import React from 'react';
import { LogOut } from 'lucide-react';
import { AppLogo } from './AppLogo';

interface ExitConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirmExit: () => void;
}

export const ExitConfirmDialog: React.FC<ExitConfirmDialogProps> = ({
  open,
  onCancel,
  onConfirmExit,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3.5">
          <AppLogo size={42} />
          <div>
            <h2
              id="exit-dialog-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              Exit AG File Manager
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">File Manager</p>
          </div>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300">
          Are you sure you want to exit the application?
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmExit}
            className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors flex items-center gap-2 shadow-sm focus-visible:outline-2 focus-visible:outline-rose-500"
          >
            <LogOut size={16} />
            <span>Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
