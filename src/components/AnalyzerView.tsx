import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FolderInput,
  Info,
  MoreHorizontal,
  Pencil,
  Scissors,
  Share2,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { AnalyzerToolType, FileNode, SortBy, SortOrder } from '../types/fileManager';
import { formatBytes, formatDateTime, sortFileNodes } from '../utils/formatters';
import { FileIcon } from './FileIcon';

interface AnalyzerViewProps {
  tool: AnalyzerToolType;
  files: FileNode[];
  nativeEmptyFolders?: FileNode[];
  emptyFoldersLoading?: boolean;
  showThumbnails: boolean;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  onBackHome?: () => void;
  onSelectTool?: (tool: AnalyzerToolType) => void;
  onRefreshEmptyFolders?: () => void;
  onOpenFolder: (folderId: string) => void;
  onOpenFile: (file: FileNode, contextList?: FileNode[]) => void;
  onDeleteFiles: (ids: string[]) => void;
  onCopyFiles: (ids: string[]) => void;
  onCutFiles: (ids: string[]) => void;
  onMoveFiles: (ids: string[]) => void;
  onRenameRequest: (ids: string[]) => void;
  onShare: (ids: string[]) => void;
  onShowProperties: (nodes: FileNode[]) => void;
  onCleanEmptyFolders: (ids: string[]) => void;
  onClearAppCache: (ids: string[]) => void;
}

export const ANALYZER_TABS: { id: AnalyzerToolType; label: string }[] = [
  { id: 'file_analyzer', label: 'File Analyzer' },
  { id: 'large_files', label: 'Large Files' },
  { id: 'recent_files', label: 'Recent Files' },
  { id: 'empty_folders', label: 'Empty Folders' },
  { id: 'app_cache', label: 'Apps Cache' },
  { id: 'duplicate_files', label: 'Duplicate Files' },
];

interface SelectableRowProps {
  node: FileNode;
  files: FileNode[];
  selected: boolean;
  isSelecting: boolean;
  showThumbnails: boolean;
  subtitle: string;
  rightText?: string;
  onPrimaryClick: (node: FileNode) => void;
  onToggleSelect: (id: string) => void;
  onMoveSingle: (id: string) => void;
  onDeleteSingle: (id: string) => void;
}

const AnalyzerFileRow: React.FC<SelectableRowProps> = memo(({
  node,
  selected,
  isSelecting,
  showThumbnails,
  subtitle,
  rightText,
  onPrimaryClick,
  onToggleSelect,
  onMoveSingle,
  onDeleteSingle,
}) => {
  return (
    <div
      onClick={() => (isSelecting ? onToggleSelect(node.id) : onPrimaryClick(node))}
      className={`cv-row px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none min-w-0 ${
        selected
          ? 'bg-blue-50/90 dark:bg-blue-950/40'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <FileIcon node={node} showThumbnails={showThumbnails} size="md" />

      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className="text-[13px] sm:text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 [overflow-wrap:anywhere]"
          title={node.name}
        >
          {node.name}
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-1.5 min-w-0">
          <div className="min-w-0 flex-1 flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums overflow-hidden">
            {rightText && (
              <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0 whitespace-nowrap">
                {rightText}
              </span>
            )}
            {rightText && subtitle && <span className="shrink-0">·</span>}
            <span className="truncate min-w-0">{subtitle}</span>
          </div>

          {!isSelecting && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveSingle(node.id);
                }}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                aria-label={`Move ${node.name}`}
                title="Move"
              >
                <FolderInput size={14} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSingle(node.id);
                }}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                aria-label={`Delete ${node.name}`}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(node.id);
        }}
        aria-label={`Select ${node.name}`}
        className="min-w-[28px] min-h-[28px] flex items-center justify-center shrink-0"
      >
        {selected ? (
          <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
            <Check size={12} strokeWidth={3} />
          </span>
        ) : (
          <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-blue-500 transition-colors" />
        )}
      </button>
    </div>
  );
});

AnalyzerFileRow.displayName = 'AnalyzerFileRow';

export const AnalyzerView: React.FC<AnalyzerViewProps> = memo(({
  tool,
  files,
  nativeEmptyFolders,
  emptyFoldersLoading = false,
  showThumbnails,
  sortBy = 'name',
  sortOrder = 'asc',
  onSelectTool,
  onRefreshEmptyFolders,
  onOpenFolder,
  onOpenFile,
  onDeleteFiles,
  onCopyFiles,
  onCutFiles,
  onMoveFiles,
  onRenameRequest,
  onShare,
  onShowProperties,
  onCleanEmptyFolders,
  onClearAppCache,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [visibleLimit, setVisibleLimit] = useState(40);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const activeTabBtnRef = useRef<HTMLButtonElement>(null);
  const swipePaneRef = useRef<HTMLDivElement>(null);
  const tabSwipeRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lastDx: number;
  } | null>(null);

  useEffect(() => {
    setSelectedIds([]);
    setMoreMenuOpen(false);
    setExpandedGroup(null);
    setVisibleLimit(40);
    activeTabBtnRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [tool]);

  const getCachedPath = useMemo(() => {
    const byId = new Map(files.map((n) => [n.id, n]));
    const pathCache = new Map<string, string>();
    return (nodeId: string): string => {
      const hit = pathCache.get(nodeId);
      if (hit !== undefined) return hit;
      const direct = byId.get(nodeId);
      if (direct?.realPath) {
        pathCache.set(nodeId, direct.realPath);
        return direct.realPath;
      }
      const parts: string[] = [];
      let curr = direct;
      let guard = 0;
      while (curr && guard < 40) {
        guard++;
        if (curr.id === 'internal_root') {
          parts.unshift('/storage/emulated/0');
          break;
        }
        if (curr.id === 'sd_root') {
          parts.unshift('/storage/sdcard1');
          break;
        }
        parts.unshift(curr.name);
        curr = curr.parentId ? byId.get(curr.parentId) : undefined;
      }
      const resolved = parts.join('/') || '/storage/emulated/0';
      pathCache.set(nodeId, resolved);
      return resolved;
    };
  }, [files]);

  // Prune any IDs that were deleted/moved out of active set
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.length === 0) return prev;
      const existing = new Set(files.filter((f) => !f.trashed).map((f) => f.id));
      if (nativeEmptyFolders) {
        nativeEmptyFolders.forEach((f) => existing.add(f.id));
      }
      const next = prev.filter((id) => existing.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [files, nativeEmptyFolders]);

  const {
    breakdownGroups,
    totalAnalyzedBytes,
    largeFiles,
    recentFiles,
    emptyFolders,
    cacheFiles,
    totalCacheBytes,
    duplicateGroups,
  } = useMemo(() => {
    const activeFiles = files.filter((n) => !n.trashed);
    const nonFolderFiles = activeFiles.filter((n) => n.kind !== 'folder');

    const videoList: FileNode[] = [];
    const archiveList: FileNode[] = [];
    const imageList: FileNode[] = [];
    const audioList: FileNode[] = [];
    const apkList: FileNode[] = [];
    const docList: FileNode[] = [];

    let videoBytes = 0;
    let archiveBytes = 0;
    let imageBytes = 0;
    let audioBytes = 0;
    let apkBytes = 0;
    let docBytes = 0;

    const large: FileNode[] = [];
    const cache: FileNode[] = [];
    let cacheBytesSum = 0;
    const hashGroups = new Map<string, FileNode[]>();
    const nonEmptyParentIds = new Set<string>();

    for (let i = 0; i < activeFiles.length; i++) {
      const n = activeFiles[i];
      if (n.parentId) nonEmptyParentIds.add(n.parentId);
      if (n.isAppCache) {
        cache.push(n);
        cacheBytesSum += n.size;
      }
      if (n.kind === 'folder') continue;

      switch (n.kind) {
        case 'video':
          videoBytes += n.size;
          videoList.push(n);
          break;
        case 'archive':
        case 'other':
          archiveBytes += n.size;
          archiveList.push(n);
          break;
        case 'image':
          imageBytes += n.size;
          imageList.push(n);
          break;
        case 'audio':
          audioBytes += n.size;
          audioList.push(n);
          break;
        case 'apk':
          apkBytes += n.size;
          apkList.push(n);
          break;
        case 'document':
        case 'text':
          docBytes += n.size;
          docList.push(n);
          break;
      }

      if (n.size >= 50 * 1024 * 1024) large.push(n);
      if (n.hash) {
        const arr = hashGroups.get(n.hash) || [];
        arr.push(n);
        hashGroups.set(n.hash, arr);
      }
    }

    const sortList = (list: FileNode[]) =>
      sortFileNodes(list, sortBy, sortOrder, files, true);

    const groups = [
      { id: 'videos', label: 'Videos', color: 'bg-rose-500', bytes: videoBytes, items: sortList(videoList) },
      {
        id: 'archives',
        label: 'Archives & Other',
        color: 'bg-orange-500',
        bytes: archiveBytes,
        items: sortList(archiveList),
      },
      { id: 'images', label: 'Images', color: 'bg-emerald-500', bytes: imageBytes, items: sortList(imageList) },
      { id: 'audio', label: 'Audio', color: 'bg-violet-500', bytes: audioBytes, items: sortList(audioList) },
      { id: 'apk', label: 'APK Files', color: 'bg-teal-500', bytes: apkBytes, items: sortList(apkList) },
      {
        id: 'docs',
        label: 'Documents & Text',
        color: 'bg-blue-500',
        bytes: docBytes,
        items: sortList(docList),
      },
    ];
    const totalAnalyzed = groups.reduce((acc, g) => acc + g.bytes, 0);

    const sortedLarge = sortList(large);
    const recent = sortList(
      [...nonFolderFiles].sort((a, b) => b.modifiedAt - a.modifiedAt).slice(0, 40)
    );
    const empty = sortList(
      nativeEmptyFolders
        ? nativeEmptyFolders.filter((n) => !n.trashed)
        : activeFiles.filter(
            (n) =>
              n.kind === 'folder' &&
              n.parentId !== null &&
              !n.hidden &&
              !nonEmptyParentIds.has(n.id)
          )
    );
    const sortedCache = sortList(cache);
    const dups = Array.from(hashGroups.values())
      .filter((g) => g.length > 1)
      .map((g) => sortList(g));

    return {
      breakdownGroups: groups,
      totalAnalyzedBytes: totalAnalyzed,
      largeFiles: sortedLarge,
      recentFiles: recent,
      emptyFolders: empty,
      cacheFiles: sortedCache,
      totalCacheBytes: cacheBytesSum,
      duplicateGroups: dups,
    };
  }, [files, nativeEmptyFolders, sortBy, sortOrder]);

  useEffect(() => {
    const targetCount =
      tool === 'large_files'
        ? largeFiles.length
        : tool === 'recent_files'
          ? recentFiles.length
          : 0;
    if (visibleLimit >= targetCount) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleLimit((prev) => Math.min(prev + 60, targetCount));
        }
      },
      { rootMargin: '400px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [tool, visibleLimit, largeFiles.length, recentFiles.length]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }, []);

  const visibleSelectableIds = useMemo(() => {
    if (tool === 'large_files') return largeFiles.map((f) => f.id);
    if (tool === 'recent_files') return recentFiles.map((f) => f.id);
    if (tool === 'empty_folders') return emptyFolders.map((f) => f.id);
    if (tool === 'app_cache') return cacheFiles.map((f) => f.id);
    if (tool === 'duplicate_files') return duplicateGroups.flat().map((f) => f.id);
    if (tool === 'file_analyzer' && expandedGroup) {
      const grp = breakdownGroups.find((g) => g.id === expandedGroup);
      return grp ? grp.items.map((f) => f.id) : [];
    }
    return [];
  }, [
    tool,
    largeFiles,
    recentFiles,
    emptyFolders,
    cacheFiles,
    duplicateGroups,
    breakdownGroups,
    expandedGroup,
  ]);

  const isSelecting = selectedIds.length > 0;
  const allVisibleSelected =
    visibleSelectableIds.length > 0 &&
    visibleSelectableIds.every((id) => selectedIds.includes(id));

  const selectedNodes = useMemo(() => {
    const pool = tool === 'empty_folders' && nativeEmptyFolders ? nativeEmptyFolders : files;
    return pool.filter((f) => selectedIds.includes(f.id));
  }, [tool, nativeEmptyFolders, files, selectedIds]);

  const activeTabIndex = ANALYZER_TABS.findIndex((t) => t.id === tool);

  const resetPaneTransform = useCallback((animated: boolean) => {
    const el = swipePaneRef.current;
    if (!el) return;
    el.style.transition = animated ? 'transform 160ms cubic-bezier(0.22, 1, 0.36, 1)' : '';
    el.style.transform = 'translate3d(0px, 0px, 0px)';
  }, []);

  const handlePaneTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1 || !onSelectTool) {
      tabSwipeRef.current = null;
      return;
    }
    const touch = e.touches[0];
    if (touch.clientX <= 30 || touch.clientX >= window.innerWidth - 30) {
      tabSwipeRef.current = null;
      return;
    }
    tabSwipeRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      lastDx: 0,
    };
    const el = swipePaneRef.current;
    if (el) el.style.transition = '';
  }, [onSelectTool]);

  const handlePaneTouchMove = useCallback(
    (e: React.TouchEvent) => {
      const state = tabSwipeRef.current;
      if (!state || !state.active || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - state.startX;
      const dy = e.touches[0].clientY - state.startY;
      if (Math.abs(dy) > 22 && Math.abs(dy) > Math.abs(dx) * 0.9) {
        tabSwipeRef.current = null;
        resetPaneTransform(true);
        return;
      }
      const canGoNext = dx < -8 && activeTabIndex < ANALYZER_TABS.length - 1;
      const canGoPrev = dx > 8 && activeTabIndex > 0;
      if ((canGoNext || canGoPrev) && Math.abs(dx) > Math.abs(dy) * 1.1) {
        e.stopPropagation();
        const clamped = Math.max(-120, Math.min(120, dx));
        state.lastDx = clamped;
        const el = swipePaneRef.current;
        if (el) {
          el.style.transform = `translate3d(${clamped * 0.25}px, 0px, 0px)`;
        }
      }
    },
    [activeTabIndex, resetPaneTransform]
  );

  const handlePaneTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const state = tabSwipeRef.current;
      tabSwipeRef.current = null;
      resetPaneTransform(true);
      if (!state || !state.active || !onSelectTool) return;
      if (Math.abs(state.lastDx) > 8) {
        e.stopPropagation();
      }
      if (state.lastDx <= -56 && activeTabIndex < ANALYZER_TABS.length - 1) {
        onSelectTool(ANALYZER_TABS[activeTabIndex + 1].id);
      } else if (state.lastDx >= 56 && activeTabIndex > 0) {
        onSelectTool(ANALYZER_TABS[activeTabIndex - 1].id);
      }
    },
    [activeTabIndex, onSelectTool, resetPaneTransform]
  );

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 pt-2.5 sm:pt-3 pb-24 space-y-2.5 sm:space-y-3 overflow-x-hidden">
      {/* Compact Horizontal Scrollable Tab Bar + Inline Select All */}
      <div className="flex items-center gap-2 min-w-0">
        <div
          role="tablist"
          aria-label="File Analyzer sections"
          className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {ANALYZER_TABS.map((tab) => {
            const isActive = tool === tab.id;
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabBtnRef : undefined}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelectTool?.(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {visibleSelectableIds.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setSelectedIds(allVisibleSelected ? [] : visibleSelectableIds)
            }
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0 whitespace-nowrap"
          >
            {allVisibleSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Selection Banner */}
      {isSelecting && (
        <div className="px-3.5 sm:px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-2 text-xs sm:text-sm">
          <span className="font-semibold text-blue-700 dark:text-blue-300 tabular-nums truncate">
            {selectedIds.length} selected
          </span>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-[11px] sm:text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1 shrink-0 whitespace-nowrap"
          >
            <X size={13} /> Clear
          </button>
        </div>
      )}

      {/* Swipeable Analyzer Tab Content */}
      <div
        ref={swipePaneRef}
        data-analyzer-pane="true"
        onTouchStart={handlePaneTouchStart}
        onTouchMove={handlePaneTouchMove}
        onTouchEnd={handlePaneTouchEnd}
        onTouchCancel={handlePaneTouchEnd}
        className="space-y-3 sm:space-y-4 min-h-[260px]"
        style={{ touchAction: 'pan-y' }}
      >

      {/* Tool Body: File Analyzer (Expandable Categories) */}
      {tool === 'file_analyzer' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 space-y-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <BarChart3 size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                Storage Distribution
              </h3>
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums shrink-0 whitespace-nowrap">
              {formatBytes(totalAnalyzedBytes)} indexed
            </span>
          </div>

          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
            {breakdownGroups.map((g) => {
              const pct = totalAnalyzedBytes > 0 ? (g.bytes / totalAnalyzedBytes) * 100 : 0;
              if (pct <= 0) return null;
              return (
                <div
                  key={g.id}
                  className={`${g.color} h-full`}
                  style={{ width: `${pct}%` }}
                  title={`${g.label}: ${formatBytes(g.bytes)}`}
                />
              );
            })}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {breakdownGroups.map((g) => {
              const pct = totalAnalyzedBytes > 0 ? (g.bytes / totalAnalyzedBytes) * 100 : 0;
              const isOpen = expandedGroup === g.id;
              return (
                <div key={g.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedGroup((prev) => (prev === g.id ? null : g.id));
                      setSelectedIds([]);
                    }}
                    className="w-full py-3 flex items-center justify-between gap-2 text-xs sm:text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1.5 sm:px-2 rounded-xl transition-colors min-w-0"
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                      <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-sm shrink-0 ${g.color}`} />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {g.label}
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums shrink-0">
                        ({g.items.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="tabular-nums text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatBytes(g.bytes)} · {pct.toFixed(1)}%
                      </span>
                      {isOpen ? (
                        <ChevronDown size={15} className="text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight size={15} className="text-slate-400 shrink-0" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50/40 dark:bg-slate-950/30">
                      {g.items.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500">
                          No files in {g.label}.
                        </div>
                      ) : (
                        g.items.slice(0, 80).map((file) => (
                          <AnalyzerFileRow
                            key={file.id}
                            node={file}
                            files={files}
                            selected={selectedIds.includes(file.id)}
                            isSelecting={isSelecting}
                            showThumbnails={showThumbnails}
                            subtitle={getCachedPath(file.parentId || 'internal_root')}
                            rightText={formatBytes(file.size)}
                            onPrimaryClick={(item) => onOpenFile(item, g.items)}
                            onToggleSelect={toggleSelect}
                            onMoveSingle={(id) => onMoveFiles([id])}
                            onDeleteSingle={(id) => onDeleteFiles([id])}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tool Body: Large Files */}
      {tool === 'large_files' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {largeFiles.length === 0 ? (
            <div className="p-10 text-center text-xs sm:text-sm text-slate-500">
              No files larger than 50 MB found.
            </div>
          ) : (
            <>
              {largeFiles.slice(0, visibleLimit).map((file) => (
                <AnalyzerFileRow
                  key={file.id}
                  node={file}
                  files={files}
                  selected={selectedIds.includes(file.id)}
                  isSelecting={isSelecting}
                  showThumbnails={showThumbnails}
                  subtitle={getCachedPath(file.parentId || 'internal_root')}
                  rightText={formatBytes(file.size)}
                  onPrimaryClick={(item) => onOpenFile(item, largeFiles)}
                  onToggleSelect={toggleSelect}
                  onMoveSingle={(id) => onMoveFiles([id])}
                  onDeleteSingle={(id) => onDeleteFiles([id])}
                />
              ))}
              {visibleLimit < largeFiles.length && (
                <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
                  Loading more...
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tool Body: Recent Files */}
      {tool === 'recent_files' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {recentFiles.length === 0 ? (
            <div className="p-10 text-center text-xs sm:text-sm text-slate-500">
              No recent files indexed yet.
            </div>
          ) : (
            <>
              {recentFiles.slice(0, visibleLimit).map((file) => (
                <AnalyzerFileRow
                  key={file.id}
                  node={file}
                  files={files}
                  selected={selectedIds.includes(file.id)}
                  isSelecting={isSelecting}
                  showThumbnails={showThumbnails}
                  subtitle={`${formatBytes(file.size)} · ${formatDateTime(file.modifiedAt)}`}
                  onPrimaryClick={(item) => onOpenFile(item, recentFiles)}
                  onToggleSelect={toggleSelect}
                  onMoveSingle={(id) => onMoveFiles([id])}
                  onDeleteSingle={(id) => onDeleteFiles([id])}
                />
              ))}
              {visibleLimit < recentFiles.length && (
                <div ref={sentinelRef} className="py-4 text-center text-xs text-slate-400">
                  Loading more...
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Tool Body: Empty Folders */}
      {tool === 'empty_folders' && (
        <div className="space-y-3">
          {(emptyFolders.length > 0 || onRefreshEmptyFolders) && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {onRefreshEmptyFolders && (
                <button
                  type="button"
                  onClick={onRefreshEmptyFolders}
                  className="min-h-[36px] sm:min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
                >
                  Scan Again
                </button>
              )}
              {emptyFolders.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCleanEmptyFolders(emptyFolders.map((f) => f.id))}
                  className="min-h-[36px] sm:min-h-[40px] px-3 sm:px-4 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap"
                >
                  Remove All Empty Folders ({emptyFolders.length})
                </button>
              )}
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {emptyFoldersLoading && emptyFolders.length === 0 ? (
              <div className="p-10 text-center space-y-2.5">
                <div className="w-6 h-6 mx-auto rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                <p className="text-xs sm:text-sm text-slate-500">Scanning storage for empty folders...</p>
              </div>
            ) : emptyFolders.length === 0 ? (
              <div className="p-10 text-center text-xs sm:text-sm text-slate-500">
                No empty folders detected. Storage is clean.
              </div>
            ) : (
              emptyFolders.map((folder) => (
                <AnalyzerFileRow
                  key={folder.id}
                  node={folder}
                  files={files}
                  selected={selectedIds.includes(folder.id)}
                  isSelecting={isSelecting}
                  showThumbnails={false}
                  subtitle={folder.realPath || getCachedPath(folder.id)}
                  onPrimaryClick={(node) => onOpenFolder(node.id)}
                  onToggleSelect={toggleSelect}
                  onMoveSingle={(id) => onMoveFiles([id])}
                  onDeleteSingle={(id) => onCleanEmptyFolders([id])}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Tool Body: App Cache */}
      {tool === 'app_cache' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 sm:p-5 space-y-4 overflow-hidden">
          <div className="flex items-center justify-between gap-2.5 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Zap size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Cached App Data
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums truncate">
                  {formatBytes(totalCacheBytes)} · {cacheFiles.length} cache files
                </p>
              </div>
            </div>
            {cacheFiles.length > 0 && (
              <button
                type="button"
                onClick={() => onClearAppCache(cacheFiles.map((f) => f.id))}
                className="min-h-[36px] sm:min-h-[40px] px-3 sm:px-4 py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shrink-0 whitespace-nowrap"
              >
                Clear Cache
              </button>
            )}
          </div>

          {cacheFiles.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-500 py-4 text-center">
              All temporary app caches are cleared.
            </p>
          ) : (
            <div className="-mx-3.5 sm:-mx-5 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {cacheFiles.map((c) => (
                <AnalyzerFileRow
                  key={c.id}
                  node={c}
                  files={files}
                  selected={selectedIds.includes(c.id)}
                  isSelecting={isSelecting}
                  showThumbnails={showThumbnails}
                  subtitle={getCachedPath(c.parentId || 'internal_root')}
                  rightText={formatBytes(c.size)}
                  onPrimaryClick={(item) => onOpenFile(item, cacheFiles)}
                  onToggleSelect={toggleSelect}
                  onMoveSingle={(id) => onMoveFiles([id])}
                  onDeleteSingle={(id) => onClearAppCache([id])}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tool Body: Duplicate Files */}
      {tool === 'duplicate_files' && (
        <div className="space-y-4">
          {duplicateGroups.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-xs sm:text-sm text-slate-500">
              No duplicate files found.
            </div>
          ) : (
            duplicateGroups.map((group, idx) => (
              <div
                key={group[0].hash || idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
              >
                <div className="px-3 sm:px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] sm:text-xs min-w-0">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 min-w-0 truncate">
                    <Copy size={13} className="shrink-0" />
                    <span className="truncate">
                      Group {idx + 1} · {formatBytes(group[0].size)} each
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteFiles(group.slice(1).map((g) => g.id))}
                    className="font-semibold text-rose-600 dark:text-rose-400 hover:underline shrink-0 whitespace-nowrap"
                  >
                    Keep First
                  </button>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {group.map((item) => (
                    <AnalyzerFileRow
                      key={item.id}
                      node={item}
                      files={files}
                      selected={selectedIds.includes(item.id)}
                      isSelecting={isSelecting}
                      showThumbnails={showThumbnails}
                      subtitle={getCachedPath(item.parentId || 'internal_root')}
                      onPrimaryClick={(item) => onOpenFile(item, duplicateGroups.flat())}
                      onToggleSelect={toggleSelect}
                      onMoveSingle={(id) => onMoveFiles([id])}
                      onDeleteSingle={(id) => onDeleteFiles([id])}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </div>

      {/* Fixed Bottom Action Bar when selecting */}
      {isSelecting && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="max-w-5xl mx-auto px-2 py-2 flex items-center justify-around">
            <button
              type="button"
              onClick={() => {
                onMoveFiles(selectedIds);
                setSelectedIds([]);
              }}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
            >
              <FolderInput size={18} />
              <span className="text-[11px] font-medium">Move</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCopyFiles(selectedIds);
                setSelectedIds([]);
              }}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Copy size={18} />
              <span className="text-[11px] font-medium">Copy</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onCutFiles(selectedIds);
                setSelectedIds([]);
              }}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Scissors size={18} />
              <span className="text-[11px] font-medium">Cut</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (tool === 'empty_folders') {
                  onCleanEmptyFolders(selectedIds);
                } else if (tool === 'app_cache') {
                  onClearAppCache(selectedIds);
                } else {
                  onDeleteFiles(selectedIds);
                }
                setSelectedIds([]);
              }}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 size={18} />
              <span className="text-[11px] font-medium">Delete</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreMenuOpen((prev) => !prev)}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <MoreHorizontal size={18} />
                <span className="text-[11px] font-medium">More</span>
              </button>

              {moreMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMoreMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 bottom-14 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-20 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        onRenameRequest(selectedIds);
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Pencil size={16} />
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        onShare(selectedIds);
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Share2 size={16} />
                      <span>Share</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        onShowProperties(selectedNodes);
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Info size={16} />
                      <span>Properties</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

AnalyzerView.displayName = 'AnalyzerView';
