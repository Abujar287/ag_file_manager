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

interface MicroSdCardProps {
  id: string;
  title: string;
  percent: number;
  usedBytes?: number;
  totalBytes?: number;
  isMounted: boolean;
  unmountedText?: string;
  onClick: () => void;
}

const MicroSdCard: React.FC<MicroSdCardProps> = ({
  id,
  title,
  percent,
  usedBytes = 0,
  totalBytes = 0,
  isMounted,
  unmountedText = 'No card found',
  onClick,
}) => {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const displayPercent = isMounted ? Math.min(100, Math.max(0, percent)) : 0;
  const offset = circumference - (displayPercent / 100) * circumference;
  const gradId = `microsd_grad_${id}`;

  return (
    <button
      type="button"
      disabled={!isMounted}
      onClick={() => isMounted && onClick()}
      className={`group relative w-full text-left rounded-2xl transition-all duration-150 focus-visible:outline-2 focus-visible:outline-blue-500 select-none ${
        isMounted
          ? 'cursor-pointer hover:brightness-105 active:scale-[0.99]'
          : 'cursor-not-allowed opacity-85'
      }`}
      style={{
        filter: 'drop-shadow(0 4px 12px rgba(15, 23, 42, 0.4))',
      }}
    >
      {/* Background SVG matching the reference image MicroSD Card */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 340 156"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4A5262" />
            <stop offset="48%" stopColor="#3E4554" />
            <stop offset="52%" stopColor="#383E4C" />
            <stop offset="100%" stopColor="#2E3440" />
          </linearGradient>
        </defs>

        {/* MicroSD card body with rounded corners, side notches, and bottom stepped notch */}
        <path
          d="M 14 3 H 326 Q 337 3 337 14 V 72 Q 337 75 335 76 L 333 78 L 335 80 Q 337 81 337 84 V 142 Q 337 153 326 153 H 176 L 164 146 H 108 L 96 153 H 14 Q 3 153 3 142 V 84 Q 3 81 5 80 L 7 78 L 5 76 Q 3 75 3 72 V 14 Q 3 3 14 3 Z"
          fill={`url(#${gradId})`}
          stroke="#586377"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Subtle horizontal divider groove across the center */}
        <line x1="7" y1="78" x2="333" y2="78" stroke="#222731" strokeWidth="1.5" />
        <line
          x1="7"
          y1="79.5"
          x2="333"
          y2="79.5"
          stroke="#606A7E"
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />
      </svg>

      {/* Foreground Content */}
      <div className="relative z-10 px-2 sm:px-4 py-2.5 sm:py-3.5 flex items-center gap-1.5 sm:gap-3.5 min-h-[84px] sm:min-h-[114px]">
        {/* Left: Storage Ring Gauge */}
        <div className="relative w-9 h-9 sm:w-14 sm:h-14 shrink-0 flex items-center justify-center">
          <svg
            className="w-9 h-9 sm:w-14 sm:h-14 -rotate-90"
            viewBox="0 0 36 36"
            aria-hidden="true"
          >
            {/* Inner Dark Background */}
            <circle cx="18" cy="18" r="16" fill="#242934" />
            {/* Dark Track Circle */}
            <circle cx="18" cy="18" r={radius} fill="none" stroke="#373E4D" strokeWidth="3.5" />
            {/* Active Bright White Arc */}
            {isMounted && (
              <circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            )}
          </svg>
          <span className="absolute text-[10px] sm:text-xs font-bold text-white tabular-nums tracking-tight">
            {isMounted ? `${displayPercent}%` : '0%'}
          </span>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 sm:py-1 h-full">
          {/* Top Row: Title + Arrow */}
          <div className="flex items-center justify-between gap-1">
            <h2 className="text-[10px] sm:text-sm font-bold text-white tracking-tight leading-tight">
              {title}
            </h2>
            {isMounted && (
              <ArrowRight
                size={13}
                className="text-[#8894A6] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0"
              />
            )}
          </div>

          {/* Spacer / Divider clearance */}
          <div className="h-0.5 sm:h-1.5" />

          {/* Bottom Row: Storage Capacity Numbers */}
          <div className="text-[9px] sm:text-xs tabular-nums leading-tight font-medium">
            {isMounted ? (
              <div className="flex flex-wrap items-baseline gap-x-1">
                <span className="text-[#FF822E] font-bold whitespace-nowrap">
                  {formatBytes(usedBytes, 1)}
                </span>
                <span className="text-[#8E99A9] whitespace-nowrap">
                  / {formatBytes(totalBytes, 0)}
                </span>
              </div>
            ) : (
              <span className="text-slate-400 italic font-medium whitespace-nowrap">
                {unmountedText}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
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
    <div className="max-w-5xl mx-auto px-2.5 sm:px-6 py-4 sm:py-5 space-y-5 sm:space-y-6">
      {/* 1. Storage Overview — Side-by-side MicroSD Card Design matching user reference */}
      <section aria-label="Storage Overview">
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* Internal Storage Card */}
          <MicroSdCard
            id="internal"
            title="Internal Storage"
            percent={internalPct}
            usedBytes={internalUsed}
            totalBytes={INTERNAL_TOTAL_BYTES}
            isMounted={true}
            onClick={() => onOpenFolder('internal_root')}
          />

          {/* External Storage Card */}
          <MicroSdCard
            id="external"
            title="External Storage"
            percent={sdPct}
            usedBytes={sdUsed}
            totalBytes={SD_TOTAL_BYTES}
            isMounted={sdCardMounted}
            unmountedText="No card found"
            onClick={() => onOpenFolder('sd_root')}
          />
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
              className="min-h-[48px] px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center gap-2.5 text-left"
            >
              <span className="text-blue-600 dark:text-blue-400 shrink-0">{tool.icon}</span>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-100 leading-tight">
                {tool.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Categories Section (4x2 Grid) */}
      <section aria-label="Categories">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          Categories
        </h3>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 py-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onOpenCategory(cat.id)}
              className="group min-h-[78px] px-1 py-1 rounded-xl flex flex-col items-center justify-start text-center gap-1.5 transition-opacity active:opacity-75 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <div
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 ${cat.squircleBg}`}
              >
                <span className="text-white/30 scale-95" aria-hidden="true">
                  {cat.icon}
                </span>
                <span className="absolute inset-0 flex items-center justify-center text-sm sm:text-base font-bold text-white tabular-nums drop-shadow-xs">
                  {counts[cat.id]}
                </span>
              </div>

              <span className="text-[11px] sm:text-xs font-medium text-slate-800 dark:text-slate-200 leading-tight w-full truncate">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
