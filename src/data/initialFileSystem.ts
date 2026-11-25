import { FileNode } from '../types/fileManager';

const NOW = Date.now();

export const INTERNAL_TOTAL_BYTES = 128 * 1024 * 1024 * 1024; // 128 GB
export const INTERNAL_SYSTEM_RESERVED_BYTES = 18.4 * 1024 * 1024 * 1024; // Android OS footprint
export const SD_TOTAL_BYTES = 64 * 1024 * 1024 * 1024; // 64 GB

// Clean Android folder structure only — zero hardcoded sample/dummy files in code
export const INITIAL_FILES: FileNode[] = [
  {
    id: 'internal_root',
    name: 'Internal',
    parentId: null,
    kind: 'folder',
    size: 0,
    modifiedAt: NOW,
  },
  {
    id: 'sd_root',
    name: 'External',
    parentId: null,
    kind: 'folder',
    size: 0,
    modifiedAt: NOW,
  },
  {
    id: 'dir_download',
    name: 'Download',
    parentId: 'internal_root',
    kind: 'folder',
    size: 0,
    modifiedAt: NOW,
  },
  {
    id: 'dir_dcim',
    name: 'DCIM',
    parentId: 'internal_root',
    kind: 'folder',
    size: 0,
    modifiedAt: NOW,
  },
  {
    id: 'dir_camera',
    name: 'Camera',
    parentId: 'dir_dcim',
    kind: 'folder',
    size: 0,
    modifiedAt: NOW,
  },
  {
    id: 'dir_pictures',
    name: 'Pictures',
    parentId: 'internal_root',
    kind: 'folder',
    size: 0,
    modifiedAt: NOW,
  },
  {
    id: 'dir_movies',
    name: 'Movies',
    parentId: 'internal_root',
    kind: 'folder',
    size: 0,
    modifiedAt: NOW,
  },
  {
    id: 'dir_music',
    name: 'Music',
    parentId: 'internal_root',
    kind: 'folder',
    size: 0,
    modifiedAt: NOW,
  },
  {
    id: 'dir_documents',
    name: 'Documents',
    parentId: 'internal_root',
    kind: 'folder',
    size: 0,
    modifiedAt: NOW,
  },
];
