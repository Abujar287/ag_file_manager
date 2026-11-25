import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronRight,
  Clock,
  File,
  FilePlus2,
  FolderPlus,
  Grid2X2,
  Home,
  Layers,
  List,
  Menu,
  MoreVertical,
  Search,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import { SortBy, SortOrder, TabWindow, ViewMode } from '../types/fileManager';

interface TopBarProps {
  onOpenDrawer: () => void;
  onGoHome: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchOpen: boolean;
  onToggleSearch: (open: boolean) => void;
  onNewItem: (type: 'folder' | 'text' | 'file') => void;
  onUploadFiles: () => void;
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onChangeSort: (sortBy: SortBy) => void;
  historyPaths: { id: string; label: string; path: string }[];
  onNavigateHistory: (folderId: string) => void;
  tabs: TabWindow[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
  onCloseOtherPages: () => void;
}

type OverflowSubmenu = 'root' | 'new' | 'view' | 'history' | 'windows';

export const TopBar: React.FC<TopBarProps> = ({
  onOpenDrawer,
  onGoHome,
  searchQuery,
  onSearchChange,
  searchOpen,
  onToggleSearch,
  onNewItem,
  onUploadFiles,
  viewMode,
  onChangeViewMode,
  sortBy,
  sortOrder,
  onChangeSort,
  historyPaths,
  onNavigateHistory,
  tabs,
  activeTabId,
  onSelectTab,
  onNewTab,
  onCloseTab,
  onCloseOtherPages,
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
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="h-14 px-3 sm:px-5 flex items-center justify-between gap-2">
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
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={onOpenDrawer}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-2 focus-visible:outline-blue-600"
                aria-label="Open navigation menu"
              >
                <Menu size={22} />
              </button>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
                AG File Manager
              </h1>
            </div>

            {/* Right: Home Icon Button, Search Icon Button, 3-Dot Overflow Menu */}
            <div className="flex items-center gap-0.5 shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={onGoHome}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Home"
                title="Home"
              >
                <Home size={20} />
              </button>

              <button
                type="button"
                onClick={() => onToggleSearch(true)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Search files"
                title="Search"
              >
                <Search size={20} />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen((prev) => !prev);
                    setSubmenu('root');
                  }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="More options"
                  aria-expanded={menuOpen}
                >
                  <MoreVertical size={20} />
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
                          onClick={() => setSubmenu('view')}
                          className="w-full px-4 py-2.5 flex items-center justify-between text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                        >
                          <span>View</span>
                          <ChevronRight size={16} className="text-slate-400" />
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
                          <span>Windows ({tabs.length})</span>
                          <ChevronRight size={16} className="text-slate-400" />
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                        <button
                          type="button"
                          onClick={() => {
                            onCloseOtherPages();
                            closeMenu();
                          }}
                          disabled={tabs.length <= 1}
                          className="w-full px-4 py-2.5 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 disabled:opacity-40 disabled:pointer-events-none"
                        >
                          Close Other Pages
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

                    {submenu === 'view' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setSubmenu('root')}
                          className="w-full px-4 py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 text-left border-b border-slate-100 dark:border-slate-800"
                        >
                          ← Back · View & Sort
                        </button>
                        <div className="px-4 pt-2.5 pb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          View Mode
                        </div>
                        <div className="px-3 pb-2 grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() => onChangeViewMode('list')}
                            className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
                              viewMode === 'list'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <List size={14} />
                            <span>List</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onChangeViewMode('grid')}
                            className={`px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-medium transition-colors ${
                              viewMode === 'grid'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <Grid2X2 size={14} />
                            <span>Grid</span>
                          </button>
                        </div>
                        <div className="px-4 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                          Sort By
                        </div>
                        {(['name', 'size', 'date', 'type'] as SortBy[]).map((key) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => onChangeSort(key)}
                            className="w-full px-4 py-2 flex items-center justify-between text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 capitalize"
                          >
                            <span>{key}</span>
                            {sortBy === key && (
                              <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                                {sortOrder === 'asc' ? 'Asc' : 'Desc'}
                                <Check size={14} />
                              </span>
                            )}
                          </button>
                        ))}
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
                          ← Back · Windows
                        </button>
                        <div className="max-h-60 overflow-y-auto py-1">
                          {tabs.map((tab) => (
                            <div
                              key={tab.id}
                              className={`px-3 py-2 flex items-center justify-between gap-2 ${
                                tab.id === activeTabId
                                  ? 'bg-blue-50/80 dark:bg-blue-950/30'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/80'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectTab(tab.id);
                                  closeMenu();
                                }}
                                className="flex-1 flex items-center gap-2 text-left min-w-0"
                              >
                                <Layers
                                  size={14}
                                  className={
                                    tab.id === activeTabId ? 'text-blue-600' : 'text-slate-400'
                                  }
                                />
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                                  {tab.title}
                                </span>
                              </button>
                              {tabs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => onCloseTab(tab.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                  aria-label={`Close ${tab.title}`}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-1 px-2 pb-1">
                          <button
                            type="button"
                            onClick={() => {
                              onNewTab();
                              closeMenu();
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left"
                          >
                            + New Window Tab
                          </button>
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
