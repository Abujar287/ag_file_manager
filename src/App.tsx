import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  ActiveScreen,
  AnalyzerToolType,
  AppSettings,
  CategoryType,
  ClipboardState,
  FileNode,
  SortBy,
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
import { BatchRenameDialog } from './components/BatchRenameDialog';
import { UpdateModal } from './components/UpdateModal';
import { SettingsView } from './components/SettingsView';
import { AboutView } from './components/AboutView';
import { FileViewerDialog, NewItemDialog, PropertiesDialog } from './components/Dialogs';

const LATEST_VERSION_NAME = '1.2.0';

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
        apps: 'Apps',
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
        app_cache: 'App Cache',
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

const DEFAULT_SETTINGS: AppSettings = {
  showHiddenFiles: false,
  showThumbnails: true,
  theme: 'system',
  viewMode: 'list',
  sortBy: 'name',
  sortOrder: 'asc',
  sdCardMounted: true,
  updateScenario: 'available',
  currentVersionCode: 2,
  currentVersionName: '1.1.0',
};

export default function App() {
  const [files, setFiles] = useState<FileNode[]>(() => {
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
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
      }
    } catch {
      // ignore storage read errors
    }
    return DEFAULT_SETTINGS;
  });

  const fileUploadInputRef = useRef<HTMLInputElement>(null);

  const [tabs, setTabs] = useState<TabWindow[]>([
    { id: 'tab_1', title: 'Home', screen: { type: 'home' } },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab_1');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyPaths, setHistoryPaths] = useState<{ id: string; label: string; path: string }[]>([
    { id: 'dir_download', label: 'Download', path: '/storage/emulated/0/Download' },
    { id: 'dir_documents', label: 'Documents', path: '/storage/emulated/0/Documents' },
  ]);

  const [clipboard, setClipboard] = useState<ClipboardState | null>(null);
  const [newItemType, setNewItemType] = useState<'folder' | 'text' | 'file' | null>(null);
  const [renameTargetIds, setRenameTargetIds] = useState<string[] | null>(null);
  const [propertiesNode, setPropertiesNode] = useState<FileNode | null>(null);
  const [viewingFile, setViewingFile] = useState<FileNode | null>(null);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    try {
      localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
    } catch {
      // ignore quota errors
    }
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

  // If SD card gets unmounted while viewing an SD folder, navigate safely back to Home
  useEffect(() => {
    if (!settings.sdCardMounted) {
      setTabs((prev) =>
        prev.map((tab) => {
          if (tab.screen.type === 'folder') {
            const path = getNodePath(tab.screen.folderId, files);
            if (path.startsWith('/storage/sdcard1')) {
              return { ...tab, title: 'Home', screen: { type: 'home' } };
            }
          }
          return tab;
        })
      );
    }
  }, [settings.sdCardMounted, files]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeScreen = activeTab.screen;

  const navigateInActiveTab = (screen: ActiveScreen) => {
    setSearchOpen(false);
    setSearchQuery('');

    if (screen.type === 'folder') {
      const folderNode = files.find((f) => f.id === screen.folderId);
      if (folderNode) {
        const path = getNodePath(folderNode.id, files);
        setHistoryPaths((prev) => [
          { id: folderNode.id, label: folderNode.name, path },
          ...prev.filter((item) => item.id !== folderNode.id),
        ].slice(0, 12));
      }
    }

    const title = getScreenTitle(screen, files);
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, title, screen } : t))
    );
  };

  const handleNewTab = () => {
    const id = `tab_${Date.now()}`;
    const newTab: TabWindow = {
      id,
      title: 'Internal',
      screen: { type: 'folder', folderId: 'internal_root' },
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
    setSearchOpen(false);
  };

  const handleCloseTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId) {
      setActiveTabId(remaining[remaining.length - 1].id);
    }
  };

  const handleCloseOtherPages = () => {
    setTabs((prev) => prev.filter((t) => t.id === activeTab.id));
    showToast('Closed other pages');
  };

  const handleChangeSort = (sortBy: SortBy) => {
    setSettings((prev) => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleCreateNewItem = (name: string, type: 'folder' | 'text' | 'file') => {
    const targetParentId =
      activeScreen.type === 'folder' ? activeScreen.folderId : 'internal_root';
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

  const handlePaste = (targetFolderId: string) => {
    if (!clipboard) return;
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
      // Deep clone selected items & descendants into targetFolderId
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

  const handleDelete = (ids: string[], permanent = false) => {
    if (permanent) {
      setFiles((prev) => prev.filter((n) => !ids.includes(n.id)));
      showToast(`Permanently deleted ${ids.length} item(s)`);
    } else {
      setFiles((prev) =>
        prev.map((n) =>
          ids.includes(n.id)
            ? { ...n, trashed: true, originalParentId: n.parentId }
            : n
        )
      );
      showToast(`Moved ${ids.length} item(s) to Recycle Bin`);
    }
  };

  const handleRestore = (ids: string[]) => {
    setFiles((prev) =>
      prev.map((n) =>
        ids.includes(n.id)
          ? {
              ...n,
              trashed: false,
              parentId: n.originalParentId || 'internal_root',
            }
          : n
      )
    );
    showToast(`Restored ${ids.length} item(s)`);
  };

  const handleEmptyRecycleBin = () => {
    setFiles((prev) => prev.filter((n) => !n.trashed));
    showToast('Recycle Bin emptied');
  };

  const handleBatchRenameConfirm = (renames: { id: string; newName: string }[]) => {
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

  const handleShare = async (ids: string[]) => {
    const names = files
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
  };

  const handleToggleFavourite = (ids: string[]) => {
    setFiles((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, favourite: !n.favourite } : n))
    );
    showToast('Updated favourites');
  };

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

  const handleCleanEmptyFolders = (ids: string[]) => {
    setFiles((prev) => prev.filter((n) => !ids.includes(n.id)));
    showToast(`Removed ${ids.length} empty folder(s)`);
  };

  const handleClearAppCache = (ids: string[]) => {
    setFiles((prev) => prev.filter((n) => !ids.includes(n.id)));
    showToast('App cache cleared');
  };

  const handleSaveTextFile = (id: string, content: string) => {
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
    ? files.filter((f) => renameTargetIds.includes(f.id))
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Hidden file picker for importing real files from device */}
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
        viewMode={settings.viewMode}
        onChangeViewMode={(viewMode: ViewMode) =>
          setSettings((prev) => ({ ...prev, viewMode }))
        }
        sortBy={settings.sortBy}
        sortOrder={settings.sortOrder}
        onChangeSort={handleChangeSort}
        historyPaths={historyPaths}
        onNavigateHistory={(folderId) => navigateInActiveTab({ type: 'folder', folderId })}
        tabs={tabs}
        activeTabId={activeTab.id}
        onSelectTab={(id) => setActiveTabId(id)}
        onNewTab={handleNewTab}
        onCloseTab={handleCloseTab}
        onCloseOtherPages={handleCloseOtherPages}
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
          {/* Window Switcher Strip (only shown when >1 window tab is open) */}
          {tabs.length > 1 && !searchOpen && (
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center gap-1.5 overflow-x-auto">
              {tabs.map((tab) => {
                const active = tab.id === activeTab.id;
                return (
                  <div
                    key={tab.id}
                    className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                      active
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTabId(tab.id)}
                      className="max-w-[140px] truncate"
                    >
                      {tab.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCloseTab(tab.id)}
                      className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                      aria-label={`Close ${tab.title}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {searchOpen ? (
            <FileBrowser
              mode="search"
              searchQuery={searchQuery}
              files={files}
              showHidden={settings.showHiddenFiles}
              showThumbnails={settings.showThumbnails}
              viewMode={settings.viewMode}
              sortBy={settings.sortBy}
              sortOrder={settings.sortOrder}
              clipboard={clipboard}
              onBackHome={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              onOpenFolder={(folderId) => navigateInActiveTab({ type: 'folder', folderId })}
              onOpenFile={setViewingFile}
              onCopy={(ids) => {
                setClipboard({ mode: 'copy', itemIds: ids });
                showToast(`${ids.length} item(s) copied`);
              }}
              onCut={(ids) => {
                setClipboard({ mode: 'cut', itemIds: ids });
                showToast(`${ids.length} item(s) ready to move`);
              }}
              onPaste={handlePaste}
              onCancelClipboard={() => setClipboard(null)}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onEmptyRecycleBin={handleEmptyRecycleBin}
              onRenameRequest={(ids) => setRenameTargetIds(ids)}
              onShare={handleShare}
              onToggleFavourite={handleToggleFavourite}
              onCompressZip={handleCompressZip}
              onShowProperties={setPropertiesNode}
            />
          ) : activeScreen.type === 'home' ? (
            <HomeDashboard
              files={files}
              sdCardMounted={settings.sdCardMounted}
              onOpenFolder={(folderId) => navigateInActiveTab({ type: 'folder', folderId })}
              onOpenTool={(tool) => navigateInActiveTab({ type: 'analyzer', tool })}
              onOpenCategory={(category) =>
                navigateInActiveTab({ type: 'category', category })
              }
            />
          ) : activeScreen.type === 'folder' || activeScreen.type === 'category' ? (
            <FileBrowser
              mode={activeScreen.type}
              folderId={activeScreen.type === 'folder' ? activeScreen.folderId : undefined}
              category={
                activeScreen.type === 'category' ? activeScreen.category : undefined
              }
              files={files}
              showHidden={settings.showHiddenFiles}
              showThumbnails={settings.showThumbnails}
              viewMode={settings.viewMode}
              sortBy={settings.sortBy}
              sortOrder={settings.sortOrder}
              clipboard={clipboard}
              onBackHome={() => navigateInActiveTab({ type: 'home' })}
              onOpenFolder={(folderId) => navigateInActiveTab({ type: 'folder', folderId })}
              onOpenFile={setViewingFile}
              onCopy={(ids) => {
                setClipboard({ mode: 'copy', itemIds: ids });
                showToast(`${ids.length} item(s) copied`);
              }}
              onCut={(ids) => {
                setClipboard({ mode: 'cut', itemIds: ids });
                showToast(`${ids.length} item(s) ready to move`);
              }}
              onPaste={handlePaste}
              onCancelClipboard={() => setClipboard(null)}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onEmptyRecycleBin={handleEmptyRecycleBin}
              onRenameRequest={(ids) => setRenameTargetIds(ids)}
              onShare={handleShare}
              onToggleFavourite={handleToggleFavourite}
              onCompressZip={handleCompressZip}
              onShowProperties={setPropertiesNode}
            />
          ) : activeScreen.type === 'analyzer' ? (
            <AnalyzerView
              tool={activeScreen.tool}
              files={files}
              showThumbnails={settings.showThumbnails}
              onSelectTool={(tool) => navigateInActiveTab({ type: 'analyzer', tool })}
              onBackHome={() => navigateInActiveTab({ type: 'home' })}
              onOpenFolder={(folderId) => navigateInActiveTab({ type: 'folder', folderId })}
              onOpenFile={setViewingFile}
              onDeleteFiles={(ids) => handleDelete(ids, false)}
              onCleanEmptyFolders={handleCleanEmptyFolders}
              onClearAppCache={handleClearAppCache}
            />
          ) : activeScreen.type === 'settings' ? (
            <SettingsView
              settings={settings}
              onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
              onBackHome={() => navigateInActiveTab({ type: 'home' })}
            />
          ) : (
            <AboutView
              settings={settings}
              onBackHome={() => navigateInActiveTab({ type: 'home' })}
              onCheckUpdate={() => setUpdateModalOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
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

      <PropertiesDialog
        node={propertiesNode}
        allNodes={files}
        onClose={() => setPropertiesNode(null)}
      />

      <FileViewerDialog
        file={viewingFile}
        onClose={() => setViewingFile(null)}
        onSaveText={handleSaveTextFile}
        onDownloadFile={handleDownloadFileCopy}
      />

      <UpdateModal
        open={updateModalOpen}
        currentVersion={settings.currentVersionName}
        newVersion={LATEST_VERSION_NAME}
        scenario={settings.updateScenario}
        onClose={() => setUpdateModalOpen(false)}
        onSaveApkToPublicDownloads={handleSaveApkToPublicDownloads}
        onInstallCompleted={handleInstallCompleted}
      />

      {/* Lightweight Toast */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium shadow-lg whitespace-nowrap"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
