import React, { useEffect, useRef, useState } from 'react';
import { UpdateScenario } from '../types/fileManager';
import {
  getNativeBridge,
  getRunningAppVersion,
  isRunningInAndroidApp,
  NativeDownloadProgress,
  openExternalDownloadUrl,
  triggerSystemDownload,
} from '../services/deviceStorageService';
import {
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

    const fetchManifest = async (): Promise<RemoteVersionManifest | null> => {
      const cacheBust = `?t=${Date.now()}`;
      const githubRawMirror = `https://github.com/${GITHUB_REPO}/raw/main/version.json`;
      const urls =
        isFileProtocol || isRunningInAndroidApp()
          ? [REMOTE_VERSION_JSON_URL + cacheBust, githubRawMirror + cacheBust]
          : ['./version.json' + cacheBust, REMOTE_VERSION_JSON_URL + cacheBust];

      let best: RemoteVersionManifest | null = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) continue;
          const data = (await res.json()) as Partial<RemoteVersionManifest>;
          if (typeof data.versionCode === 'number' && typeof data.versionName === 'string') {
            const candidate: RemoteVersionManifest = {
              versionCode: data.versionCode,
              versionName: data.versionName,
              apkUrl:
                data.apkUrl ||
                `${GITHUB_RELEASE_DOWNLOAD_BASE}/v${data.versionName}/AG_File_Manager_v${data.versionName}.apk`,
            };
            if (!best || candidate.versionCode > best.versionCode) {
              best = candidate;
            }
          }
        } catch {
          // try next endpoint
        }
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
          setErrorMessage(
            'Unable to reach GitHub update server. Please check your internet connection and try again.'
          );
          setPhase('error');
          return;
        }
        // Web preview fallback
        const fallbackManifest: RemoteVersionManifest = {
          versionCode: effectiveCurrentCode,
          versionName: newVersion || effectiveCurrentName,
          apkUrl: `./downloads/AG_File_Manager_v${newVersion || effectiveCurrentName}.apk`,
        };
        setRemoteManifest(fallbackManifest);
        setPhase(effectiveCurrentName === newVersion ? 'up_to_date' : 'prompt');
        return;
      }

      setRemoteManifest(data);

      if (data.versionCode > effectiveCurrentCode) {
        setPhase('prompt');
      } else {
        setPhase('up_to_date');
      }
    };

    const timer = window.setTimeout(runCheck, 250);

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
        // Cross-origin HEAD may be blocked by CORS; keep checking explicit remote URLs if local failed
      }
    }
    const remoteFallback =
      candidates.find((u) => /^https?:\/\//i.test(u)) || candidates[0];
    return { url: remoteFallback, size: 0 };
  };

  const startDownload = async () => {
    clearTimers();
    setErrorMessage('');
    setDownloadedMb(0);
    setPhase('downloading');

    const bridge = getNativeBridge();
    const candidates = getDownloadCandidates();
    const primaryUrl = candidates[0];

    // Path A: Native Android APK — use real DownloadManager + automatic URL fallback + live progress
    if (bridge && typeof bridge.downloadWithDownloadManager === 'function') {
      const startCandidate = (idx: number) => {
        if (idx >= candidates.length) {
          clearTimers();
          setErrorMessage(
            'APK download failed from GitHub. Push to GitHub to publish the release APK or open via Browser / IDM.'
          );
          setPhase('error');
          return;
        }

        const candidateUrl = candidates[idx];
        const dlId = triggerSystemDownload(
          candidateUrl,
          targetFilename,
          `AG File Manager v${targetVersionName}`
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
                if (
                  typeof bridge.canRequestPackageInstalls === 'function' &&
                  !bridge.canRequestPackageInstalls()
                ) {
                  setPhase('permission_prompt');
                } else {
                  setPhase('installer_confirm');
                }
              } else if (prog.status === 'failed') {
                clearTimers();
                if (idx + 1 < candidates.length) {
                  setDownloadedMb(0);
                  startCandidate(idx + 1);
                } else {
                  setErrorMessage(
                    prog.reason ||
                      'Download interrupted. Try Browser / IDM download or tap Retry.'
                  );
                  setPhase('error');
                }
              }
            } catch {
              // keep polling until finished
            }
          }, 350);
          return;
        }

        // Fallback if DownloadManager returned no ID (browser fallback launched externally)
        onSaveApkToPublicDownloads(targetFilename, 4_100_000);
        setPhase('installer_confirm');
      };

      startCandidate(0);
      return;
    }

    // Path B: Web / Mobile Browser — verify APK endpoint then trigger direct download (IDM-compatible)
    try {
      const { url: chosenUrl, size: contentSize } = await resolveReachableWebUrl(candidates);
      if (contentSize > 0) {
        setTotalMb(contentSize / (1024 * 1024));
        setDownloadedMb(contentSize / (1024 * 1024));
      } else {
        setDownloadedMb(totalMb);
      }

      // Direct URL download allows Internet Download Manager (IDM) or browser DownloadManager to intercept cleanly
      triggerSystemDownload(chosenUrl, targetFilename, `AG File Manager v${targetVersionName}`);
      onSaveApkToPublicDownloads(targetFilename, contentSize || 4_100_000);
      setPhase('installer_confirm');
    } catch {
      triggerSystemDownload(primaryUrl, targetFilename, `AG File Manager v${targetVersionName}`);
      onSaveApkToPublicDownloads(targetFilename, 4_100_000);
      setPhase('installer_confirm');
    }
  };

  const handleOpenInBrowserOrIdm = async () => {
    const candidates = getDownloadCandidates();
    if (!isRunningInAndroidApp() && window.location.protocol !== 'file:') {
      const { url } = await resolveReachableWebUrl(candidates);
      openExternalDownloadUrl(url, targetFilename);
      return;
    }
    const externalUrl =
      candidates.find((u) => /^https?:\/\//i.test(u)) || candidates[0];
    openExternalDownloadUrl(externalUrl, targetFilename);
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
        `Could not launch installer for ${targetFilename}. Open your Download folder and tap the APK file.`
      );
      setPhase('error');
      return;
    }

    // Web preview simulation of installer completion
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
            <div className="flex items-center gap-3">
              <AppLogo size={36} />
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  AG File Manager
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  v{effectiveCurrentName} (Build {effectiveCurrentCode})
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-800 dark:text-slate-200">
              You are using the latest version.
            </p>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleOpenInBrowserOrIdm}
                className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                Download APK
              </button>
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
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <AppLogo size={36} />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Update Available Now
              </h2>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="text-slate-600 dark:text-slate-400 tabular-nums">
                Current Version: {effectiveCurrentName} (Build {effectiveCurrentCode})
              </div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                New Version: {targetVersionName} (Build {targetVersionCode})
              </div>
            </div>

            {phase === 'downloading' && (
              <div className="space-y-2 pt-1">
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all duration-150"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="text-xs font-mono text-slate-600 dark:text-slate-300 tabular-nums">
                  {percent}% — {downloadedMb.toFixed(1)} MB / {totalMb.toFixed(1)} MB
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenInBrowserOrIdm}
                className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              >
                Browser / IDM
              </button>
              <div className="flex items-center gap-2">
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
          </div>
        )}

        {phase === 'permission_prompt' && (
          <div className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Install Permission Required
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Allow AG File Manager to install updates from{' '}
              <span className="font-mono text-xs">Download/{targetFilename}</span>.
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
                onClick={() => {
                  const bridge = getNativeBridge();
                  bridge?.requestInstallPermission?.();
                  setPhase('installer_confirm');
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Allow & Continue
              </button>
            </div>
          </div>
        )}

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
                  App installed · v{targetVersionName}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
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
          <div className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-rose-600 dark:text-rose-400">
              Update Failed
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">{errorMessage}</p>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleOpenInBrowserOrIdm}
                className="min-h-[40px] px-3 py-2 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
              >
                Browser / IDM
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Close
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
          </div>
        )}
      </div>
    </div>
  );
};
