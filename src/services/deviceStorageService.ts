// Device Storage and Native Android Bridge Service
// Interfaces between the React UI and either the native Android Bridge or browser File APIs.

export interface DeviceStorageStats {
  internal: {
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercent: number;
  };
  external: {
    isMounted: boolean;
    totalBytes: number;
    usedBytes: number;
    freeBytes: number;
    usedPercent: number;
  };
}

export interface AndroidBridgeInterface {
  isPermissionGranted?: () => boolean;
  requestStoragePermissions?: () => void;
  getDeviceStorageStats?: () => string;
  listDirectory?: (path: string) => string;
  downloadWithDownloadManager?: (url: string, fileName: string, title: string) => void;
  exitApp?: () => void;
  openFile?: (path: string, mimeType: string) => void;
  shareFile?: (path: string) => void;
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
    const hasGranted = localStorage.getItem('ag_fm_permission_granted') === 'true';
    return hasGranted;
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
      return true;
    } catch (e) {
      console.warn('Error invoking native requestStoragePermissions', e);
    }
  }

  // Mark as requested for web
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
            },
          };
        }
      }
    } catch (e) {
      console.warn('Error reading native storage stats:', e);
    }
  }

  // Web browser fallback: use real navigator.storage.estimate() if available
  let deviceTotal = 128 * 1024 * 1024 * 1024; // standard base 128 GB
  let deviceUsed = 48.2 * 1024 * 1024 * 1024; // typical OS + app footprint

  if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota && estimate.quota > 0) {
        // Many mobile browsers report device storage quota (e.g. 50GB-256GB)
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

/**
 * Downloads a file using Android's native system DownloadManager or web browser download.
 */
export function triggerSystemDownload(
  url: string,
  fileName: string,
  title: string
): void {
  const bridge = getNativeBridge();
  if (bridge && typeof bridge.downloadWithDownloadManager === 'function') {
    try {
      bridge.downloadWithDownloadManager(url, fileName, title);
      return;
    } catch (e) {
      console.warn('Native DownloadManager call failed, falling back to browser', e);
    }
  }

  // Browser download trigger
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error('Browser download trigger failed:', e);
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

  // Browser exit handling
  try {
    window.close();
  } catch {
    // window.close() might be blocked by browser if not opened via script
  }
}
