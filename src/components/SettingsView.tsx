import React from 'react';
import { ArrowLeft, Monitor, Moon, Sun } from 'lucide-react';
import { AppSettings, ThemeMode } from '../types/fileManager';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onBackHome: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onBackHome,
}) => {
  const themes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: 'light', label: 'Light', icon: <Sun size={16} /> },
    { id: 'dark', label: 'Dark', icon: <Moon size={16} /> },
    { id: 'system', label: 'System', icon: <Monitor size={16} /> },
  ];

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
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
      </div>

      {/* Theme Selector */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Theme</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Choose appearance mode for AG File Manager
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onUpdateSettings({ theme: t.id })}
              className={`min-h-[42px] px-3 py-2 rounded-lg text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                settings.theme === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Browsing Preferences */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Show Hidden Files
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Display dot-files such as .nomedia and hidden folders
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showHiddenFiles}
            onClick={() => onUpdateSettings({ showHiddenFiles: !settings.showHiddenFiles })}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
              settings.showHiddenFiles ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                settings.showHiddenFiles ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Show Thumbnails
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Render image previews in file lists and grids
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.showThumbnails}
            onClick={() => onUpdateSettings({ showThumbnails: !settings.showThumbnails })}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
              settings.showThumbnails ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                settings.showThumbnails ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="p-5 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              External SD Card Inserted
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Show or hide the External SD Card storage slot
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.sdCardMounted}
            onClick={() => onUpdateSettings({ sdCardMounted: !settings.sdCardMounted })}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
              settings.sdCardMounted ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform ${
                settings.sdCardMounted ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
};
