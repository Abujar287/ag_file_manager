import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  Edit3,
  ExternalLink,
  File as FileGlyph,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Maximize2,
  MemoryStick,
  Minimize2,
  Music,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Share2,
  Trash2,
  Volume2,
  VolumeX,
  WrapText,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FileNode } from '../types/fileManager';
import {
  computeMultiSelectionStats,
  formatBytes,
  formatDateTime,
  getExtension,
  getNodePath,
} from '../utils/formatters';
import { getNativeBridge, isRunningInAndroidApp } from '../services/deviceStorageService';
import { FileIcon } from './FileIcon';

interface NewItemDialogProps {
  type: 'folder' | 'text' | 'file' | null;
  files: FileNode[];
  defaultParentId: string;
  sdCardMounted: boolean;
  onBrowseFolder?: (folderId: string) => void;
  onCancel: () => void;
  onCreate: (name: string, type: 'folder' | 'text' | 'file', targetParentId: string) => void;
}

export const NewItemDialog: React.FC<NewItemDialogProps> = ({
  type,
  files,
  defaultParentId,
  sdCardMounted,
  onBrowseFolder,
  onCancel,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string>(defaultParentId);
  const [pathPickerOpen, setPathPickerOpen] = useState(false);

  useEffect(() => {
    if (type === 'folder') setName('New Folder');
    else if (type === 'text') setName('note.txt');
    else if (type === 'file') setName('untitled.dat');
    if (type) {
      setSelectedParentId(defaultParentId || 'internal_root');
      setPathPickerOpen(false);
    }
  }, [type, defaultParentId]);

  const byId = useMemo(() => new Map(files.map((n) => [n.id, n])), [files]);

  const ancestors = useMemo(() => {
    const list: FileNode[] = [];
    let curr = byId.get(selectedParentId);
    let guard = 0;
    while (curr && guard < 30) {
      list.unshift(curr);
      curr = curr.parentId ? byId.get(curr.parentId) : undefined;
      guard++;
    }
    return list;
  }, [byId, selectedParentId]);

  const childFolders = useMemo(() => {
    return files
      .filter((n) => n.kind === 'folder' && !n.trashed && n.parentId === selectedParentId)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [files, selectedParentId]);

  if (!type) return null;

  const title =
    type === 'folder' ? 'New Folder' : type === 'text' ? 'New Text File' : 'New File';
  const currentPath = getNodePath(selectedParentId, files);

  const selectFolder = (folderId: string) => {
    setSelectedParentId(folderId);
    onBrowseFolder?.(folderId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 sm:p-6 space-y-4 max-h-[88vh] flex flex-col">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onCreate(name.trim(), type, selectedParentId);
          }}
          className="space-y-4 flex-1 min-h-0 flex flex-col"
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
              Name
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="space-y-2 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Save Location
              </span>
              <button
                type="button"
                onClick={() => {
                  const next = !pathPickerOpen;
                  setPathPickerOpen(next);
                  if (next) onBrowseFolder?.(selectedParentId);
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <FolderOpen size={13} />
                <span>{pathPickerOpen ? 'Hide Path Picker' : 'Choose Path'}</span>
              </button>
            </div>

            <div className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                {currentPath}
              </span>
            </div>

            {pathPickerOpen && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-56 bg-white dark:bg-slate-950">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectFolder('internal_root')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                      !currentPath.startsWith('/storage/sdcard1')
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <HardDrive size={12} />
                    <span>Internal</span>
                  </button>
                  {sdCardMounted && (
                    <button
                      type="button"
                      onClick={() => selectFolder('sd_root')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                        currentPath.startsWith('/storage/sdcard1')
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <MemoryStick size={12} />
                      <span>External</span>
                    </button>
                  )}
                </div>

                {ancestors.length > 0 && (
                  <div className="px-3 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto text-[11px]">
                    {ancestors.map((seg, idx) => (
                      <React.Fragment key={seg.id}>
                        {idx > 0 && <ChevronRight size={12} className="text-slate-400 shrink-0" />}
                        <button
                          type="button"
                          onClick={() => selectFolder(seg.id)}
                          className={`px-1 py-0.5 rounded whitespace-nowrap ${
                            idx === ancestors.length - 1
                              ? 'font-semibold text-blue-600 dark:text-blue-400'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {seg.name}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                )}

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                  {childFolders.length === 0 ? (
                    <div className="py-5 px-3 text-center text-xs text-slate-500 dark:text-slate-400">
                      No subfolders here. Item will be created in this folder.
                    </div>
                  ) : (
                    childFolders.map((folder) => (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => selectFolder(folder.id)}
                        className="w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-900"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Folder size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {folder.name}
                          </span>
                        </div>
                        <ChevronRight size={14} className="text-slate-400 shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PropertiesDialogProps {
  nodes: FileNode[] | null;
  allNodes: FileNode[];
  onClose: () => void;
}

export const PropertiesDialog: React.FC<PropertiesDialogProps> = ({
  nodes,
  allNodes,
  onClose,
}) => {
  const [calculating, setCalculating] = useState(false);
  const [stats, setStats] = useState<{
    totalBytes: number;
    fileCount: number;
    folderCount: number;
  }>({ totalBytes: 0, fileCount: 0, folderCount: 0 });

  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    // Immediate in-memory calculation first
    const localStats = computeMultiSelectionStats(nodes, allNodes, true);
    setStats(localStats);

    const bridge = getNativeBridge();
    const realPaths = nodes
      .map((n) => n.realPath)
      .filter((p): p is string => Boolean(p));

    if (
      isRunningInAndroidApp() &&
      bridge &&
      typeof bridge.calculatePropertiesAsync === 'function' &&
      realPaths.length > 0
    ) {
      const reqId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setCalculating(true);

      const handleResult = (ev: Event) => {
        const detail = (ev as CustomEvent).detail as {
          requestId?: string;
          totalBytes?: number;
          fileCount?: number;
          folderCount?: number;
        };
        if (!detail || detail.requestId !== reqId) return;
        setStats({
          totalBytes: Number(detail.totalBytes) || 0,
          fileCount: Number(detail.fileCount) || 0,
          folderCount: Number(detail.folderCount) || 0,
        });
        setCalculating(false);
      };

      window.addEventListener('android_properties_result', handleResult);
      try {
        bridge.calculatePropertiesAsync(reqId, JSON.stringify(realPaths));
      } catch {
        setCalculating(false);
      }

      return () => {
        window.removeEventListener('android_properties_result', handleResult);
      };
    } else {
      setCalculating(false);
    }
  }, [nodes, allNodes]);

  if (!nodes || nodes.length === 0) return null;

  const isSingle = nodes.length === 1;
  const singleNode = nodes[0];
  const hasFolders = nodes.some((n) => n.kind === 'folder');
  const hasFiles = nodes.some((n) => n.kind !== 'folder');
  const typeSummary = isSingle
    ? singleNode.kind
    : hasFolders && hasFiles
      ? 'Mixed (Folders & Files)'
      : hasFolders
        ? 'Folders'
        : 'Files';

  const pathLabel = isSingle
    ? getNodePath(singleNode.id, allNodes)
    : `${nodes.length} selected in ${
        singleNode.parentId ? getNodePath(singleNode.parentId, allNodes) : 'Storage'
      }`;

  const latestModified = nodes.reduce(
    (max, n) => (n.modifiedAt > max ? n.modifiedAt : max),
    nodes[0].modifiedAt
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {isSingle ? 'Properties' : `Properties (${nodes.length} items)`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close properties"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Name</span>
            <span className="font-medium text-slate-900 dark:text-slate-100 text-right break-all">
              {isSingle ? singleNode.name : `${nodes.length} items selected`}
            </span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Type</span>
            <span className="text-slate-900 dark:text-slate-100 capitalize">{typeSummary}</span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Contains</span>
            <span className="tabular-nums text-slate-900 dark:text-slate-100">
              {calculating ? (
                <span className="text-blue-600 dark:text-blue-400">Calculating...</span>
              ) : (
                `${stats.folderCount} ${stats.folderCount === 1 ? 'folder' : 'folders'}, ${stats.fileCount} ${stats.fileCount === 1 ? 'file' : 'files'}`
              )}
            </span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Location</span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 text-right break-all">
              {pathLabel}
            </span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Total Size</span>
            <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100 text-right">
              {calculating ? (
                <span className="text-blue-600 dark:text-blue-400 font-normal">Scanning...</span>
              ) : (
                <>
                  {formatBytes(stats.totalBytes, 2)}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({stats.totalBytes.toLocaleString()} B)
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">
              {isSingle ? 'Modified' : 'Latest Modified'}
            </span>
            <span className="tabular-nums text-slate-900 dark:text-slate-100">
              {formatDateTime(latestModified)}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface FileViewerDialogProps {
  file: FileNode | null;
  galleryFiles?: FileNode[];
  onSelectFile?: (file: FileNode) => void;
  onClose: () => void;
  onSaveText: (id: string, content: string) => void;
  onDownloadFile: (file: FileNode) => void;
  onOpenExternal?: (file: FileNode) => void;
  onShareFile?: (file: FileNode) => void;
  onDeleteFile?: (file: FileNode) => void;
}

export const FileViewerDialog: React.FC<FileViewerDialogProps> = ({
  file,
  galleryFiles,
  onSelectFile,
  onClose,
  onSaveText,
  onDownloadFile,
  onOpenExternal,
  onShareFile,
  onDeleteFile,
}) => {
  const [textDraft, setTextDraft] = useState('');
  const [textEditMode, setTextEditMode] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);

  // Image zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const imgElRef = useRef<HTMLImageElement>(null);
  const swipeStageRef = useRef<HTMLDivElement>(null);
  const liveTransformRef = useRef<{ x: number; y: number; zoom: number }>({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const swipeNavRef = useRef<{ active: boolean; startX: number; startY: number; dx: number }>({
    active: false,
    startX: 0,
    startY: 0,
    dx: 0,
  });
  const pinchDistRef = useRef<number | null>(null);
  const pinchBaseZoomRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);

  // Video player state & refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoStageContainerRef = useRef<HTMLDivElement>(null);
  const activeVideoThumbRef = useRef<HTMLButtonElement | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(true);
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoSeeking, setVideoSeeking] = useState(false);
  const [videoSeekPreview, setVideoSeekPreview] = useState<number | null>(null);
  const [videoPlaybackRate, setVideoPlaybackRate] = useState(1);
  const [videoFullscreen, setVideoFullscreen] = useState(false);

  const [brightness, setBrightness] = useState<number>(100);
  const [videoVolume, setVideoVolume] = useState<number>(1);
  const [videoGestureNotice, setVideoGestureNotice] = useState<string | null>(null);
  const videoTouchStateRef = useRef<{
    startX: number;
    startY: number;
    mode: 'none' | 'horizontal' | 'vertical_left' | 'vertical_right';
    baseBrightness: number;
    baseVolume: number;
  }>({ startX: 0, startY: 0, mode: 'none', baseBrightness: 100, baseVolume: 1 });

  const handleVideoTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    videoTouchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      mode: 'none',
      baseBrightness: brightness,
      baseVolume: videoRef.current ? videoRef.current.volume : videoVolume,
    };
  };

  const handleVideoTouchMove = (e: React.TouchEvent) => {
    const state = videoTouchStateRef.current;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;

    if (state.mode === 'none') {
      if (Math.abs(dx) > 18 && Math.abs(dx) > Math.abs(dy) * 1.1) {
        state.mode = 'horizontal';
      } else if (Math.abs(dy) > 18 && Math.abs(dy) > Math.abs(dx)) {
        const isLeft = state.startX < window.innerWidth / 2;
        state.mode = isLeft ? 'vertical_left' : 'vertical_right';
      }
    }

    if (state.mode === 'vertical_left') {
      const delta = -dy;
      const nextB = Math.min(200, Math.max(20, state.baseBrightness + Math.round(delta * 0.4)));
      setBrightness(nextB);
      setVideoGestureNotice(`Brightness: ${nextB}%`);
    } else if (state.mode === 'vertical_right') {
      const delta = -dy;
      const nextV = Math.min(1, Math.max(0, state.baseVolume + delta * 0.005));
      setVideoVolume(nextV);
      if (videoRef.current) videoRef.current.volume = nextV;
      setVideoGestureNotice(`Volume: ${Math.round(nextV * 100)}%`);
    }
  };

  const handleVideoTouchEnd = (e: React.TouchEvent) => {
    const state = videoTouchStateRef.current;
    if (state.mode === 'horizontal') {
      const touch = e.changedTouches[0];
      const dx = touch ? touch.clientX - state.startX : 0;
      if (dx <= -45) {
        goNextMedia();
      } else if (dx >= 45) {
        goPrevMedia();
      }
    }
    state.mode = 'none';
    setTimeout(() => setVideoGestureNotice(null), 1400);
  };

  // Built-in PDF reader state
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfPageIndex, setPdfPageIndex] = useState(0);
  const [pdfPageDataUrl, setPdfPageDataUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(1);

  const isPdf = Boolean(file && file.name.toLowerCase().endsWith('.pdf'));

  const mediaSiblings = useMemo(() => {
    if (!file) return [];
    const list = (galleryFiles || []).filter(
      (n) => !n.trashed && (n.kind === 'image' || n.kind === 'video')
    );
    if (list.length === 0) return [file];
    if (!list.some((n) => n.id === file.id)) return [file, ...list];
    return list;
  }, [file, galleryFiles]);

  const videoSiblings = useMemo(() => {
    if (!file || file.kind !== 'video') return [];
    const vids = mediaSiblings.filter((n) => n.kind === 'video');
    if (vids.length > 1) return vids;
    return mediaSiblings;
  }, [file, mediaSiblings]);

  const activeNavList = file?.kind === 'video' ? videoSiblings : mediaSiblings;

  const currentMediaIndex = useMemo(() => {
    if (!file) return -1;
    return activeNavList.findIndex((n) => n.id === file.id);
  }, [file, activeNavList]);

  const goPrevMedia = () => {
    if (!onSelectFile || activeNavList.length <= 1 || currentMediaIndex <= 0) return;
    onSelectFile(activeNavList[currentMediaIndex - 1]);
  };

  const goNextMedia = () => {
    if (
      !onSelectFile ||
      activeNavList.length <= 1 ||
      currentMediaIndex < 0 ||
      currentMediaIndex >= activeNavList.length - 1
    ) {
      return;
    }
    onSelectFile(activeNavList[currentMediaIndex + 1]);
  };

  const visibleFilmstrip = useMemo(() => {
    if (activeNavList.length <= 1) return [];
    const idx = currentMediaIndex >= 0 ? currentMediaIndex : 0;
    const start = Math.max(0, idx - 6);
    const end = Math.min(activeNavList.length, idx + 18);
    return activeNavList.slice(start, end);
  }, [activeNavList, currentMediaIndex]);

  useEffect(() => {
    setTextDraft(file?.content || '');
    setTextEditMode(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    liveTransformRef.current = { x: 0, y: 0, zoom: 1 };
    if (swipeStageRef.current) {
      swipeStageRef.current.style.transform = '';
    }
    setShowOverlay(true);
    setVideoPlaying(true);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setVideoSeeking(false);
    setVideoSeekPreview(null);
    setPdfPageCount(0);
    setPdfPageIndex(0);
    setPdfPageDataUrl(null);
    setPdfZoom(1);
  }, [file]);

  useEffect(() => {
    const onFsChange = () => {
      setVideoFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (file?.kind === 'video' && activeVideoThumbRef.current) {
      activeVideoThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [file?.id, file?.kind]);

  // Silently preload adjacent images for instant zero-flicker gallery swipes
  useEffect(() => {
    if (!file || currentMediaIndex < 0) return;
    const neighbors = [
      mediaSiblings[currentMediaIndex - 1],
      mediaSiblings[currentMediaIndex + 1],
    ];
    for (const n of neighbors) {
      if (!n || n.kind !== 'image') continue;
      const src =
        n.mediaUrl ||
        (n.realPath ? `file://${encodeURI(n.realPath).replace(/#/g, '%23')}` : undefined);
      if (src) {
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
      }
    }
  }, [file, currentMediaIndex, mediaSiblings]);

  // Keyboard navigation in Gallery Viewer
  useEffect(() => {
    if (!file || (file.kind !== 'image' && file.kind !== 'video')) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrevMedia();
      else if (e.key === 'ArrowRight') goNextMedia();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Load PDF page count and initial page on Android via PdfRenderer
  useEffect(() => {
    if (!file || !isPdf || !file.realPath) return;
    const bridge = getNativeBridge();
    if (!bridge || typeof bridge.getPdfPageCount !== 'function') return;

    try {
      const count = bridge.getPdfPageCount(file.realPath);
      setPdfPageCount(count);
    } catch {
      setPdfPageCount(0);
    }
  }, [file, isPdf]);

  useEffect(() => {
    if (!file || !isPdf || !file.realPath || pdfPageCount <= 0) return;
    const bridge = getNativeBridge();
    if (!bridge || typeof bridge.renderPdfPageAsync !== 'function') return;

    const reqId = `pdf_${Date.now()}_${pdfPageIndex}`;
    setPdfLoading(true);

    const onPdfPage = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        requestId?: string;
        dataUrl?: string;
      };
      if (!detail || detail.requestId !== reqId) return;
      setPdfPageDataUrl(detail.dataUrl || null);
      setPdfLoading(false);
    };

    window.addEventListener('android_pdf_page_result', onPdfPage);
    try {
      bridge.renderPdfPageAsync(reqId, file.realPath, pdfPageIndex);
    } catch {
      setPdfLoading(false);
    }

    return () => {
      window.removeEventListener('android_pdf_page_result', onPdfPage);
    };
  }, [file, isPdf, pdfPageCount, pdfPageIndex]);

  if (!file) return null;

  const isImage = file.kind === 'image';
  const isVideo = file.kind === 'video';
  const isAudio = file.kind === 'audio';
  const isText = file.kind === 'text';

  const mediaSrc =
    file.mediaUrl ||
    file.thumbnailUrl ||
    (file.realPath ? `file://${encodeURI(file.realPath).replace(/#/g, '%23')}` : undefined);

  const clampZoom = (z: number) => Math.min(5, Math.max(1, Number(z.toFixed(2))));

  const applyDirectImageTransform = (x: number, y: number, z: number) => {
    liveTransformRef.current = { x, y, zoom: z };
    const el = imgElRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${z})`;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
      pinchBaseZoomRef.current = liveTransformRef.current.zoom || zoom;
      dragRef.current.active = false;
      swipeNavRef.current.active = false;
      if (swipeStageRef.current) swipeStageRef.current.style.transform = '';
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (isImage && now - lastTapRef.current < 280) {
        if (zoom > 1.1) {
          liveTransformRef.current = { x: 0, y: 0, zoom: 1 };
          setZoom(1);
          setPan({ x: 0, y: 0 });
        } else {
          liveTransformRef.current = { x: 0, y: 0, zoom: 2.4 };
          setZoom(2.4);
        }
        lastTapRef.current = 0;
        swipeNavRef.current.active = false;
        return;
      }
      lastTapRef.current = now;
      if (isImage && zoom > 1) {
        dragRef.current = {
          active: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          origX: pan.x,
          origY: pan.y,
        };
        swipeNavRef.current.active = false;
      } else {
        swipeNavRef.current = {
          active: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          dx: 0,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isImage && e.touches.length === 2 && pinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const nextZoom = clampZoom(pinchBaseZoomRef.current * (dist / pinchDistRef.current));
      const nx = nextZoom === 1 ? 0 : liveTransformRef.current.x;
      const ny = nextZoom === 1 ? 0 : liveTransformRef.current.y;
      applyDirectImageTransform(nx, ny, nextZoom);
    } else if (isImage && e.touches.length === 1 && dragRef.current.active && liveTransformRef.current.zoom > 1) {
      const nx = dragRef.current.origX + (e.touches[0].clientX - dragRef.current.startX);
      const ny = dragRef.current.origY + (e.touches[0].clientY - dragRef.current.startY);
      applyDirectImageTransform(nx, ny, liveTransformRef.current.zoom);
    } else if (e.touches.length === 1 && swipeNavRef.current.active && liveTransformRef.current.zoom <= 1.05) {
      const dx = e.touches[0].clientX - swipeNavRef.current.startX;
      const dy = e.touches[0].clientY - swipeNavRef.current.startY;
      if (Math.abs(dy) > 36 && Math.abs(dy) > Math.abs(dx)) {
        swipeNavRef.current.active = false;
        if (swipeStageRef.current) swipeStageRef.current.style.transform = '';
      } else {
        swipeNavRef.current.dx = dx;
        if (swipeStageRef.current && mediaSiblings.length > 1) {
          swipeStageRef.current.style.transform = `translate3d(${Math.round(dx * 0.4)}px, 0, 0)`;
        }
      }
    }
  };

  const handleTouchEnd = () => {
    if (pinchDistRef.current !== null || dragRef.current.active) {
      const { x, y, zoom: committedZoom } = liveTransformRef.current;
      if (imgElRef.current) imgElRef.current.style.transition = 'transform 120ms ease-out';
      setZoom(committedZoom);
      setPan({ x, y });
    }
    if (swipeStageRef.current) {
      swipeStageRef.current.style.transform = '';
    }
    if (swipeNavRef.current.active && liveTransformRef.current.zoom <= 1.05) {
      const dx = swipeNavRef.current.dx;
      if (dx <= -55) {
        goNextMedia();
      } else if (dx >= 55) {
        goPrevMedia();
      }
    }
    pinchDistRef.current = null;
    dragRef.current.active = false;
    swipeNavRef.current.active = false;
  };

  const lines = textDraft.split('\n');
  const extLabel = getExtension(file.name).toUpperCase() || file.kind.toUpperCase();

  const formatVideoTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00';
    const whole = Math.floor(secs);
    const hrs = Math.floor(whole / 3600);
    const mins = Math.floor((whole % 3600) / 60);
    const rem = whole % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
    }
    return `${mins}:${String(rem).padStart(2, '0')}`;
  };

  const toggleVideoPlayPause = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused || vid.ended) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  };

  const seekVideoTo = (targetSec: number) => {
    const vid = videoRef.current;
    if (!vid) return;
    const maxSec = Number.isFinite(vid.duration) && vid.duration > 0 ? vid.duration : videoDuration;
    const clamped = Math.max(0, Math.min(maxSec || 0, targetSec));
    vid.currentTime = clamped;
    setVideoCurrentTime(clamped);
  };

  const skipVideoBy = (deltaSec: number) => {
    const vid = videoRef.current;
    const base = vid ? vid.currentTime : videoCurrentTime;
    seekVideoTo(base + deltaSec);
  };

  const toggleVideoMute = () => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setVideoMuted(vid.muted);
  };

  const cycleVideoPlaybackRate = () => {
    const rates = [0.5, 1, 1.25, 1.5, 2];
    const idx = rates.indexOf(videoPlaybackRate);
    const nextRate = rates[(idx + 1) % rates.length];
    setVideoPlaybackRate(nextRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const toggleVideoFullscreen = () => {
    const el = videoStageContainerRef.current || videoRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      el.requestFullscreen?.().catch(() => {
        videoRef.current?.requestFullscreen?.().catch(() => {});
      });
    }
  };

  if (isVideo && mediaSrc) {
    const displayTime = videoSeeking && videoSeekPreview !== null ? videoSeekPreview : videoCurrentTime;
    const effectiveDuration = videoDuration > 0 ? videoDuration : 0;
    const progressPct =
      effectiveDuration > 0 ? Math.min(100, Math.max(0, (displayTime / effectiveDuration) * 100)) : 0;

    return (
      <div
        ref={videoStageContainerRef}
        className="fixed inset-0 z-50 bg-black text-white flex flex-col select-none overflow-hidden"
      >
        {/* Top Compact Video Header */}
        <div className="shrink-0 bg-zinc-950/95 border-b border-white/10 px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2.5 z-20">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white shrink-0"
              aria-label="Back"
            >
              <ArrowLeft size={19} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                {file.name}
              </h2>
              <p className="text-[11px] text-white/70 tabular-nums truncate">
                {activeNavList.length > 1 && currentMediaIndex >= 0
                  ? `${currentMediaIndex + 1} / ${activeNavList.length} · `
                  : ''}
                {formatBytes(file.size)} · {formatDateTime(file.modifiedAt)}
              </p>
            </div>
          </div>

          {onOpenExternal && (
            <button
              type="button"
              onClick={() => onOpenExternal(file)}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/12 hover:bg-white/20 text-white flex items-center gap-1.5 shrink-0"
              title="Open with external player"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Open with</span>
            </button>
          )}
        </div>

        {/* Video Stage with Swipe & Gesture Handlers */}
        <div
          className="relative flex-1 flex items-center justify-center bg-black px-2 py-2 overflow-hidden touch-none"
          onClick={toggleVideoPlayPause}
          onTouchStart={handleVideoTouchStart}
          onTouchMove={handleVideoTouchMove}
          onTouchEnd={handleVideoTouchEnd}
        >
          <video
            ref={videoRef}
            key={file.id}
            src={mediaSrc}
            preload="metadata"
            autoPlay
            playsInline
            muted={videoMuted}
            style={{ filter: `brightness(${brightness}%)` }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (Number.isFinite(v.duration)) setVideoDuration(v.duration);
            }}
            onDurationChange={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setVideoDuration(d);
            }}
            onTimeUpdate={(e) => {
              if (!videoSeeking) {
                setVideoCurrentTime(e.currentTarget.currentTime);
              }
            }}
            onPlay={() => setVideoPlaying(true)}
            onPause={() => setVideoPlaying(false)}
            onEnded={() => setVideoPlaying(false)}
            className="max-w-full max-h-full w-auto h-auto rounded-lg outline-none shadow-2xl object-contain"
          />

          {/* Gesture Notice Popup (Brightness / Volume) */}
          {videoGestureNotice && (
            <div className="absolute inset-0 m-auto w-44 h-16 bg-black/80 border border-white/20 rounded-2xl flex items-center justify-center text-sm font-bold text-white shadow-2xl z-30 pointer-events-none">
              {videoGestureNotice}
            </div>
          )}

          {/* Center Play Overlay when Paused */}
          {!videoPlaying && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleVideoPlayPause();
              }}
              aria-label="Play video"
              className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-black/70 hover:bg-blue-600 border border-white/25 text-white flex items-center justify-center shadow-2xl transition-colors z-20"
            >
              <Play size={26} fill="currentColor" className="ml-0.5" />
            </button>
          )}
        </div>

        {/* Minimal Bottom Controls: Timeline & Play/Pause */}
        <div
          className="shrink-0 bg-zinc-950 border-t border-white/10 px-4 sm:px-6 py-3 space-y-2 z-20"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono tabular-nums text-white/85 min-w-[40px]">
              {formatVideoTime(displayTime)}
            </span>
            <div className="relative flex-1 flex items-center h-6">
              <div className="w-full h-1.5 rounded-full bg-white/20 overflow-hidden pointer-events-none">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={effectiveDuration > 0 ? effectiveDuration : 100}
                step={0.1}
                value={effectiveDuration > 0 ? Math.min(displayTime, effectiveDuration) : 0}
                disabled={effectiveDuration <= 0}
                onPointerDown={() => setVideoSeeking(true)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVideoSeeking(true);
                  setVideoSeekPreview(val);
                  if (videoRef.current && effectiveDuration > 0) {
                    videoRef.current.currentTime = val;
                  }
                }}
                onPointerUp={(e) => {
                  const val = parseFloat((e.target as HTMLInputElement).value);
                  if (effectiveDuration > 0) seekVideoTo(val);
                  setVideoSeeking(false);
                  setVideoSeekPreview(null);
                }}
                onPointerCancel={() => {
                  setVideoSeeking(false);
                  setVideoSeekPreview(null);
                }}
                aria-label="Seek video timeline"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div
                className="w-3.5 h-3.5 rounded-full bg-white border-2 border-blue-500 shadow-md pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-mono tabular-nums text-white/70 min-w-[40px] text-right">
              {formatVideoTime(effectiveDuration)}
            </span>
          </div>

          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={toggleVideoPlayPause}
              className="w-12 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-sm"
              aria-label={videoPlaying ? 'Pause' : 'Play'}
            >
              {videoPlaying ? <Pause size={20} /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Immersive Fullscreen Gallery Viewer for Images
  if (isImage && mediaSrc) {
    const hasPrev = currentMediaIndex > 0;
    const hasNext = currentMediaIndex >= 0 && currentMediaIndex < activeNavList.length - 1;

    return (
      <div className="fixed inset-0 z-50 bg-black text-white flex flex-col select-none">
        {/* Top Gallery Header */}
        <div
          className={`absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/85 via-black/50 to-transparent px-3 sm:px-5 pt-3 pb-6 flex items-center justify-between gap-3 transition-opacity duration-200 ${
            showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white shrink-0"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm sm:text-base font-semibold text-white truncate">
                {file.name}
              </h2>
              <p className="text-[11px] text-white/75 tabular-nums truncate">
                {activeNavList.length > 1 && currentMediaIndex >= 0
                  ? `${currentMediaIndex + 1} / ${activeNavList.length} · `
                  : ''}
                {formatBytes(file.size)} · {formatDateTime(file.modifiedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-full px-2 py-1 mr-1">
              <button
                type="button"
                onClick={() => {
                  const next = clampZoom(zoom - 0.5);
                  setZoom(next);
                  if (next === 1) setPan({ x: 0, y: 0 });
                }}
                disabled={zoom <= 1}
                className="p-1 rounded-full hover:bg-white/15 disabled:opacity-40"
                aria-label="Zoom out"
              >
                <ZoomOut size={15} />
              </button>
              <span className="text-[11px] font-mono tabular-nums min-w-[42px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(clampZoom(zoom + 0.5))}
                disabled={zoom >= 5}
                className="p-1 rounded-full hover:bg-white/15 disabled:opacity-40"
                aria-label="Zoom in"
              >
                <ZoomIn size={15} />
              </button>
              {zoom > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="p-1 rounded-full hover:bg-white/15"
                  aria-label="Reset zoom"
                >
                  <RotateCcw size={14} />
                </button>
              )}
            </div>
            {onOpenExternal && (
              <button
                type="button"
                onClick={() => onOpenExternal(file)}
                className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/12 hover:bg-white/20 text-white flex items-center gap-1.5"
                title="Open with external app"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Open with</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Image Stage */}
        <div
          ref={swipeStageRef}
          className="relative flex-1 flex items-center justify-center overflow-hidden touch-none will-change-transform"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => setShowOverlay((v) => !v)}
        >
          <div
            className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
            onWheel={(e) => {
              e.preventDefault();
              const next = clampZoom(zoom + (e.deltaY < 0 ? 0.25 : -0.25));
              liveTransformRef.current = {
                x: next === 1 ? 0 : pan.x,
                y: next === 1 ? 0 : pan.y,
                zoom: next,
              };
              setZoom(next);
              if (next === 1) setPan({ x: 0, y: 0 });
            }}
            onMouseDown={(e) => {
              if (zoom <= 1) return;
              dragRef.current = {
                active: true,
                startX: e.clientX,
                startY: e.clientY,
                origX: pan.x,
                origY: pan.y,
              };
            }}
            onMouseMove={(e) => {
              if (!dragRef.current.active || zoom <= 1) return;
              const nx = dragRef.current.origX + (e.clientX - dragRef.current.startX);
              const ny = dragRef.current.origY + (e.clientY - dragRef.current.startY);
              applyDirectImageTransform(nx, ny, zoom);
            }}
            onMouseUp={() => {
              if (dragRef.current.active) {
                dragRef.current.active = false;
                setPan({ x: liveTransformRef.current.x, y: liveTransformRef.current.y });
              }
            }}
            onMouseLeave={() => {
              if (dragRef.current.active) {
                dragRef.current.active = false;
                setPan({ x: liveTransformRef.current.x, y: liveTransformRef.current.y });
              }
            }}
          >
            <img
              ref={imgElRef}
              src={mediaSrc}
              alt={file.name}
              draggable={false}
              decoding="async"
              referrerPolicy="no-referrer"
              style={{
                transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                transition: 'transform 120ms ease-out',
              }}
              className="max-w-full max-h-full object-contain pointer-events-none will-change-transform"
            />
          </div>

          {/* Previous / Next Navigation Arrows */}
          {showOverlay && hasPrev && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrevMedia();
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center shadow-lg"
              aria-label="Previous"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {showOverlay && hasNext && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNextMedia();
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-white flex items-center justify-center shadow-lg"
              aria-label="Next"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>

        {/* Bottom Filmstrip & Gallery Action Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent pt-6 pb-3 px-3 sm:px-5 space-y-2.5 transition-opacity duration-200 ${
            showOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {visibleFilmstrip.length > 1 && onSelectFile && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 justify-start sm:justify-center">
              {visibleFilmstrip.map((item) => {
                const isActive = item.id === file.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectFile(item)}
                    className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 border-2 transition-transform duration-100 ${
                      isActive
                        ? 'border-blue-500 scale-105 shadow-md'
                        : 'border-white/20 opacity-65 hover:opacity-100'
                    }`}
                    aria-label={item.name}
                  >
                    <FileIcon node={item} showThumbnails={true} size="fill" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-around max-w-md mx-auto text-xs font-medium">
            {onShareFile && (
              <button
                type="button"
                onClick={() => onShareFile(file)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-white/90 hover:bg-white/10"
              >
                <Share2 size={18} />
                <span>Share</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onDownloadFile(file)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-white/90 hover:bg-white/10"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
            {onOpenExternal && (
              <button
                type="button"
                onClick={() => onOpenExternal(file)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-white/90 hover:bg-white/10"
              >
                <ExternalLink size={18} />
                <span>Open</span>
              </button>
            )}
            {onDeleteFile && (
              <button
                type="button"
                onClick={() => onDeleteFile(file)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-rose-400 hover:bg-rose-500/20"
              >
                <Trash2 size={18} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {file.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {extLabel} · {formatBytes(file.size)} · {formatDateTime(file.modifiedAt)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenExternal && (
              <button
                type="button"
                onClick={() => onOpenExternal(file)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1.5"
                title="Open with external app"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Open with</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
          {isAudio && mediaSrc ? (
            <div className="flex-1 p-8 flex flex-col items-center justify-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Music size={38} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Built-in Audio Player
                </p>
              </div>
              <audio src={mediaSrc} controls autoPlay className="w-full max-w-md" />
            </div>
          ) : isPdf ? (
            <div className="flex-1 flex flex-col min-h-[380px]">
              {pdfPageCount > 0 ? (
                <>
                  <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-slate-200 dark:bg-slate-950">
                    {pdfLoading || !pdfPageDataUrl ? (
                      <div className="py-16 flex flex-col items-center gap-2 text-xs text-slate-500">
                        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                        <span>Rendering PDF page {pdfPageIndex + 1}...</span>
                      </div>
                    ) : (
                      <img
                        src={pdfPageDataUrl}
                        alt={`Page ${pdfPageIndex + 1}`}
                        style={{ width: `${Math.round(pdfZoom * 100)}%` }}
                        className="max-w-none bg-white shadow-lg rounded-md"
                      />
                    )}
                  </div>
                  <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={pdfPageIndex <= 0}
                        onClick={() => setPdfPageIndex((p) => Math.max(0, p - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="px-2 font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        Page {pdfPageIndex + 1} / {pdfPageCount}
                      </span>
                      <button
                        type="button"
                        disabled={pdfPageIndex >= pdfPageCount - 1}
                        onClick={() => setPdfPageIndex((p) => Math.min(pdfPageCount - 1, p + 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        aria-label="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPdfZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Zoom out PDF"
                      >
                        <ZoomOut size={15} />
                      </button>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {Math.round(pdfZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setPdfZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Zoom in PDF"
                      >
                        <ZoomIn size={15} />
                      </button>
                    </div>
                  </div>
                </>
              ) : mediaSrc ? (
                <object
                  data={mediaSrc}
                  type="application/pdf"
                  className="w-full flex-1 min-h-[420px]"
                >
                  <div className="p-10 text-center space-y-3">
                    <FileText size={36} className="mx-auto text-blue-600" />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      PDF Document Ready
                    </p>
                    {onOpenExternal && (
                      <button
                        type="button"
                        onClick={() => onOpenExternal(file)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white"
                      >
                        Open with System PDF Viewer
                      </button>
                    )}
                  </div>
                </object>
              ) : (
                <div className="p-10 text-center space-y-3">
                  <FileText size={36} className="mx-auto text-blue-600" />
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Unable to preview PDF directly in browser.
                  </p>
                </div>
              )}
            </div>
          ) : isText ? (
            <div className="flex-1 flex flex-col min-h-[340px]">
              <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {lines.length} {lines.length === 1 ? 'line' : 'lines'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWordWrap((w) => !w)}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium ${
                      wordWrap
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <WrapText size={13} />
                    <span>Wrap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextEditMode((m) => !m)}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium ${
                      textEditMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {textEditMode ? <Code2 size={13} /> : <Edit3 size={13} />}
                    <span>{textEditMode ? 'Preview' : 'Edit'}</span>
                  </button>
                </div>
              </div>

              {textEditMode ? (
                <textarea
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  className={`flex-1 w-full p-4 bg-slate-50 dark:bg-slate-950 font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none resize-none ${
                    wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                  }`}
                />
              ) : (
                <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 allow-text-select">
                  <pre
                    className={`font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 ${
                      wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                    }`}
                  >
                    {textDraft || '(Empty file)'}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <FileGlyph size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {file.kind === 'apk'
                    ? 'Android Package Archive (.apk)'
                    : `${extLabel} File`}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No built-in preview available for this format. Use &ldquo;Open with&rdquo; to launch in an installed app.
                </p>
              </div>
              {onOpenExternal && (
                <button
                  type="button"
                  onClick={() => onOpenExternal(file)}
                  className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  <span>Open with</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => onDownloadFile(file)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Export Copy
          </button>

          <div className="flex items-center gap-2">
            {onOpenExternal && (
              <button
                type="button"
                onClick={() => onOpenExternal(file)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Open with</span>
              </button>
            )}
            {isText && textEditMode && (
              <button
                type="button"
                onClick={() => {
                  onSaveText(file.id, textDraft);
                  onClose();
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DeleteConfirmDialogProps {
  open: boolean;
  itemCount: number;
  singleItemName?: string;
  permanentOnly?: boolean;
  isEmptyBin?: boolean;
  onCancel: () => void;
  onMoveToBin?: () => void;
  onDeletePermanently: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  itemCount,
  singleItemName,
  permanentOnly = false,
  isEmptyBin = false,
  onCancel,
  onMoveToBin,
  onDeletePermanently,
}) => {
  if (!open) return null;

  const title = isEmptyBin
    ? 'Empty Recycle Bin?'
    : permanentOnly
      ? itemCount === 1 && singleItemName
        ? `Delete "${singleItemName}" permanently?`
        : `Delete ${itemCount} items permanently?`
      : itemCount === 1 && singleItemName
        ? `Delete "${singleItemName}"?`
        : `Delete ${itemCount} items?`;

  const description = isEmptyBin
    ? 'All files in the Recycle Bin will be permanently deleted from your phone storage.'
    : permanentOnly
      ? 'This will permanently delete the selected items from your phone storage and cannot be undone.'
      : 'Move to Recycle Bin to restore later, or delete permanently from your phone storage.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 break-words">
              {title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {!permanentOnly && onMoveToBin && (
            <button
              type="button"
              onClick={onMoveToBin}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Move to Recycle Bin
            </button>
          )}
          <button
            type="button"
            onClick={onDeletePermanently}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isEmptyBin ? 'Empty Recycle Bin' : 'Delete Permanently'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
