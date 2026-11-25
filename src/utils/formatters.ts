import { FileKind, FileNode, SortBy, SortOrder } from '../types/fileManager';

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${sizes[i]}`;
}

export function formatDateTime(epochMs: number): string {
  const d = new Date(epochMs);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  let hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${month}/${day}/${year} ${hours}:${mins} ${ampm}`;
}

export function inferFileKind(filename: string): FileKind {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'mkv', 'mov', 'avi', 'webm', '3gp', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'opus'].includes(ext)) return 'audio';
  if (ext === 'apk') return 'apk';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) return 'archive';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'document';
  if (
    [
      'txt', 'md', 'json', 'xml', 'csv', 'log', 'kt', 'kts', 'yml', 'yaml',
      'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp',
      'html', 'htm', 'css', 'scss', 'sql', 'sh', 'bash', 'gradle',
      'properties', 'ini', 'conf', 'cfg', 'env', 'toml', 'rs', 'go', 'php', 'rb',
    ].includes(ext)
  ) {
    return 'text';
  }
  return 'other';
}

export function getExtension(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx <= 0) return '';
  return filename.slice(idx + 1);
}

export function getBaseName(filename: string): string {
  const idx = filename.lastIndexOf('.');
  if (idx <= 0) return filename;
  return filename.slice(0, idx);
}

export type ChildrenMap = Map<string | null, FileNode[]>;

export function buildChildrenMap(allNodes: FileNode[], showHidden: boolean): ChildrenMap {
  const childrenMap: ChildrenMap = new Map();
  for (const node of allNodes) {
    if (node.trashed) continue;
    if (!showHidden && node.hidden) continue;
    let list = childrenMap.get(node.parentId);
    if (!list) {
      list = [];
      childrenMap.set(node.parentId, list);
    }
    list.push(node);
  }
  return childrenMap;
}

const folderStatsWeakCache = new WeakMap<
  ChildrenMap,
  Map<string, { itemCount: number; totalSize: number; fileCount: number; folderCount: number }>
>();

export function computeFolderStatsFromMap(
  folderId: string,
  childrenMap: ChildrenMap
): { itemCount: number; totalSize: number; fileCount: number; folderCount: number } {
  let cache = folderStatsWeakCache.get(childrenMap);
  if (!cache) {
    cache = new Map();
    folderStatsWeakCache.set(childrenMap, cache);
  }
  const hit = cache.get(folderId);
  if (hit) return hit;

  const directChildren = childrenMap.get(folderId) || [];
  let totalSize = 0;
  let fileCount = 0;
  let folderCount = 0;

  const visited = new Set<string>();
  const stack = [...directChildren];
  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (visited.has(curr.id)) continue;
    visited.add(curr.id);
    if (curr.kind === 'folder') {
      folderCount++;
      const sub = childrenMap.get(curr.id);
      if (sub) {
        for (let i = 0; i < sub.length; i++) stack.push(sub[i]);
      }
    } else {
      fileCount++;
      totalSize += curr.size;
    }
  }

  const res = {
    itemCount: directChildren.length,
    totalSize,
    fileCount,
    folderCount,
  };
  cache.set(folderId, res);
  return res;
}

export function computeFolderStats(
  folderId: string,
  allNodes: FileNode[],
  showHidden: boolean
): { itemCount: number; totalSize: number } {
  const childrenMap = buildChildrenMap(allNodes, showHidden);
  const { itemCount, totalSize } = computeFolderStatsFromMap(folderId, childrenMap);
  return { itemCount, totalSize };
}

export function computeMultiSelectionStats(
  selectedNodes: FileNode[],
  allNodes: FileNode[],
  showHidden = true
): { totalBytes: number; fileCount: number; folderCount: number } {
  const childrenMap = buildChildrenMap(allNodes, showHidden);
  const visitedIds = new Set<string>();
  let totalBytes = 0;
  let fileCount = 0;
  let folderCount = 0;

  const stack = [...selectedNodes];
  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (visitedIds.has(curr.id)) continue;
    visitedIds.add(curr.id);

    if (curr.kind === 'folder') {
      folderCount++;
      const sub = childrenMap.get(curr.id);
      if (sub) {
        for (let i = 0; i < sub.length; i++) stack.push(sub[i]);
      }
    } else {
      fileCount++;
      totalBytes += curr.size;
    }
  }

  return { totalBytes, fileCount, folderCount };
}

export function getNodePath(nodeId: string, allNodes: FileNode[]): string {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const direct = byId.get(nodeId);
  if (direct?.realPath) return direct.realPath;
  const parts: string[] = [];
  let curr = direct;
  while (curr) {
    if (curr.id === 'internal_root') {
      parts.unshift('/storage/emulated/0');
      break;
    }
    if (curr.id === 'sd_root') {
      parts.unshift('/storage/sdcard1');
      break;
    }
    parts.unshift(curr.name);
    curr = curr.parentId ? byId.get(curr.parentId) : undefined;
  }
  return parts.join('/') || '/storage/emulated/0';
}

export function sortFileNodes(
  nodes: FileNode[],
  sortBy: SortBy,
  sortOrder: SortOrder,
  allNodes: FileNode[],
  showHidden: boolean,
  prebuiltChildrenMap?: ChildrenMap
): FileNode[] {
  const dir = sortOrder === 'asc' ? 1 : -1;
  const childrenMap =
    sortBy === 'size'
      ? prebuiltChildrenMap || buildChildrenMap(allNodes, showHidden)
      : undefined;

  const sizeCache = new Map<string, number>();
  const getSize = (node: FileNode): number => {
    if (node.kind !== 'folder') return node.size;
    const cached = sizeCache.get(node.id);
    if (cached !== undefined) return cached;
    const total = childrenMap
      ? computeFolderStatsFromMap(node.id, childrenMap).totalSize
      : 0;
    sizeCache.set(node.id, total);
    return total;
  };

  return [...nodes].sort((a, b) => {
    // Folders always first
    if (a.kind === 'folder' && b.kind !== 'folder') return -1;
    if (a.kind !== 'folder' && b.kind === 'folder') return 1;

    let cmp = 0;
    if (sortBy === 'name') {
      cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    } else if (sortBy === 'size') {
      cmp = getSize(a) - getSize(b);
    } else if (sortBy === 'date') {
      cmp = a.modifiedAt - b.modifiedAt;
    } else if (sortBy === 'type') {
      cmp = a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name);
    }

    return cmp * dir;
  });
}

export type FolderBadgeKind =
  | 'none'
  | 'download'
  | 'camera'
  | 'image'
  | 'video'
  | 'music'
  | 'apk'
  | 'archive'
  | 'document'
  | 'generic';

const folderVisualWeakCache = new WeakMap<
  ChildrenMap,
  Map<string, { isEmpty: boolean; badgeKind: FolderBadgeKind; previewThumbUrl?: string }>
>();

export function getFolderVisualMetaFromMap(
  folder: FileNode,
  childrenMap: ChildrenMap
): {
  isEmpty: boolean;
  badgeKind: FolderBadgeKind;
  previewThumbUrl?: string;
} {
  let cache = folderVisualWeakCache.get(childrenMap);
  if (!cache) {
    cache = new Map();
    folderVisualWeakCache.set(childrenMap, cache);
  }
  const hit = cache.get(folder.id);
  if (hit) return hit;

  const direct = childrenMap.get(folder.id) || [];
  if (direct.length === 0) {
    const emptyRes = { isEmpty: true, badgeKind: 'none' as FolderBadgeKind };
    cache.set(folder.id, emptyRes);
    return emptyRes;
  }

  let previewThumbUrl: string | undefined;
  let firstKind: FileKind | undefined;

  // Bounded BFS up to 120 nodes so large folders compute badges in <0.1ms
  const stack = [...direct];
  let inspected = 0;
  while (stack.length > 0 && inspected < 120) {
    const curr = stack.pop()!;
    inspected++;
    if (curr.kind === 'folder') {
      const sub = childrenMap.get(curr.id);
      if (sub) {
        for (let i = 0; i < sub.length && inspected + stack.length < 150; i++) {
          stack.push(sub[i]);
        }
      }
    } else {
      if (!firstKind) firstKind = curr.kind;
      if (!previewThumbUrl && curr.thumbnailUrl) {
        previewThumbUrl = curr.thumbnailUrl;
      }
      if (firstKind && previewThumbUrl) break;
    }
  }

  const lowerName = folder.name.toLowerCase();
  let res: { isEmpty: boolean; badgeKind: FolderBadgeKind; previewThumbUrl?: string };
  if (lowerName === 'download' || lowerName === 'downloads') {
    res = { isEmpty: false, badgeKind: 'download', previewThumbUrl };
  } else if (lowerName === 'dcim' || lowerName === 'camera') {
    res = { isEmpty: false, badgeKind: 'camera', previewThumbUrl };
  } else if (lowerName === 'pictures' || lowerName === 'screenshots') {
    res = { isEmpty: false, badgeKind: 'image', previewThumbUrl };
  } else if (lowerName === 'music' || lowerName === 'ringtones' || lowerName === 'audio') {
    res = { isEmpty: false, badgeKind: 'music', previewThumbUrl };
  } else if (lowerName === 'movies' || lowerName === 'videos') {
    res = { isEmpty: false, badgeKind: 'video', previewThumbUrl };
  } else if (lowerName === 'documents') {
    res = { isEmpty: false, badgeKind: 'document', previewThumbUrl };
  } else if (lowerName === 'backups' || lowerName === 'backups_sd') {
    res = { isEmpty: false, badgeKind: 'archive', previewThumbUrl };
  } else {
    const badgeKind: FolderBadgeKind =
      firstKind === 'image'
        ? 'image'
        : firstKind === 'video'
          ? 'video'
          : firstKind === 'audio'
            ? 'music'
            : firstKind === 'apk'
              ? 'apk'
              : firstKind === 'archive'
                ? 'archive'
                : firstKind === 'document' || firstKind === 'text'
                  ? 'document'
                  : 'generic';
    res = { isEmpty: false, badgeKind, previewThumbUrl };
  }

  cache.set(folder.id, res);
  return res;
}

export function getFolderVisualMeta(
  folder: FileNode,
  allNodes: FileNode[],
  showHidden: boolean
): {
  isEmpty: boolean;
  badgeKind: FolderBadgeKind;
  previewThumbUrl?: string;
} {
  return getFolderVisualMetaFromMap(folder, buildChildrenMap(allNodes, showHidden));
}
