import React from 'react';
import { ArrowLeft, DownloadCloud, Folder } from 'lucide-react';
import { AppSettings } from '../types/fileManager';

interface AboutViewProps {
  settings: AppSettings;
  onBackHome: () => void;
  onCheckUpdate: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  settings,
  onBackHome,
  onCheckUpdate,
}) => {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBackHome}
          className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          aria-label="Back to Home"
        >
          <ArrowLeft size={18} />
        </button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">About</h2>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0">
            <Folder size={28} fill="currentColor" fillOpacity={0.2} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              AG File Manager
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
              Version {settings.currentVersionName} · File Manager
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Apps Owner Name</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">Abujar Al-Gifari</span>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Email</span>
            <span className="font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100">
              abujar287.algifari@gmail.com
            </span>
          </div>
          <div className="py-3 flex items-center justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Version</span>
            <span className="font-mono text-slate-900 dark:text-slate-100 tabular-nums">
              {settings.currentVersionName} (Build {settings.currentVersionCode})
            </span>
          </div>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={onCheckUpdate}
            className="min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
          >
            <DownloadCloud size={17} />
            <span>Check Update</span>
          </button>
        </div>
      </div>
    </div>
  );
};
