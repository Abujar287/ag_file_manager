import React, { useEffect, useRef, useState } from 'react';
import { UpdateScenario } from '../types/fileManager';
import {
  fetchNativeUpdateManifest,
  getNativeBridge,
  getRunningAppVersion,
  isRunningInAndroidApp,
  NativeDownloadProgress,
  triggerSystemDownload,
} from '../services/deviceStorageService';
import {
  GITHUB_LATEST_RELEASE_API,
  GITHUB_LATEST_RELEASE_VERSION_URL,
  GITHUB_RELEASE_DOWNLOAD_BASE,
  GITHUB_REPO,
  REMOTE_DOWNLOADS_BASE_URL,
  REMOTE_VERSION_JSON_URL,
} from '../versionInfo';
import { AppLogo } from './AppLogo';

interface UpdateModalProps {
  open: boolean;
  currentVersion: string;
  currentVersionCode?: number;
  newVersion: string;
  scenario: UpdateScenario;
  onClose: () => void;
  onSaveApkToPublicDownloads: (filename: string, sizeBytes: number) => void;
  onInstallCompleted: (newVersionName: string, newVersionCode: number) => void;
}

interface RemoteVersionManifest {
  versionCode: number;
  versionName: string;
  apkUrl: string;
}

type ModalPhase =
  | 'checking'
  | 'up_to_date'
  | 'prompt'
  | 'downloading'
  | 'permission_prompt'
  | 'installer_confirm'
  | 'signature_conflict'
  | 'installing'
  | 'installed'
  | 'error';

export const UpdateModal: React.FC<UpdateModalProps> = ({
  open,
  currentVersion,
  currentVersionCode,
  newVersion,
  scenario,
  onClose,
  onSaveApkToPublicDownloads,
  onInstallCompleted,
}) => {
  const [phase, setPhase] = useState<ModalPhase>('checking');
  const [downloadedMb, setDownloadedMb] = useState(0);
  const [totalMb, setTotalMb] = useState(3.2);
  const [errorMessage, setErrorMessage] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [remoteManifest, setRemoteManifest] = useState<RemoteVersionManifest | null>(null);
  const [downloadedApkPath, setDownloadedApkPath] = useState<string>('');
  const timerRef = useRef<number | null>(null);

  const runningVersion = getRunningAppVersion();
  const effectiveCurrentCode = currentVersionCode ?? runningVersion.versionCode;
  const effectiveCurrentName = currentVersion || runningVersion.versionName;

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
    setTotalMb(3.2);
    setErrorMessage('');
    setInstallProgress(0);
    setDownloadedApkPath('');
    setPhase('checking');

    let mounted = true;
    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

    const compareVersionNames = (a: string, b: string): number => {
      const pa = a.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
      const pb = b.replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
      const len = Math.max(pa.length, pb.length, 3);
      for (let i = 0; i < len; i++) {
        const diff = (pa[i] || 0) - (pb[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    };

    const fetchManifest = async (): Promise<RemoteVersionManifest | null> => {
      const cacheBust = `?t=${Date.now()}`;
      const githubRawMirror = `https://github.com/${GITHUB_REPO}/raw/main/version.json`;
      const urls =
        isFileProtocol || isRunningInAndroidApp()
          ? [
              GITHUB_LATEST_RELEASE_VERSION_URL + cacheBust,
              REMOTE_VERSION_JSON_URL + cacheBust,
              githubRawMirror + cacheBust,
            ]
          : ['./version.json' + cacheBust, REMOTE_VERSION_JSON_URL + cacheBust];

      let best: RemoteVersionManifest | null = null;
      const pickBest = (
        current: RemoteVersionManifest | null,
        candidate: RemoteVersionManifest
      ): RemoteVersionManifest => {
        if (!current) return candidate;
        const verDiff = compareVersionNames(candidate.versionName, current.versionName);
        if (verDiff > 0 || (verDiff === 0 && candidate.versionCode > current.versionCode)) {
          return candidate;
        }
        return current;
      };

      // On Android WebView, native HttpURLConnection bypasses GitHub 302 CORS restrictions
      if (isRunningInAndroidApp()) {
        const nativeManifest = await fetchNativeUpdateManifest();
        if (nativeManifest) {
          best = pickBest(best, {
            versionCode: nativeManifest.versionCode,
            versionName: nativeManifest.versionName,
            apkUrl:
              nativeManifest.apkUrl ||
              `${GITHUB_RELEASE_DOWNLOAD_BASE}/v${nativeManifest.versionName}/AG_File_Manager_v${nativeManifest.versionName}.apk`,
          });
        }
      }

      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) continue;
          const data = (await res.json()) as Partial<RemoteVersionManifest>;
          if (typeof data.versionCode === 'number' && typeof data.versionName === 'string') {
            best = pickBest(best, {
              versionCode: data.versionCode,
              versionName: data.versionName,
              apkUrl:
                data.apkUrl ||
                `${GITHUB_RELEASE_DOWNLOAD_BASE}/v${data.versionName}/AG_File_Manager_v${data.versionName}.apk`,
            });
          }
        } catch {
          // try next endpoint
        }
      }

      // Check GitHub Releases API (CORS-enabled) so releases are detected without committing version.json to main
      try {
        const relRes = await fetch(GITHUB_LATEST_RELEASE_API, {
          cache: 'no-store',
          headers: { Accept: 'application/vnd.github+json' },
        });
        if (relRes.ok) {
          const rel = (await relRes.json()) as {
            tag_name?: string;
            assets?: Array<{ name?: string; browser_download_url?: string }>;
          };
          const relVersion = (rel.tag_name || '').replace(/^v/i, '').trim();
          const apkAsset = rel.assets?.find((a) => a.name && /\.apk$/i.test(a.name));
          if (relVersion && compareVersionNames(relVersion, effectiveCurrentName) > 0) {
            const syntheticCode =
              best && compareVersionNames(relVersion, best.versionName) <= 0
                ? best.versionCode
                : Math.max(effectiveCurrentCode + 1, best ? best.versionCode + 1 : effectiveCurrentCode + 1);
            best = pickBest(best, {
              versionCode: syntheticCode,
              versionName: relVersion,
              apkUrl:
                apkAsset?.browser_download_url ||
                `${GITHUB_RELEASE_DOWNLOAD_BASE}/v${relVersion}/AG_File_Manager_v${relVersion}.apk`,
            });
          }
        }
      } catch {
        // ignore network/rate-limit errors from GitHub API
      }

      return best;
    };

    const runCheck = async () => {
      if (scenario === 'offline_error' && !isRunningInAndroidApp()) {
        setErrorMessage('No internet connection. Please check your network and try again.');
        setPhase('error');
        return;
      }

      const data = await fetchManifest();
      if (!mounted) return;

      if (!data) {
        if (isRunningInAndroidApp()) {
          setErrorMessage('Unable to check for updates. Please check your internet connection.');
          setPhase('error');
          return;
        }
        const fallbackManifest: RemoteVersionManifest = {
          versionCode: effectiveCurrentCode,
          versionName: newVersion || effectiveCurrentName,
          apkUrl: `./downloads/AG_File_Manager_v${newVersion || effectiveCurrentName}.apk`,
        };
        setRemoteManifest(fallbackManifest);
        setPhase(compareVersionNames(fallbackManifest.versionName, effectiveCurrentName) > 0 ? 'prompt' : 'up_to_date');
        return;
      }

      setRemoteManifest(data);

      const hasUpdate =
        data.versionCode > effectiveCurrentCode ||
        compareVersionNames(data.versionName, effectiveCurrentName) > 0;
      if (hasUpdate) {
        setPhase('prompt');
      } else {
        setPhase('up_to_date');
      }
    };

    const timer = window.setTimeout(runCheck, 220);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      clearTimers();
    };
  }, [open, scenario, effectiveCurrentCode, effectiveCurrentName, newVersion]);

  if (!open) return null;

  const targetVersionName = remoteManifest?.versionName || newVersion || effectiveCurrentName;
  const targetVersionCode = remoteManifest?.versionCode || effectiveCurrentCode;
  const targetFilename = `AG_File_Manager_v${targetVersionName}.apk`;

  const getDownloadCandidates = (): string[] => {
    const manifestUrl = remoteManifest?.apkUrl;
    const githubReleaseUrl = `${GITHUB_RELEASE_DOWNLOAD_BASE}/v${targetVersionName}/${targetFilename}`;
    const githubRawUrl = `${REMOTE_DOWNLOADS_BASE_URL}/${targetFilename}`;
    const githubWebRawUrl = `https://github.com/${GITHUB_REPO}/raw/main/public/downloads/${targetFilename}`;
    const localWebUrl = `./downloads/${targetFilename}`;

    if (isRunningInAndroidApp() || window.location.protocol === 'file:') {
      const list = [
        manifestUrl && /^https?:\/\//i.test(manifestUrl) ? manifestUrl : githubReleaseUrl,
        githubReleaseUrl,
        githubRawUrl,
        githubWebRawUrl,
      ];
      return Array.from(new Set(list));
    }

    const list = [
      localWebUrl,
      manifestUrl || githubReleaseUrl,
      githubReleaseUrl,
      githubRawUrl,
      githubWebRawUrl,
    ];
    return Array.from(new Set(list));
  };

  const resolveReachableWebUrl = async (candidates: string[]): Promise<{ url: string; size: number }> => {
    for (const candidate of candidates) {
      try {
        const headRes = await fetch(candidate, { method: 'HEAD' });
        if (headRes.ok) {
          const len = parseInt(headRes.headers.get('content-length') || '0', 10);
          if (len === 0 || len > 100_000) {
            return { url: candidate, size: len };
          }
        }
      } catch {
        // Cross-origin HEAD may be blocked by CORS
      }
    }
    const remoteFallback =
      candidates.find((u) => /^https?:\/\//i.test(u)) || candidates[0];
    return { url: remoteFallback, size: 0 };
  };

  const proceedAfterDownload = (resolvedPath: string) => {
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.checkApkInstallCompatibility === 'function') {
      try {
        const raw = bridge.checkApkInstallCompatibility(resolvedPath);
        const compat = JSON.parse(raw) as {
          compatible?: boolean;
          code?: string;
          reason?: string;
        };
        if (compat && compat.compatible === false) {
          if (compat.code === 'signature_mismatch') {
            setErrorMessage(
              compat.reason ||
                `Package conflicts with the existing installation. Uninstall the older app once, then install Download/${targetFilename}.`
            );
            setPhase('signature_conflict');
            return;
          }
          setErrorMessage(compat.reason || 'Downloaded package cannot be installed.');
          setPhase('error');
          return;
        }
      } catch {
        // continue cleanly if JSON parsing fails
      }
    }

    if (
      bridge &&
      typeof bridge.canRequestPackageInstalls === 'function' &&
      !bridge.canRequestPackageInstalls()
    ) {
      setPhase('permission_prompt');
    } else {
      setPhase('installer_confirm');
    }
  };

  const startDownload = async () => {
    clearTimers();
    setErrorMessage('');
    setDownloadedMb(0);
    setPhase('downloading');

    const bridge = getNativeBridge();
    const candidates = getDownloadCandidates();
    const primaryUrl = candidates[0];

    if (bridge && typeof bridge.downloadWithDownloadManager === 'function') {
      const startCandidate = (idx: number) => {
        if (idx >= candidates.length) {
          clearTimers();
          setErrorMessage('Download failed. Please check your connection and retry.');
          setPhase('error');
          return;
        }

        const candidateUrl = candidates[idx];
        const dlId = triggerSystemDownload(
          candidateUrl,
          targetFilename,
          `AG File Manager ${targetVersionName}`
        );

        if (dlId && typeof bridge.getDownloadProgress === 'function') {
          clearTimers();
          timerRef.current = window.setInterval(() => {
            try {
              const raw = bridge.getDownloadProgress!(dlId);
              if (!raw) return;
              const prog = JSON.parse(raw) as NativeDownloadProgress;
              if (prog.totalBytes > 0) {
                setTotalMb(Math.max(0.1, prog.totalBytes / (1024 * 1024)));
              }
              if (prog.downloadedBytes >= 0) {
                setDownloadedMb(prog.downloadedBytes / (1024 * 1024));
              }
              if (prog.status === 'successful') {
                clearTimers();
                const resolvedPath =
                  prog.localPath || `/storage/emulated/0/Download/${targetFilename}`;
                setDownloadedApkPath(resolvedPath);
                onSaveApkToPublicDownloads(targetFilename, prog.totalBytes || 4_100_000);
                proceedAfterDownload(resolvedPath);
              } else if (prog.status === 'failed') {
                clearTimers();
                if (idx + 1 < candidates.length) {
                  setDownloadedMb(0);
                  startCandidate(idx + 1);
                } else {
                  setErrorMessage(prog.reason || 'Download interrupted. Please try again.');
                  setPhase('error');
                }
              }
            } catch {
              // keep polling until finished
            }
          }, 350);
          return;
        }

        const fallbackPath = `/storage/emulated/0/Download/${targetFilename}`;
        setDownloadedApkPath(fallbackPath);
        onSaveApkToPublicDownloads(targetFilename, 4_100_000);
        proceedAfterDownload(fallbackPath);
      };

      startCandidate(0);
      return;
    }

    try {
      const { url: chosenUrl, size: contentSize } = await resolveReachableWebUrl(candidates);
      if (contentSize > 0) {
        setTotalMb(contentSize / (1024 * 1024));
        setDownloadedMb(contentSize / (1024 * 1024));
      } else {
        setDownloadedMb(totalMb);
      }

      triggerSystemDownload(chosenUrl, targetFilename, `AG File Manager ${targetVersionName}`);
      onSaveApkToPublicDownloads(targetFilename, contentSize || 4_100_000);
      setPhase('installer_confirm');
    } catch {
      triggerSystemDownload(primaryUrl, targetFilename, `AG File Manager ${targetVersionName}`);
      onSaveApkToPublicDownloads(targetFilename, 4_100_000);
      setPhase('installer_confirm');
    }
  };

  const handleConfirmInstall = () => {
    const bridge = getNativeBridge();
    if (bridge && typeof bridge.installApk === 'function') {
      if (
        typeof bridge.canRequestPackageInstalls === 'function' &&
        !bridge.canRequestPackageInstalls()
      ) {
        setPhase('permission_prompt');
        return;
      }
      const pathToInstall =
        downloadedApkPath || `/storage/emulated/0/Download/${targetFilename}`;
      const launched = bridge.installApk(pathToInstall);
      if (launched) {
        onClose();
        return;
      }
      setErrorMessage(
        `Could not launch installer. Open Download/${targetFilename} to install.`
      );
      setPhase('error');
      return;
    }

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
    onInstallCompleted(targetVersionName, targetVersionCode);
    onClose();
  };

  const percent = totalMb > 0 ? Math.min(100, Math.round((downloadedMb / totalMb) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55">
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {phase === 'checking' && (
          <div className="p-5 sm:p-6 text-center space-y-3">
            <div className="w-7 h-7 mx-auto rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 break-words leading-relaxed">
              Checking for updates...
            </p>
          </div>
        )}

        {phase === 'up_to_date' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 pt-0.5">
                <AppLogo size={38} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">
                  AG File Manager
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums break-words leading-relaxed mt-0.5">
                  Current Version: AG File Manager {effectiveCurrentName}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">
              You are using the latest version.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
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

        {(phase === 'prompt' || phase === 'downloading') && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <AppLogo size={38} />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-slate-100 min-w-0 flex-1 break-words leading-snug">
                New Update Available
              </h2>
            </div>

            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 px-3.5 py-3 space-y-2 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-slate-600 dark:text-slate-400">
                <span className="text-xs font-medium shrink-0">Current Version</span>
                <span className="tabular-nums break-words text-right font-medium text-slate-800 dark:text-slate-200">
                  AG File Manager {effectiveCurrentName}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 border-t border-slate-200/70 dark:border-slate-700/60 pt-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 shrink-0">
                  New Version
                </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums break-words text-right">
                  AG File Manager {targetVersionName}
                </span>
              </div>
            </div>

            {phase === 'downloading' && (
              <div className="space-y-2">
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-150"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums break-words leading-relaxed">
                  {percent}% · {downloadedMb.toFixed(1)} MB / {totalMb.toFixed(1)} MB
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
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
                className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
              >
                {phase === 'downloading' ? 'Downloading...' : 'Download'}
              </button>
            </div>
          </div>
        )}

        {phase === 'permission_prompt' && (
          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">
              Install Permission Required
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 break-words leading-relaxed">
              Allow AG File Manager to install the downloaded update.
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const bridge = getNativeBridge();
                  bridge?.requestInstallPermission?.();
                  setPhase('installer_confirm');
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Allow &amp; Continue
              </button>
            </div>
          </div>
        )}

        {phase === 'installer_confirm' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 pt-0.5">
                <AppLogo size={38} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">
                  New Update Ready
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums break-words leading-relaxed mt-0.5">
                  AG File Manager {targetVersionName}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">
              Download complete. Tap Install to update AG File Manager.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
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
                Install
              </button>
            </div>
          </div>
        )}

        {phase === 'signature_conflict' && (
          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-amber-600 dark:text-amber-400 break-words leading-snug">
              Reinstall Required Once
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  getNativeBridge()?.uninstallSelf?.();
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Uninstall Old App
              </button>
            </div>
          </div>
        )}

        {phase === 'installing' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <AppLogo size={38} />
              </div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100 min-w-0 flex-1 break-words">
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
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 pt-0.5">
                <AppLogo size={38} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 break-words leading-snug">
                  AG File Manager
                </h2>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium break-words leading-relaxed mt-0.5">
                  App installed · v{targetVersionName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onInstallCompleted(targetVersionName, targetVersionCode);
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
          <div className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base font-semibold text-rose-600 dark:text-rose-400 break-words leading-snug">
              Update Failed
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startDownload}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
