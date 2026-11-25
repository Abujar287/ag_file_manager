import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FolderDown,
  Info,
  Package,
  Search,
  Share2,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import { InstalledApp } from '../types/fileManager';
import { formatBytes } from '../utils/formatters';
import {
  isRunningInAndroidApp,
  launchInstalledApp,
  openInstalledAppDetails,
  uninstallInstalledApp,
  uninstallInstalledApps,
} from '../services/deviceStorageService';

interface InstalledAppsViewProps {
  apps: InstalledApp[];
  loading: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onOpenApkFiles: () => void;
  onBackupApk: (app: InstalledApp) => void;
  onShareApk: (app: InstalledApp) => void;
  onShowToast: (msg: string) => void;
}

export const InstalledAppsView: React.FC<InstalledAppsViewProps> = memo(({
  apps,
  loading,
  onBack,
  onRefresh,
  onOpenApkFiles,
  onBackupApk,
  onShareApk,
  onShowToast,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'user' | 'system'>('all');
  const [query, setQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<InstalledApp | null>(null);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const selectedPackagesRef = useRef<string[]>(selectedPackages);
  selectedPackagesRef.current = selectedPackages;

  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const inAndroid = isRunningInAndroidApp();

  // Prune packages that were uninstalled
  useEffect(() => {
    setSelectedPackages((prev) => {
      if (prev.length === 0) return prev;
      const existing = new Set(apps.map((a) => a.packageName));
      const next = prev.filter((pkg) => existing.has(pkg));
      return next.length === prev.length ? prev : next;
    });
  }, [apps]);

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((app) => {
      if (filterMode === 'user' && app.isSystemApp) return false;
      if (filterMode === 'system' && !app.isSystemApp) return false;
      if (!q) return true;
      return (
        app.name.toLowerCase().includes(q) ||
        app.packageName.toLowerCase().includes(q)
      );
    });
  }, [apps, filterMode, query]);

  const userCount = useMemo(() => apps.filter((a) => !a.isSystemApp).length, [apps]);
  const systemCount = useMemo(() => apps.filter((a) => a.isSystemApp).length, [apps]);

  const isSelecting = selectedPackages.length > 0;
  const selectedSet = useMemo(() => new Set(selectedPackages), [selectedPackages]);
  const allFilteredSelected =
    filteredApps.length > 0 && filteredApps.every((a) => selectedSet.has(a.packageName));

  const toggleSelect = useCallback((packageName: string) => {
    setSelectedPackages((prev) =>
      prev.includes(packageName)
        ? prev.filter((p) => p !== packageName)
        : [...prev, packageName]
    );
  }, []);

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    pointerStartRef.current = null;
  }, []);

  const handlePointerDown = useCallback((packageName: string, e: React.PointerEvent) => {
    longPressTriggeredRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setSelectedPackages((prev) =>
        prev.includes(packageName) ? prev : [...prev, packageName]
      );
    }, 420);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStartRef.current || longPressTimerRef.current === null) return;
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      if (dx > 10 || dy > 10) {
        cancelLongPress();
      }
    },
    [cancelLongPress]
  );

  const handleRowClick = useCallback(
    (app: InstalledApp) => {
      if (longPressTriggeredRef.current) {
        longPressTriggeredRef.current = false;
        return;
      }
      if (selectedPackagesRef.current.length > 0) {
        toggleSelect(app.packageName);
        return;
      }
      setSelectedApp(app);
    },
    [toggleSelect]
  );

  const handleUninstallSelected = () => {
    if (selectedPackages.length === 0) return;
    if (!inAndroid) {
      onShowToast('Uninstalling apps is available inside Android APK');
      return;
    }
    const ok = uninstallInstalledApps(selectedPackages);
    if (ok) {
      onShowToast(
        selectedPackages.length === 1
          ? 'Confirm uninstall on device prompt'
          : `Starting uninstall for ${selectedPackages.length} selected apps`
      );
      setSelectedPackages([]);
    } else {
      onShowToast('Unable to start app uninstall');
    }
  };

  const singleSelectedApp = useMemo(
    () =>
      selectedPackages.length === 1
        ? apps.find((a) => a.packageName === selectedPackages[0]) || null
        : null,
    [apps, selectedPackages]
  );

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header Bar */}
      <div className="px-4 sm:px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            Installed Apps ({apps.length})
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenApkFiles}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60"
          >
            APK Files
          </button>
          {inAndroid && (
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="px-4 sm:px-6 py-3 space-y-2.5">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search installed apps or package name..."
            className="w-full pl-9 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              aria-label="Clear app search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: 'all' as const, label: `All (${apps.length})` },
              { id: 'user' as const, label: `User (${userCount})` },
              { id: 'system' as const, label: `System (${systemCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  filterMode === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {filteredApps.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setSelectedPackages(
                  allFilteredSelected ? [] : filteredApps.map((a) => a.packageName)
                )
              }
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shrink-0"
            >
              {allFilteredSelected ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>
      </div>

      {/* Multi-Select Banner */}
      {isSelecting && (
        <div className="mx-4 sm:mx-6 mb-3 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedPackages([])}
              className="p-1 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              aria-label="Clear selection"
            >
              <X size={17} />
            </button>
            <span className="text-sm font-semibold text-blue-900 dark:text-blue-100 tabular-nums">
              {selectedPackages.length} selected
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setSelectedPackages(
                allFilteredSelected ? [] : filteredApps.map((a) => a.packageName)
              )
            }
            className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline px-2 py-1"
          >
            {allFilteredSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      )}

      {/* App List */}
      {loading && apps.length === 0 ? (
        <div className="mx-4 sm:mx-6 py-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
          <div className="w-7 h-7 mx-auto mb-3 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Loading installed apps...
          </p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="mx-4 sm:mx-6 py-14 px-4 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <Smartphone size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {inAndroid
              ? 'No matching installed apps found'
              : 'Installed device apps appear in the Android APK'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {inAndroid
              ? 'Try clearing your search or switching between All, User, and System apps.'
              : 'Web browsers cannot read installed Android apps directly. Open APK Files to manage .apk installer files.'}
          </p>
          {!inAndroid && (
            <button
              type="button"
              onClick={onOpenApkFiles}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              View APK Files
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-200/70 dark:divide-slate-800/80 bg-white dark:bg-slate-900 sm:mx-6 sm:rounded-2xl sm:border sm:border-slate-200 sm:dark:border-slate-800 overflow-hidden">
          {filteredApps.map((app) => {
            const isSelected = selectedSet.has(app.packageName);
            return (
              <div
                key={app.packageName}
                onPointerDown={(e) => handlePointerDown(app.packageName, e)}
                onPointerMove={handlePointerMove}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onClick={() => handleRowClick(app)}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer select-none transition-colors ${
                  isSelected
                    ? 'bg-blue-50/90 dark:bg-blue-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {app.iconUrl ? (
                  <img
                    src={app.iconUrl}
                    alt={app.name}
                    loading="lazy"
                    className="w-11 h-11 rounded-xl shrink-0 object-cover bg-slate-100 dark:bg-slate-800"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Package size={22} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {app.name}
                    </span>
                    {app.isSystemApp && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                        System
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {app.packageName}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                    {app.versionName ? `v${app.versionName} · ` : ''}
                    {formatBytes(app.size)}
                  </div>
                </div>

                {!isSelecting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!launchInstalledApp(app.packageName)) {
                        setSelectedApp(app);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/70 shrink-0"
                  >
                    Open
                  </button>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(app.packageName);
                  }}
                  aria-label={`Select ${app.name}`}
                  className="min-w-[32px] min-h-[32px] flex items-center justify-center shrink-0"
                >
                  {isSelected ? (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700 hover:bg-blue-500 transition-colors" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-Select Bottom Action Bar */}
      {isSelecting && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg">
          <div className="max-w-3xl mx-auto px-3 py-2 flex items-center justify-around gap-2">
            <button
              type="button"
              onClick={handleUninstallSelected}
              className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
            >
              <Trash2 size={18} />
              <span>Uninstall ({selectedPackages.length})</span>
            </button>

            {singleSelectedApp && (
              <>
                {singleSelectedApp.apkPath && (
                  <button
                    type="button"
                    onClick={() => {
                      onBackupApk(singleSelectedApp);
                      setSelectedPackages([]);
                    }}
                    className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-medium"
                  >
                    <FolderDown size={18} />
                    <span>Backup APK</span>
                  </button>
                )}

                {singleSelectedApp.apkPath && (
                  <button
                    type="button"
                    onClick={() => {
                      onShareApk(singleSelectedApp);
                      setSelectedPackages([]);
                    }}
                    className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                  >
                    <Share2 size={18} />
                    <span>Share APK</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    openInstalledAppDetails(singleSelectedApp.packageName);
                    setSelectedPackages([]);
                  }}
                  className="min-h-[48px] flex-1 flex flex-col items-center justify-center gap-1 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                >
                  <Info size={18} />
                  <span>App Info</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* App Action Modal */}
      {selectedApp && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="w-full sm:max-w-sm bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {selectedApp.iconUrl ? (
                  <img
                    src={selectedApp.iconUrl}
                    alt={selectedApp.name}
                    className="w-10 h-10 rounded-xl shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl shrink-0 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                    <Package size={20} />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {selectedApp.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 truncate">
                    {selectedApp.packageName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-2 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              <button
                type="button"
                onClick={() => {
                  const ok = launchInstalledApp(selectedApp.packageName);
                  setSelectedApp(null);
                  if (!ok) onShowToast('Unable to launch this app');
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
              >
                <ExternalLink size={17} className="text-blue-600" />
                <span>Open App</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openInstalledAppDetails(selectedApp.packageName);
                  setSelectedApp(null);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
              >
                <Info size={17} className="text-slate-500" />
                <span>App Info</span>
              </button>

              {selectedApp.apkPath && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onBackupApk(selectedApp);
                      setSelectedApp(null);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <FolderDown size={17} className="text-emerald-600" />
                    <span>Backup APK to Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onShareApk(selectedApp);
                      setSelectedApp(null);
                    }}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <Share2 size={17} className="text-indigo-600" />
                    <span>Share APK</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  uninstallInstalledApp(selectedApp.packageName);
                  setSelectedApp(null);
                }}
                className="w-full px-4 py-3 flex items-center gap-3 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl"
              >
                <Trash2 size={17} />
                <span>{selectedApp.isSystemApp ? 'Uninstall / Updates' : 'Uninstall'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
