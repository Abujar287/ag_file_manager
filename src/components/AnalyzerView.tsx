import React, { useMemo } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Clock,
  Copy,
  FolderMinus,
  Layers,
  Trash2,
  Zap,
} from 'lucide-react';
import { AnalyzerToolType, FileNode } from '../types/fileManager';
import { formatBytes, formatDateTime, getNodePath } from '../utils/formatters';
import { FileIcon } from './FileIcon';

interface AnalyzerViewProps {
  tool: AnalyzerToolType;
  files: FileNode[];
  showThumbnails: boolean;
  onSelectTool: (tool: AnalyzerToolType) => void;
  onBackHome: () => void;
  onOpenFolder: (folderId: string) => void;
  onOpenFile: (file: FileNode) => void;
  onDeleteFiles: (ids: string[]) => void;
  onCleanEmptyFolders: (ids: string[]) => void;
  onClearAppCache: (ids: string[]) => void;
}

const TOOL_TABS: { id: AnalyzerToolType; label: string }[] = [
  { id: 'file_analyzer', label: 'File Analyzer' },
  { id: 'large_files', label: 'Large Files' },
  { id: 'recent_files', label: 'Recent Files' },
  { id: 'empty_folders', label: 'Empty Folders' },
  { id: 'app_cache', label: 'App Cache' },
  { id: 'duplicate_files', label: 'Duplicate Files' },
];

export const AnalyzerView: React.FC<AnalyzerViewProps> = ({
  tool,
  files,
  showThumbnails,
  onSelectTool,
  onBackHome,
  onOpenFolder,
  onOpenFile,
  onDeleteFiles,
  onCleanEmptyFolders,
  onClearAppCache,
}) => {
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
          break;
        case 'archive':
        case 'other':
          archiveBytes += n.size;
          break;
        case 'image':
          imageBytes += n.size;
          break;
        case 'audio':
          audioBytes += n.size;
          break;
        case 'apk':
          apkBytes += n.size;
          break;
        case 'document':
        case 'text':
          docBytes += n.size;
          break;
      }

      if (n.size >= 50 * 1024 * 1024) large.push(n);
      if (n.hash) {
        const arr = hashGroups.get(n.hash) || [];
        arr.push(n);
        hashGroups.set(n.hash, arr);
      }
    }

    const groups = [
      { label: 'Videos', color: 'bg-rose-500', bytes: videoBytes },
      { label: 'Archives & Disk Images', color: 'bg-orange-500', bytes: archiveBytes },
      { label: 'Images', color: 'bg-emerald-500', bytes: imageBytes },
      { label: 'Audio', color: 'bg-violet-500', bytes: audioBytes },
      { label: 'Apps (APK)', color: 'bg-teal-500', bytes: apkBytes },
      { label: 'Documents & Text', color: 'bg-blue-500', bytes: docBytes },
    ];
    const totalAnalyzed = groups.reduce((acc, g) => acc + g.bytes, 0);

    large.sort((a, b) => b.size - a.size);
    const recent = [...nonFolderFiles]
      .sort((a, b) => b.modifiedAt - a.modifiedAt)
      .slice(0, 20);
    const empty = activeFiles.filter(
      (n) => n.kind === 'folder' && n.parentId !== null && !n.hidden && !nonEmptyParentIds.has(n.id)
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
  }, [files]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBackHome}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          aria-label="Back to Home"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {TOOL_TABS.find((t) => t.id === tool)?.label}
        </h2>
      </div>

      {/* Tool Switcher Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {TOOL_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelectTool(t.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              tool === t.id
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tool Body */}
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
                  key={g.label}
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
              return (
                <div
                  key={g.label}
                  className="py-3 flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-sm ${g.color}`} />
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {g.label}
                    </span>
                  </div>
                  <div className="tabular-nums text-slate-600 dark:text-slate-400">
                    {formatBytes(g.bytes)} · {pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tool === 'large_files' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {largeFiles.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No files larger than 50 MB found.
            </div>
          ) : (
            largeFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => onOpenFile(file)}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileIcon node={file} showThumbnails={showThumbnails} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {file.name}
                    </div>
                    <div className="text-xs font-mono text-slate-500 truncate">
                      {getNodePath(file.parentId || 'internal_root', files)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFiles([file.id]);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    aria-label={`Delete ${file.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tool === 'recent_files' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
          {recentFiles.map((file) => (
            <div
              key={file.id}
              onClick={() => onOpenFile(file)}
              className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon node={file} showThumbnails={showThumbnails} />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {file.name}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">
                    {formatBytes(file.size)} · {formatDateTime(file.modifiedAt)}
                  </div>
                </div>
              </div>
              <Clock size={16} className="text-slate-400 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {tool === 'empty_folders' && (
        <div className="space-y-3">
          {emptyFolders.length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onCleanEmptyFolders(emptyFolders.map((f) => f.id))}
                className="min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Remove All Empty Folders ({emptyFolders.length})
              </button>
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {emptyFolders.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-500">
                No empty folders detected. Storage is clean.
              </div>
            ) : (
              emptyFolders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => onOpenFolder(folder.id)}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileIcon node={folder} showThumbnails={false} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {folder.name}
                      </div>
                      <div className="text-xs font-mono text-slate-500 truncate">
                        {getNodePath(folder.id, files)}
                      </div>
                    </div>
                  </div>
                  <FolderMinus size={16} className="text-slate-400 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800">
              {cacheFiles.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 truncate">
                    {c.name}
                  </span>
                  <span className="tabular-nums text-xs font-medium text-slate-600 dark:text-slate-400">
                    {formatBytes(c.size)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                    <div
                      key={item.id}
                      className="px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileIcon node={item} showThumbnails={showThumbnails} size="sm" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </div>
                          <div className="text-xs font-mono text-slate-500 truncate">
                            {getNodePath(item.parentId || 'internal_root', files)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteFiles([item.id])}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600"
                        aria-label={`Delete ${item.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
