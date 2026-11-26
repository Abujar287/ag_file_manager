import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ClipboardPaste,
  Copy,
  FileArchive,
  FolderOpen,
  Info,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Scissors,
  Share2,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import {
  CategoryType,
  ClipboardState,
  FileNode,
  SortBy,
  SortOrder,
  ViewMode,
} from '../types/fileManager';
import {
  INTERNAL_SYSTEM_RESERVED_BYTES,
  INTERNAL_TOTAL_BYTES,
  SD_TOTAL_BYTES,
} from '../data/initialFileSystem';
import {
  buildChildrenMap,
  ChildrenMap,
  computeFolderStatsFromMap,
  formatBytes,
  formatDateTime,
  getExtension,
  getFolderVisualMetaFromMap,
  getNodePath,
  sortFileNodes,
} from '../utils/formatters';
import { FileIcon } from './FileIcon';
import { DeviceStorageStats } from '../services/deviceStorageService';

interface FileBrowserProps {
  mode: 'folder' | 'category' | 'search';
  folderId?: string;
  category?: CategoryType;
  searchQuery?: string;
  files: FileNode[];
  storageStats?: DeviceStorageStats | null;
  showHidden: boolean;
  showThumbnails: boolean;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  clipboard: ClipboardState | null;
  onBackHome?: () => void;
  onOpenFolder: (folderId: string) => void;
  onOpenFile: (file: FileNode, contextList?: FileNode[]) => void;
  onCopy: (ids: string[]) => void;
  onCut: (ids: string[]) => void;
  onPaste: (targetFolderId: string) => void;
  onCancelClipboard: () => void;
  onDelete: (ids: string[], permanent?: boolean) => void;
  onRestore: (ids: string[]) => void;
  onEmptyRecycleBin: () => void;
  onRenameRequest: (ids: string[]) => void;
  onShare: (ids: string[]) => void;
  onToggleFavourite: (ids: string[]) => void;
  onCompressZip: (ids: string[]) => void;
  onShowProperties: (nodes: FileNode[]) => void;
}

const CATEGORY_TITLES: Record<CategoryType, string> = {
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

interface RowProps {
  node: FileNode;
  selected: boolean;
  isSelecting: boolean;
  viewMode: ViewMode;
  showThumbnails: boolean;
  childrenMap: ChildrenMap;
  isMediaGallery?: boolean;
  onPointerDown: (id: string, e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onCancelLongPress: () => void;
  onContextSelect: (id: string, e: React.MouseEvent) => void;
  onRowClick: (node: FileNode) => void;
  onToggleDot: (id: string, e: React.MouseEvent) => void;
}

const FileBrowserRow = memo<RowProps>(
  ({
    node,
    selected,
    isSelecting,
    viewMode,
    showThumbnails,
    childrenMap,
    isMediaGallery = false,
    onPointerDown,
    onPointerMove,
    onCancelLongPress,
    onContextSelect,
    onRowClick,
    onToggleDot,
  }) => {
    const folderStats =
      node.kind === 'folder' ? computeFolderStatsFromMap(node.id, childrenMap) : null;
    const folderMeta =
      node.kind === 'folder' ? getFolderVisualMetaFromMap(node, childrenMap) : undefined;

    if (viewMode === 'grid') {
      const isMedia = node.kind === 'image' || node.kind === 'video';
      if (isMediaGallery && isMedia) {
        return (
          <div
            onPointerDown={(e) => onPointerDown(node.id, e)}
            onPointerMove={onPointerMove}
            onPointerUp={onCancelLongPress}
            onPointerLeave={onCancelLongPress}
            onPointerCancel={onCancelLongPress}
            onContextMenu={(e) => onContextSelect(node.id, e)}
            onClick={() => onRowClick(node)}
            className={`cv-tile group relative aspect-square rounded-xl overflow-hidden cursor-pointer select-none bg-slate-200 dark:bg-slate-800 border transition-transform duration-100 ${
              selected
                ? 'border-blue-600 ring-2 ring-blue-500/70 scale-[0.97]'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <FileIcon
              node={node}
              showThumbnails={showThumbnails}
              size="fill"
              folderMeta={folderMeta}
            />

            {/* Bottom gradient caption with file name & size */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-2 pt-5 pb-1.5 pointer-events-none">
              <div className="text-[11px] font-medium text-white truncate leading-tight">
                {node.name}
              </div>
              <div className="text-[10px] text-white/80 tabular-nums">
                {formatBytes(node.size)}
              </div>
            </div>

            {node.favourite && (
              <span className="absolute top-1.5 left-1.5 p-1 rounded-full bg-black/45 text-amber-400 pointer-events-none">
                <Star size={11} className="fill-amber-400" />
              </span>
            )}

            <button
              type="button"
              onClick={(e) => onToggleDot(node.id, e)}
              aria-label={`Select ${node.name}`}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center"
            >
              {selected ? (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : isSelecting ? (
                <span className="w-5 h-5 rounded-full border-2 border-white bg-black/35 shadow-sm" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full border border-white/80 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>
        );
      }

      return (
        <div
          onPointerDown={(e) => onPointerDown(node.id, e)}
          onPointerMove={onPointerMove}
          onPointerUp={onCancelLongPress}
          onPointerLeave={onCancelLongPress}
          onPointerCancel={onCancelLongPress}
          onContextMenu={(e) => onContextSelect(node.id, e)}
          onClick={() => onRowClick(node)}
          className={`cv-tile rounded-2xl border cursor-pointer select-none overflow-hidden flex flex-col ${
            selected
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 ring-1 ring-blue-500/40'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
          }`}
        >
          <div className="relative aspect-square w-full bg-slate-100/70 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden">
            {isMedia ? (
              <FileIcon
                node={node}
                showThumbnails={showThumbnails}
                size="fill"
                folderMeta={folderMeta}
              />
            ) : (
              <FileIcon
                node={node}
                showThumbnails={showThumbnails}
                size="lg"
                folderMeta={folderMeta}
              />
            )}

            <button
              type="button"
              onClick={(e) => onToggleDot(node.id, e)}
              aria-label={`Select ${node.name}`}
              className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
            >
              {selected ? (
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Check size={12} strokeWidth={3} />
                </span>
              ) : isSelecting ? (
                <span className="w-5 h-5 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-900/80" />
              ) : null}
            </button>
          </div>

          <div className="p-2.5 min-w-0">
            <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
              {node.name}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5 truncate">
              {node.kind === 'folder' && folderStats
                ? `${folderStats.itemCount} items · ${formatBytes(folderStats.totalSize)}`
                : formatBytes(node.size)}
            </div>
          </div>
        </div>
      );
    }

    if (viewMode === 'detail') {
      const ext = node.kind === 'folder' ? 'FOLDER' : (getExtension(node.name) || node.kind).toUpperCase();
      return (
        <div
          onPointerDown={(e) => onPointerDown(node.id, e)}
          onPointerMove={onPointerMove}
          onPointerUp={onCancelLongPress}
          onPointerLeave={onCancelLongPress}
          onPointerCancel={onCancelLongPress}
          onContextMenu={(e) => onContextSelect(node.id, e)}
          onClick={() => onRowClick(node)}
          className={`cv-row px-4 sm:px-6 py-2 flex items-center gap-3 cursor-pointer select-none ${
            selected
              ? 'bg-blue-50/90 dark:bg-blue-950/40'
              : 'hover:bg-white/70 dark:hover:bg-slate-900/60'
          }`}
        >
          <FileIcon
            node={node}
            showThumbnails={showThumbnails}
            size="sm"
            folderMeta={folderMeta}
          />
          <div className="flex-1 min-w-0 grid grid-cols-12 items-center gap-2">
            <div className="col-span-6 sm:col-span-5 flex items-center gap-1.5 min-w-0">
              <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {node.name}
              </span>
              {node.favourite && (
                <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />
              )}
            </div>
            <div className="hidden sm:block sm:col-span-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
              {ext}
            </div>
            <div className="col-span-3 sm:col-span-2 text-xs text-slate-600 dark:text-slate-300 tabular-nums text-right truncate">
              {node.kind === 'folder' && folderStats
                ? `${folderStats.itemCount} items`
                : formatBytes(node.size)}
            </div>
            <div className="col-span-3 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums text-right truncate">
              {formatDateTime(node.modifiedAt)}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => onToggleDot(node.id, e)}
            aria-label={`Select ${node.name}`}
            className="min-w-[28px] min-h-[28px] flex items-center justify-center shrink-0"
          >
            {selected ? (
              <span className="w-4.5 h-4.5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <Check size={11} strokeWidth={3} />
              </span>
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-blue-500 transition-colors" />
            )}
          </button>
        </div>
      );
    }

    return (
      <div
        onPointerDown={(e) => onPointerDown(node.id, e)}
        onPointerMove={onPointerMove}
        onPointerUp={onCancelLongPress}
        onPointerLeave={onCancelLongPress}
        onPointerCancel={onCancelLongPress}
        onContextMenu={(e) => onContextSelect(node.id, e)}
        onClick={() => onRowClick(node)}
        className={`cv-row min-h-[64px] px-4 sm:px-6 py-2.5 flex items-center gap-3.5 cursor-pointer select-none ${
          selected
            ? 'bg-blue-50/90 dark:bg-blue-950/40'
            : 'hover:bg-white/70 dark:hover:bg-slate-900/60'
        }`}
      >
        <FileIcon
          node={node}
          showThumbnails={showThumbnails}
          folderMeta={folderMeta}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-medium text-slate-900 dark:text-slate-100 break-words leading-snug">
              {node.name}
            </span>
            {node.favourite && (
              <Star
                size={13}
                className="text-amber-500 fill-amber-500 shrink-0"
                aria-label="Favourite"
              />
            )}
          </div>

          <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <div className="flex items-center gap-4 min-w-0">
              {node.kind === 'folder' && folderStats ? (
                <>
                  <span className="whitespace-nowrap">
                    {folderStats.itemCount}{' '}
                    {folderStats.itemCount === 1 ? 'item' : 'items'}
                  </span>
                  <span className="whitespace-nowrap">
                    {formatBytes(folderStats.totalSize)}
                  </span>
                </>
              ) : (
                <span className="whitespace-nowrap">{formatBytes(node.size)}</span>
              )}
            </div>
            <span className="whitespace-nowrap shrink-0 text-right">
              {formatDateTime(node.modifiedAt)}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => onToggleDot(node.id, e)}
          aria-label={`Select ${node.name}`}
          className="min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
        >
          {selected ? (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Check size={12} strokeWidth={3} />
            </span>
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-blue-500 transition-colors" />
          )}
        </button>
      </div>
    );
  }
);

FileBrowserRow.displayName = 'FileBrowserRow';

export const FileBrowser: React.FC<FileBrowserProps> = memo(({
  mode,
  folderId,
  category,
  searchQuery = '',
  files,
  storageStats,
  showHidden,
  showThumbnails,
  viewMode,
  sortBy,
  sortOrder,
  clipboard,
  onOpenFolder,
  onOpenFile,
  onCopy,
  onCut,
  onPaste,
  onCancelClipboard,
  onDelete,
  onRestore,
  onEmptyRecycleBin,
  onRenameRequest,
  onShare,
  onToggleFavourite,
  onCompressZip,
  onShowProperties,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  selectedIdsRef.current = selectedIds;
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(40);
  const isMediaCategory =
    mode === 'category' && (category === 'images' || category === 'videos');
  const [galleryViewOverride, setGalleryViewOverride] = useState<'grid' | 'list' | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSelectedIds([]);
    setMoreMenuOpen(false);
    setVisibleLimit(40);
    setGalleryViewOverride(null);
  }, [mode, folderId, category]);

  const effectiveViewMode: ViewMode = isMediaCategory
    ? galleryViewOverride ?? 'grid'
    : viewMode;

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [moreMenuOpen]);

  const childrenMap = useMemo(() => buildChildrenMap(files, showHidden), [files, showHidden]);

  const sortedItems = useMemo(() => {
    let items: FileNode[] = [];
    if (mode === 'folder' && folderId) {
      items = files.filter(
        (n) => n.parentId === folderId && !n.trashed && (showHidden || !n.hidden)
      );
    } else if (mode === 'category' && category) {
      if (category === 'recycle_bin') {
        items = files.filter((n) => n.trashed);
      } else {
        const now = Date.now();
        const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
        items = files.filter((n) => {
          if (n.trashed || n.kind === 'folder') return false;
          if (!showHidden && n.hidden) return false;
          switch (category) {
            case 'images':
              return n.kind === 'image';
            case 'videos':
              return n.kind === 'video';
            case 'audio':
              return n.kind === 'audio';
            case 'apps':
            case 'apk_files':
              return n.kind === 'apk';
            case 'new_files':
              return n.modifiedAt >= sevenDaysAgo;
            case 'compressed':
              return n.kind === 'archive';
            case 'documents':
              return n.kind === 'document' || n.kind === 'text';
            default:
              return false;
          }
        });
      }
    } else if (mode === 'search') {
      const q = searchQuery.trim().toLowerCase();
      items = files.filter(
        (n) =>
          !n.trashed &&
          n.parentId !== null &&
          (showHidden || !n.hidden) &&
          (!q || n.name.toLowerCase().includes(q))
      );
    }

    return sortFileNodes(items, sortBy, sortOrder, files, showHidden, childrenMap);
  }, [mode, folderId, category, searchQuery, files, showHidden, sortBy, sortOrder, childrenMap]);

  // Progressive incremental rendering to eliminate initial render frame drops on huge directories
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleLimit >= sortedItems.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleLimit((prev) => Math.min(sortedItems.length, prev + 60));
        }
      },
      { rootMargin: '450px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visibleLimit, sortedItems.length]);

  const renderedItems = useMemo(
    () => sortedItems.slice(0, visibleLimit),
    [sortedItems, visibleLimit]
  );

  const isSelecting = selectedIds.length > 0;
  const isRecycleBin = mode === 'category' && category === 'recycle_bin';

  const { freePercent, folderAncestors } = useMemo(() => {
    const currentPath =
      mode === 'folder' && folderId ? getNodePath(folderId, files) : '/storage/emulated/0';
    const isSdCard = currentPath.startsWith('/storage/sdcard1');

    const byId = new Map(files.map((n) => [n.id, n]));
    const liveVolume = isSdCard ? storageStats?.external : storageStats?.internal;

    let totalBytes: number;
    let usedBytes: number;

    if (liveVolume?.totalBytes && liveVolume.totalBytes > 0) {
      totalBytes = liveVolume.totalBytes;
      usedBytes = liveVolume.usedBytes;
    } else {
      let volumeFilesBytes = 0;
      for (const n of files) {
        if (n.kind === 'folder') continue;
        let curr: string | null | undefined = n.parentId;
        let underSd = false;
        let guard = 0;
        while (curr && guard < 30) {
          if (curr === 'sd_root') {
            underSd = true;
            break;
          }
          curr = byId.get(curr)?.parentId;
          guard++;
        }
        if (isSdCard ? underSd : !underSd) {
          volumeFilesBytes += n.size;
        }
      }
      totalBytes = isSdCard ? SD_TOTAL_BYTES : INTERNAL_TOTAL_BYTES;
      usedBytes = Math.min(
        totalBytes,
        (isSdCard ? 0 : INTERNAL_SYSTEM_RESERVED_BYTES) + volumeFilesBytes
      );
    }

    const freePct = Math.max(0, Math.round(((totalBytes - usedBytes) / totalBytes) * 100));

    const ancestors: { id: string; label: string }[] = [];
    if (mode === 'folder' && folderId) {
      let curr = byId.get(folderId);
      while (curr) {
        ancestors.unshift({ id: curr.id, label: curr.name });
        curr = curr.parentId ? byId.get(curr.parentId) : undefined;
      }
    }

    return { freePercent: freePct, folderAncestors: ancestors };
  }, [mode, folderId, files, storageStats]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
  }, []);

  const handlePointerDown = useCallback(
    (id: string, e: React.PointerEvent) => {
      longPressTriggeredRef.current = false;
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      window.getSelection()?.removeAllRanges();
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        window.getSelection()?.removeAllRanges();
        setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }, 420);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStartRef.current || longPressTimerRef.current === null) return;
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      if (dx > 10 || dy > 10) {
        cancelLongPress();
      }
    },
    [cancelLongPress]
  );

  const handleContextSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.getSelection()?.removeAllRanges();
    if (longPressTriggeredRef.current) {
      return;
    }
    longPressTriggeredRef.current = true;
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const sortedItemsRef = useRef<FileNode[]>(sortedItems);
  sortedItemsRef.current = sortedItems;

  const handleRowClick = useCallback(
    (node: FileNode) => {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }
      if (selectedIdsRef.current.length > 0) {
        toggleSelect(node.id);
        return;
      }
      if (node.kind === 'folder') {
        onOpenFolder(node.id);
      } else {
        onOpenFile(node, sortedItemsRef.current);
      }
    },
    [toggleSelect, onOpenFolder, onOpenFile]
  );

  const handleToggleDot = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      toggleSelect(id);
    },
    [toggleSelect]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedNodes = useMemo(
    () => files.filter((n) => selectedSet.has(n.id)),
    [files, selectedSet]
  );

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Compact Path / Category Context Strip */}
      {mode === 'folder' && folderId ? (
        <div className="px-3 sm:px-6 py-1.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <nav
            className="flex items-center gap-0.5 overflow-x-auto text-xs sm:text-sm text-slate-600 dark:text-slate-300 min-w-0 flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Current path"
          >
            {folderAncestors.map((seg, idx) => (
              <React.Fragment key={seg.id}>
                {idx > 0 && (
                  <span className="text-slate-400 dark:text-slate-500 select-none shrink-0 px-0.5">
                    /
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onOpenFolder(seg.id)}
                  className={`px-1.5 py-1 rounded-lg whitespace-nowrap transition-colors ${
                    idx === folderAncestors.length - 1
                      ? 'font-semibold text-slate-900 dark:text-slate-100'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {seg.label}
                </button>
              </React.Fragment>
            ))}
          </nav>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tabular-nums shrink-0 whitespace-nowrap">
            {freePercent}% free
          </span>
        </div>
      ) : (
        <div className="px-4 sm:px-6 pt-2.5 pb-0.5 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate tabular-nums">
            {mode === 'search'
              ? searchQuery
                ? `"${searchQuery}" · ${sortedItems.length} result${sortedItems.length === 1 ? '' : 's'}`
                : `All Files · ${sortedItems.length}`
              : `${category ? CATEGORY_TITLES[category] : 'Files'} · ${sortedItems.length}`}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            {isMediaCategory && !isSelecting && (
              <button
                type="button"
                onClick={() =>
                  setGalleryViewOverride(effectiveViewMode === 'grid' ? 'list' : 'grid')
                }
                className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={effectiveViewMode === 'grid' ? 'Switch to list view' : 'Switch to gallery view'}
                title={effectiveViewMode === 'grid' ? 'List View' : 'Gallery View'}
              >
                {effectiveViewMode === 'grid' ? <ListIcon size={15} /> : <LayoutGrid size={15} />}
              </button>
            )}
            {isRecycleBin && sortedItems.length > 0 && !isSelecting && (
              <button
                type="button"
                onClick={onEmptyRecycleBin}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70"
              >
                Empty Bin
              </button>
            )}
          </div>
        </div>
      )}

      {/* Multi-Select Header Banner */}
      {isSelecting && (
        <div className="mx-4 sm:mx-6 mt-3 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-1 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              aria-label="Clear selection"
            >
              <X size={17} />
            </button>
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100 tabular-nums">
              {selectedIds.length} selected
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedIds(
                selectedIds.length === sortedItems.length ? [] : sortedItems.map((i) => i.id)
              )
            }
            className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline px-2 py-1"
          >
            {selectedIds.length === sortedItems.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {sortedItems.length === 0 ? (
        <div className="mx-4 sm:mx-6 mt-6 py-16 px-4 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <FolderOpen size={36} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isRecycleBin ? 'Recycle Bin is empty' : 'No files or folders here'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'search'
              ? 'Try searching a different filename or extension.'
              : 'Use the top-right 3-dot menu to create a new folder or file.'}
          </p>
        </div>
      ) : effectiveViewMode === 'grid' ? (
        <div
          className={
            isMediaCategory
              ? 'px-2.5 sm:px-6 pt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 sm:gap-2.5'
              : 'px-4 sm:px-6 pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'
          }
        >
          {renderedItems.map((node) => (
            <FileBrowserRow
              key={node.id}
              node={node}
              selected={selectedSet.has(node.id)}
              isSelecting={isSelecting}
              viewMode="grid"
              showThumbnails={showThumbnails}
              childrenMap={childrenMap}
              isMediaGallery={isMediaCategory}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onCancelLongPress={cancelLongPress}
              onContextSelect={handleContextSelect}
              onRowClick={handleRowClick}
              onToggleDot={handleToggleDot}
            />
          ))}
        </div>
      ) : effectiveViewMode === 'detail' ? (
        <div>
          <div className="px-4 sm:px-6 py-2 bg-slate-100/70 dark:bg-slate-900/70 border-b border-slate-200/70 dark:border-slate-800 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <div className="w-9 shrink-0" />
            <div className="flex-1 grid grid-cols-12 gap-2">
              <div className="col-span-6 sm:col-span-5">Name</div>
              <div className="hidden sm:block sm:col-span-2">Type</div>
              <div className="col-span-3 sm:col-span-2 text-right">Size</div>
              <div className="col-span-3 text-right">Modified</div>
            </div>
            <div className="w-7 shrink-0" />
          </div>
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
            {renderedItems.map((node) => (
              <FileBrowserRow
                key={node.id}
                node={node}
                selected={selectedSet.has(node.id)}
                isSelecting={isSelecting}
                viewMode="detail"
                showThumbnails={showThumbnails}
                childrenMap={childrenMap}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onCancelLongPress={cancelLongPress}
                onContextSelect={handleContextSelect}
                onRowClick={handleRowClick}
                onToggleDot={handleToggleDot}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80">
          {renderedItems.map((node) => (
            <FileBrowserRow
              key={node.id}
              node={node}
              selected={selectedSet.has(node.id)}
              isSelecting={isSelecting}
              viewMode="list"
              showThumbnails={showThumbnails}
              childrenMap={childrenMap}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onCancelLongPress={cancelLongPress}
              onContextSelect={handleContextSelect}
              onRowClick={handleRowClick}
              onToggleDot={handleToggleDot}
            />
          ))}
        </div>
      )}

      {visibleLimit < sortedItems.length && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-slate-400">
          Loading more items...
        </div>
      )}

      {/* Paste Bar */}
      {clipboard && mode === 'folder' && folderId && !isSelecting && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-xs sm:text-sm truncate">
            {clipboard.mode === 'copy' ? 'Copied' : 'Moving'} {clipboard.itemIds.length}{' '}
            {clipboard.itemIds.length === 1 ? 'item' : 'items'}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCancelClipboard}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onPaste(folderId)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5"
            >
              <ClipboardPaste size={14} />
              <span>Paste Here</span>
            </button>
          </div>
        </div>
      )}

      {/* Multi-Select Bottom Toolbar */}
      {isSelecting && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="max-w-3xl mx-auto px-2 py-2 flex items-center justify-around gap-1">
            {isRecycleBin ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onRestore(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  <RotateCcw size={18} />
                  <span>Restore</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(selectedIds, true);
                    setSelectedIds([]);
                  }}
                  className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  <Trash2 size={18} />
                  <span>Delete Forever</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onCopy(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  <Copy size={18} />
                  <span>Copy</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCut(selectedIds);
                    setSelectedIds([]);
                  }}
                  className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  <Scissors size={18} />
                  <span>Cut</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onDelete(selectedIds, false);
                    setSelectedIds([]);
                  }}
                  className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  <Trash2 size={18} />
                  <span>Delete</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRenameRequest(selectedIds)}
                  className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  <Pencil size={18} />
                  <span>Rename</span>
                </button>

                <div className="relative flex-1" ref={moreMenuRef}>
                  <button
                    type="button"
                    onClick={() => setMoreMenuOpen((p) => !p)}
                    className="w-full min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                  >
                    <MoreHorizontal size={18} />
                    <span>More</span>
                  </button>

                  {moreMenuOpen && (
                    <div className="absolute bottom-14 right-0 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 text-sm">
                      <button
                        type="button"
                        onClick={() => {
                          onShare(selectedIds);
                          setMoreMenuOpen(false);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Share2 size={16} />
                        <span>Share</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleFavourite(selectedIds);
                          setMoreMenuOpen(false);
                          setSelectedIds([]);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Star size={16} />
                        <span>Add to Favourite</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onCompressZip(selectedIds);
                          setMoreMenuOpen(false);
                          setSelectedIds([]);
                        }}
                        className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <FileArchive size={16} />
                        <span>Compress (ZIP)</span>
                      </button>
                      {selectedNodes.length >= 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            onShowProperties(selectedNodes);
                            setMoreMenuOpen(false);
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Info size={16} />
                          <span>Properties</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
