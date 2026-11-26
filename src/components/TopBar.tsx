import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  BarChart3,
  ChevronRight,
  Clock,
  Copy,
  File,
  FilePlus2,
  FileText,
  Folder,
  FolderMinus,
  FolderPlus,
  HardDrive,
  Home,
  Image as ImageIcon,
  Info,
  Layers,
  MemoryStick,
  Menu,
  MoreVertical,
  Music,
  Package,
  PackageCheck,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { ActiveScreen, TabWindow } from '../types/fileManager';

let measureCtx: CanvasRenderingContext2D | null = null;
function measureWindowLabelWidth(text: string): number {
  if (typeof document === 'undefined') return text.length * 7;
  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d');
  }
  if (!measureCtx) return text.length * 7;
  measureCtx.font = '600 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  return Math.ceil(measureCtx.measureText(text).width);
}

function getWindowIcon(screen: ActiveScreen, size = 13): React.ReactNode {
  switch (screen.type) {
    case 'home':
      return <Home size={size} />;
    case 'settings':
      return <Settings size={size} />;
    case 'about':
      return <Info size={size} />;
    case 'folder':
      if (screen.folderId === 'internal_root') return <HardDrive size={size} />;
      if (screen.folderId === 'sd_root') return <MemoryStick size={size} />;
      return <Folder size={size} />;
    case 'category':
      switch (screen.category) {
        case 'images':
          return <ImageIcon size={size} />;
        case 'videos':
          return <Video size={size} />;
        case 'audio':
          return <Music size={size} />;
        case 'apps':
          return <Package size={size} />;
        case 'apk_files':
          return <PackageCheck size={size} />;
        case 'new_files':
          return <Sparkles size={size} />;
        case 'compressed':
          return <Archive size={size} />;
        case 'documents':
          return <FileText size={size} />;
        case 'recycle_bin':
          return <Trash2 size={size} />;
      }
      break;
    case 'analyzer':
      switch (screen.tool) {
        case 'file_analyzer':
          return <BarChart3 size={size} />;
        case 'large_files':
          return <Layers size={size} />;
        case 'recent_files':
          return <Clock size={size} />;
        case 'empty_folders':
          return <FolderMinus size={size} />;
        case 'app_cache':
          return <Zap size={size} />;
        case 'duplicate_files':
          return <Copy size={size} />;
      }
      break;
  }
  return <Folder size={size} />;
}

interface TopBarProps {
  onOpenDrawer: () => void;
  onGoHome: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchOpen: boolean;
  onToggleSearch: (open: boolean) => void;
  onNewItem: (type: 'folder' | 'text' | 'file') => void;
  onUploadFiles: () => void;
  onOpenViewSort: () => void;
  historyPaths: { id: string; label: string; path: string }[];
  onNavigateHistory: (folderId: string) => void;
  windows: TabWindow[];
  activeWindowId: string | null;
  isHomeActive: boolean;
  maxWindows: number;
  onSelectWindow: (windowId: string) => void;
  onNewWindow: () => void;
  onCloseWindow: (windowId: string) => void;
  onCloseOtherWindows: () => void;
  onCloseAllWindows: () => void;
  rightMenuOpen?: boolean;
  onRightMenuOpenChange?: (open: boolean) => void;
  rightWrapperRef?: React.RefObject<HTMLDivElement | null>;
  rightPanelRef?: React.RefObject<HTMLDivElement | null>;
  rightBackdropRef?: React.RefObject<HTMLDivElement | null>;
}

type OverflowSubmenu = 'root' | 'new' | 'history' | 'windows';

export const TopBar: React.FC<TopBarProps> = ({
  onOpenDrawer,
  onGoHome,
  searchQuery,
  onSearchChange,
  searchOpen,
  onToggleSearch,
  onNewItem,
  onUploadFiles,
  onOpenViewSort,
  historyPaths,
  onNavigateHistory,
  windows,
  activeWindowId,
  isHomeActive,
  maxWindows,
  onSelectWindow,
  onNewWindow,
  onCloseWindow,
  onCloseOtherWindows,
  onCloseAllWindows,
  rightMenuOpen,
  onRightMenuOpenChange,
  rightWrapperRef,
  rightPanelRef,
  rightBackdropRef,
}) => {
  const [internalMenuOpen, setInternalMenuOpen] = useState(false);
  const menuOpen = rightMenuOpen !== undefined ? rightMenuOpen : internalMenuOpen;
  const setMenuOpen = (val: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof val === 'function' ? val(menuOpen) : val;
    if (onRightMenuOpenChange) {
      onRightMenuOpenChange(next);
    } else {
      setInternalMenuOpen(next);
    }
  };
  const [submenu, setSubmenu] = useState<OverflowSubmenu>('root');
  const [stripWidth, setStripWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? Math.max(120, window.innerWidth - 160) : 480
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const windowsStripRef = useRef<HTMLDivElement>(null);
  const localRightWrapperRef = useRef<HTMLDivElement>(null);
  const localRightPanelRef = useRef<HTMLDivElement>(null);
  const localRightBackdropRef = useRef<HTMLDivElement>(null);
  const resolvedRightWrapperRef = rightWrapperRef || localRightWrapperRef;
  const resolvedRightPanelRef = rightPanelRef || localRightPanelRef;
  const resolvedRightBackdropRef = rightBackdropRef || localRightBackdropRef;
  const rightCloseDragRef = useRef<{
    startX: number;
    startY: number;
    lastDx: number;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    const el = windowsStripRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const updateWidth = () => {
      if (el.clientWidth > 0) {
        setStripWidth(el.clientWidth);
      }
    };
    updateWidth();
    const ro = new ResizeObserver(updateWidth);
    ro.observe(el);
    return () => ro.disconnect();
  }, [searchOpen, windows.length]);

  const windowDisplayModes = useMemo(() => {
    const count = windows.length;
    if (count === 0) return new Map<string, { showName: boolean; maxLabelPx: number }>();

    const isWide = stripWidth >= 420;
    const iconOnlyW = isWide ? 38 : 32;
    const gapW = isWide ? 4 : 3;
    const baseTextChromeW = isWide ? 42 : 36;
    const maxLabelCap = isWide ? 116 : 92;

    const totalGaps = Math.max(0, count - 1) * gapW;
    let remainingPx = stripWidth - count * iconOnlyW - totalGaps;

    const desiredTextWidths = windows.map((w) =>
      Math.min(maxLabelCap, measureWindowLabelWidth(w.title))
    );

    // Prioritize active window first, then left-to-right creation order
    const activeIdx = !isHomeActive
      ? windows.findIndex((w) => w.id === activeWindowId)
      : -1;
    const priorityIndices: number[] = [];
    if (activeIdx >= 0) priorityIndices.push(activeIdx);
    for (let i = 0; i < count; i++) {
      if (i !== activeIdx) priorityIndices.push(i);
    }

    const allocated = new Map<string, { showName: boolean; maxLabelPx: number }>();

    // Pass 1: allocate full labels for as many windows as fit cleanly
    for (const idx of priorityIndices) {
      const win = windows[idx];
      const textW = desiredTextWidths[idx];
      const extraNeeded = baseTextChromeW + textW - iconOnlyW + 4;
      if (remainingPx >= extraNeeded) {
        allocated.set(win.id, { showName: true, maxLabelPx: textW + 4 });
        remainingPx -= extraNeeded;
      }
    }

    // Pass 2: if enough partial room remains for at least a readable truncated label, allow one more
    for (const idx of priorityIndices) {
      const win = windows[idx];
      if (allocated.has(win.id)) continue;
      const minReadableLabel = 38;
      const chromeOverhead = baseTextChromeW - iconOnlyW;
      if (remainingPx >= chromeOverhead + minReadableLabel) {
        const labelPx = Math.min(desiredTextWidths[idx] + 4, remainingPx - chromeOverhead);
        allocated.set(win.id, { showName: true, maxLabelPx: labelPx });
        remainingPx = 0;
        break;
      }
    }

    for (const win of windows) {
      if (!allocated.has(win.id)) {
        allocated.set(win.id, { showName: false, maxLabelPx: 0 });
      }
    }

    return allocated;
  }, [windows, stripWidth, isHomeActive, activeWindowId]);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!menuOpen) {
      setSubmenu('root');
    }
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    setSubmenu('root');
  };

  const handleRightSidebarTouchStart = (e: React.TouchEvent) => {
    if (!menuOpen || e.touches.length !== 1) return;
    rightCloseDragRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      lastDx: 0,
      active: true,
    };
  };

  const handleRightSidebarTouchMove = (e: React.TouchEvent) => {
    const state = rightCloseDragRef.current;
    if (!state || !state.active || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - state.startX;
    const dy = e.touches[0].clientY - state.startY;
    if (Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx) * 0.9) {
      rightCloseDragRef.current = null;
      if (resolvedRightPanelRef.current) {
        resolvedRightPanelRef.current.style.transition = '';
        resolvedRightPanelRef.current.style.transform = '';
      }
      if (resolvedRightBackdropRef.current) {
        resolvedRightBackdropRef.current.style.transition = '';
        resolvedRightBackdropRef.current.style.opacity = '';
      }
      return;
    }
    if (dx > 0 && Math.abs(dx) > Math.abs(dy)) {
      const panelW = resolvedRightPanelRef.current?.offsetWidth || 280;
      const clamped = Math.min(panelW, Math.max(0, dx));
      state.lastDx = clamped;
      if (resolvedRightPanelRef.current) {
        resolvedRightPanelRef.current.style.transition = 'none';
        resolvedRightPanelRef.current.style.transform = `translate3d(${clamped}px, 0, 0)`;
      }
      if (resolvedRightBackdropRef.current) {
        resolvedRightBackdropRef.current.style.transition = 'none';
        resolvedRightBackdropRef.current.style.opacity = String(Math.max(0, 1 - clamped / panelW));
      }
    }
  };

  const handleRightSidebarTouchEnd = () => {
    const state = rightCloseDragRef.current;
    rightCloseDragRef.current = null;
    if (resolvedRightPanelRef.current) {
      resolvedRightPanelRef.current.style.transition = '';
      resolvedRightPanelRef.current.style.transform = '';
    }
    if (resolvedRightBackdropRef.current) {
      resolvedRightBackdropRef.current.style.transition = '';
      resolvedRightBackdropRef.current.style.opacity = '';
    }
    if (state?.active && state.lastDx >= 52) {
      closeMenu();
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="h-14 px-1.5 sm:px-4 flex items-center gap-1 sm:gap-1.5">
        {searchOpen ? (
          <div className="flex-1 flex items-center gap-2">
            <Search size={18} className="text-slate-400 shrink-0 ml-1" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search files, folders, APKs..."
              className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none py-2"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                aria-label="Clear search"
              >
                <XCircle size={18} />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onToggleSearch(false);
              }}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              aria-label="Close search"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <>
            {/* Left: Drawer Menu + Home */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <button
                type="button"
                onClick={onOpenDrawer}
                className="w-8 h-9 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 shrink-0"
                aria-label="Open navigation menu"
              >
                <Menu size={19} />
              </button>
              <button
                type="button"
                onClick={onGoHome}
                className={`w-8 h-9 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-colors shrink-0 ${
                  isHomeActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label="Home"
                title="Home"
              >
                <Home size={18} />
              </button>
            </div>

            {/* Center: Up to 6 Open Windows with Icon + Auto-Overflow Name */}
            <div
              ref={windowsStripRef}
              className="flex-1 min-w-0 flex items-center gap-[3px] sm:gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Active windows"
            >
              {windows.map((win) => {
                const isActive = !isHomeActive && win.id === activeWindowId;
                const mode = windowDisplayModes.get(win.id) ?? { showName: false, maxLabelPx: 0 };
                return (
                  <div
                    key={win.id}
                    className={`inline-flex items-center h-7 sm:h-8 rounded-lg border transition-colors shrink-0 ${
                      isActive
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={win.title}
                      onClick={() => onSelectWindow(win.id)}
                      title={win.title}
                      className={`h-full flex items-center rounded-l-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                        mode.showName ? 'pl-1.5 pr-1 gap-1' : 'pl-1 pr-0.5 justify-center'
                      }`}
                    >
                      <span className="shrink-0 flex items-center">
                        {getWindowIcon(win.screen, mode.showName ? 13 : 12)}
                      </span>
                      {mode.showName && (
                        <span
                          className="text-[11px] sm:text-xs font-semibold truncate leading-none"
                          style={{ maxWidth: `${mode.maxLabelPx}px` }}
                        >
                          {win.title}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseWindow(win.id);
                      }}
                      aria-label={`Close ${win.title}`}
                      title={`Close ${win.title}`}
                      className={`h-full flex items-center justify-center rounded-r-lg transition-colors shrink-0 ${
                        mode.showName ? 'w-4 sm:w-5' : 'w-3.5 sm:w-4'
                      } ${
                        isActive
                          ? 'text-white/85 hover:text-white hover:bg-white/20'
                          : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                      }`}
                    >
                      <X size={mode.showName ? 10 : 9} strokeWidth={2.75} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Right: Search Icon Button + 3-Dot Overflow Menu Button */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onToggleSearch(true)}
                className="w-8 h-9 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Search files"
                title="Search"
              >
                <Search size={18} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen((prev) => !prev);
                  setSubmenu('root');
                }}
                className="w-8 h-9 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="More options"
                aria-expanded={menuOpen}
              >
                <MoreVertical size={19} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Smooth Right Slide-Over Three-Dot Sidebar */}
      <div
        ref={resolvedRightWrapperRef}
        aria-hidden={!menuOpen}
        onTouchStart={handleRightSidebarTouchStart}
        onTouchMove={handleRightSidebarTouchMove}
        onTouchEnd={handleRightSidebarTouchEnd}
        onTouchCancel={handleRightSidebarTouchEnd}
        className={`fixed inset-0 z-50 flex justify-end transition-[visibility] duration-250 ${
          menuOpen ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
        }`}
      >
        <div
          ref={resolvedRightBackdropRef}
          className={`fixed inset-0 bg-black/40 transition-opacity duration-250 ease-out ${
            menuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={closeMenu}
          aria-hidden="true"
        />

        <div
          ref={resolvedRightPanelRef}
          className={`relative w-72 max-w-[84vw] h-full z-10 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col text-sm will-change-transform transition-transform duration-250 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
            {submenu === 'root' ? (
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Options
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setSubmenu('root')}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>
                  ← Back ·{' '}
                  {submenu === 'new'
                    ? 'New'
                    : submenu === 'history'
                      ? 'History'
                      : `Windows (${windows.length}/${maxWindows})`}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={closeMenu}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close options menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {submenu === 'root' && (
              <>
                <button
                  type="button"
                  onClick={() => setSubmenu('new')}
                  className="w-full min-h-[44px] px-4 py-2.5 flex items-center justify-between text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                >
                  <span>New</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onOpenViewSort();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 flex items-center justify-between text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                >
                  <span>View &amp; Sort</span>
                  <SlidersHorizontal size={15} className="text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setSubmenu('history')}
                  className="w-full min-h-[44px] px-4 py-2.5 flex items-center justify-between text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                >
                  <span>History</span>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setSubmenu('windows')}
                  className="w-full min-h-[44px] px-4 py-2.5 flex items-center justify-between text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                >
                  <span>
                    Windows ({windows.length}/{maxWindows})
                  </span>
                  <ChevronRight size={16} className="text-slate-400" />
                </button>
                <div className="my-1.5 border-t border-slate-100 dark:border-slate-800" />
                <button
                  type="button"
                  onClick={() => {
                    onCloseOtherWindows();
                    closeMenu();
                  }}
                  disabled={isHomeActive || windows.length <= 1}
                  className="w-full min-h-[44px] px-4 py-2.5 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:opacity-40 disabled:pointer-events-none"
                >
                  Close Other Windows
                </button>
              </>
            )}

            {submenu === 'new' && (
              <div>
                <button
                  type="button"
                  onClick={() => {
                    onNewItem('folder');
                    closeMenu();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 flex items-center gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                >
                  <FolderPlus size={16} className="text-amber-600" />
                  <span>Folder</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNewItem('text');
                    closeMenu();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 flex items-center gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                >
                  <FilePlus2 size={16} className="text-blue-600" />
                  <span>Text File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNewItem('file');
                    closeMenu();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 flex items-center gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                >
                  <File size={16} className="text-slate-500" />
                  <span>File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUploadFiles();
                    closeMenu();
                  }}
                  className="w-full min-h-[44px] px-4 py-2.5 flex items-center gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                >
                  <Upload size={16} className="text-emerald-600" />
                  <span>Import from Device</span>
                </button>
              </div>
            )}

            {submenu === 'history' && (
              <div className="py-1">
                {historyPaths.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-500">
                    No folders visited yet
                  </div>
                ) : (
                  historyPaths.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        onNavigateHistory(h.id);
                        closeMenu();
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-2.5"
                    >
                      <Clock size={14} className="text-slate-400 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                          {h.label}
                        </div>
                        <div className="text-xs font-mono text-slate-500 truncate">
                          {h.path}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {submenu === 'windows' && (
              <div>
                <div className="py-1">
                  {windows.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-slate-500">
                      No open windows yet. Open a folder, category, or tool from Home.
                    </div>
                  ) : (
                    windows.map((win) => {
                      const isActive = !isHomeActive && win.id === activeWindowId;
                      return (
                        <div
                          key={win.id}
                          className={`px-3 py-2 flex items-center justify-between gap-2 ${
                            isActive
                              ? 'bg-blue-50/80 dark:bg-blue-950/30'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectWindow(win.id);
                              closeMenu();
                            }}
                            className="flex-1 flex items-center gap-2 text-left min-w-0"
                          >
                            <span
                              className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {getWindowIcon(win.screen, 13)}
                            </span>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                              {win.title}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onCloseWindow(win.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                            aria-label={`Close ${win.title}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 px-3 pb-2 space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onNewWindow();
                      closeMenu();
                    }}
                    disabled={windows.length >= maxWindows}
                    className="w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Layers size={14} />
                    <span>
                      {windows.length >= maxWindows
                        ? `Max ${maxWindows} Windows Reached`
                        : '+ New Window'}
                    </span>
                  </button>
                  {windows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onCloseAllWindows();
                        closeMenu();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left"
                    >
                      Close All Windows
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
