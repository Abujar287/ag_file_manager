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

const StorageRing: React.FC<{ percent: number; strokeColor: string }> = ({
  percent,
  strokeColor,
}) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(100, Math.max(0, percent)) / 100) * circumference;

  return (
    <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
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
  const internalFree = Math.max(0, INTERNAL_TOTAL_BYTES - internalUsed);
  const internalPct = Math.round((internalUsed / INTERNAL_TOTAL_BYTES) * 100);

  const sdUsed = Math.min(SD_TOTAL_BYTES, sdFilesBytes);
  const sdFree = Math.max(0, SD_TOTAL_BYTES - sdUsed);
  const sdPct = Math.round((sdUsed / SD_TOTAL_BYTES) * 100);

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
    { id: 'file_analyzer', label: 'File Analyzer', icon: <BarChart3 size={18} /> },
    { id: 'large_files', label: 'Large Files', icon: <Layers size={18} /> },
    { id: 'recent_files', label: 'Recent Files', icon: <Clock size={18} /> },
    { id: 'empty_folders', label: 'Empty Folders', icon: <FolderMinus size={18} /> },
    { id: 'app_cache', label: 'App Cache', icon: <Zap size={18} /> },
    { id: 'duplicate_files', label: 'Duplicate Files', icon: <Copy size={18} /> },
  ];

  // Demo-pic matched vibrant solid squircle icons (4x2 grid, borderless on background, count inside icon)
  const categories: {
    id: CategoryType;
    label: string;
    icon: React.ReactNode;
    squircleBg: string;
  }[] = [
    {
      id: 'images',
      label: 'Images',
      icon: <ImageIcon size={30} strokeWidth={1.9} />,
      squircleBg: 'bg-[#F4585A]',
    },
    {
      id: 'videos',
      label: 'Videos',
      icon: <Video size={30} strokeWidth={1.9} />,
      squircleBg: 'bg-[#0D8CFF]',
    },
    {
      id: 'audio',
      label: 'Audio',
      icon: <Music size={30} strokeWidth={1.9} />,
      squircleBg: 'bg-[#9E33FF]',
    },
    {
      id: 'apps',
      label: 'Apps',
      icon: <Package size={30} strokeWidth={1.9} />,
      squircleBg: 'bg-[#11C72A]',
    },
    {
      id: 'new_files',
      label: 'New Files',
      icon: <Sparkles size={30} strokeWidth={1.9} />,
      squircleBg: 'bg-[#FF8C1A]',
    },
    {
      id: 'compressed',
      label: 'Compressed',
      icon: <Archive size={30} strokeWidth={1.9} />,
      squircleBg: 'bg-[#0CB4F5]',
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: <FileText size={30} strokeWidth={1.9} />,
      squircleBg: 'bg-[#EAB308]',
    },
    {
      id: 'recycle_bin',
      label: 'Recycle Bin',
      icon: <Trash2 size={30} strokeWidth={1.9} />,
      squircleBg: 'bg-[#7A92AC]',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 space-y-7">
      {/* 1. Storage Overview Section — Side-by-side 1 row on mobile & desktop, circular ring style matching demo */}
      <section aria-label="Storage Overview">
        <div
          className={`grid gap-3 sm:gap-4 ${
            sdCardMounted ? 'grid-cols-2' : 'grid-cols-1'
          }`}
        >
          {/* Internal Storage */}
          <button
            type="button"
            onClick={() => onOpenFolder('internal_root')}
            className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 hover:border-blue-400 dark:hover:border-blue-700 transition-colors flex items-center gap-2.5 sm:gap-3.5 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <StorageRing percent={internalPct} strokeColor="#2563EB" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  Internal Storage
                </h2>
                <ArrowRight size={14} className="text-slate-400 shrink-0 hidden sm:block" />
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5 truncate">
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {formatBytes(internalFree)}
                </span>{' '}
                / {formatBytes(INTERNAL_TOTAL_BYTES, 0)}
              </p>
            </div>
          </button>

          {/* External Storage (SD Card) — Hidden cleanly when no external SD card is inserted */}
          {sdCardMounted && (
            <button
              type="button"
              onClick={() => onOpenFolder('sd_root')}
              className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 sm:p-4 hover:border-amber-400 dark:hover:border-amber-700 transition-colors flex items-center gap-2.5 sm:gap-3.5 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <StorageRing percent={sdPct} strokeColor="#F59E0B" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    External Storage
                  </h2>
                  <ArrowRight size={14} className="text-slate-400 shrink-0 hidden sm:block" />
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5 truncate">
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    {formatBytes(sdFree)}
                  </span>{' '}
                  / {formatBytes(SD_TOTAL_BYTES, 0)}
                </p>
              </div>
            </button>
          )}
        </div>
      </section>

      {/* 2. Quick Analysis Tools (2x3 Grid) */}
      <section aria-label="Quick Analysis Tools">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Quick Analysis Tools
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {quickTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onOpenTool(tool.id)}
              className="min-h-[52px] px-3.5 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors flex items-center gap-3 text-left"
            >
              <span className="text-blue-600 dark:text-blue-400 shrink-0">{tool.icon}</span>
              <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                {tool.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Categories Section (4x2 Grid — Borderless on background, vibrant demo-style squircle icons with count centered inside) */}
      <section aria-label="Categories">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Categories
        </h3>
        <div className="grid grid-cols-4 gap-x-2 gap-y-5 py-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onOpenCategory(cat.id)}
              className="group min-h-[82px] px-1 py-1 flex flex-col items-center justify-start text-center gap-2 transition-opacity active:opacity-75 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <div
                className={`relative w-13 h-13 sm:w-14 sm:h-14 rounded-[18px] flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${cat.squircleBg}`}
              >
                <span className="text-white/30" aria-hidden="true">
                  {cat.icon}
                </span>
                <span className="absolute inset-0 flex items-center justify-center text-base sm:text-lg font-bold text-white tabular-nums drop-shadow-xs">
                  {counts[cat.id]}
                </span>
              </div>

              <span className="text-xs sm:text-[13px] font-medium text-slate-800 dark:text-slate-200 truncate w-full px-0.5">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
