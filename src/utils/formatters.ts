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
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'mkv', 'mov', 'avi', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg'].includes(ext)) return 'audio';
  if (ext === 'apk') return 'apk';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'document';
  if (['txt', 'md', 'json', 'xml', 'csv', 'log', 'kt', 'kts', 'yml'].includes(ext)) return 'text';
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

export function computeFolderStats(
  folderId: string,
  allNodes: FileNode[],
  showHidden: boolean
): { itemCount: number; totalSize: number } {
  const childrenMap = new Map<string | null, FileNode[]>();
  for (const node of allNodes) {
    if (node.trashed) continue;
    if (!showHidden && node.hidden) continue;
    const list = childrenMap.get(node.parentId) || [];
    list.push(node);
    childrenMap.set(node.parentId, list);
  }

  const directChildren = childrenMap.get(folderId) || [];
  let totalSize = 0;

  const stack = [...directChildren];
  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (curr.kind === 'folder') {
      const sub = childrenMap.get(curr.id) || [];
      for (const s of sub) stack.push(s);
    } else {
      totalSize += curr.size;
    }
  }

  return {
    itemCount: directChildren.length,
    totalSize,
  };
}

export function getNodePath(nodeId: string, allNodes: FileNode[]): string {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const parts: string[] = [];
  let curr = byId.get(nodeId);
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
  showHidden: boolean
): FileNode[] {
  const dir = sortOrder === 'asc' ? 1 : -1;
  return [...nodes].sort((a, b) => {
    // Folders always first
    if (a.kind === 'folder' && b.kind !== 'folder') return -1;
    if (a.kind !== 'folder' && b.kind === 'folder') return 1;

    let cmp = 0;
    if (sortBy === 'name') {
      cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    } else if (sortBy === 'size') {
      const sa =
        a.kind === 'folder' ? computeFolderStats(a.id, allNodes, showHidden).totalSize : a.size;
      const sb =
        b.kind === 'folder' ? computeFolderStats(b.id, allNodes, showHidden).totalSize : b.size;
      cmp = sa - sb;
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

export function getFolderVisualMeta(
  folder: FileNode,
  allNodes: FileNode[],
  showHidden: boolean
): {
  isEmpty: boolean;
  badgeKind: FolderBadgeKind;
  previewThumbUrl?: string;
} {
  const childrenMap = new Map<string | null, FileNode[]>();
  for (const node of allNodes) {
    if (node.trashed) continue;
    if (!showHidden && node.hidden) continue;
    const list = childrenMap.get(node.parentId) || [];
    list.push(node);
    childrenMap.set(node.parentId, list);
  }

  const direct = childrenMap.get(folder.id) || [];
  if (direct.length === 0) {
    return { isEmpty: true, badgeKind: 'none' };
  }

  // Gather subtree files to find preview thumbnail & dominant content type
  const subtreeFiles: FileNode[] = [];
  const stack = [...direct];
  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (curr.kind === 'folder') {
      const sub = childrenMap.get(curr.id) || [];
      for (const s of sub) stack.push(s);
    } else {
      subtreeFiles.push(curr);
    }
  }

  const previewThumbUrl = subtreeFiles.find((f) => Boolean(f.thumbnailUrl))?.thumbnailUrl;

  const lowerName = folder.name.toLowerCase();
  if (lowerName === 'download' || lowerName === 'downloads') {
    return { isEmpty: false, badgeKind: 'download', previewThumbUrl };
  }
  if (lowerName === 'dcim' || lowerName === 'camera') {
    return { isEmpty: false, badgeKind: 'camera', previewThumbUrl };
  }
  if (lowerName === 'pictures' || lowerName === 'screenshots') {
    return { isEmpty: false, badgeKind: 'image', previewThumbUrl };
  }
  if (lowerName === 'music' || lowerName === 'ringtones' || lowerName === 'audio') {
    return { isEmpty: false, badgeKind: 'music', previewThumbUrl };
  }
  if (lowerName === 'movies' || lowerName === 'videos') {
    return { isEmpty: false, badgeKind: 'video', previewThumbUrl };
  }
  if (lowerName === 'documents') {
    return { isEmpty: false, badgeKind: 'document', previewThumbUrl };
  }
  if (lowerName === 'backups' || lowerName === 'backups_sd') {
    return { isEmpty: false, badgeKind: 'archive', previewThumbUrl };
  }

  const firstKind = subtreeFiles[0]?.kind;
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

  return { isEmpty: false, badgeKind, previewThumbUrl };
}

