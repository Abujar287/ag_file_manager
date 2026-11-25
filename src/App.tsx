import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Home, Menu } from 'lucide-react';
import {
  ActiveScreen,
  AnalyzerToolType,
  AppSettings,
  CategoryType,
  ClipboardState,
  FileNode,
  InstalledApp,
  SortBy,
  SortOrder,
  TabWindow,
  ViewMode,
} from './types/fileManager';
import { INITIAL_FILES } from './data/initialFileSystem';
import { getNodePath, inferFileKind } from './utils/formatters';
import { buildZipBlob, triggerBlobDownload } from './utils/zipExport';
import { TopBar } from './components/TopBar';
import { NavigationDrawer } from './components/NavigationDrawer';
import { HomeDashboard } from './components/HomeDashboard';
import { FileBrowser } from './components/FileBrowser';
import { AnalyzerView } from './components/AnalyzerView';
import { InstalledAppsView } from './components/InstalledAppsView';
import { MoveTargetModal } from './components/MoveTargetModal';
import { BatchRenameDialog } from './components/BatchRenameDialog';
import { UpdateModal } from './components/UpdateModal';
import { ViewSortModal } from './components/ViewSortModal';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import {
  DeleteConfirmDialog,
  FileViewerDialog,
  NewItemDialog,
  PropertiesDialog,
} from './components/Dialogs';
import { ExitConfirmDialog } from './components/ExitConfirmDialog';
import { StoragePermissionModal } from './components/StoragePermissionModal';
import {
  DeviceStorageStats,
  checkStoragePermissionGranted,
  exitApplication,
  getLiveStorageStats,
  getNativeBridge,
  getRunningAppVersion,
  isRunningInAndroidApp,
  requestStoragePermission,
} from './services/deviceStorageService';
import { APP_VERSION_NAME } from './versionInfo';

const LATEST_VERSION_NAME = APP_VERSION_NAME;
const MAX_WINDOWS = 3;

function screensEqual(a: ActiveScreen, b: ActiveScreen): boolean {
  if (a.type !== b.type) return false;
  switch (a.type) {
    case 'home':
    case 'settings':
    case 'about':
      return true;
    case 'folder':
      return b.type === 'folder' && a.folderId === b.folderId;
    case 'category':
      return b.type === 'category' && a.category === b.category;
    case 'analyzer':
      return b.type === 'analyzer' && a.tool === b.tool;
  }
}

function getScreenTitle(screen: ActiveScreen, files: FileNode[]): string {
  switch (screen.type) {
    case 'home':
      return 'Home';
    case 'folder': {
      const node = files.find((f) => f.id === screen.folderId);
      return node?.name || 'Folder';
    }
    case 'category': {
      const labels: Record<CategoryType, string> = {
        images: 'Images',
        videos: 'Videos',
        audio: 'Audio',
        apps: 'Installed Apps',
        apk_files: 'APK Files',
        new_files: 'New Files',
        compressed: 'Compressed',
        documents: 'Documents',
        recycle_bin: 'Recycle Bin',
      };
      return labels[screen.category];
    }
    case 'analyzer': {
      const labels: Record<AnalyzerToolType, string> = {
        file_analyzer: 'File Analyzer',
        large_files: 'Large Files',
        recent_files: 'Recent Files',
        empty_folders: 'Empty Folders',
        app_cache: 'Apps Cache',
        duplicate_files: 'Duplicate Files',
      };
      return labels[screen.tool];
    }
    case 'settings':
      return 'Settings';
    case 'about':
      return 'About';
  }
}

const FILES_STORAGE_KEY = 'ag_fm_files_v2';
const SETTINGS_STORAGE_KEY = 'ag_fm_settings_v2';

const runningVersion = getRunningAppVersion();

const DEFAULT_SETTINGS: AppSettings = {
  showHiddenFiles: false,
  showThumbnails: true,
  theme: 'system',
  viewMode: 'list',
  sortBy: 'name',
  sortOrder: 'asc',
  sdCardMounted: true,
  updateScenario: 'available',
  currentVersionCode: runningVersion.versionCode,
  currentVersionName: runningVersion.versionName,
};

function createNativeRootNodes(internalPath = '/storage/emulated/0', sdPath?: string): FileNode[] {
  const now = Date.now();
  const roots: FileNode[] = [
    {
      id: 'internal_root',
      name: 'Internal',
      parentId: null,
      kind: 'folder',
      size: 0,
      modifiedAt: now,
      realPath: internalPath,
    },
    {
      id: 'sd_root',
      name: 'External',
      parentId: null,
      kind: 'folder',
      size: 0,
      modifiedAt: now,
      realPath: sdPath || '/storage/sdcard1',
    },
  ];
  return roots;
}

export default function App() {
  const [files, setFiles] = useState<FileNode[]>(() => {
    if (isRunningInAndroidApp()) {
      return createNativeRootNodes();
    }
    try {
      const raw = localStorage.getItem(FILES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FileNode[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((n) =>
            n.id === 'internal_root'
              ? { ...n, name: 'Internal' }
              : n.id === 'sd_root'
                ? { ...n, name: 'External' }
                : n
          );
        }
      }
    } catch {
      // ignore storage read errors
    }
    return INITIAL_FILES;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const liveVer = getRunningAppVersion();
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppSettings>;
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          currentVersionCode: liveVer.versionCode,
          currentVersionName: liveVer.versionName,
        };
      }
    } catch {
      // ignore storage read errors
    }
    return {
      ...DEFAULT_SETTINGS,
      currentVersionCode: liveVer.versionCode,
      currentVersionName: liveVer.versionName,
    };
  });

  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  const [windows, setWindows] = useState<TabWindow[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [utilityScreen, setUtilityScreen] = useState<'settings' | 'about' | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyPaths, setHistoryPaths] = useState<{ id: string; label: string; path: string }[]>(() =>
    isRunningInAndroidApp()
      ? [{ id: 'internal_root', label: 'Internal', path: '/storage/emulated/0' }]
      : [
          { id: 'dir_download', label: 'Download', path: '/storage/emulated/0/Download' },
          { id: 'dir_documents', label: 'Documents', path: '/storage/emulated/0/Documents' },
        ]
  );

  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [newItemType, setNewItemType] = useState<'folder' | 'text' | 'file' | null>(null);
  const [renameTargetIds, setRenameTargetIds] = useState<string[] | null>(null);
  const [moveTargetIds, setMoveTargetIds] = useState<string[] | null>(null);
  const [propertiesNodes, setPropertiesNodes] = useState<FileNode[] | null>(null);
  const [viewingFile, setViewingFile] = useState<FileNode | null>(null);
  const [viewingContextFiles, setViewingContextFiles] = useState<FileNode[]>([]);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [viewSortModalOpen, setViewSortModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [installedAppsLoading, setInstalledAppsLoading] = useState(false);
  const [nativeEmptyFolders, setNativeEmptyFolders] = useState<FileNode[]>([]);
  const [emptyFoldersLoading, setEmptyFoldersLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    ids: string[];
    permanentOnly: boolean;
    isEmptyBin?: boolean;
  } | null>(null);
  const [apkConflictPrompt, setApkConflictPrompt] = useState<{
    fileName: string;
    reason: string;
  } | null>(null);

  // Swipe navigation state (DOM-driven to avoid 60fps full-tree re-renders)
  const swipeIndicatorRef = useRef<HTMLDivElement>(null);
  const swipeRightIndicatorRef = useRef<HTMLDivElement>(null);
  const edgeSwipeRef = useRef<{ active: boolean; startX: number; startY: number; lastDx: number } | null>(null);

  // Exit dialog & storage permission states (Points 1, 2, 6)
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [storagePermissionOpen, setStoragePermissionOpen] = useState(false);
  const [hasStoragePermission, setHasStoragePermission] = useState(true);
  const [storageStats, setStorageStats] = useState<DeviceStorageStats | null>(null);
  const folderScanInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (isRunningInAndroidApp()) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
      } catch {
        // ignore quota errors
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [files]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota errors
    }
  }, [settings]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 2600);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  // Apply Light / Dark / System theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const useDark =
        settings.theme === 'dark' || (settings.theme === 'system' && media.matches);
      root.classList.toggle('dark', useDark);
    };

    applyTheme();
    media.addEventListener('change', applyTheme);
    return () => media.removeEventListener('change', applyTheme);
  }, [settings.theme]);

  // If SD card gets unmounted while viewing an SD folder, safely close SD windows or return Home
  useEffect(() => {
    if (!settings.sdCardMounted) {
      setWindows((prev) => {
        const filtered = prev.filter((win) => {
          if (win.screen.type === 'folder') {
            const path = getNodePath(win.screen.folderId, files);
            return !path.startsWith('/storage/sdcard1');
          }
          return true;
        });
        if (filtered.length !== prev.length && activeWindowId && !filtered.some((w) => w.id === activeWindowId)) {
          setActiveWindowId(null);
        }
        return filtered.length === prev.length ? prev : filtered;
      });
    }
  }, [settings.sdCardMounted, files, activeWindowId]);

  const activeWindow = activeWindowId
    ? windows.find((w) => w.id === activeWindowId) || null
    : null;
  const isHomeActive = !utilityScreen && !activeWindow;
  const activeScreen: ActiveScreen = utilityScreen
    ? { type: utilityScreen }
    : activeWindow
      ? activeWindow.screen
      : { type: 'home' };

  const filesRef = useRef(files);
  filesRef.current = files;
  const nativeEmptyFoldersRef = useRef(nativeEmptyFolders);
  nativeEmptyFoldersRef.current = nativeEmptyFolders;
  const windowsRef = useRef(windows);
  windowsRef.current = windows;
  const activeWindowIdRef = useRef(activeWindow?.id ?? null);
  activeWindowIdRef.current = activeWindow?.id ?? null;
  const utilityScreenRef = useRef(utilityScreen);
  utilityScreenRef.current = utilityScreen;
  const activeScreenRef = useRef(activeScreen);
  activeScreenRef.current = activeScreen;
  const storageStatsRef = useRef(storageStats);
  storageStatsRef.current = storageStats;

  const mergeNativeNodes = useCallback((parentId: string | null, incoming: FileNode[], replaceSameParent = false) => {
    setFiles((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      if (replaceSameParent && parentId) {
        for (const [id, node] of byId.entries()) {
          if (node.parentId === parentId && !node.trashed && id !== 'internal_root' && id !== 'sd_root') {
            byId.delete(id);
          }
        }
      }
      for (const item of incoming) {
        byId.set(item.id, item);
      }
      return Array.from(byId.values());
    });
  }, []);

  const pendingDirRequestsRef = useRef<Map<string, string>>(new Map());
  const pendingCategoryReqRef = useRef<string | null>(null);
  const lastCategoryScanAtRef = useRef<number>(0);
  const pendingAppsReqRef = useRef<string | null>(null);
  const lastAppsScanAtRef = useRef<number>(0);
  const pendingEmptyFoldersReqRef = useRef<string | null>(null);
  const pendingTrashReqRef = useRef<string | null>(null);

  const loadNativeFolder = useCallback((folderId: string, explicitPath?: string) => {
    const bridge = getNativeBridge();
    if (!bridge) return;

    const currentFiles = filesRef.current;
    const stats = storageStatsRef.current;
    const targetNode = currentFiles.find((n) => n.id === folderId);
    const targetPath =
      explicitPath ||
      targetNode?.realPath ||
      (folderId === 'internal_root'
        ? stats?.internal?.rootPath || '/storage/emulated/0'
        : folderId === 'sd_root'
          ? stats?.external?.rootPath || ''
          : getNodePath(folderId, currentFiles));

    if (!targetPath) return;

    if (typeof bridge.listDirectoryAsync === 'function') {
      const reqId = `dir_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      pendingDirRequestsRef.current.set(reqId, folderId);
      try {
        bridge.listDirectoryAsync(reqId, targetPath);
        return;
      } catch {
        pendingDirRequestsRef.current.delete(reqId);
      }
    }

    if (typeof bridge.listDirectory === 'function') {
      try {
        const jsonStr = bridge.listDirectory(targetPath);
        if (jsonStr) {
          const parsed = JSON.parse(jsonStr) as FileNode[];
          if (Array.isArray(parsed)) {
            const normalized = parsed.map((item) => ({
              ...item,
              parentId: folderId,
            }));
            mergeNativeNodes(folderId, normalized, true);
          }
        }
      } catch (e) {
        console.warn('Native directory reading failed:', e);
      }
    }
  }, [mergeNativeNodes]);

  const triggerAsyncCategoryScan = useCallback((force = false) => {
    const bridge = getNativeBridge();
    if (!bridge) return;
    const now = Date.now();
    if (!force && lastCategoryScanAtRef.current > 0 && now - lastCategoryScanAtRef.current < 30000) {
      return;
    }
    lastCategoryScanAtRef.current = now;
    if (typeof bridge.scanAllCategoriesAsync === 'function') {
      const reqId = `cat_${now}`;
      pendingCategoryReqRef.current = reqId;
      try {
        bridge.scanAllCategoriesAsync(reqId);
        return;
      } catch {
        // fall through
      }
    }
    if (typeof bridge.scanAllCategories === 'function') {
      window.setTimeout(() => {
        try {
          const raw = bridge.scanAllCategories!();
          if (raw) {
            const scanned = JSON.parse(raw) as FileNode[];
            if (Array.isArray(scanned) && scanned.length > 0) {
              mergeNativeNodes(null, scanned, false);
            }
          }
        } catch (err) {
          console.warn('Category scan skipped:', err);
        }
      }, 40);
    }
  }, [mergeNativeNodes]);

  const loadInstalledApps = useCallback((force = false) => {
    const bridge = getNativeBridge();
    if (!bridge) return;
    const now = Date.now();
    if (!force && lastAppsScanAtRef.current > 0 && now - lastAppsScanAtRef.current < 30000) {
      return;
    }
    lastAppsScanAtRef.current = now;

    if (typeof bridge.getInstalledAppsAsync === 'function') {
      const reqId = `apps_${now}`;
      pendingAppsReqRef.current = reqId;
      setInstalledAppsLoading(true);
      try {
        bridge.getInstalledAppsAsync(reqId);
        return;
      } catch {
        setInstalledAppsLoading(false);
      }
    }
    if (typeof bridge.getInstalledApps === 'function') {
      setInstalledAppsLoading(true);
      window.setTimeout(() => {
        try {
          const raw = bridge.getInstalledApps!();
          const parsed = raw ? (JSON.parse(raw) as InstalledApp[]) : [];
          if (Array.isArray(parsed)) {
            setInstalledApps(parsed);
          }
        } catch {
          // ignore
        } finally {
          setInstalledAppsLoading(false);
        }
      }, 30);
    }
  }, []);

  const loadNativeEmptyFolders = useCallback(() => {
    const bridge = getNativeBridge();
    if (!bridge) return;
    if (typeof bridge.findEmptyFoldersAsync === 'function') {
      const reqId = `empty_${Date.now()}`;
      pendingEmptyFoldersReqRef.current = reqId;
      setEmptyFoldersLoading(true);
      try {
        bridge.findEmptyFoldersAsync(reqId);
        return;
      } catch {
        setEmptyFoldersLoading(false);
      }
    }
    if (typeof bridge.findEmptyFolders === 'function') {
      setEmptyFoldersLoading(true);
      window.setTimeout(() => {
        try {
          const raw = bridge.findEmptyFolders!();
          const parsed = raw ? (JSON.parse(raw) as FileNode[]) : [];
          if (Array.isArray(parsed)) {
            setNativeEmptyFolders(parsed);
          }
        } catch {
          // ignore
        } finally {
          setEmptyFoldersLoading(false);
        }
      }, 20);
    }
  }, []);

  const loadNativeTrashItems = useCallback(() => {
    const bridge = getNativeBridge();
    if (!bridge) return;
    if (typeof bridge.getTrashItemsAsync === 'function') {
      const reqId = `trash_${Date.now()}`;
      pendingTrashReqRef.current = reqId;
      try {
        bridge.getTrashItemsAsync(reqId);
        return;
      } catch {
        // fall through
      }
    }
    if (typeof bridge.getTrashItems === 'function') {
      try {
        const raw = bridge.getTrashItems();
        const parsed = raw ? (JSON.parse(raw) as FileNode[]) : [];
        if (Array.isArray(parsed)) {
          setFiles((prev) => [
            ...parsed.map((item) => ({ ...item, trashed: true })),
            ...prev.filter((n) => !n.trashed),
          ]);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  const refreshNativeDeviceState = async () => {
    const granted = await checkStoragePermissionGranted();
    setHasStoragePermission(granted);

    const totalFilesBytes = files.reduce(
      (acc, f) => acc + (f.kind === 'folder' ? 0 : f.size),
      0
    );
    const stats = await getLiveStorageStats(totalFilesBytes);
    setStorageStats(stats);

    if (isRunningInAndroidApp()) {
      setSettings((prev) => ({
        ...prev,
        sdCardMounted: Boolean(stats.external?.isMounted),
      }));
    }

    const bridge = getNativeBridge();
    if (!bridge) return;

    // Ensure root nodes reflect true device paths
    const internalRootPath = stats.internal?.rootPath || '/storage/emulated/0';
    const sdRootPath = stats.external?.isMounted ? stats.external.rootPath : undefined;
    mergeNativeNodes(null, createNativeRootNodes(internalRootPath, sdRootPath), false);

    loadNativeFolder('internal_root', internalRootPath);
    if (sdRootPath) {
      loadNativeFolder('sd_root', sdRootPath);
    }

    loadInstalledApps(true);
    loadNativeTrashItems();

    if (granted) {
      triggerAsyncCategoryScan(true);
      loadNativeEmptyFolders();
    }
  };

  // Initialize live device storage stats & async native event listeners
  useEffect(() => {
    refreshNativeDeviceState();

    const onPermissionEvent = () => {
      refreshNativeDeviceState();
    };
    const onDirResult = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        requestId?: string;
        items?: FileNode[];
      };
      if (!detail?.requestId || !Array.isArray(detail.items)) return;
      const folderId = pendingDirRequestsRef.current.get(detail.requestId);
      if (!folderId) return;
      pendingDirRequestsRef.current.delete(detail.requestId);
      const normalized = detail.items.map((item) => ({
        ...item,
        parentId: folderId,
      }));
      mergeNativeNodes(folderId, normalized, true);
    };
    const onCategoriesResult = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        requestId?: string;
        items?: FileNode[];
      };
      if (!detail?.requestId || detail.requestId !== pendingCategoryReqRef.current) return;
      if (Array.isArray(detail.items) && detail.items.length > 0) {
        mergeNativeNodes(null, detail.items, false);
      }
    };
    const onInstalledAppsResult = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        requestId?: string;
        apps?: InstalledApp[];
      };
      if (!detail?.requestId || detail.requestId !== pendingAppsReqRef.current) return;
      setInstalledAppsLoading(false);
      if (Array.isArray(detail.apps)) {
        setInstalledApps(detail.apps);
      }
    };
    const onAppsChanged = () => {
      loadInstalledApps(true);
    };
    const onEmptyFoldersResult = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        requestId?: string;
        folders?: FileNode[];
      };
      if (!detail?.requestId || detail.requestId !== pendingEmptyFoldersReqRef.current) return;
      setEmptyFoldersLoading(false);
      if (Array.isArray(detail.folders)) {
        setNativeEmptyFolders(detail.folders);
      }
    };
    const onTrashItemsResult = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        requestId?: string;
        items?: FileNode[];
      };
      if (!detail?.requestId || detail.requestId !== pendingTrashReqRef.current) return;
      if (Array.isArray(detail.items)) {
        setFiles((prev) => [
          ...detail.items!.map((item) => ({ ...item, trashed: true })),
          ...prev.filter((n) => !n.trashed),
        ]);
      }
    };

    const onWindowFocus = () => {
      const screen = activeScreenRef.current;
      if (isRunningInAndroidApp() && screen.type === 'category' && screen.category === 'apps') {
        loadInstalledApps(true);
      }
    };

    window.addEventListener('android_permission_result', onPermissionEvent);
    window.addEventListener('android_dir_result', onDirResult);
    window.addEventListener('android_categories_result', onCategoriesResult);
    window.addEventListener('android_installed_apps_result', onInstalledAppsResult);
    window.addEventListener('android_apps_changed', onAppsChanged);
    window.addEventListener('android_empty_folders_result', onEmptyFoldersResult);
    window.addEventListener('android_trash_items_result', onTrashItemsResult);
    window.addEventListener('focus', onWindowFocus);
    return () => {
      window.removeEventListener('android_permission_result', onPermissionEvent);
      window.removeEventListener('android_dir_result', onDirResult);
      window.removeEventListener('android_categories_result', onCategoriesResult);
      window.removeEventListener('android_installed_apps_result', onInstalledAppsResult);
      window.removeEventListener('android_apps_changed', onAppsChanged);
      window.removeEventListener('android_empty_folders_result', onEmptyFoldersResult);
      window.removeEventListener('android_trash_items_result', onTrashItemsResult);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [loadInstalledApps]);

  const syncScreenSideEffects = useCallback((screen: ActiveScreen) => {
    const currentFiles = filesRef.current;
    if (screen.type === 'folder') {
      if (isRunningInAndroidApp()) {
        loadNativeFolder(screen.folderId);
      }
      const folderNode = currentFiles.find((f) => f.id === screen.folderId);
      if (folderNode) {
        const path = getNodePath(folderNode.id, currentFiles);
        setHistoryPaths((prev) => [
          { id: folderNode.id, label: folderNode.name, path },
          ...prev.filter((item) => item.id !== folderNode.id),
        ].slice(0, 12));
      }
    } else if (screen.type === 'category' && isRunningInAndroidApp()) {
      if (screen.category === 'apps') {
        loadInstalledApps(false);
      } else if (screen.category === 'recycle_bin') {
        loadNativeTrashItems();
      } else {
        triggerAsyncCategoryScan(false);
      }
    } else if (screen.type === 'analyzer' && isRunningInAndroidApp()) {
      if (screen.tool === 'empty_folders') {
        loadNativeEmptyFolders();
      } else {
        triggerAsyncCategoryScan(false);
      }
    }
  }, [loadNativeFolder, loadInstalledApps, loadNativeTrashItems, loadNativeEmptyFolders, triggerAsyncCategoryScan]);

  const navigateInActiveTab = useCallback((screen: ActiveScreen) => {
    setSearchOpen(false);
    setSearchQuery('');

    if (screen.type === 'home') {
      setUtilityScreen(null);
      setActiveWindowId(null);
      return;
    }

    if (screen.type === 'settings' || screen.type === 'about') {
      setUtilityScreen(screen.type);
      return;
    }

    const currentFiles = filesRef.current;
    const currentWinId = activeWindowIdRef.current;
    const isCurrentlyOnHome = !currentWinId || utilityScreenRef.current !== null;

    if (isCurrentlyOnHome) {
      if (windowsRef.current.length >= MAX_WINDOWS) {
        setUtilityScreen(null);
        setActiveWindowId(null);
        showToast(`Maximum ${MAX_WINDOWS} windows limit reached. Close a window to open another.`);
        return;
      }

      const id = `win_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      const newWin: TabWindow = {
        id,
        title: getScreenTitle(screen, currentFiles),
        screen,
        backStack: [],
      };
      setUtilityScreen(null);
      setWindows((prev) => (prev.length >= MAX_WINDOWS ? prev : [...prev, newWin]));
      setActiveWindowId(id);
      syncScreenSideEffects(screen);
      return;
    }

    const title = getScreenTitle(screen, currentFiles);
    setWindows((prev) =>
      prev.map((w) => {
        if (w.id !== currentWinId) return w;
        if (screensEqual(w.screen, screen)) {
          return { ...w, title, screen };
        }
        return {
          ...w,
          title,
          screen,
          backStack: [...w.backStack, w.screen],
        };
      })
    );
    syncScreenSideEffects(screen);
  }, [syncScreenSideEffects, showToast]);

  // Step-by-step Back Navigation Stack:
  // Any non-home segment returns to the previous screen in backStack until reaching Home
  // (leaving the window open); On Home screen, pressing Back shows Exit Confirmation Dialog!
  const handleBackAction = () => {
    if (exitConfirmOpen) {
      setExitConfirmOpen(false);
      return;
    }
    if (storagePermissionOpen) {
      setStoragePermissionOpen(false);
      return;
    }
    if (viewingFile) {
      setViewingFile(null);
      return;
    }
    if (deleteConfirm) {
      setDeleteConfirm(null);
      return;
    }
    if (propertiesNodes) {
      setPropertiesNodes(null);
      return;
    }
    if (moveTargetIds) {
      setMoveTargetIds(null);
      return;
    }
    if (viewSortModalOpen) {
      setViewSortModalOpen(false);
      return;
    }
    if (renameTargetIds) {
      setRenameTargetIds(null);
      return;
    }
    if (newItemType) {
      setNewItemType(null);
      return;
    }
    if (updateModalOpen) {
      setUpdateModalOpen(false);
      return;
    }
    if (drawerOpen) {
      setDrawerOpen(false);
      return;
    }
    if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery('');
      return;
    }

    if (utilityScreen !== null) {
      setUtilityScreen(null);
      return;
    }

    if (activeWindow) {
      if (activeWindow.backStack.length > 0) {
        const prevScreen = activeWindow.backStack[activeWindow.backStack.length - 1];
        const nextStack = activeWindow.backStack.slice(0, -1);
        syncScreenSideEffects(prevScreen);
        const title = getScreenTitle(prevScreen, filesRef.current);
        const targetId = activeWindow.id;
        setWindows((prev) =>
          prev.map((w) =>
            w.id === targetId
              ? {
                  ...w,
                  title,
                  screen: prevScreen,
                  backStack: nextStack,
                }
              : w
          )
        );
        return;
      }

      if (activeWindow.screen.type === 'folder') {
        const currentFolderId = activeWindow.screen.folderId;
        const currentFolder = files.find((f) => f.id === currentFolderId);
        if (currentFolder && currentFolder.parentId && currentFolder.parentId !== null) {
          const parentScreen: ActiveScreen = { type: 'folder', folderId: currentFolder.parentId };
          syncScreenSideEffects(parentScreen);
          const title = getScreenTitle(parentScreen, filesRef.current);
          const targetId = activeWindow.id;
          setWindows((prev) =>
            prev.map((w) =>
              w.id === targetId ? { ...w, title, screen: parentScreen, backStack: [] } : w
            )
          );
          return;
        }
      }

      // Return to Home screen while keeping this window open
      setActiveWindowId(null);
      return;
    }

    // Already on Home: show Exit confirmation dialog!
    setExitConfirmOpen(true);
  };

  // Wire to Android native onBackPressed via window.handleSystemBackButton
  useEffect(() => {
    window.handleSystemBackButton = () => {
      handleBackAction();
    };
    return () => {
      delete window.handleSystemBackButton;
    };
  });

  // Wire to browser back button (popstate)
  useEffect(() => {
    window.history.replaceState({ screen: 'home' }, '');
    window.history.pushState({ screen: 'active' }, '');

    const onPopState = () => {
      window.history.pushState({ screen: 'active' }, '');
      handleBackAction();
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  });

  const handleRequestStoragePermission = async () => {
    await requestStoragePermission();
    setStoragePermissionOpen(false);
    await refreshNativeDeviceState();

    if (!isRunningInAndroidApp()) {
      setHasStoragePermission(true);
      showToast('Storage permission granted');
      folderScanInputRef.current?.click();
    }
  };

  const handleScanFolder = (eventFileList: FileList | null) => {
    if (!eventFileList || eventFileList.length === 0) return;
    const now = Date.now();
    const createdFolderPaths = new Map<string, string>();
    createdFolderPaths.set('', 'internal_root');

    const newNodes: FileNode[] = [];
    const scannedFiles = Array.from(eventFileList);

    scannedFiles.forEach((f) => {
      const relPath = (f as any).webkitRelativePath || f.name;
      const parts = relPath.split('/');
      const fileName = parts.pop() || f.name;

      let currentPath = '';
      let parentNodeId = 'internal_root';

      parts.forEach((part: string) => {
        const nextPath = currentPath ? `${currentPath}/${part}` : part;
        if (!createdFolderPaths.has(nextPath)) {
          const folderId = `dir_${Math.random().toString(36).slice(2, 8)}_${now}`;
          createdFolderPaths.set(nextPath, folderId);
          newNodes.push({
            id: folderId,
            name: part,
            parentId: parentNodeId,
            kind: 'folder',
            size: 0,
            modifiedAt: now,
          });
        }
        parentNodeId = createdFolderPaths.get(nextPath)!;
        currentPath = nextPath;
      });

      const kind = inferFileKind(fileName);
      newNodes.push({
        id: `scanned_${Math.random().toString(36).slice(2, 8)}_${now}`,
        name: fileName,
        parentId: parentNodeId,
        kind,
        size: f.size,
        modifiedAt: f.lastModified || now,
        hidden: fileName.startsWith('.'),
      });
    });

    setFiles((prev) => {
      const roots = prev.filter((n) => n.id === 'internal_root' || n.id === 'sd_root');
      return [...roots, ...newNodes];
    });

    setHasStoragePermission(true);
    try {
      localStorage.setItem('ag_fm_permission_granted', 'true');
    } catch {
      // ignore
    }
    showToast(`Scanned ${scannedFiles.length} item(s) from phone storage`);
  };

  const handleSelectWindow = useCallback((windowId: string) => {
    const target = windowsRef.current.find((w) => w.id === windowId);
    if (!target) return;
    setSearchOpen(false);
    setSearchQuery('');
    setUtilityScreen(null);
    setActiveWindowId(windowId);
    syncScreenSideEffects(target.screen);
  }, [syncScreenSideEffects]);

  const handleNewWindow = useCallback(() => {
    if (windowsRef.current.length >= MAX_WINDOWS) {
      showToast(`Maximum ${MAX_WINDOWS} windows limit reached`);
      return;
    }
    const id = `win_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
    const screen: ActiveScreen = { type: 'folder', folderId: 'internal_root' };
    const newWin: TabWindow = {
      id,
      title: 'Internal',
      screen,
      backStack: [],
    };
    setUtilityScreen(null);
    setSearchOpen(false);
    setSearchQuery('');
    setWindows((prev) => (prev.length >= MAX_WINDOWS ? prev : [...prev, newWin]));
    setActiveWindowId(id);
    syncScreenSideEffects(screen);
  }, [syncScreenSideEffects, showToast]);

  const handleCloseWindow = useCallback((windowId: string) => {
    setWindows((prev) => {
      const idx = prev.findIndex((w) => w.id === windowId);
      if (idx === -1) return prev;
      const remaining = prev.filter((w) => w.id !== windowId);
      if (activeWindowIdRef.current === windowId) {
        if (remaining.length === 0) {
          setActiveWindowId(null);
        } else {
          const nextWin = remaining[Math.min(idx, remaining.length - 1)];
          setActiveWindowId(nextWin.id);
          syncScreenSideEffects(nextWin.screen);
        }
      }
      return remaining;
    });
  }, [syncScreenSideEffects]);

  const handleCloseOtherWindows = useCallback(() => {
    const currId = activeWindowIdRef.current;
    if (!currId) return;
    setWindows((prev) => prev.filter((w) => w.id === currId));
    showToast('Closed other windows');
  }, [showToast]);

  const handleCloseAllWindows = useCallback(() => {
    setWindows([]);
    setActiveWindowId(null);
    showToast('Closed all windows');
  }, [showToast]);

  const handleChangeSort = (sortBy: SortBy, explicitOrder?: SortOrder) => {
    setSettings((prev) => ({
      ...prev,
      sortBy,
      sortOrder:
        explicitOrder ||
        (prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'),
    }));
  };

  const handleOpenExternal = (file: FileNode) => {
    const bridge = getNativeBridge();
    if (bridge && file.realPath && typeof bridge.openFile === 'function') {
      const ok = bridge.openFile(file.realPath, '');
      if (ok) return;
    }
    handleDownloadFileCopy(file);
  };

  const handleOpenFile = useCallback((file: FileNode, contextList?: FileNode[]) => {
    const applyContext = () => {
      setViewingContextFiles(contextList && contextList.length > 0 ? contextList : []);
    };
    const bridge = getNativeBridge();
    if (bridge && file.realPath) {
      if (file.kind === 'apk' && typeof bridge.installApk === 'function') {
        if (typeof bridge.checkApkInstallCompatibility === 'function') {
          try {
            const raw = bridge.checkApkInstallCompatibility(file.realPath);
            const compat = JSON.parse(raw) as {
              compatible?: boolean;
              code?: string;
              reason?: string;
            };
            if (compat?.code === 'signature_mismatch') {
              setApkConflictPrompt({
                fileName: file.name,
                reason:
                  compat.reason ||
                  `This APK uses a different signing key than the installed AG File Manager. Uninstall the old app once, then install ${file.name} cleanly.`,
              });
              return;
            }
            if (compat?.code === 'downgrade') {
              showToast(compat.reason || 'Selected APK is older than the installed version.');
              return;
            }
          } catch {
            // continue to system installer if check fails
          }
        }
        const ok = bridge.installApk(file.realPath);
        if (ok) return;
      }

      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      if (
        file.kind === 'image' ||
        file.kind === 'video' ||
        file.kind === 'audio' ||
        isPdf
      ) {
        const fileUri =
          file.mediaUrl ||
          `file://${encodeURI(file.realPath).replace(/#/g, '%23')}`;
        applyContext();
        setViewingFile({ ...file, mediaUrl: fileUri });
        return;
      }

      if (file.kind === 'text') {
        if (typeof bridge.readTextFileAsync === 'function') {
          const reqId = `txt_${Date.now()}`;
          const onTextResult = (ev: Event) => {
            const detail = (ev as CustomEvent).detail as {
              requestId?: string;
              content?: string;
            };
            if (!detail || detail.requestId !== reqId) return;
            window.removeEventListener('android_text_result', onTextResult);
            applyContext();
            setViewingFile({ ...file, content: detail.content ?? '' });
          };
          window.addEventListener('android_text_result', onTextResult);
          try {
            bridge.readTextFileAsync(reqId, file.realPath);
            return;
          } catch {
            window.removeEventListener('android_text_result', onTextResult);
          }
        }
        if (typeof bridge.readTextFile === 'function') {
          try {
            const text = bridge.readTextFile(file.realPath);
            applyContext();
            setViewingFile({ ...file, content: text });
            return;
          } catch {
            // fall through to viewer
          }
        }
      }
    }
    applyContext();
    setViewingFile(file);
  }, [showToast]);

  const handleCreateNewItem = (name: string, type: 'folder' | 'text' | 'file') => {
    const targetParentId =
      activeScreen.type === 'folder' ? activeScreen.folderId : 'internal_root';
    const bridge = getNativeBridge();
    if (bridge) {
      const parentPath = getNodePath(targetParentId, files);
      const ok =
        type === 'folder'
          ? bridge.createFolder?.(parentPath, name)
          : bridge.createTextFile?.(parentPath, name, '');
      setNewItemType(null);
      if (ok) {
        loadNativeFolder(targetParentId, parentPath);
        showToast(`Created ${name}`);
      } else {
        showToast(`Failed to create ${name}`);
      }
      return;
    }

    const now = Date.now();
    const newNode: FileNode = {
      id: `node_${now}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      parentId: targetParentId,
      kind: type === 'folder' ? 'folder' : type === 'text' ? 'text' : inferFileKind(name),
      size: type === 'folder' ? 0 : type === 'text' ? 0 : 1024,
      modifiedAt: now,
      hidden: name.startsWith('.'),
      content: type === 'text' ? '' : undefined,
    };

    setFiles((prev) => [newNode, ...prev]);
    setNewItemType(null);
    showToast(`Created ${name}`);
  };

  const handleMoveFilesToFolder = useCallback((ids: string[], targetFolderId: string) => {
    const currentFiles = filesRef.current;
    const targetDir = getNodePath(targetFolderId, currentFiles);
    const targetFolderNode = currentFiles.find((n) => n.id === targetFolderId);
    const bridge = getNativeBridge();

    if (bridge && typeof bridge.copyOrMovePaths === 'function') {
      const lookupPool = [...currentFiles, ...nativeEmptyFoldersRef.current];
      const sourcePaths = ids
        .map((id) => lookupPool.find((n) => n.id === id)?.realPath)
        .filter((p): p is string => Boolean(p));

      if (sourcePaths.length > 0 && targetDir) {
        const ok = bridge.copyOrMovePaths(JSON.stringify(sourcePaths), targetDir, true);
        setMoveTargetIds(null);
        if (ok) {
          const now = Date.now();
          setFiles((prev) =>
            prev.map((n) => {
              if (!ids.includes(n.id) || n.id === targetFolderId) return n;
              const nextRealPath = `${targetDir.replace(/\/$/, '')}/${n.name}`;
              return {
                ...n,
                parentId: targetFolderId,
                realPath: nextRealPath,
                modifiedAt: now,
              };
            })
          );
          setNativeEmptyFolders((prev) => prev.filter((n) => !ids.includes(n.id)));
          loadNativeFolder(targetFolderId, targetDir);
          showToast(
            `Moved ${sourcePaths.length} item(s) to ${targetFolderNode?.name || 'folder'}`
          );
        } else {
          showToast('Move failed');
        }
        return;
      }
    }

    const now = Date.now();
    setFiles((prev) =>
      prev.map((n) =>
        ids.includes(n.id) && n.id !== targetFolderId
          ? { ...n, parentId: targetFolderId, modifiedAt: now }
          : n
      )
    );
    setMoveTargetIds(null);
    showToast(`Moved ${ids.length} item(s) to ${targetFolderNode?.name || 'folder'}`);
  }, [loadNativeFolder, showToast]);

  const handlePaste = (targetFolderId: string) => {
    if (!clipboard) return;
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.copyOrMovePaths === 'function') {
      const sourcePaths = clipboard.itemIds
        .map((id) => files.find((n) => n.id === id)?.realPath)
        .filter((p): p is string => Boolean(p));
      const targetDir = getNodePath(targetFolderId, files);
      if (sourcePaths.length > 0 && targetDir) {
        const isCut = clipboard.mode === 'cut';
        const movedIds = clipboard.itemIds;
        const ok = bridge.copyOrMovePaths(
          JSON.stringify(sourcePaths),
          targetDir,
          isCut
        );
        setClipboard(null);
        if (ok) {
          if (isCut) {
            const now = Date.now();
            setFiles((prev) =>
              prev.map((n) =>
                movedIds.includes(n.id) && n.id !== targetFolderId
                  ? {
                      ...n,
                      parentId: targetFolderId,
                      realPath: `${targetDir.replace(/\/$/, '')}/${n.name}`,
                      modifiedAt: now,
                    }
                  : n
              )
            );
          }
          loadNativeFolder(targetFolderId, targetDir);
          showToast(
            `${isCut ? 'Moved' : 'Copied'} ${sourcePaths.length} item(s)`
          );
        } else {
          showToast('Operation failed');
        }
        return;
      }
    }

    const now = Date.now();

    if (clipboard.mode === 'cut') {
      setFiles((prev) =>
        prev.map((n) =>
          clipboard.itemIds.includes(n.id) && n.id !== targetFolderId
            ? { ...n, parentId: targetFolderId, modifiedAt: now }
            : n
        )
      );
      showToast(`Moved ${clipboard.itemIds.length} item(s)`);
    } else {
      setFiles((prev) => {
        const clones: FileNode[] = [];
        const cloneSubtree = (nodeId: string, newParentId: string, isRootItem: boolean) => {
          const orig = prev.find((f) => f.id === nodeId);
          if (!orig) return;
          const newId = `copy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          const baseName = isRootItem ? `Copy of ${orig.name}` : orig.name;
          clones.push({
            ...orig,
            id: newId,
            name: baseName,
            parentId: newParentId,
            modifiedAt: now,
          });
          if (orig.kind === 'folder') {
            prev
              .filter((child) => child.parentId === orig.id && !child.trashed)
              .forEach((child) => cloneSubtree(child.id, newId, false));
          }
        };

        clipboard.itemIds.forEach((id) => cloneSubtree(id, targetFolderId, true));
        return [...clones, ...prev];
      });
      showToast(`Copied ${clipboard.itemIds.length} item(s)`);
    }
    setClipboard(null);
  };

  const collectSubtreeIds = useCallback((rootIds: string[], allFiles: FileNode[]): Set<string> => {
    const result = new Set<string>(rootIds);
    let added = true;
    while (added) {
      added = false;
      for (let i = 0; i < allFiles.length; i++) {
        const n = allFiles[i];
        if (n.parentId && result.has(n.parentId) && !result.has(n.id)) {
          result.add(n.id);
          added = true;
        }
      }
    }
    return result;
  }, []);

  const handleDelete = useCallback((ids: string[], permanent = false) => {
    const currentFiles = filesRef.current;
    const subtreeIds = collectSubtreeIds(ids, currentFiles);
    const bridge = getNativeBridge();

    if (bridge) {
      if (!permanent && typeof bridge.moveToTrash === 'function') {
        const payload = ids
          .map((id) => currentFiles.find((n) => n.id === id))
          .filter((n): n is FileNode => Boolean(n && n.realPath))
          .map((n) => ({
            id: n.id,
            realPath: n.realPath,
            parentId: n.parentId || 'internal_root',
          }));

        if (payload.length > 0) {
          try {
            const raw = bridge.moveToTrash(JSON.stringify(payload));
            const trashedNodes = raw ? (JSON.parse(raw) as FileNode[]) : [];
            if (Array.isArray(trashedNodes) && trashedNodes.length > 0) {
              const normalized = trashedNodes.map((t) => ({
                ...t,
                trashed: true,
              }));
              setFiles((prev) => [
                ...normalized,
                ...prev.filter((n) => !subtreeIds.has(n.id)),
              ]);
              setNativeEmptyFolders((prev) => prev.filter((n) => !subtreeIds.has(n.id)));
              showToast(`Moved ${normalized.length} item(s) to Recycle Bin`);
              return;
            }
          } catch {
            // fall through
          }
        }
      }

      if (permanent && typeof bridge.deletePaths === 'function') {
        const paths = ids
          .map((id) => currentFiles.find((n) => n.id === id)?.realPath)
          .filter((p): p is string => Boolean(p));
        if (paths.length > 0) {
          const ok = bridge.deletePaths(JSON.stringify(paths), false);
          if (ok) {
            setFiles((prev) => prev.filter((n) => !subtreeIds.has(n.id)));
            setNativeEmptyFolders((prev) => prev.filter((n) => !subtreeIds.has(n.id)));
            showToast(`Permanently deleted ${paths.length} item(s) from phone`);
            return;
          }
        }
      }
    }

    if (permanent) {
      setFiles((prev) => prev.filter((n) => !subtreeIds.has(n.id)));
      showToast(`Permanently deleted ${ids.length} item(s)`);
    } else {
      setFiles((prev) =>
        prev.map((n) =>
          subtreeIds.has(n.id)
            ? {
                ...n,
                trashed: true,
                originalParentId: ids.includes(n.id) ? n.parentId : n.originalParentId ?? n.parentId,
              }
            : n
        )
      );
      showToast(`Moved ${ids.length} item(s) to Recycle Bin`);
    }
  }, [collectSubtreeIds, showToast]);

  const handleRestore = useCallback((ids: string[]) => {
    const currentFiles = filesRef.current;
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.restoreFromTrash === 'function') {
      const payload = ids
        .map((id) => currentFiles.find((n) => n.id === id))
        .filter((n): n is FileNode => Boolean(n && n.realPath))
        .map((n) => ({
          id: n.id,
          realPath: n.realPath,
          originalPath: n.originalPath || '',
        }));
      if (payload.length > 0) {
        try {
          const raw = bridge.restoreFromTrash(JSON.stringify(payload));
          const restored = raw ? (JSON.parse(raw) as { id: string; restoredPath: string; success: boolean }[]) : [];
          const restoredIds = new Set(restored.filter((r) => r.success).map((r) => r.id));
          if (restoredIds.size > 0) {
            setFiles((prev) => prev.filter((n) => !restoredIds.has(n.id)));
            triggerAsyncCategoryScan(true);
            loadNativeFolder('internal_root');
            showToast(`Restored ${restoredIds.size} item(s)`);
            return;
          }
        } catch {
          // fall through
        }
      }
    }

    const subtreeIds = collectSubtreeIds(ids, currentFiles);
    setFiles((prev) =>
      prev.map((n) =>
        subtreeIds.has(n.id)
          ? {
              ...n,
              trashed: false,
              parentId: ids.includes(n.id)
                ? n.originalParentId || 'internal_root'
                : n.parentId || n.originalParentId || 'internal_root',
            }
          : n
      )
    );
    showToast(`Restored ${ids.length} item(s)`);
  }, [collectSubtreeIds, loadNativeFolder, showToast, triggerAsyncCategoryScan]);

  const handleEmptyRecycleBin = useCallback(() => {
    const currentFiles = filesRef.current;
    const bridge = getNativeBridge();
    if (bridge) {
      if (typeof bridge.emptyTrash === 'function') {
        bridge.emptyTrash();
      } else if (typeof bridge.deletePaths === 'function') {
        const trashedPaths = currentFiles
          .filter((n) => n.trashed && n.realPath)
          .map((n) => n.realPath as string);
        if (trashedPaths.length > 0) {
          bridge.deletePaths(JSON.stringify(trashedPaths), false);
        }
      }
    }
    setFiles((prev) => prev.filter((n) => !n.trashed));
    showToast('Recycle Bin emptied');
  }, [showToast]);

  const requestDeleteConfirm = useCallback((ids: string[], permanent = false) => {
    if (ids.length === 0) return;
    setDeleteConfirm({ ids, permanentOnly: permanent });
  }, []);

  const requestEmptyRecycleBinConfirm = useCallback(() => {
    setDeleteConfirm({ ids: [], permanentOnly: true, isEmptyBin: true });
  }, []);

  const handleBatchRenameConfirm = (renames: { id: string; newName: string }[]) => {
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.renamePath === 'function') {
      for (const r of renames) {
        const target = files.find((f) => f.id === r.id);
        if (target?.realPath) {
          bridge.renamePath(target.realPath, r.newName);
        }
      }
      const renameMap = new Map(renames.map((r) => [r.id, r.newName]));
      const now = Date.now();
      setFiles((prev) =>
        prev.map((n) => {
          const nextName = renameMap.get(n.id);
          if (!nextName) return n;
          const parentPath = n.realPath ? n.realPath.replace(/\/[^/]+$/, '') : '';
          return {
            ...n,
            name: nextName,
            kind: n.kind === 'folder' ? 'folder' : inferFileKind(nextName),
            realPath: parentPath ? `${parentPath}/${nextName}` : n.realPath,
            modifiedAt: now,
          };
        })
      );
      setRenameTargetIds(null);
      if (activeScreen.type === 'folder') {
        loadNativeFolder(activeScreen.folderId);
      }
      showToast(`Renamed ${renames.length} item(s)`);
      return;
    }

    const map = new Map(renames.map((r) => [r.id, r.newName]));
    const now = Date.now();
    setFiles((prev) =>
      prev.map((n) => {
        const nextName = map.get(n.id);
        if (!nextName) return n;
        return {
          ...n,
          name: nextName,
          kind: n.kind === 'folder' ? 'folder' : inferFileKind(nextName),
          modifiedAt: now,
        };
      })
    );
    setRenameTargetIds(null);
    showToast(`Renamed ${renames.length} item(s)`);
  };

  const handleShare = useCallback(async (ids: string[]) => {
    const currentFiles = filesRef.current;
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.shareFiles === 'function') {
      const paths = ids
        .map((id) => currentFiles.find((f) => f.id === id)?.realPath)
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        bridge.shareFiles(JSON.stringify(paths));
        return;
      }
    }

    const names = currentFiles
      .filter((f) => ids.includes(f.id))
      .map((f) => f.name)
      .join(', ');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'AG File Manager',
          text: `Sharing from AG File Manager: ${names}`,
        });
        return;
      } catch {
        // user cancelled share sheet
      }
    }
    showToast(`Ready to share: ${names}`);
  }, [showToast]);

  const handleBackupAppApk = useCallback((app: InstalledApp) => {
    const bridge = getNativeBridge();
    if (!bridge || !app.apkPath || typeof bridge.copyOrMovePaths !== 'function') {
      showToast('APK export is available inside Android app');
      return;
    }
    const internalRoot =
      storageStatsRef.current?.internal?.rootPath || '/storage/emulated/0';
    const downloadDir = `${internalRoot.replace(/\/$/, '')}/Download`;
    const ok = bridge.copyOrMovePaths(JSON.stringify([app.apkPath]), downloadDir, false);
    if (!ok) {
      showToast(`Failed to backup ${app.name}`);
      return;
    }
    const srcName = app.apkPath.split('/').pop() || 'base.apk';
    const safeBase = app.name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || app.packageName;
    const safeVer = (app.versionName || '1.0').replace(/[^a-zA-Z0-9._-]+/g, '_');
    const targetName = `${safeBase}_v${safeVer}.apk`;
    if (srcName !== targetName && typeof bridge.renamePath === 'function') {
      bridge.renamePath(`${downloadDir}/${srcName}`, targetName);
    }
    triggerAsyncCategoryScan(true);
    showToast(`Backed up ${targetName} to Download`);
  }, [showToast, triggerAsyncCategoryScan]);

  const handleShareAppApk = useCallback((app: InstalledApp) => {
    const bridge = getNativeBridge();
    if (bridge && app.apkPath && typeof bridge.shareFiles === 'function') {
      bridge.shareFiles(JSON.stringify([app.apkPath]));
    } else {
      showToast('Share APK is available on Android device');
    }
  }, [showToast]);

  const handleToggleFavourite = useCallback((ids: string[]) => {
    setFiles((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, favourite: !n.favourite } : n))
    );
    showToast('Updated favourites');
  }, [showToast]);

  const handleCompressZip = (ids: string[]) => {
    const targets = files.filter((n) => ids.includes(n.id));
    if (targets.length === 0) return;

    const parentId =
      activeScreen.type === 'folder'
        ? activeScreen.folderId
        : targets[0].parentId || 'internal_root';
    const zipName =
      targets.length === 1
        ? `${targets[0].name.replace(/\.[^.]+$/, '')}.zip`
        : `Archive_${new Date().toISOString().slice(0, 10)}.zip`;

    const totalSize = targets.reduce((acc, t) => acc + Math.max(t.size, 1024), 0);
    const compressedSize = Math.max(512, Math.round(totalSize * 0.65));

    const zipNode: FileNode = {
      id: `zip_${Date.now()}`,
      name: zipName,
      parentId,
      kind: 'archive',
      size: compressedSize,
      modifiedAt: Date.now(),
      content: `ZIP Archive containing: ${targets.map((t) => t.name).join(', ')}`,
    };

    setFiles((prev) => [zipNode, ...prev]);
    showToast(`Compressed into ${zipName}`);
  };

  const handleCleanEmptyFolders = useCallback((ids: string[]) => {
    const currentFiles = filesRef.current;
    const lookupPool = [...nativeEmptyFoldersRef.current, ...currentFiles];
    const bridge = getNativeBridge();
    if (bridge) {
      const paths = ids
        .map((id) => lookupPool.find((n) => n.id === id)?.realPath)
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        if (typeof bridge.deleteEmptyFolders === 'function') {
          bridge.deleteEmptyFolders(JSON.stringify(paths));
        } else if (typeof bridge.deletePaths === 'function') {
          bridge.deletePaths(JSON.stringify(paths), false);
        }
      }
    }
    setNativeEmptyFolders((prev) => prev.filter((n) => !ids.includes(n.id)));
    setFiles((prev) => prev.filter((n) => !ids.includes(n.id)));
    showToast(`Removed ${ids.length} empty folder(s)`);
    if (isRunningInAndroidApp()) {
      window.setTimeout(() => loadNativeEmptyFolders(), 250);
    }
  }, [loadNativeEmptyFolders, showToast]);

  const handleClearAppCache = useCallback((ids: string[]) => {
    const currentFiles = filesRef.current;
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.deletePaths === 'function') {
      const paths = ids
        .map((id) => currentFiles.find((n) => n.id === id)?.realPath)
        .filter((p): p is string => Boolean(p));
      if (paths.length > 0) {
        bridge.deletePaths(JSON.stringify(paths), false);
      }
    }
    setFiles((prev) => prev.filter((n) => !ids.includes(n.id)));
    showToast('App cache cleared');
  }, [showToast]);

  const handleSaveTextFile = (id: string, content: string) => {
    const bridge = getNativeBridge();
    const target = files.find((n) => n.id === id);
    if (bridge && target?.realPath && typeof bridge.writeTextFile === 'function') {
      bridge.writeTextFile(target.realPath, content);
    }
    const byteLen = new TextEncoder().encode(content).length;
    setFiles((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, content, size: byteLen, modifiedAt: Date.now() } : n
      )
    );
    showToast('File saved');
  };

  const handleDownloadFileCopy = (file: FileNode) => {
    if (file.kind === 'archive') {
      const blob = buildZipBlob([
        {
          path: 'README.txt',
          content: file.content || `Exported archive: ${file.name}`,
        },
      ]);
      triggerBlobDownload(blob, file.name);
    } else {
      const blob = new Blob(
        [file.content || `AG File Manager export\nFile: ${file.name}\nSize: ${file.size} bytes`],
        { type: 'text/plain;charset=utf-8' }
      );
      triggerBlobDownload(blob, file.name);
    }
  };

  const handleSaveApkToPublicDownloads = (filename: string, sizeBytes: number) => {
    const now = Date.now();
    setFiles((prev) => {
      const hasDownloadDir = prev.some((n) => n.id === 'dir_download' && !n.trashed);
      const baseList = hasDownloadDir
        ? prev.map((n) => (n.id === 'dir_download' ? { ...n, modifiedAt: now } : n))
        : [
            ...prev.filter((n) => n.id !== 'dir_download'),
            {
              id: 'dir_download',
              name: 'Download',
              parentId: 'internal_root',
              kind: 'folder' as const,
              size: 0,
              modifiedAt: now,
            },
          ];

      const filtered = baseList.filter(
        (n) => !(n.parentId === 'dir_download' && n.name === filename)
      );
      const apkNode: FileNode = {
        id: `apk_dl_${now}`,
        name: filename,
        parentId: 'dir_download',
        kind: 'apk',
        size: sizeBytes,
        modifiedAt: now,
        hash: `sha_apk_${filename}`,
      };
      return [apkNode, ...filtered];
    });
    showToast(`Saved ${filename} to Download folder`);
  };

  const handleUploadDeviceFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const targetParentId =
      activeScreen.type === 'folder' ? activeScreen.folderId : 'dir_download';
    const now = Date.now();

    Array.from(fileList).forEach((file) => {
      const kind = inferFileKind(file.name);
      const baseNode: FileNode = {
        id: `up_${now}_${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        parentId: targetParentId,
        kind,
        size: file.size,
        modifiedAt: file.lastModified || now,
        hidden: file.name.startsWith('.'),
      };

      if (kind === 'image' && file.size <= 2 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setFiles((prev) => [
            { ...baseNode, thumbnailUrl: reader.result as string },
            ...prev,
          ]);
        };
        reader.readAsDataURL(file);
      } else if (kind === 'text' && file.size <= 512 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setFiles((prev) => [
            { ...baseNode, content: reader.result as string },
            ...prev,
          ]);
        };
        reader.readAsText(file);
      } else {
        setFiles((prev) => [baseNode, ...prev]);
      }
    });

    showToast(`Imported ${fileList.length} file(s)`);
  };

  const handleInstallCompleted = (newVersionName: string, newVersionCode: number) => {
    setSettings((prev) => ({
      ...prev,
      currentVersionName: newVersionName,
      currentVersionCode: newVersionCode,
      updateScenario: 'up_to_date',
    }));
    showToast(`Updated to AG File Manager v${newVersionName}`);
  };

  const renameTargets = renameTargetIds
    ? Array.from(
        new Map(
          [...files, ...nativeEmptyFolders]
            .filter((f) => renameTargetIds.includes(f.id))
            .map((f) => [f.id, f])
        ).values()
      )
    : [];

  const currentWindowIdx =
    !utilityScreen && !searchOpen && activeWindow
      ? windows.findIndex((w) => w.id === activeWindow.id)
      : -1;

  const nextWindowOnRight =
    !utilityScreen && !searchOpen
      ? currentWindowIdx === -1
        ? windows.length > 0
          ? { index: 0, window: windows[0] }
          : null
        : currentWindowIdx < windows.length - 1
          ? { index: currentWindowIdx + 1, window: windows[currentWindowIdx + 1] }
          : null
      : null;

  const prevWindowOnLeft =
    !utilityScreen && !searchOpen && currentWindowIdx > 0
      ? { index: currentWindowIdx - 1, window: windows[currentWindowIdx - 1] }
      : null;

  const updateSwipeIndicator = useCallback((dx: number) => {
    const el = swipeIndicatorRef.current;
    if (!el) return;
    if (dx > 12) {
      el.style.display = 'flex';
      el.style.transform = `translate3d(${Math.min(18, dx - 36)}px, -50%, 0)`;
      el.style.opacity = String(Math.min(1, dx / 64));
    } else {
      el.style.display = 'none';
      el.style.opacity = '0';
    }
  }, []);

  const updateRightSwipeIndicator = useCallback((dx: number) => {
    const el = swipeRightIndicatorRef.current;
    if (!el) return;
    if (dx < -12) {
      el.style.display = 'flex';
      el.style.transform = `translate3d(${Math.max(-18, dx + 36)}px, -50%, 0)`;
      el.style.opacity = String(Math.min(1, Math.abs(dx) / 64));
    } else {
      el.style.display = 'none';
      el.style.opacity = '0';
    }
  }, []);

  const handleRootTouchStart = useCallback((e: React.TouchEvent) => {
    if (
      e.touches.length !== 1 ||
      viewingFile ||
      drawerOpen ||
      updateModalOpen ||
      viewSortModalOpen ||
      Boolean(moveTargetIds) ||
      Boolean(renameTargetIds) ||
      Boolean(deleteConfirm) ||
      Boolean(propertiesNodes) ||
      Boolean(newItemType) ||
      exitConfirmOpen ||
      storagePermissionOpen ||
      Boolean(apkConflictPrompt)
    ) {
      edgeSwipeRef.current = null;
      return;
    }
    // Skip swipe when inside a horizontally scrollable strip (breadcrumbs, open windows strip, etc.)
    let el = e.target as HTMLElement | null;
    while (el && el !== e.currentTarget) {
      if (el.scrollWidth > el.clientWidth + 4) {
        const style = window.getComputedStyle(el);
        if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
          edgeSwipeRef.current = null;
          return;
        }
      }
      el = el.parentElement;
    }
    const touch = e.touches[0];
    edgeSwipeRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      lastDx: 0,
    };
  }, [
    viewingFile,
    drawerOpen,
    updateModalOpen,
    viewSortModalOpen,
    moveTargetIds,
    renameTargetIds,
    deleteConfirm,
    propertiesNodes,
    newItemType,
    exitConfirmOpen,
    storagePermissionOpen,
    apkConflictPrompt,
  ]);

  const handleRootTouchMove = useCallback((e: React.TouchEvent) => {
    const state = edgeSwipeRef.current;
    if (!state || !state.active || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - state.startX;
    const dy = e.touches[0].clientY - state.startY;
    if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx) * 0.9) {
      edgeSwipeRef.current = null;
      updateSwipeIndicator(0);
      updateRightSwipeIndicator(0);
      return;
    }
    const canSwipeLeftToRight =
      prevWindowOnLeft !== null ||
      currentWindowIdx === 0 ||
      searchOpen ||
      utilityScreen !== null
        ? state.startX <= Math.max(280, window.innerWidth * 0.85)
        : state.startX <= 96;

    if (dx > 8 && dx > Math.abs(dy) * 1.15 && canSwipeLeftToRight) {
      const clamped = Math.min(110, dx);
      state.lastDx = clamped;
      updateSwipeIndicator(clamped);
      updateRightSwipeIndicator(0);
    } else if (dx < -8 && Math.abs(dx) > Math.abs(dy) * 1.15 && nextWindowOnRight !== null) {
      const clamped = Math.max(-110, dx);
      state.lastDx = clamped;
      updateRightSwipeIndicator(clamped);
      updateSwipeIndicator(0);
    }
  }, [
    prevWindowOnLeft,
    nextWindowOnRight,
    currentWindowIdx,
    searchOpen,
    utilityScreen,
    updateSwipeIndicator,
    updateRightSwipeIndicator,
  ]);

  const handleRootTouchEnd = useCallback(() => {
    const state = edgeSwipeRef.current;
    if (state?.active && state.lastDx >= 64) {
      if (searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      } else if (utilityScreen !== null) {
        setUtilityScreen(null);
      } else if (prevWindowOnLeft) {
        syncScreenSideEffects(prevWindowOnLeft.window.screen);
        setActiveWindowId(prevWindowOnLeft.window.id);
      } else if (currentWindowIdx === 0) {
        setActiveWindowId(null);
      } else if (isHomeActive && state.startX <= 96) {
        setDrawerOpen(true);
      }
    } else if (state?.active && state.lastDx <= -64 && nextWindowOnRight) {
      setSearchOpen(false);
      setSearchQuery('');
      setUtilityScreen(null);
      syncScreenSideEffects(nextWindowOnRight.window.screen);
      setActiveWindowId(nextWindowOnRight.window.id);
    }
    edgeSwipeRef.current = null;
    updateSwipeIndicator(0);
    updateRightSwipeIndicator(0);
  }, [
    searchOpen,
    utilityScreen,
    prevWindowOnLeft,
    nextWindowOnRight,
    currentWindowIdx,
    isHomeActive,
    syncScreenSideEffects,
    updateSwipeIndicator,
    updateRightSwipeIndicator,
  ]);

  const handleBackActionRef = useRef(handleBackAction);
  handleBackActionRef.current = handleBackAction;

  const handleOpenFolderMemo = useCallback(
    (folderId: string) => navigateInActiveTab({ type: 'folder', folderId }),
    [navigateInActiveTab]
  );
  const handleBackStepMemo = useCallback(
    () => handleBackActionRef.current(),
    []
  );
  const handleBackSearchMemo = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery('');
  }, []);
  const handleOpenToolMemo = useCallback(
    (tool: AnalyzerToolType) => navigateInActiveTab({ type: 'analyzer', tool }),
    [navigateInActiveTab]
  );
  const handleSelectAnalyzerTabMemo = useCallback(
    (tool: AnalyzerToolType) => {
      const targetWinId = activeWindowIdRef.current;
      if (!targetWinId) return;
      const nextScreen: ActiveScreen = { type: 'analyzer', tool };
      const title = getScreenTitle(nextScreen, filesRef.current);
      setWindows((prev) =>
        prev.map((w) =>
          w.id === targetWinId
            ? { ...w, title, screen: nextScreen }
            : w
        )
      );
      syncScreenSideEffects(nextScreen);
    },
    [syncScreenSideEffects]
  );
  const handleOpenCategoryMemo = useCallback(
    (category: CategoryType) => navigateInActiveTab({ type: 'category', category }),
    [navigateInActiveTab]
  );
  const handleOpenApkFilesMemo = useCallback(
    () => navigateInActiveTab({ type: 'category', category: 'apk_files' }),
    [navigateInActiveTab]
  );
  const handleRefreshAppsMemo = useCallback(
    () => loadInstalledApps(true),
    [loadInstalledApps]
  );
  const handleRequestPermissionMemo = useCallback(() => setStoragePermissionOpen(true), []);
  const handleCopyMemo = useCallback(
    (ids: string[]) => {
      setClipboard({ mode: 'copy', itemIds: ids });
      showToast(`${ids.length} item(s) copied`);
    },
    [showToast]
  );
  const handleCutMemo = useCallback(
    (ids: string[]) => {
      setClipboard({ mode: 'cut', itemIds: ids });
      showToast(`${ids.length} item(s) ready to move`);
    },
    [showToast]
  );
  const handleCancelClipboardMemo = useCallback(() => setClipboard(null), []);
  const handleRenameRequestMemo = useCallback((ids: string[]) => setRenameTargetIds(ids), []);
  const handleMoveRequestMemo = useCallback((ids: string[]) => setMoveTargetIds(ids), []);
  const handleDeleteNonPermanentMemo = useCallback(
    (ids: string[]) => requestDeleteConfirm(ids, false),
    [requestDeleteConfirm]
  );
  const handleCloseViewerMemo = useCallback(() => {
    setViewingFile(null);
    setViewingContextFiles([]);
  }, []);
  const handleSelectViewerFileMemo = useCallback(
    (nextFile: FileNode) => handleOpenFile(nextFile, viewingContextFiles),
    [handleOpenFile, viewingContextFiles]
  );
  const handleShareViewerFileMemo = useCallback(
    (target: FileNode) => handleShare([target.id]),
    [handleShare]
  );
  const handleDeleteViewerFileMemo = useCallback(
    (target: FileNode) => {
      setViewingFile(null);
      setViewingContextFiles([]);
      requestDeleteConfirm([target.id], false);
    },
    [requestDeleteConfirm]
  );

  return (
    <div
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
      onTouchStart={handleRootTouchStart}
      onTouchMove={handleRootTouchMove}
      onTouchEnd={handleRootTouchEnd}
      onTouchCancel={handleRootTouchEnd}
    >
      {/* Left-to-Right Swipe Navigation Indicator (updated via DOM ref for zero lag) */}
      <div
        ref={swipeIndicatorRef}
        style={{ display: 'none', opacity: 0 }}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none items-center gap-1.5 pl-2 pr-3 py-2.5 rounded-r-2xl bg-blue-600 text-white shadow-xl max-w-[190px]"
      >
        {prevWindowOnLeft ? (
          <>
            <ChevronLeft size={16} className="shrink-0" />
            <span className="text-xs font-semibold truncate">
              W{prevWindowOnLeft.index + 1} · {prevWindowOnLeft.window.title}
            </span>
          </>
        ) : currentWindowIdx === 0 || searchOpen || utilityScreen !== null ? (
          <>
            <Home size={18} className="shrink-0" />
            <span className="text-xs font-semibold">Home</span>
          </>
        ) : (
          <>
            <Menu size={18} className="shrink-0" />
            <span className="text-xs font-semibold">Menu</span>
          </>
        )}
      </div>

      {/* Right-to-Left Swipe Next-Window Indicator */}
      <div
        ref={swipeRightIndicatorRef}
        style={{ display: 'none', opacity: 0 }}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 pointer-events-none items-center gap-1.5 pl-3 pr-2 py-2.5 rounded-l-2xl bg-blue-600 text-white shadow-xl max-w-[190px]"
      >
        <span className="text-xs font-semibold truncate">
          {nextWindowOnRight
            ? `W${nextWindowOnRight.index + 1} · ${nextWindowOnRight.window.title}`
            : 'Next'}
        </span>
        <ChevronRight size={16} className="shrink-0" />
      </div>

      {/* Hidden file picker for importing individual real files from device */}
      <input
        ref={fileUploadInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleUploadDeviceFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Hidden folder scanner for reading whole directories from phone storage */}
      <input
        ref={folderScanInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        multiple
        className="hidden"
        onChange={(e) => {
          handleScanFolder(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Top Header Bar */}
      <TopBar
        onOpenDrawer={() => setDrawerOpen((prev) => !prev)}
        onGoHome={() => navigateInActiveTab({ type: 'home' })}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchOpen={searchOpen}
        onToggleSearch={setSearchOpen}
        onNewItem={(type) => setNewItemType(type)}
        onUploadFiles={() => fileUploadInputRef.current?.click()}
        onOpenViewSort={() => setViewSortModalOpen(true)}
        historyPaths={historyPaths}
        onNavigateHistory={(folderId) => navigateInActiveTab({ type: 'folder', folderId })}
        windows={windows}
        activeWindowId={activeWindow?.id ?? null}
        isHomeActive={isHomeActive}
        maxWindows={MAX_WINDOWS}
        onSelectWindow={handleSelectWindow}
        onNewWindow={handleNewWindow}
        onCloseWindow={handleCloseWindow}
        onCloseOtherWindows={handleCloseOtherWindows}
        onCloseAllWindows={handleCloseAllWindows}
      />

      <div className="flex-1 flex">
        {/* Left Navigation Drawer (Docked on lg+, slide-over on smaller screens) */}
        <NavigationDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          activeScreen={activeScreen}
          settings={settings}
          onNavigate={navigateInActiveTab}
          onToggleHidden={() =>
            setSettings((prev) => ({ ...prev, showHiddenFiles: !prev.showHiddenFiles }))
          }
          onToggleThumbnails={() =>
            setSettings((prev) => ({ ...prev, showThumbnails: !prev.showThumbnails }))
          }
          onCheckUpdate={() => setUpdateModalOpen(true)}
        />

        {/* Main Viewport */}
        <main className="flex-1 min-w-0">
          {searchOpen ? (
            <FileBrowser
              mode="search"
              searchQuery={searchQuery}
              files={files}
              storageStats={storageStats}
              showHidden={settings.showHiddenFiles}
              showThumbnails={settings.showThumbnails}
              viewMode={settings.viewMode}
              sortBy={settings.sortBy}
              sortOrder={settings.sortOrder}
              clipboard={clipboard}
              onBackHome={handleBackSearchMemo}
              onOpenFolder={handleOpenFolderMemo}
              onOpenFile={handleOpenFile}
              onCopy={handleCopyMemo}
              onCut={handleCutMemo}
              onPaste={handlePaste}
              onCancelClipboard={handleCancelClipboardMemo}
              onDelete={requestDeleteConfirm}
              onRestore={handleRestore}
              onEmptyRecycleBin={requestEmptyRecycleBinConfirm}
              onRenameRequest={handleRenameRequestMemo}
              onShare={handleShare}
              onToggleFavourite={handleToggleFavourite}
              onCompressZip={handleCompressZip}
              onShowProperties={setPropertiesNodes}
            />
          ) : activeScreen.type === 'home' ? (
            <HomeDashboard
              files={files}
              installedAppsCount={installedApps.length}
              sdCardMounted={settings.sdCardMounted}
              storageStats={storageStats}
              hasPermission={hasStoragePermission}
              openWindows={windows}
              maxWindows={MAX_WINDOWS}
              onSelectWindow={handleSelectWindow}
              onCloseWindow={handleCloseWindow}
              onRequestPermission={handleRequestPermissionMemo}
              onOpenFolder={handleOpenFolderMemo}
              onOpenTool={handleOpenToolMemo}
              onOpenCategory={handleOpenCategoryMemo}
            />
          ) : activeScreen.type === 'category' && activeScreen.category === 'apps' ? (
            <InstalledAppsView
              apps={installedApps}
              loading={installedAppsLoading}
              onBack={handleBackStepMemo}
              onRefresh={handleRefreshAppsMemo}
              onOpenApkFiles={handleOpenApkFilesMemo}
              onBackupApk={handleBackupAppApk}
              onShareApk={handleShareAppApk}
              onShowToast={showToast}
            />
          ) : activeScreen.type === 'folder' || activeScreen.type === 'category' ? (
            <FileBrowser
              mode={activeScreen.type}
              folderId={activeScreen.type === 'folder' ? activeScreen.folderId : undefined}
              category={
                activeScreen.type === 'category' ? activeScreen.category : undefined
              }
              files={files}
              storageStats={storageStats}
              showHidden={settings.showHiddenFiles}
              showThumbnails={settings.showThumbnails}
              viewMode={settings.viewMode}
              sortBy={settings.sortBy}
              sortOrder={settings.sortOrder}
              clipboard={clipboard}
              onBackHome={handleBackStepMemo}
              onOpenFolder={handleOpenFolderMemo}
              onOpenFile={handleOpenFile}
              onCopy={handleCopyMemo}
              onCut={handleCutMemo}
              onPaste={handlePaste}
              onCancelClipboard={handleCancelClipboardMemo}
              onDelete={requestDeleteConfirm}
              onRestore={handleRestore}
              onEmptyRecycleBin={requestEmptyRecycleBinConfirm}
              onRenameRequest={handleRenameRequestMemo}
              onShare={handleShare}
              onToggleFavourite={handleToggleFavourite}
              onCompressZip={handleCompressZip}
              onShowProperties={setPropertiesNodes}
            />
          ) : activeScreen.type === 'analyzer' ? (
            <AnalyzerView
              tool={activeScreen.tool}
              files={files}
              nativeEmptyFolders={isRunningInAndroidApp() ? nativeEmptyFolders : undefined}
              emptyFoldersLoading={emptyFoldersLoading}
              showThumbnails={settings.showThumbnails}
              onBackHome={handleBackStepMemo}
              onSelectTool={handleSelectAnalyzerTabMemo}
              onRefreshEmptyFolders={isRunningInAndroidApp() ? loadNativeEmptyFolders : undefined}
              onOpenFolder={handleOpenFolderMemo}
              onOpenFile={handleOpenFile}
              onDeleteFiles={handleDeleteNonPermanentMemo}
              onCopyFiles={handleCopyMemo}
              onCutFiles={handleCutMemo}
              onMoveFiles={handleMoveRequestMemo}
              onRenameRequest={handleRenameRequestMemo}
              onShare={handleShare}
              onShowProperties={setPropertiesNodes}
              onCleanEmptyFolders={handleCleanEmptyFolders}
              onClearAppCache={handleClearAppCache}
            />
          ) : activeScreen.type === 'settings' ? (
            <SettingsView
              settings={settings}
              onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              onBackHome={handleBackStepMemo}
            />
          ) : (
            <AboutView
              settings={settings}
              onBackHome={handleBackStepMemo}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ViewSortModal
        open={viewSortModalOpen}
        viewMode={settings.viewMode}
        sortBy={settings.sortBy}
        sortOrder={settings.sortOrder}
        onChangeViewMode={(viewMode: ViewMode) =>
          setSettings((prev) => ({ ...prev, viewMode }))
        }
        onChangeSort={handleChangeSort}
        onClose={() => setViewSortModalOpen(false)}
      />

      <NewItemDialog
        type={newItemType}
        onCancel={() => setNewItemType(null)}
        onCreate={handleCreateNewItem}
      />

      {renameTargetIds && renameTargets.length > 0 && (
        <BatchRenameDialog
          items={renameTargets}
          onCancel={() => setRenameTargetIds(null)}
          onConfirm={handleBatchRenameConfirm}
        />
      )}

      <MoveTargetModal
        open={Boolean(moveTargetIds && moveTargetIds.length > 0)}
        itemCount={moveTargetIds?.length || 0}
        files={files}
        sdCardMounted={settings.sdCardMounted}
        onBrowseFolder={(folderId) => {
          if (isRunningInAndroidApp()) {
            loadNativeFolder(folderId);
          }
        }}
        onCancel={() => setMoveTargetIds(null)}
        onConfirmMove={(targetFolderId) => {
          if (moveTargetIds && moveTargetIds.length > 0) {
            handleMoveFilesToFolder(moveTargetIds, targetFolderId);
          }
        }}
      />

      <PropertiesDialog
        nodes={propertiesNodes}
        allNodes={files}
        onClose={() => setPropertiesNodes(null)}
      />

      <DeleteConfirmDialog
        open={Boolean(deleteConfirm)}
        itemCount={deleteConfirm?.ids.length || 0}
        singleItemName={
          deleteConfirm?.ids.length === 1
            ? (files.find((f) => f.id === deleteConfirm.ids[0]) ||
                nativeEmptyFolders.find((f) => f.id === deleteConfirm.ids[0]))?.name
            : undefined
        }
        permanentOnly={Boolean(deleteConfirm?.permanentOnly)}
        isEmptyBin={Boolean(deleteConfirm?.isEmptyBin)}
        onCancel={() => setDeleteConfirm(null)}
        onMoveToBin={() => {
          if (deleteConfirm && !deleteConfirm.isEmptyBin) {
            handleDelete(deleteConfirm.ids, false);
          }
          setDeleteConfirm(null);
        }}
        onDeletePermanently={() => {
          if (deleteConfirm?.isEmptyBin) {
            handleEmptyRecycleBin();
          } else if (deleteConfirm) {
            handleDelete(deleteConfirm.ids, true);
          }
          setDeleteConfirm(null);
        }}
      />

      <FileViewerDialog
        file={viewingFile}
        galleryFiles={viewingContextFiles}
        onSelectFile={handleSelectViewerFileMemo}
        onClose={handleCloseViewerMemo}
        onSaveText={handleSaveTextFile}
        onDownloadFile={handleDownloadFileCopy}
        onOpenExternal={handleOpenExternal}
        onShareFile={handleShareViewerFileMemo}
        onDeleteFile={handleDeleteViewerFileMemo}
      />

      <UpdateModal
        open={updateModalOpen}
        currentVersion={settings.currentVersionName}
        currentVersionCode={settings.currentVersionCode}
        newVersion={LATEST_VERSION_NAME}
        scenario={settings.updateScenario}
        onClose={() => setUpdateModalOpen(false)}
        onSaveApkToPublicDownloads={handleSaveApkToPublicDownloads}
        onInstallCompleted={handleInstallCompleted}
      />

      {apkConflictPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55">
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-base font-semibold text-amber-600 dark:text-amber-400">
              Reinstall Required Once
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {apkConflictPrompt.reason}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setApkConflictPrompt(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  getNativeBridge()?.uninstallSelf?.();
                  setApkConflictPrompt(null);
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Uninstall Old App
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Point 6: Exit Confirmation Popup */}
      <ExitConfirmDialog
        open={exitConfirmOpen}
        onCancel={() => setExitConfirmOpen(false)}
        onConfirmExit={() => exitApplication()}
      />

      {/* Point 1 & 2: Real Storage & Media Permission Request Modal */}
      <StoragePermissionModal
        open={storagePermissionOpen}
        onClose={() => setStoragePermissionOpen(false)}
        isAndroid={isRunningInAndroidApp()}
        onRequestPermission={handleRequestStoragePermission}
        onSelectFolder={() => {
          setStoragePermissionOpen(false);
          folderScanInputRef.current?.click();
        }}
      />

      {/* Lightweight Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium shadow-lg text-center break-words"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
