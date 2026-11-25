// Device Storage and Native Android Bridge Service
// Interfaces between the React UI and either the native Android Bridge or browser File APIs.

import { APP_VERSION_CODE, APP_VERSION_NAME } from '../versionInfo';

export interface DeviceStorageStats {
  internal: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercent: number;
    rootPath?: string;
  };
  external: {
    isMounted: boolean;
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercent: number;
    rootPath?: string;
  };
}

export interface NativeDownloadProgress {
  status: 'pending' | 'running' | 'paused' | 'successful' | 'failed' | 'unknown';
  downloadedBytes: number;
  totalBytes: number;
  localPath?: string;
  reason?: string;
}

export interface AndroidBridgeInterface {
  isPermissionGranted?: () => boolean;
  requestStoragePermissions?: () => void;
  getAppVersionCode?: () => number;
  getAppVersionName?: () => string;
  getDeviceStorageStats?: () => string;
  listDirectory?: (path: string) => string;
  scanAllCategories?: () => string;
  createFolder?: (parentPath: string, name: string) => boolean;
  createTextFile?: (parentPath: string, name: string, content: string) => boolean;
  readTextFile?: (path: string) => string;
  writeTextFile?: (path: string, content: string) => boolean;
  renamePath?: (path: string, newName: string) => boolean;
  deletePaths?: (pathsJson: string, moveToTrash: boolean) => boolean;
  copyOrMovePaths?: (pathsJson: string, targetDirPath: string, move: boolean) => boolean;
  downloadWithDownloadManager?: (url: string, fileName: string, title: string) => string;
  getDownloadProgress?: (downloadId: string) => string;
  canRequestPackageInstalls?: () => boolean;
  requestInstallPermission?: () => void;
  installApk?: (localPath: string) => boolean;
  exitApp?: () => void;
  openFile?: (path: string, mimeType: string) => boolean;
  openUrlInBrowser?: (url: string) => boolean;
  shareFile?: (path: string) => void;
  shareFiles?: (pathsJson: string) => void;
}

declare global {
  interface Window {
    AndroidBridge?: AndroidBridgeInterface;
    AndroidInterface?: AndroidBridgeInterface;
    handleSystemBackButton?: () => void;
  }
}

export function getNativeBridge(): AndroidBridgeInterface | null {
  if (typeof window === 'undefined') return null;
  return window.AndroidBridge || window.AndroidInterface || null;
}

export function isRunningInAndroidApp(): boolean {
  return getNativeBridge() !== null;
}

export function getRunningAppVersion(): { versionCode: number; versionName: string } {
  const bridge = getNativeBridge();
  if (bridge) {
    try {
      const code =
        typeof bridge.getAppVersionCode === 'function'
          ? bridge.getAppVersionCode()
          : APP_VERSION_CODE;
      const name =
        typeof bridge.getAppVersionName === 'function'
          ? bridge.getAppVersionName()
          : APP_VERSION_NAME;
      return {
        versionCode: Number(code) || APP_VERSION_CODE,
        versionName: name || APP_VERSION_NAME,
      };
    } catch {
      // fall back to bundle version constants
    }
  }
  return {
    versionCode: APP_VERSION_CODE,
    versionName: APP_VERSION_NAME,
  };
}

/**
 * Checks if storage / media permissions are granted.
 */
export async function checkStoragePermissionGranted(): Promise<boolean> {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.isPermissionGranted === 'function') {
    try {
      return Boolean(bridge.isPermissionGranted());
    } catch {
      return false;
    }
  }

  // Web check: check if user previously granted folder access or stored files
  try {
    return localStorage.getItem('ag_fm_permission_granted') === 'true';
  } catch {
    return false;
  }
}

/**
 * Requests storage permissions from the host system.
 */
export async function requestStoragePermission(): Promise<boolean> {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.requestStoragePermissions === 'function') {
    try {
      bridge.requestStoragePermissions();
      return Boolean(bridge.isPermissionGranted?.());
    } catch (e) {
      console.warn('Error invoking native requestStoragePermissions', e);
    }
  }

  try {
    localStorage.setItem('ag_fm_permission_granted', 'true');
  } catch {
    // ignore
  }
  return true;
}

/**
 * Retrieves real live device storage capacities (Internal & External SD Card).
 * Uses Android StatFs if in APK, or navigator.storage.estimate() in browser.
 */
export async function getLiveStorageStats(
  fallbackFilesBytes = 0
): Promise<DeviceStorageStats> {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.getDeviceStorageStats === 'function') {
    try {
      const raw = bridge.getDeviceStorageStats();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.internal && parsed.internal.totalBytes > 0) {
          return {
            internal: {
              totalBytes: parsed.internal.totalBytes,
              usedBytes: parsed.internal.usedBytes,
              freeBytes: parsed.internal.freeBytes,
              usedPercent: Math.round(
                (parsed.internal.usedBytes / parsed.internal.totalBytes) * 100
              ),
              rootPath: parsed.internal.rootPath || '/storage/emulated/0',
            },
            external: {
              isMounted: Boolean(parsed.external?.isMounted),
              totalBytes: parsed.external?.totalBytes || 0,
              usedBytes: parsed.external?.usedBytes || 0,
              freeBytes: parsed.external?.freeBytes || 0,
              usedPercent: parsed.external?.totalBytes
                ? Math.round(
                    (parsed.external.usedBytes / parsed.external.totalBytes) * 100
                  )
                : 0,
              rootPath: parsed.external?.rootPath || undefined,
            },
          };
        }
      }
    } catch (e) {
      console.warn('Error reading native storage stats:', e);
    }
  }

  // Web browser fallback: use real navigator.storage.estimate() if available
  let deviceTotal = 128 * 1024 * 1024 * 1024;
  let deviceUsed = 48.2 * 1024 * 1024 * 1024;

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota && estimate.quota > 0) {
        deviceTotal = estimate.quota;
        if (estimate.usage) {
          deviceUsed = estimate.usage + fallbackFilesBytes;
        }
      }
    } catch {
      // ignore
    }
  }

  deviceUsed = Math.min(deviceTotal, deviceUsed + fallbackFilesBytes);
  const free = Math.max(0, deviceTotal - deviceUsed);
  const pct = Math.round((deviceUsed / deviceTotal) * 100);

  return {
    internal: {
      totalBytes: deviceTotal,
      usedBytes: deviceUsed,
      freeBytes: free,
      usedPercent: pct,
      rootPath: '/storage/emulated/0',
    },
    external: {
      isMounted: false,
      totalBytes: 0,
      usedBytes: 0,
      freeBytes: 0,
      usedPercent: 0,
    },
  };
}

export function resolveDownloadUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    const clean = url.startsWith('./') ? url.slice(1) : url;
    return window.location.origin + (clean.startsWith('/') ? clean : '/' + clean);
  }
  return url;
}

/**
 * Downloads a file using Android's native system DownloadManager or web browser download (IDM-compatible).
 */
export function triggerSystemDownload(
  url: string,
  fileName: string,
  title: string
): string | null {
  const resolved = resolveDownloadUrl(url);
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.downloadWithDownloadManager === 'function') {
    try {
      const dlId = bridge.downloadWithDownloadManager(resolved, fileName, title);
      return dlId || null;
    } catch (e) {
      console.warn('Native DownloadManager call failed, falling back to browser', e);
    }
  }

  // Browser / IDM download trigger (direct URL anchor allows IDM interception)
  try {
    const a = document.createElement('a');
    a.href = resolved;
    a.download = fileName;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error('Browser download trigger failed:', e);
  }
  return null;
}

/**
 * Opens the direct APK URL in an external browser or IDM (Internet Download Manager).
 */
export function openExternalDownloadUrl(url: string, fileName: string): void {
  const resolved = resolveDownloadUrl(url);
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.openUrlInBrowser === 'function') {
    try {
      if (bridge.openUrlInBrowser(resolved)) {
        return;
      }
    } catch {
      // fall back to anchor trigger
    }
  }
  try {
    const a = document.createElement('a');
    a.href = resolved;
    a.download = fileName;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error('External browser/IDM trigger failed:', e);
  }
}

/**
 * Cleanly exits the app on Android or browser.
 */
export function exitApplication(): void {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.exitApp === 'function') {
    try {
      bridge.exitApp();
      return;
    } catch {
      // ignore
    }
  }

  try {
    window.close();
  } catch {
    // window.close() might be blocked by browser if not opened via script
  }
}
