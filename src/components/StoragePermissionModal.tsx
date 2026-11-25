import React from 'react';
import { FolderCheck, ShieldAlert, Sparkles, X } from 'lucide-react';
import { AppLogo } from './AppLogo';

interface StoragePermissionModalProps {
  open: boolean;
  onClose: () => void;
  onRequestPermission: () => void;
  onSelectFolder: () => void;
  isAndroid: boolean;
}

export const StoragePermissionModal: React.FC<StoragePermissionModalProps> = ({
  open,
  onClose,
  onRequestPermission,
  onSelectFolder,
  isAndroid,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="perm-modal-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AppLogo size={42} />
            <div>
              <h2
                id="perm-modal-title"
                className="text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Media & Storage Permission
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">AG File Manager</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Dismiss"
          >
            <X size={18} />
          </button>
        </div>

        {/* Info card */}
        <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-start gap-3">
          <ShieldAlert className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
          <div className="text-xs text-blue-950 dark:text-blue-200 space-y-1">
            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
              Access your real device files
            </p>
            <p>
              Allow storage and media permissions so AG File Manager can show all the files,
              folders, photos, videos, and real free storage on your phone.
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <FolderCheck size={16} className="text-emerald-600 shrink-0" />
            <span>Reads phone storage (Internal & SD Card)</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600 shrink-0" />
            <span>Calculates real used and free disk capacity</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Later
          </button>

          {!isAndroid && (
            <button
              type="button"
              onClick={onSelectFolder}
              className="w-full sm:w-auto min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors"
            >
              Select Folder to Scan
            </button>
          )}

          <button
            type="button"
            onClick={onRequestPermission}
            className="w-full sm:w-auto min-h-[42px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm"
          >
            Allow Permission
          </button>
        </div>
      </div>
    </div>
  );
};
