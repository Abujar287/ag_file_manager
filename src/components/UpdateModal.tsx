import React, { useEffect, useRef, useState } from 'react';
import { UpdateScenario } from '../types/fileManager';
import { triggerSystemDownload } from '../services/deviceStorageService';
import { AppLogo } from './AppLogo';

interface UpdateModalProps {
  open: boolean;
  currentVersion: string;
  newVersion: string;
  scenario: UpdateScenario;
  onClose: () => void;
  onSaveApkToPublicDownloads: (filename: string, sizeBytes: number) => void;
  onInstallCompleted: (newVersionName: string, newVersionCode: number) => void;
}

type ModalPhase =
  | 'checking'
  | 'up_to_date'
  | 'prompt'
  | 'downloading'
  | 'permission_prompt'
  | 'installer_confirm'
  | 'installing'
  | 'installed'
  | 'error';

// Lightweight R8-minified APK footprint (~1.8 MB)
const TOTAL_APK_MB = 1.8;
const TOTAL_APK_BYTES = Math.round(TOTAL_APK_MB * 1024 * 1024);

export const UpdateModal: React.FC<UpdateModalProps> = ({
  open,
  currentVersion,
  newVersion,
  scenario,
  onClose,
  onSaveApkToPublicDownloads,
  onInstallCompleted,
}) => {
  const [phase, setPhase] = useState<ModalPhase>('checking');
  const [downloadedMb, setDownloadedMb] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      clearTimers();
      return;
    }

    setDownloadedMb(0);
    setErrorMessage('');
    setInstallProgress(0);
    setPhase('checking');

    let mounted = true;
    const fetchLiveVersion = async () => {
      try {
        const res = await fetch('/version.json?' + Date.now());
        if (!res.ok) throw new Error('Failed to check update server');
        const data = await res.json();
        if (!mounted) return;

        if (data.versionCode && data.versionCode > 2) {
          setPhase('prompt');
        } else if (currentVersion === newVersion) {
          setPhase('up_to_date');
        } else {
          setPhase('prompt');
        }
      } catch (e) {
        if (!mounted) return;
        if (scenario === 'offline_error') {
          setErrorMessage('No internet connection. Please check your network and try again.');
          setPhase('error');
        } else if (scenario === 'up_to_date') {
          setPhase('up_to_date');
        } else {
          setPhase('prompt');
        }
      }
    };

    const timer = window.setTimeout(fetchLiveVersion, 350);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      clearTimers();
    };
  }, [open, scenario, currentVersion, newVersion]);

  if (!open) return null;

  const targetFilename = `AG_File_Manager_v${newVersion}.apk`;

  const startDownload = () => {
    setErrorMessage('');
    setDownloadedMb(0);
    setPhase('downloading');

    // Trigger download in system Download Manager / Internet Download Manager
    triggerSystemDownload(
      `/downloads/${targetFilename}`,
      targetFilename,
      `AG File Manager v${newVersion}`
    );

    clearTimers();
    let current = 0;

    // Simulates live DownloadManager query progress
    timerRef.current = window.setInterval(() => {
      current = Math.min(TOTAL_APK_MB, current + 0.18);
      setDownloadedMb(current);

      if (current >= TOTAL_APK_MB) {
        clearTimers();

        if (scenario === 'corrupted_apk') {
          setErrorMessage(
            'Downloaded APK package failed integrity verification. Please delete and retry.'
          );
          setPhase('error');
          return;
        }

        // Save directly into /storage/emulated/0/Download/ (Internal Storage -> Download)
        onSaveApkToPublicDownloads(targetFilename, TOTAL_APK_BYTES);

        if (scenario === 'permission_required') {
          setPhase('permission_prompt');
        } else {
          setPhase('installer_confirm');
        }
      }
    }, 100);
  };

  const handleConfirmInstall = () => {
    setPhase('installing');
    setInstallProgress(20);
    clearTimers();
    let p = 20;
    timerRef.current = window.setInterval(() => {
      p = Math.min(100, p + 28);
      setInstallProgress(p);
      if (p >= 100) {
        clearTimers();
        setPhase('installed');
      }
    }, 180);
  };

  const handleOpenUpdatedApp = () => {
    onInstallCompleted(newVersion, 3);
    onClose();
  };

  const percent = Math.min(100, Math.round((downloadedMb / TOTAL_APK_MB) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {phase === 'checking' && (
          <div className="p-6 text-center space-y-3">
            <div className="w-7 h-7 mx-auto rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Checking for updates...
            </p>
          </div>
        )}

        {phase === 'up_to_date' && (
          <div className="p-6 space-y-5">
            <p className="text-sm text-slate-800 dark:text-slate-200">
              You are using the latest version.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* STRICT MINIMAL "Update Available Now" Dialog (prompt + live download progress) */}
        {(phase === 'prompt' || phase === 'downloading') && (
          <div className="p-6 space-y-5">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Update Available Now
            </h2>

            <div className="space-y-1.5 text-sm">
              <div className="text-slate-600 dark:text-slate-400 tabular-nums">
                Current Version: {currentVersion}
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                New Version: {newVersion}
              </div>
            </div>

            {phase === 'downloading' && (
              <div className="space-y-2 pt-1">
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-100"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                  {percent}% — {downloadedMb.toFixed(1)} MB / {TOTAL_APK_MB.toFixed(1)} MB
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  clearTimers();
                  onClose();
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={phase === 'downloading'}
                onClick={startDownload}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
              >
                Download
              </button>
            </div>
          </div>
        )}

        {/* Install Unknown Apps Permission Request */}
        {phase === 'permission_prompt' && (
          <div className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Install Permission Required
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Allow AG File Manager to install updates from{' '}
              <span className="font-mono text-xs">/storage/emulated/0/Download/{targetFilename}</span>.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setPhase('installer_confirm')}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Allow & Continue
              </button>
            </div>
          </div>
        )}

        {/* Standard Android Package Installer Update Prompt */}
        {phase === 'installer_confirm' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <AppLogo size={38} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  AG File Manager
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                  Download/{targetFilename}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300">
              Do you want to install an update to this existing application?
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmInstall}
                className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Update
              </button>
            </div>
          </div>
        )}

        {phase === 'installing' && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <AppLogo size={38} />
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                AG File Manager
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-600 dark:text-slate-300">Installing...</div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-150"
                  style={{ width: `${installProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {phase === 'installed' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <AppLogo size={38} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  AG File Manager
                </h2>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  App installed · v{newVersion}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onInstallCompleted(newVersion, 3);
                  onClose();
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleOpenUpdatedApp}
                className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Open
              </button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-rose-600 dark:text-rose-400">
              Update Failed
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">{errorMessage}</p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Close
              </button>
              {scenario !== 'offline_error' && (
                <button
                  type="button"
                  onClick={startDownload}
                  className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
