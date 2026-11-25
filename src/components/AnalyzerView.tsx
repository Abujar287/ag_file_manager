import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
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
import { AnalyzerToolType, FileNode } from '../types/fileManager';
import { formatBytes, formatDateTime, getNodePath } from '../utils/formatters';
import { FileIcon } from './FileIcon';

interface AnalyzerViewProps {
  tool: AnalyzerToolType;
  files: FileNode[];
  nativeEmptyFolders?: FileNode[];
  emptyFoldersLoading?: boolean;
  showThumbnails: boolean;
  onBackHome: () => void;
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

const TOOL_TITLES: Record<AnalyzerToolType, string> = {
  file_analyzer: 'File Analyzer',
  large_files: 'Large Files',
  recent_files: 'Recent Files',
  empty_folders: 'Empty Folders',
  app_cache: 'App Cache',
  duplicate_files: 'Duplicate Files',
};

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

const AnalyzerFileRow: React.FC<SelectableRowProps> = ({
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
      className={`px-3.5 sm:px-4 py-3 flex items-center gap-3 cursor-pointer select-none transition-colors ${
        selected
          ? 'bg-blue-50/90 dark:bg-blue-950/40'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
      }`}
    >
      <FileIcon node={node} showThumbnails={showThumbnails} size="md" />

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words leading-snug line-clamp-2">
          {node.name}
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {rightText && (
              <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                {rightText}
              </span>
            )}
            {rightText && subtitle && <span className="shrink-0">·</span>}
            <span className="truncate">{subtitle}</span>
          </div>

          {!isSelecting && (
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveSingle(node.id);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                aria-label={`Move ${node.name}`}
                title="Move"
              >
                <FolderInput size={15} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSingle(node.id);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                aria-label={`Delete ${node.name}`}
                title="Delete"
              >
                <Trash2 size={15} />
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
};

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  tool,
  files,
  nativeEmptyFolders,
  emptyFoldersLoading = false,
  showThumbnails,
  onBackHome,
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

  useEffect(() => {
    setSelectedIds([]);
    setMoreMenuOpen(false);
    setExpandedGroup(null);
  }, [tool]);

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

    const bySizeDesc = (a: FileNode, b: FileNode) => b.size - a.size;
    videoList.sort(bySizeDesc);
    archiveList.sort(bySizeDesc);
    imageList.sort(bySizeDesc);
    audioList.sort(bySizeDesc);
    apkList.sort(bySizeDesc);
    docList.sort(bySizeDesc);

    const groups = [
      { id: 'videos', label: 'Videos', color: 'bg-rose-500', bytes: videoBytes, items: videoList },
      {
        id: 'archives',
        label: 'Archives & Other',
        color: 'bg-orange-500',
        bytes: archiveBytes,
        items: archiveList,
      },
      { id: 'images', label: 'Images', color: 'bg-emerald-500', bytes: imageBytes, items: imageList },
      { id: 'audio', label: 'Audio', color: 'bg-violet-500', bytes: audioBytes, items: audioList },
      { id: 'apk', label: 'APK Files', color: 'bg-teal-500', bytes: apkBytes, items: apkList },
      {
        id: 'docs',
        label: 'Documents & Text',
        color: 'bg-blue-500',
        bytes: docBytes,
        items: docList,
      },
    ];
    const totalAnalyzed = groups.reduce((acc, g) => acc + g.bytes, 0);

    large.sort(bySizeDesc);
    const recent = [...nonFolderFiles]
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
      .slice(0, 40);
    const empty = nativeEmptyFolders
      ? nativeEmptyFolders.filter((n) => !n.trashed)
      : activeFiles.filter(
          (n) =>
            n.kind === 'folder' &&
            n.parentId !== null &&
            !n.hidden &&
            !nonEmptyParentIds.has(n.id)
        );
    const dups = Array.from(hashGroups.values()).filter((g) => g.length > 1);

    return {
      breakdownGroups: groups,
      totalAnalyzedBytes: totalAnalyzed,
      largeFiles: large,
      recentFiles: recent,
      emptyFolders: empty,
      cacheFiles: cache,
      totalCacheBytes: cacheBytesSum,
      duplicateGroups: dups,
    };
  }, [files, nativeEmptyFolders]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackHome}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
            {TOOL_TITLES[tool]}
          </h2>
        </div>

        {visibleSelectableIds.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setSelectedIds(allVisibleSelected ? [] : visibleSelectableIds)
            }
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
          >
            {allVisibleSelected ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* Selection Banner */}
      {isSelecting && (
        <div className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between text-sm">
          <span className="font-semibold text-blue-700 dark:text-blue-300 tabular-nums">
            {selectedIds.length} selected
          </span>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs font-medium text-blue-700 dark:text-blue-300 hover:underline flex items-center gap-1"
          >
            <X size={14} /> Clear
          </button>
        </div>
      )}

      {/* Tool Body: File Analyzer (Expandable Categories) */}
      {tool === 'file_analyzer' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <BarChart3 size={20} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Storage Distribution
              </h3>
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
              {formatBytes(totalAnalyzedBytes)} indexed
            </span>
          </div>

          <div className="h-3.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
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
                <div key={g.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedGroup((prev) => (prev === g.id ? null : g.id));
                      setSelectedIds([]);
                    }}
                    className="w-full py-3.5 flex items-center justify-between text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-3 h-3 rounded-sm shrink-0 ${g.color}`} />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {g.label}
                      </span>
                      <span className="text-xs text-slate-400 tabular-nums">
                        ({g.items.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="tabular-nums text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {formatBytes(g.bytes)} · {pct.toFixed(1)}%
                      </span>
                      {isOpen ? (
                        <ChevronDown size={16} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400" />
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
                        g.items.slice(0, 120).map((file) => (
                          <AnalyzerFileRow
                            key={file.id}
                            node={file}
                            files={files}
                            selected={selectedIds.includes(file.id)}
                            isSelecting={isSelecting}
                            showThumbnails={showThumbnails}
                            subtitle={getNodePath(file.parentId || 'internal_root', files)}
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
            <div className="p-10 text-center text-sm text-slate-500">
              No files larger than 50 MB found.
            </div>
          ) : (
            largeFiles.map((file) => (
              <AnalyzerFileRow
                key={file.id}
                node={file}
                files={files}
                selected={selectedIds.includes(file.id)}
                isSelecting={isSelecting}
                showThumbnails={showThumbnails}
                subtitle={getNodePath(file.parentId || 'internal_root', files)}
                rightText={formatBytes(file.size)}
                onPrimaryClick={(item) => onOpenFile(item, largeFiles)}
                onToggleSelect={toggleSelect}
                onMoveSingle={(id) => onMoveFiles([id])}
                onDeleteSingle={(id) => onDeleteFiles([id])}
              />
            ))
          )}
        </div>
      )}

      {/* Tool Body: Recent Files */}
      {tool === 'recent_files' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {recentFiles.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No recent files indexed yet.
            </div>
          ) : (
            recentFiles.map((file) => (
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
            ))
          )}
        </div>
      )}

      {/* Tool Body: Empty Folders */}
      {tool === 'empty_folders' && (
        <div className="space-y-3">
          {(emptyFolders.length > 0 || onRefreshEmptyFolders) && (
            <div className="flex items-center justify-end gap-2">
              {onRefreshEmptyFolders && (
                <button
                  type="button"
                  onClick={onRefreshEmptyFolders}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Scan Again
                </button>
              )}
              {emptyFolders.length > 0 && (
                <button
                  type="button"
                  onClick={() => onCleanEmptyFolders(emptyFolders.map((f) => f.id))}
                  className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
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
                <p className="text-sm text-slate-500">Scanning storage for empty folders...</p>
              </div>
            ) : emptyFolders.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
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
                  subtitle={folder.realPath || getNodePath(folder.id, files)}
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Zap size={20} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Cached App Data
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {formatBytes(totalCacheBytes)} reclaimable across {cacheFiles.length} cache
                  files
                </p>
              </div>
            </div>
            {cacheFiles.length > 0 && (
              <button
                type="button"
                onClick={() => onClearAppCache(cacheFiles.map((f) => f.id))}
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shrink-0"
              >
                Clear Cache
              </button>
            )}
          </div>

          {cacheFiles.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              All temporary app caches are cleared.
            </p>
          ) : (
            <div className="-mx-5 border-t border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
              {cacheFiles.map((c) => (
                <AnalyzerFileRow
                  key={c.id}
                  node={c}
                  files={files}
                  selected={selectedIds.includes(c.id)}
                  isSelecting={isSelecting}
                  showThumbnails={showThumbnails}
                  subtitle={getNodePath(c.parentId || 'internal_root', files)}
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-10 text-center text-sm text-slate-500">
              No duplicate files found.
            </div>
          ) : (
            duplicateGroups.map((group, idx) => (
              <div
                key={group[0].hash || idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
              >
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Copy size={14} />
                    Duplicate Group {idx + 1} · {formatBytes(group[0].size)} each
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteFiles(group.slice(1).map((g) => g.id))}
                    className="font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                  >
                    Keep First & Delete Copies
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
                      subtitle={getNodePath(item.parentId || 'internal_root', files)}
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
};
