import React, { useMemo, useState } from 'react';
import { ChevronRight, Folder, FolderPlus, HardDrive, MemoryStick, X } from 'lucide-react';
import { FileNode } from '../types/fileManager';
import { getNodePath } from '../utils/formatters';

interface MoveTargetModalProps {
  open: boolean;
  itemCount: number;
  files: FileNode[];
  sdCardMounted: boolean;
  onBrowseFolder?: (folderId: string) => void;
  onCancel: () => void;
  onConfirmMove: (targetFolderId: string) => void;
}

export const MoveTargetModal: React.FC<MoveTargetModalProps> = ({
  open,
  itemCount,
  files,
  sdCardMounted,
  onBrowseFolder,
  onCancel,
  onConfirmMove,
}) => {
  const [browseFolderId, setBrowseFolderId] = useState<string>('internal_root');

  const selectFolder = (folderId: string) => {
    setBrowseFolderId(folderId);
    onBrowseFolder?.(folderId);
  };

  const byId = useMemo(() => new Map(files.map((n) => [n.id, n])), [files]);

  const ancestors = useMemo(() => {
    const list: FileNode[] = [];
    let curr = byId.get(browseFolderId);
    let guard = 0;
    while (curr && guard < 30) {
      list.unshift(curr);
      curr = curr.parentId ? byId.get(curr.parentId) : undefined;
      guard++;
    }
    return list;
  }, [byId, browseFolderId]);

  const childFolders = useMemo(() => {
    return files
      .filter((n) => n.kind === 'folder' && !n.trashed && n.parentId === browseFolderId)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [files, browseFolderId]);

  if (!open) return null;

  const currentPath = getNodePath(browseFolderId, files);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      onClick={onCancel}
    >
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[82vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Move {itemCount} {itemCount === 1 ? 'item' : 'items'} to...
            </h2>
            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {currentPath}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close move dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Storage Switcher */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={() => selectFolder('internal_root')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
              currentPath.startsWith('/storage/emulated') || !currentPath.startsWith('/storage/sdcard1')
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <HardDrive size={13} />
            <span>Internal</span>
          </button>
          {sdCardMounted && (
            <button
              type="button"
              onClick={() => selectFolder('sd_root')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                currentPath.startsWith('/storage/sdcard1')
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <MemoryStick size={13} />
              <span>External</span>
            </button>
          )}
        </div>

        {/* Breadcrumbs */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1 overflow-x-auto text-xs">
          {ancestors.map((seg, idx) => (
            <React.Fragment key={seg.id}>
              {idx > 0 && <ChevronRight size={13} className="text-slate-400 shrink-0" />}
              <button
                type="button"
                onClick={() => selectFolder(seg.id)}
                className={`px-1.5 py-1 rounded whitespace-nowrap ${
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

        {/* Subfolders */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 min-h-[200px]">
          {childFolders.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
              <FolderPlus size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              No subfolders here. Tap &ldquo;Move Here&rdquo; to place items in this folder.
            </div>
          ) : (
            childFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => selectFolder(folder.id)}
                className="w-full px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Folder size={19} className="text-blue-600 dark:text-blue-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                    {folder.name}
                  </span>
                </div>
                <ChevronRight size={16} className="text-slate-400 shrink-0" />
              </button>
            ))
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmMove(browseFolderId)}
            className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};
