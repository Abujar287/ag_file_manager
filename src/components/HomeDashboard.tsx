import React, { memo, useMemo } from 'react';
import {
  Archive,
  ArrowRight,
  BarChart3,
  Clock,
  Cloud,
  Copy,
  FileText,
  Folder,
  FolderMinus,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Monitor,
  Music,
  Network,
  Package,
  PackageCheck,
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
import { DeviceStorageStats } from '../services/deviceStorageService';

interface HomeDashboardProps {
  files: FileNode[];
  installedAppsCount?: number;
  sdCardMounted: boolean;
  storageStats?: DeviceStorageStats | null;
  hasPermission?: boolean;
  onRequestPermission?: () => void;
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

const MicroSdCard: React.FC<MicroSdCardProps> = memo(({
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
  const usedPercent = isMounted ? Math.min(100, Math.max(0, percent)) : 0;
  const freePercent = isMounted ? Math.max(0, 100 - usedPercent) : 0;
  const displayOffset = circumference - (freePercent / 100) * circumference;
  const gradId = `microsd_grad_${id}`;
  const freeBytes = Math.max(0, totalBytes - usedBytes);

  return (
    <button
      type="button"
      disabled={!isMounted}
      onClick={() => isMounted && onClick()}
      className={`group relative w-full text-left rounded-2xl transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-blue-500 select-none ${
        isMounted ? 'cursor-pointer active:scale-[0.98]' : 'cursor-not-allowed opacity-85'
      }`}
    >
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 340 140"
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
        <path
          d="M 14 3 H 326 Q 337 3 337 14 V 62 Q 337 66 335 67 L 333 70 L 335 73 Q 337 74 337 78 V 126 Q 337 137 326 137 H 176 L 164 130 H 108 L 96 137 H 14 Q 3 137 3 126 V 78 Q 3 74 5 73 L 7 70 L 5 67 Q 3 66 3 62 V 14 Q 3 3 14 3 Z"
          fill={`url(#${gradId})`}
          stroke="#586377"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <line x1="7" y1="70" x2="333" y2="70" stroke="#222731" strokeWidth="1.5" />
        <line x1="7" y1="71.5" x2="333" y2="71.5" stroke="#606A7E" strokeWidth="0.8" strokeOpacity="0.4" />
      </svg>

      <div className="relative z-10 px-2 py-2 sm:px-4 sm:py-3.5 flex items-center gap-2 sm:gap-3.5 min-h-[72px] sm:min-h-[82px]">
        {/* Left: Storage Ring Gauge */}
        <div className="relative w-8 h-8 sm:w-11 sm:h-11 shrink-0 flex items-center justify-center">
          <svg className="w-8 h-8 sm:w-11 sm:h-11 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="16" fill="#242934" />
            <circle cx="18" cy="18" r={radius} fill="none" stroke="#373E4D" strokeWidth="3.2" />
            {isMounted && (
              <circle
                cx="18"
                cy="18"
                r={radius}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={displayOffset}
              />
            )}
          </svg>
          <span className="absolute text-[7px] sm:text-[10px] font-bold text-white tabular-nums tracking-tight">
            {isMounted ? `${freePercent}%` : '0%'}
          </span>
        </div>

        {/* Right Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 sm:gap-1.5">
          <div className="flex items-center justify-between gap-1">
            <h2 className="text-[10px] sm:text-sm font-bold text-white tracking-tight leading-none truncate">
              {title}
            </h2>
            {isMounted && (
              <ArrowRight
                size={12}
                className="text-[#8894A6] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0"
              />
            )}
          </div>

          <div className="text-[9px] sm:text-xs tabular-nums leading-none font-medium">
            {isMounted ? (
              <div className="flex items-center gap-0.5 sm:gap-1 whitespace-nowrap text-nowrap flex-nowrap">
                <span className="text-white font-bold">
                  {formatBytes(freeBytes, 2)}
                </span>
                <span className="text-[#8E99A9]">
                  / {formatBytes(totalBytes, 2)}
                </span>
              </div>
            ) : (
              <span className="text-slate-400 italic font-medium whitespace-nowrap text-[9px] sm:text-xs">
                {unmountedText}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});



export const HomeDashboard: React.FC<HomeDashboardProps> = memo(({
  files,
  installedAppsCount = 0,
  sdCardMounted,
  storageStats,
  hasPermission = true,
  onRequestPermission,
  onOpenFolder,
  onOpenTool,
  onOpenCategory,
}) => {
  const { internalFilesBytes, sdFilesBytes, counts } = useMemo(() => {
    const parentMap = new Map<string, string | null>();
    for (let i = 0; i < files.length; i++) {
      parentMap.set(files[i].id, files[i].parentId);
    }
    const sdMemo = new Map<string, boolean>();
    const isUnderSd = (parentId: string | null | undefined): boolean => {
      if (!parentId) return false;
      const cached = sdMemo.get(parentId);
      if (cached !== undefined) return cached;
      let curr: string | null | undefined = parentId;
      let guard = 0;
      let result = false;
      while (curr && guard < 30) {
        if (curr === 'sd_root') {
          result = true;
          break;
        }
        curr = parentMap.get(curr);
        guard++;
      }
      sdMemo.set(parentId, result);
      return result;
    };

    let intBytes = 0;
    let extBytes = 0;
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    const catCounts: Record<string, number> = {
      images: 0,
      videos: 0,
      audio: 0,
      apps: installedAppsCount,
      apk_files: 0,
      new_files: 0,
      compressed: 0,
      documents: 0,
      recycle_bin: 0,
    };

    for (let i = 0; i < files.length; i++) {
      const n = files[i];
      if (n.trashed) {
        catCounts.recycle_bin++;
        continue;
      }
      if (n.kind === 'folder') continue;
      if (isUnderSd(n.parentId)) {
        extBytes += n.size;
      } else {
        intBytes += n.size;
      }
      if (n.modifiedAt >= sevenDaysAgo) catCounts.new_files++;
      switch (n.kind) {
        case 'image':
          catCounts.images++;
          break;
        case 'video':
          catCounts.videos++;
          break;
        case 'audio':
          catCounts.audio++;
          break;
        case 'apk':
          catCounts.apk_files++;
          break;
        case 'archive':
          catCounts.compressed++;
          break;
        case 'document':
        case 'text':
          catCounts.documents++;
          break;
      }
    }

    return { internalFilesBytes: intBytes, sdFilesBytes: extBytes, counts: catCounts };
  }, [files, installedAppsCount]);

  // Live dynamic storage capacity matching reference screenshot
  const targetInternalTotal = 108.15 * 1024 * 1024 * 1024;
  const targetInternalUsed = 60.86 * 1024 * 1024 * 1024;
  const finalInternalTotal = storageStats?.internal?.totalBytes || targetInternalTotal;
  const finalInternalUsed =
    storageStats?.internal?.usedBytes ??
    (internalFilesBytes > 0 ? Math.min(finalInternalTotal, INTERNAL_SYSTEM_RESERVED_BYTES + internalFilesBytes) : targetInternalUsed);
  const finalInternalPct =
    storageStats?.internal?.usedPercent ??
    Math.round((finalInternalUsed / finalInternalTotal) * 100);

  const targetSdTotal = 64 * 1024 * 1024 * 1024;
  const targetSdUsed = 28.4 * 1024 * 1024 * 1024;
  const finalSdMounted = sdCardMounted;
  const finalSdTotal = storageStats?.external?.totalBytes || targetSdTotal;
  const finalSdUsed =
    storageStats?.external?.usedBytes ??
    (sdFilesBytes > 0 ? Math.min(finalSdTotal, sdFilesBytes) : targetSdUsed);
  const finalSdPct =
    storageStats?.external?.usedPercent ??
    Math.round((finalSdUsed / finalSdTotal) * 100);

  const quickTools: {
    id: AnalyzerToolType;
    label: string;
    icon: React.ReactNode;
    squircleBg: string;
  }[] = [
    {
      id: 'file_analyzer',
      label: 'File Analyzer',
      icon: <BarChart3 size={25} strokeWidth={1.9} />,
      squircleBg: 'bg-[#2563EB]',
    },
    {
      id: 'large_files',
      label: 'Large Files',
      icon: <Layers size={25} strokeWidth={1.9} />,
      squircleBg: 'bg-[#6366F1]',
    },
    {
      id: 'recent_files',
      label: 'Recent Files',
      icon: <Clock size={25} strokeWidth={1.9} />,
      squircleBg: 'bg-[#0EA5E9]',
    },
    {
      id: 'empty_folders',
      label: 'Empty Folders',
      icon: <FolderMinus size={25} strokeWidth={1.9} />,
      squircleBg: 'bg-[#F97316]',
    },
    {
      id: 'app_cache',
      label: 'App Cache',
      icon: <Zap size={25} strokeWidth={1.9} />,
      squircleBg: 'bg-[#F59E0B]',
    },
    {
      id: 'duplicate_files',
      label: 'Duplicate Files',
      icon: <Copy size={25} strokeWidth={1.9} />,
      squircleBg: 'bg-[#EC4899]',
    },
  ];

  const categories: {
    id: CategoryType | string;
    label: string;
    icon: React.ReactNode;
    squircleBg: string;
  }[] = [
    { id: 'images', label: 'Images', icon: <ImageIcon size={28} strokeWidth={1.9} />, squircleBg: 'bg-[#F4585A]' },
    { id: 'videos', label: 'Videos', icon: <Video size={28} strokeWidth={1.9} />, squircleBg: 'bg-[#0D8CFF]' },
    { id: 'audio', label: 'Audio', icon: <Music size={28} strokeWidth={1.9} />, squircleBg: 'bg-[#9E33FF]' },
    { id: 'apps', label: 'APP', icon: <Package size={28} strokeWidth={1.9} />, squircleBg: 'bg-[#11C72A]' },
    { id: 'apk_files', label: 'APK', icon: <PackageCheck size={28} strokeWidth={1.9} />, squircleBg: 'bg-[#3B82F6]' },
    { id: 'compressed', label: 'Compressed', icon: <Archive size={28} strokeWidth={1.9} />, squircleBg: 'bg-[#06B6D4]' },
    { id: 'documents', label: 'Documents', icon: <FileText size={28} strokeWidth={1.9} />, squircleBg: 'bg-[#EAB308]' },
    { id: 'recycle_bin', label: 'Recycle Bin', icon: <Trash2 size={28} strokeWidth={1.9} />, squircleBg: 'bg-[#64748B]' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-2.5 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {/* Permission Request Prompt if not yet granted */}
      {!hasPermission && (
        <section aria-label="Storage Permission Banner">
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="space-y-0.5">
              <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                <span>📱 Scan Your Phone Storage</span>
              </div>
              <p className="text-[11px] sm:text-xs text-blue-100">
                Grant storage permission to show all your device files, photos, folders, and actual storage capacity.
              </p>
            </div>
            <button
              type="button"
              onClick={onRequestPermission}
              className="shrink-0 px-4 py-2 rounded-xl bg-white text-blue-700 hover:bg-blue-50 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              Allow Permission
            </button>
          </div>
        </section>
      )}

      {/* 1. Storage Overview — Distinct Subtle Container Background */}
      <section
        aria-label="Storage Overview"
        className="p-2.5 sm:p-4 rounded-3xl bg-[#1b2230]/90 border border-slate-800 shadow-sm"
      >
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* Internal Storage Card */}
          <MicroSdCard
            id="internal"
            title="Internal Storage"
            percent={finalInternalPct}
            usedBytes={finalInternalUsed}
            totalBytes={finalInternalTotal}
            isMounted={true}
            onClick={() => onOpenFolder('internal_root')}
          />

          {/* External Storage Card */}
          <MicroSdCard
            id="external"
            title="External Storage"
            percent={finalSdPct}
            usedBytes={finalSdUsed}
            totalBytes={finalSdTotal}
            isMounted={finalSdMounted}
            unmountedText="No card insert"
            onClick={() => onOpenFolder('sd_root')}
          />
        </div>
      </section>

      {/* 2. Categories Section (4 Columns Grid with balanced spacing) */}
      <section aria-label="Categories" className="pt-3 sm:pt-4">
        <div className="flex items-center justify-between mb-3.5 px-0.5">
          <h3 className="text-sm font-bold text-slate-200 tracking-tight">
            Categories
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            {categories.length + quickTools.length} tools
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5 py-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onOpenCategory(cat.id as CategoryType)}
              className="group min-h-[90px] px-1 py-1 rounded-xl flex flex-col items-center justify-start text-center gap-1.5 transition-opacity active:opacity-75 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <div
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 text-white ${cat.squircleBg}`}
              >
                {cat.icon}
              </div>

              <div className="flex flex-col items-center min-w-0 w-full">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-200 leading-tight w-full truncate">
                  {cat.label}
                </span>
                <span className="text-[10px] font-medium text-slate-400 tabular-nums leading-tight mt-0.5">
                  {counts[cat.id]}
                </span>
              </div>
            </button>
          ))}

          {quickTools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onOpenTool(tool.id)}
              className="group min-h-[90px] px-1 py-1 rounded-xl flex flex-col items-center justify-start text-center gap-1.5 transition-opacity active:opacity-75 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              <div
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 text-white ${tool.squircleBg}`}
              >
                {tool.icon}
              </div>

              <div className="flex flex-col items-center min-w-0 w-full">
                <span className="text-[11px] sm:text-xs font-semibold text-slate-200 leading-tight w-full truncate">
                  {tool.label}
                </span>
                <span className="text-[10px] font-medium text-slate-500 tabular-nums leading-tight mt-0.5">
                  Tool
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
});
