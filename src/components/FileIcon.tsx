import React, { useState } from 'react';
import {
  Archive,
  Camera,
  Download,
  File,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Music,
  Package,
  Video,
} from 'lucide-react';
import { FileNode } from '../types/fileManager';
import { FolderBadgeKind } from '../utils/formatters';

interface FileIconProps {
  node: FileNode;
  showThumbnails: boolean;
  size?: 'sm' | 'md' | 'lg';
  folderMeta?: {
    isEmpty: boolean;
    badgeKind: FolderBadgeKind;
    previewThumbUrl?: string;
  };
}

const FolderBadgeIcon: React.FC<{ kind: FolderBadgeKind }> = ({ kind }) => {
  const cls = 'text-[#1868DB]';
  switch (kind) {
    case 'download':
      return <Download size={10} strokeWidth={2.6} className={cls} />;
    case 'camera':
      return <Camera size={10} strokeWidth={2.5} className={cls} />;
    case 'image':
      return <ImageIcon size={10} strokeWidth={2.5} className={cls} />;
    case 'music':
      return <Music size={10} strokeWidth={2.6} className={cls} />;
    case 'video':
      return <Video size={10} strokeWidth={2.5} className={cls} />;
    case 'apk':
      return <Package size={10} strokeWidth={2.5} className={cls} />;
    case 'archive':
      return <Archive size={10} strokeWidth={2.5} className={cls} />;
    case 'document':
      return <FileText size={10} strokeWidth={2.5} className={cls} />;
    default:
      return <File size={10} strokeWidth={2.5} className={cls} />;
  }
};

export const FileIcon: React.FC<FileIconProps> = ({
  node,
  showThumbnails,
  size = 'md',
  folderMeta,
}) => {
  const [imgError, setImgError] = useState(false);

  const boxClass =
    size === 'lg'
      ? 'w-14 h-14 rounded-xl'
      : size === 'sm'
        ? 'w-9 h-9 rounded-lg'
        : 'w-11 h-11 rounded-xl';

  const iconSize = size === 'lg' ? 28 : size === 'sm' ? 18 : 20;

  // Demo-matched Blue Android Folder Icon
  if (node.kind === 'folder') {
    const isEmpty = folderMeta ? folderMeta.isEmpty : true;
    const badgeKind = folderMeta ? folderMeta.badgeKind : 'none';
    const hasThumb = showThumbnails && !isEmpty && Boolean(folderMeta?.previewThumbUrl);
    const svgW = size === 'lg' ? 52 : size === 'sm' ? 34 : 44;
    const svgH = size === 'lg' ? 44 : size === 'sm' ? 29 : 38;

    return (
      <div
        className={`${boxClass} shrink-0 relative flex items-center justify-center`}
      >
        {/* Flat empty blue folder vs populated folder with top thumb/content & corner type badge */}
        <svg
          width={svgW}
          height={svgH}
          viewBox="0 0 48 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="agFolderFront" x1="24" y1="8" x2="24" y2="39" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3B93FF" />
              <stop offset="1" stopColor="#166AE5" />
            </linearGradient>
          </defs>
          {/* Back tab */}
          <path
            d="M2 7C2 4.79086 3.79086 3 6 3H16.8C17.95 3 19.04 3.49 19.8 4.35L22.5 7.4H42C44.2091 7.4 46 9.19086 46 11.4V34C46 36.2091 44.2091 38 42 38H6C3.79086 38 2 36.2091 2 34V7Z"
            fill="#155CC9"
          />
          {/* Subtle inner sheet/thumb peek when folder contains files (never on empty folder) */}
          {!isEmpty && (
            <rect
              x="6"
              y="8.5"
              width="36"
              height="6"
              rx="1.5"
              fill="#E2EEFF"
              fillOpacity="0.92"
            />
          )}
          {/* Front folder flap */}
          <path
            d={
              isEmpty
                ? 'M2 10.5C2 8.84315 3.34315 7.5 5 7.5H43C44.6569 7.5 46 8.84315 46 10.5V34C46 36.2091 44.2091 38 42 38H6C3.79086 38 2 36.2091 2 34V10.5Z'
                : 'M2 13C2 11.3431 3.34315 10 5 10H43C44.6569 10 46 11.3431 46 13V34C46 36.2091 44.2091 38 42 38H6C3.79086 38 2 36.2091 2 34V13Z'
            }
            fill="url(#agFolderFront)"
          />
        </svg>

        {/* When folder has media & Show Thumbnails is ON, show tiny clean thumbnail peek */}
        {hasThumb && folderMeta?.previewThumbUrl && !imgError && (
          <div className="absolute top-1.5 right-1.5 w-4.5 h-4.5 rounded-[5px] overflow-hidden border border-white/90 shadow-xs">
            <img
              src={folderMeta.previewThumbUrl}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Bottom-left crisp white square badge like demo pic when folder has files */}
        {!isEmpty && badgeKind !== 'none' && (
          <div className="absolute bottom-0.5 left-0.5 w-[17px] h-[17px] rounded-[4px] bg-white shadow-xs flex items-center justify-center">
            <FolderBadgeIcon kind={badgeKind} />
          </div>
        )}
      </div>
    );
  }

  // Normal File Thumbnail when Show Thumbnails is enabled
  if (showThumbnails && node.thumbnailUrl && !imgError) {
    return (
      <div
        className={`${boxClass} shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80`}
      >
        <img
          src={node.thumbnailUrl}
          alt={node.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  switch (node.kind) {
    case 'image':
      return (
        <div
          className={`${boxClass} shrink-0 flex items-center justify-center bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400`}
        >
          <FileImage size={iconSize} />
        </div>
      );
    case 'video':
      return (
        <div
          className={`${boxClass} shrink-0 flex items-center justify-center bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400`}
        >
          <FileVideo size={iconSize} />
        </div>
      );
    case 'audio':
      return (
        <div
          className={`${boxClass} shrink-0 flex items-center justify-center bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400`}
        >
          <FileAudio size={iconSize} />
        </div>
      );
    case 'apk':
      return (
        <div
          className={`${boxClass} shrink-0 flex items-center justify-center bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400`}
        >
          <Package size={iconSize} />
        </div>
      );
    case 'archive':
      return (
        <div
          className={`${boxClass} shrink-0 flex items-center justify-center bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400`}
        >
          <FileArchive size={iconSize} />
        </div>
      );
    case 'document': {
      const lower = node.name.toLowerCase();
      if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || lower.endsWith('.csv')) {
        return (
          <div
            className={`${boxClass} shrink-0 flex items-center justify-center bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400`}
          >
            <FileSpreadsheet size={iconSize} />
          </div>
        );
      }
      return (
        <div
          className={`${boxClass} shrink-0 flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400`}
        >
          <FileText size={iconSize} />
        </div>
      );
    }
    case 'text':
      return (
        <div
          className={`${boxClass} shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300`}
        >
          <FileCode2 size={iconSize} />
        </div>
      );
    default:
      return (
        <div
          className={`${boxClass} shrink-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400`}
        >
          <File size={iconSize} />
        </div>
      );
  }
};
