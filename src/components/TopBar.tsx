import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  Clock,
  File,
  FilePlus2,
  FolderPlus,
  Home,
  Layers,
  Menu,
  MoreVertical,
  Search,
  SlidersHorizontal,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { TabWindow } from '../types/fileManager';

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
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenu, setSubmenu] = useState<OverflowSubmenu>('root');
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 40);
    }
  }, [searchOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSubmenu('root');
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    setSubmenu('root');
  };

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
      <div className="h-14 px-2.5 sm:px-5 flex items-center justify-between gap-1.5 sm:gap-2">
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
            {/* Left: 3-Line Drawer Icon + App Title */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <button
                type="button"
                onClick={onOpenDrawer}
                className="min-w-[38px] min-h-[38px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 shrink-0"
                aria-label="Open navigation menu"
              >
                <Menu size={21} />
              </button>
              <h1 className="text-sm sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                AG File Manager
              </h1>
            </div>

            {/* Right: Home Icon Button, W1-W3 Indicators, Search Icon Button, 3-Dot Overflow Menu */}
            <div className="flex items-center gap-1 shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={onGoHome}
                className={`min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center rounded-xl transition-colors ${
                  isHomeActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                aria-label="Home"
                title="Home"
              >
                <Home size={19} />
              </button>

              {windows.length > 0 && (
                <div
                  className="flex items-center gap-1"
                  role="tablist"
                  aria-label="Active windows"
                >
                  {windows.map((win, index) => {
                    const isActive = !isHomeActive && win.id === activeWindowId;
                    const label = `W${index + 1}`;
                    return (
                      <button
                        key={win.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelectWindow(win.id)}
                        title={`${label}: ${win.title}`}
                        className={`min-w-[30px] sm:min-w-[34px] h-8 px-1.5 sm:px-2 rounded-lg text-xs font-bold tabular-nums transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => onToggleSearch(true)}
                className="min-w-[38px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Search files"
                title="Search"
              >
                <Search size={19} />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen((prev) => !prev);
                    setSubmenu('root');
                  }}
                  className="min-w-[36px] min-h-[38px] sm:min-w-[42px] sm:min-h-[42px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical size={19} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-1.5 z-50 text-sm">
                    {submenu === 'root' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSubmenu('new')}
                          className="w-full px-4 py-2.5 flex items-center justify-between text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
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
                          className="w-full px-4 py-2.5 flex items-center justify-between text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        >
                          <span>View &amp; Sort</span>
                          <SlidersHorizontal size={15} className="text-slate-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmenu('history')}
                          className="w-full px-4 py-2.5 flex items-center justify-between text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        >
                          <span>History</span>
                          <ChevronRight size={16} className="text-slate-400" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubmenu('windows')}
                          className="w-full px-4 py-2.5 flex items-center justify-between text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        >
                          <span>
                            Windows ({windows.length}/{maxWindows})
                          </span>
                          <ChevronRight size={16} className="text-slate-400" />
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                        <button
                          type="button"
                          onClick={() => {
                            onCloseOtherWindows();
                            closeMenu();
                          }}
                          disabled={isHomeActive || windows.length <= 1}
                          className="w-full px-4 py-2.5 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          Close Other Windows
                        </button>
                      </>
                    )}

                    {submenu === 'new' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setSubmenu('root')}
                          className="w-full px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 text-left border-b border-slate-100 dark:border-slate-800"
                        >
                          ← Back · New
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onNewItem('folder');
                            closeMenu();
                          }}
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
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
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
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
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
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
                          className="w-full px-4 py-2.5 flex items-center gap-3 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        >
                          <Upload size={16} className="text-emerald-600" />
                          <span>Import from Device</span>
                        </button>
                      </div>
                    )}

                    {submenu === 'history' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setSubmenu('root')}
                          className="w-full px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 text-left border-b border-slate-100 dark:border-slate-800"
                        >
                          ← Back · History
                        </button>
                        <div className="max-h-60 overflow-y-auto py-1">
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
                                className="w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-2.5"
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
                      </div>
                    )}

                    {submenu === 'windows' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setSubmenu('root')}
                          className="w-full px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 text-left border-b border-slate-100 dark:border-slate-800"
                        >
                          ← Back · Windows ({windows.length}/{maxWindows})
                        </button>
                        <div className="max-h-60 overflow-y-auto py-1">
                          {windows.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-slate-500">
                              No open windows yet. Open a folder from Home to start W1.
                            </div>
                          ) : (
                            windows.map((win, idx) => {
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
                                      className={`px-1.5 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                                        isActive
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                      }`}
                                    >
                                      W{idx + 1}
                                    </span>
                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                      {win.title}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onCloseWindow(win.id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded shrink-0"
                                    aria-label={`Close W${idx + 1}`}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-1 px-2 pb-1 space-y-1">
                          <button
                            type="button"
                            onClick={() => {
                              onNewWindow();
                              closeMenu();
                            }}
                            disabled={windows.length >= maxWindows}
                            className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left flex items-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
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
                              className="w-full px-3 py-2 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left"
                            >
                              Close All Windows
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
