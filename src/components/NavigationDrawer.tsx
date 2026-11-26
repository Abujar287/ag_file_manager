import React, { useRef } from 'react';
import {
  BarChart3,
  Check,
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
import { AppLogo } from './AppLogo';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  activeScreen: ActiveScreen;
  settings: AppSettings;
  onNavigate: (screen: ActiveScreen) => void;
  onToggleHidden: () => void;
  onToggleThumbnails: () => void;
  onCheckUpdate: () => void;
  wrapperRef?: React.RefObject<HTMLDivElement | null>;
  panelRef?: React.RefObject<HTMLDivElement | null>;
  backdropRef?: React.RefObject<HTMLDivElement | null>;
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
  wrapperRef,
  panelRef,
  backdropRef,
}) => {
  const localWrapperRef = useRef<HTMLDivElement>(null);
  const localPanelRef = useRef<HTMLDivElement>(null);
  const localBackdropRef = useRef<HTMLDivElement>(null);
  const resolvedWrapperRef = wrapperRef || localWrapperRef;
  const resolvedPanelRef = panelRef || localPanelRef;
  const resolvedBackdropRef = backdropRef || localBackdropRef;
  const closeDragRef = useRef<{ startX: number; startY: number; lastDx: number; active: boolean } | null>(null);
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
        <div className="flex items-center gap-3">
          <AppLogo size={36} />
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-slate-100">
              AG File Manager
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
              v{settings.currentVersionName} · File Manager
            </div>
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

        {/* Checkbox: Show Hidden Files */}
        <button
          type="button"
          role="checkbox"
          aria-checked={settings.showHiddenFiles}
          onClick={onToggleHidden}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
        >
          <span className="flex items-center gap-3.5">
            <Eye size={19} />
            <span>Show Hidden Files</span>
          </span>
          <span
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
              settings.showHiddenFiles
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-300 dark:border-slate-600 bg-transparent text-transparent'
            }`}
          >
            <Check size={14} strokeWidth={2.75} />
          </span>
        </button>

        {/* Checkbox: Show Thumbnails */}
        <button
          type="button"
          role="checkbox"
          aria-checked={settings.showThumbnails}
          onClick={onToggleThumbnails}
          className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors"
        >
          <span className="flex items-center gap-3.5">
            <ImageIcon size={19} />
            <span>Show Thumbnails</span>
          </span>
          <span
            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
              settings.showThumbnails
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-300 dark:border-slate-600 bg-transparent text-transparent'
            }`}
          >
            <Check size={14} strokeWidth={2.75} />
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

  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    if (!open || e.touches.length !== 1) return;
    closeDragRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      lastDx: 0,
      active: true,
    };
  };

  const handleDrawerTouchMove = (e: React.TouchEvent) => {
    const state = closeDragRef.current;
    if (!state || !state.active || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - state.startX;
    const dy = e.touches[0].clientY - state.startY;
    if (Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx) * 0.9) {
      closeDragRef.current = null;
      if (resolvedPanelRef.current) {
        resolvedPanelRef.current.style.transition = '';
        resolvedPanelRef.current.style.transform = '';
      }
      if (resolvedBackdropRef.current) {
        resolvedBackdropRef.current.style.transition = '';
        resolvedBackdropRef.current.style.opacity = '';
      }
      return;
    }
    if (dx < 0 && Math.abs(dx) > Math.abs(dy)) {
      const panelW = resolvedPanelRef.current?.offsetWidth || 280;
      const clamped = Math.max(-panelW, Math.min(0, dx));
      state.lastDx = clamped;
      if (resolvedPanelRef.current) {
        resolvedPanelRef.current.style.transition = 'none';
        resolvedPanelRef.current.style.transform = `translate3d(${clamped}px, 0, 0)`;
      }
      if (resolvedBackdropRef.current) {
        resolvedBackdropRef.current.style.transition = 'none';
        resolvedBackdropRef.current.style.opacity = String(Math.max(0, 1 + clamped / panelW));
      }
    }
  };

  const handleDrawerTouchEnd = () => {
    const state = closeDragRef.current;
    closeDragRef.current = null;
    if (resolvedPanelRef.current) {
      resolvedPanelRef.current.style.transition = '';
      resolvedPanelRef.current.style.transform = '';
    }
    if (resolvedBackdropRef.current) {
      resolvedBackdropRef.current.style.transition = '';
      resolvedBackdropRef.current.style.opacity = '';
    }
    if (state?.active && state.lastDx <= -52) {
      onClose();
    }
  };

  return (
    <>
      <aside className="hidden lg:block w-72 shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
        {content}
      </aside>

      <div
        ref={resolvedWrapperRef}
        aria-hidden={!open}
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
        onTouchCancel={handleDrawerTouchEnd}
        className={`fixed inset-0 z-50 lg:hidden flex transition-[visibility] duration-250 ${
          open ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
      >
        <div
          ref={resolvedBackdropRef}
          className={`fixed inset-0 bg-black/45 transition-opacity duration-250 ease-out ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={resolvedPanelRef}
          className={`relative w-76 max-w-[85vw] h-full z-10 shadow-2xl will-change-transform transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {content}
        </div>
      </div>
    </>
  );
};
