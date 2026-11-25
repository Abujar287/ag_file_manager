import React from 'react';
import {
  Archive,
  ArrowRight,
  BarChart3,
  Clock,
  Copy,
  FileText,
  FolderMinus,
  Image as ImageIcon,
  Layers,
  MemoryStick,
  Music,
  Package,
  Sparkles,
  Trash2,
  Video,
  Zap,
} from 'lucide-react';
import { AnalyzerToolType, CategoryType, FileNode } from '../types/fileManager';
import {
  INTERNAL_SYSTEM_RESERVED_BYTES,
  INTERNAL_TOTAL_BYTES,
  SD_TOTAL_BYTES,
} from '../data/initialFileSystem';
import { formatBytes } from '../utils/formatters';

interface HomeDashboardProps {
  files: FileNode[];
  sdCardMounted: boolean;
  onOpenFolder: (folderId: string) => void;
  onOpenTool: (tool: AnalyzerToolType) => void;
  onOpenCategory: (category: CategoryType) => void;
}

const StorageRing: React.FC<{ percent: number }> = ({ percent }) => {
  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative w-10 h-10 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
      <svg className="w-10 h-10 sm:w-11 sm:h-11 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-slate-700/30 dark:text-slate-700/50"
        />
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[10px] sm:text-xs font-bold text-white tabular-nums drop-shadow-xs">
        {percent}%
      </span>
    </div>
  );
};

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  files,
  sdCardMounted,
  onOpenFolder,
  onOpenTool,
  onOpenCategory,
}) => {
  const parentMap = new Map(files.map((n) => [n.id, n.parentId]));
  const isUnderRoot = (node: FileNode, rootId: string): boolean => {
    let curr: string | null | undefined = node.parentId;
    let guard = 0;
    while (curr && guard < 30) {
      if (curr === rootId) return true;
      curr = parentMap.get(curr);
      guard++;
    }
    return false;
  };

  let internalFilesBytes = 0;
  let sdFilesBytes = 0;
  for (const n of files) {
    if (n.kind === 'folder') continue;
    if (isUnderRoot(n, 'sd_root')) {
      sdFilesBytes += n.size;
    } else {
      internalFilesBytes += n.size;
    }
  }

  const internalUsed = Math.min(
    INTERNAL_TOTAL_BYTES,
    INTERNAL_SYSTEM_RESERVED_BYTES + internalFilesBytes
  );
  const internalPct = Math.round((internalUsed / INTERNAL_TOTAL_BYTES) * 100);

  const sdUsed = Math.min(SD_TOTAL_BYTES, sdFilesBytes);
  const sdPct = sdCardMounted ? Math.round((sdUsed / SD_TOTAL_BYTES) * 100) : 0;

  // Category counts
  const activeFiles = files.filter((n) => !n.trashed && n.kind !== 'folder');
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;

  const counts: Record<CategoryType, number> = {
    images: activeFiles.filter((n) => n.kind === 'image').length,
    videos: activeFiles.filter((n) => n.kind === 'video').length,
    audio: activeFiles.filter((n) => n.kind === 'audio').length,
    apps: activeFiles.filter((n) => n.kind === 'apk').length,
    new_files: activeFiles.filter((n) => n.modifiedAt >= sevenDaysAgo).length,
    compressed: activeFiles.filter((n) => n.kind === 'archive').length,
    documents: activeFiles.filter((n) => n.kind === 'document' || n.kind === 'text').length,
    recycle_bin: files.filter((n) => n.trashed).length,
  };

  const quickTools: { id: AnalyzerToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'file_analyzer', label: 'File Analyzer', icon: <BarChart3 size={16} /> },
    { id: 'large_files', label: 'Large Files', icon: <Layers size={16} /> },
    { id: 'recent_files', label: 'Recent Files', icon: <Clock size={16} /> },
    { id: 'empty_folders', label: 'Empty Folders', icon: <FolderMinus size={16} /> },
    { id: 'app_cache', label: 'App Cache', icon: <Zap size={16} /> },
    { id: 'duplicate_files', label: 'Duplicate Files', icon: <Copy size={16} /> },
  ];

  const categories: {
    id: CategoryType;
    label: string;
    icon: React.ReactNode;
    squircleBg: string;
  }[] = [
    {
      id: 'images',
      label: 'Images',
      icon: <ImageIcon size={28} strokeWidth={1.9} />,
      squircleBg: 'bg-[#F4585A]',
    },
    {
      id: 'videos',
      label: 'Videos',
      icon: <Video size={28} strokeWidth={1.9} />,
      squircleBg: 'bg-[#0D8CFF]',
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: <Music size={28} strokeWidth={1.9} />,
      squircleBg: 'bg-[#9E33FF]',
    },
    {
      id: 'apps',
      label: 'Apps',
      icon: <Package size={28} strokeWidth={1.9} />,
      squircleBg: 'bg-[#11C72A]',
    },
    {
      id: 'new_files',
      label: 'New Files',
      icon: <Sparkles size={28} strokeWidth={1.9} />,
      squircleBg: 'bg-[#FF8C1A]',
    },
    {
      id: 'compressed',
      label: 'Compressed',
      icon: <Archive size={28} strokeWidth={1.9} />,
      squircleBg: 'bg-[#0CB4F5]',
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText size={28} strokeWidth={1.9} />,
      squircleBg: 'bg-[#EAB308]',
    },
    {
      id: 'recycle_bin',
      label: 'Recycle Bin',
      icon: <Trash2 size={28} strokeWidth={1.9} />,
      squircleBg: 'bg-[#7A92AC]',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      {/* 1. Storage Overview — Compact MicroSD card shape fitting perfectly on mobile */}
      <section aria-label="Storage Overview">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {/* Internal Storage Card */}
          <button
            type="button"
            onClick={() => onOpenFolder('internal_root')}
            className="w-full text-left relative bg-[#3C414E] dark:bg-[#2A2E39] text-white border border-slate-600/50 rounded-xl p-2.5 sm:p-3.5 shadow-md hover:border-slate-400 transition-all flex items-center gap-2.5 sm:gap-3 focus-visible:outline-2 focus-visible:outline-blue-500 overflow-hidden"
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(50% + 10px) calc(100% - 8px), calc(50% + 7px) 100%, calc(50% - 7px) 100%, calc(50% - 10px) calc(100% - 8px), 0 calc(100% - 8px))',
            }}
          >
            <StorageRing percent={internalPct} />
            <div className="flex-1 min-w-0 pb-1.5">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                  Internal
                </h2>
                <ArrowRight size={13} className="text-slate-400 shrink-0" />
              </div>
              <div className="mt-0.5 text-[10px] sm:text-xs tabular-nums truncate">
                <span className="text-[#FF8C1A] font-bold">
                  {formatBytes(internalUsed)}
                </span>
                <span className="text-slate-400"> / {formatBytes(INTERNAL_TOTAL_BYTES, 0)}</span>
              </div>
            </div>
          </button>

          {/* External Storage Card */}
          <button
            type="button"
            disabled={!sdCardMounted}
            onClick={() => sdCardMounted && onOpenFolder('sd_root')}
            className={`w-full text-left relative bg-[#3C414E] dark:bg-[#2A2E39] text-white border border-slate-600/50 rounded-xl p-2.5 sm:p-3.5 shadow-md transition-all flex items-center gap-2.5 sm:gap-3 overflow-hidden ${
              sdCardMounted ? 'hover:border-slate-400 cursor-pointer' : 'opacity-60 cursor-not-allowed'
            }`}
            style={{
              clipPath:
                'polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(50% + 10px) calc(100% - 8px), calc(50% + 7px) 100%, calc(50% - 7px) 100%, calc(50% - 10px) calc(100% - 8px), 0 calc(100% - 8px))',
            }}
          >
            <StorageRing percent={sdPct} />
            <div className="flex-1 min-w-0 pb-1.5">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                  External
                </h2>
                {sdCardMounted && <ArrowRight size={13} className="text-slate-400 shrink-0" />}
              </div>
              <div className="mt-0.5 text-[10px] sm:text-xs tabular-nums truncate">
                {sdCardMounted ? (
                  <>
                    <span className="text-[#FF8C1A] font-bold">
                      {formatBytes(sdUsed)}
                    </span>
                    <span className="text-slate-400"> / {formatBytes(SD_TOTAL_BYTES, 0)}</span>
                  </>
                ) : (
                  <span className="text-slate-400 italic text-[10px]">No card found</span>
                )}
              </div>
            </div>
          </button>
        </div>
      </section>

      {/* 2. Quick Analysis Tools (2x3 Grid) */}
      <section aria-label="Quick Analysis Tools">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
          Quick Analysis Tools
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {quickTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onOpenTool(tool.id)}
              className="min-h-[44px] px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center gap-2 text-left"
            >
              <span className="text-blue-600 dark:text-blue-400 shrink-0">{tool.icon}</span>
              <span className="text-[11px] sm:text-xs font-medium text-slate-800 dark:text-slate-100 leading-tight">
                {tool.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Categories Section (4x2 Grid) */}
      <section aria-label="Categories">
        <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
          Categories
        </h3>
        <div className="grid grid-cols-4 gap-x-1.5 sm:gap-x-2 gap-y-4 py-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onOpenCategory(cat.id)}
              className="group min-h-[72px] px-0.5 py-1 flex flex-col items-center justify-start text-center gap-1.5 transition-opacity active:opacity-75 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <div
                className={`relative w-11 h-11 sm:w-13 sm:h-13 rounded-[14px] sm:rounded-[16px] flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${cat.squircleBg}`}
              >
                <span className="text-white/30 scale-90" aria-hidden="true">
                  {cat.icon}
                </span>
                <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-bold text-white tabular-nums drop-shadow-xs">
                  {counts[cat.id]}
                </span>
              </div>

              <span className="text-[11px] sm:text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight w-full">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
