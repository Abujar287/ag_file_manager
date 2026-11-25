import React from 'react';
import {
  BarChart3,
  DownloadCloud,
  Eye,
  HardDrive,
  Home,
  Image as ImageIcon,
  Info,
  MemoryStick,
  Settings,
  X,
} from 'lucide-react';
import { ActiveScreen, AppSettings } from '../types/fileManager';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  activeScreen: ActiveScreen;
  settings: AppSettings;
  onNavigate: (screen: ActiveScreen) => void;
  onToggleHidden: () => void;
  onToggleThumbnails: () => void;
  onCheckUpdate: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
  activeScreen,
  settings,
  onNavigate,
  onToggleHidden,
  onToggleThumbnails,
  onCheckUpdate,
}) => {
  const isHome = activeScreen.type === 'home';
  const isInternal = activeScreen.type === 'folder' && activeScreen.folderId === 'internal_root';
  const isExternal = activeScreen.type === 'folder' && activeScreen.folderId === 'sd_root';
  const isAnalyzer = activeScreen.type === 'analyzer';
  const isSettings = activeScreen.type === 'settings';
  const isAbout = activeScreen.type === 'about';

  const navItemClass = (active: boolean) =>
    `w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center gap-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
      active
        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70'
    }`;

  const content = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 select-none">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-base font-bold text-slate-900 dark:text-slate-100">
            AG File Manager
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            v{settings.currentVersionName} · File Manager
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Close drawer"
        >
          <X size={20} />
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <button
          type="button"
          onClick={() => {
            onNavigate({ type: 'home' });
            onClose();
          }}
          className={navItemClass(isHome)}
        >
          <Home size={19} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigate({ type: 'folder', folderId: 'internal_root' });
            onClose();
          }}
          className={navItemClass(isInternal)}
        >
          <HardDrive size={19} />
          <span>Internal</span>
        </button>

        {settings.sdCardMounted && (
          <button
            type="button"
            onClick={() => {
              onNavigate({ type: 'folder', folderId: 'sd_root' });
              onClose();
            }}
            className={navItemClass(isExternal)}
          >
            <MemoryStick size={19} />
            <span>External</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onNavigate({ type: 'analyzer', tool: 'file_analyzer' });
            onClose();
          }}
          className={navItemClass(isAnalyzer)}
        >
          <BarChart3 size={19} />
          <span>File Analyzer</span>
        </button>

        <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

        {/* Toggle: Show Hidden Files */}
        <button
          type="button"
          role="switch"
          aria-checked={settings.showHiddenFiles}
          onClick={onToggleHidden}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
        >
          <span className="flex items-center gap-3.5">
            <Eye size={19} />
            <span>Show Hidden Files</span>
          </span>
          <span
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors flex items-center ${
              settings.showHiddenFiles ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transform transition-transform ${
                settings.showHiddenFiles ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </span>
        </button>

        {/* Toggle: Show Thumbnails */}
        <button
          type="button"
          role="switch"
          aria-checked={settings.showThumbnails}
          onClick={onToggleThumbnails}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
        >
          <span className="flex items-center gap-3.5">
            <ImageIcon size={19} />
            <span>Show Thumbnails</span>
          </span>
          <span
            className={`w-10 h-5.5 rounded-full p-0.5 transition-colors flex items-center ${
              settings.showThumbnails ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
          >
            <span
              className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transform transition-transform ${
                settings.showThumbnails ? 'translate-x-4.5' : 'translate-x-0'
              }`}
            />
          </span>
        </button>

        <div className="my-2 border-t border-slate-100 dark:border-slate-800" />

        <button
          type="button"
          onClick={() => {
            onNavigate({ type: 'settings' });
            onClose();
          }}
          className={navItemClass(isSettings)}
        >
          <Settings size={19} />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onCheckUpdate();
          }}
          className={navItemClass(false)}
        >
          <DownloadCloud size={19} />
          <span>Check Update</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigate({ type: 'about' });
            onClose();
          }}
          className={navItemClass(isAbout)}
        >
          <Info size={19} />
          <span>About</span>
        </button>
      </nav>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-72 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
        {content}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative w-76 max-w-[85vw] h-full z-10 shadow-2xl">{content}</div>
        </div>
      )}
    </>
  );
};
