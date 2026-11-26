export type FileKind = 'folder' | 'image' | 'video' | 'audio' | 'apk' | 'archive' | 'document' | 'text' | 'other';

export interface FileNode {
  id: string;
  name: string;
  parentId: string | null;
  kind: FileKind;
  size: number; // bytes (for files; folders compute dynamically or store cache)
  modifiedAt: number; // epoch ms
  hidden?: boolean;
  favourite?: boolean;
  trashed?: boolean;
  originalParentId?: string | null;
  originalPath?: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  content?: string;
  hash?: string; // used for duplicate file detection
  isAppCache?: boolean;
  realPath?: string; // absolute device filesystem path when running inside Android APK
}

export type SortBy = 'name' | 'size' | 'date' | 'type';
export type SortOrder = 'asc' | 'desc';
export type ViewMode = 'list' | 'grid' | 'detail';
export type ThemeMode = 'light' | 'dark' | 'system';

export type CategoryType =
  | 'images'
  | 'videos'
  | 'audio'
  | 'apps'
  | 'apk_files'
  | 'new_files'
  | 'compressed'
  | 'documents'
  | 'recycle_bin'
  | 'cleaner'
  | 'disguised_videos'
  | 'disguised_images'
  | 'view_on_pc'
  | 'cloud_drive'
  | 'lan'
  | 'ftp'
  | 'all_tools';

export interface InstalledApp {
  packageName: string;
  name: string;
  versionName: string;
  size: number;
  modifiedAt: number;
  apkPath: string;
  iconUrl?: string;
  isSystemApp: boolean;
}

export type AnalyzerToolType =
  | 'file_analyzer'
  | 'large_files'
  | 'recent_files'
  | 'empty_folders'
  | 'app_cache'
  | 'duplicate_files';

export type ActiveScreen =
  | { type: 'home' }
  | { type: 'folder'; folderId: string }
  | { type: 'category'; category: CategoryType }
  | { type: 'analyzer'; tool: AnalyzerToolType }
  | { type: 'settings' }
  | { type: 'about' };

export interface TabWindow {
  id: string;
  title: string;
  screen: ActiveScreen;
  backStack: ActiveScreen[];
}

export interface ClipboardState {
  mode: 'copy' | 'cut';
  itemIds: string[];
}

export type UpdateScenario =
  | 'available'
  | 'up_to_date'
  | 'offline_error'
  | 'permission_required'
  | 'corrupted_apk';

export interface AppSettings {
  showHiddenFiles: boolean;
  showThumbnails: boolean;
  theme: ThemeMode;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  sdCardMounted: boolean;
  updateScenario: UpdateScenario;
  currentVersionCode: number;
  currentVersionName: string;
}
