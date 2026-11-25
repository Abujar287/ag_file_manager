import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Code2,
  Edit3,
  ExternalLink,
  File as FileGlyph,
  FileText,
  Music,
  RotateCcw,
  Trash2,
  WrapText,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { FileNode } from '../types/fileManager';
import {
  computeMultiSelectionStats,
  formatBytes,
  formatDateTime,
  getExtension,
  getNodePath,
} from '../utils/formatters';
import { getNativeBridge, isRunningInAndroidApp } from '../services/deviceStorageService';

interface NewItemDialogProps {
  type: 'folder' | 'text' | 'file' | null;
  onCancel: () => void;
  onCreate: (name: string, type: 'folder' | 'text' | 'file') => void;
}

export const NewItemDialog: React.FC<NewItemDialogProps> = ({ type, onCancel, onCreate }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (type === 'folder') setName('New Folder');
    else if (type === 'text') setName('note.txt');
    else if (type === 'file') setName('untitled.dat');
  }, [type]);

  if (!type) return null;

  const title =
    type === 'folder' ? 'New Folder' : type === 'text' ? 'New Text File' : 'New File';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) onCreate(name.trim(), type);
          }}
          className="space-y-4"
        >
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PropertiesDialogProps {
  nodes: FileNode[] | null;
  allNodes: FileNode[];
  onClose: () => void;
}

export const PropertiesDialog: React.FC<PropertiesDialogProps> = ({
  nodes,
  allNodes,
  onClose,
}) => {
  const [calculating, setCalculating] = useState(false);
  const [stats, setStats] = useState<{
    totalBytes: number;
    fileCount: number;
    folderCount: number;
  }>({ totalBytes: 0, fileCount: 0, folderCount: 0 });

  useEffect(() => {
    if (!nodes || nodes.length === 0) return;

    // Immediate in-memory calculation first
    const localStats = computeMultiSelectionStats(nodes, allNodes, true);
    setStats(localStats);

    const bridge = getNativeBridge();
    const realPaths = nodes
      .map((n) => n.realPath)
      .filter((p): p is string => Boolean(p));

    if (
      isRunningInAndroidApp() &&
      bridge &&
      typeof bridge.calculatePropertiesAsync === 'function' &&
      realPaths.length > 0
    ) {
      const reqId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setCalculating(true);

      const handleResult = (ev: Event) => {
        const detail = (ev as CustomEvent).detail as {
          requestId?: string;
          totalBytes?: number;
          fileCount?: number;
          folderCount?: number;
        };
        if (!detail || detail.requestId !== reqId) return;
        setStats({
          totalBytes: Number(detail.totalBytes) || 0,
          fileCount: Number(detail.fileCount) || 0,
          folderCount: Number(detail.folderCount) || 0,
        });
        setCalculating(false);
      };

      window.addEventListener('android_properties_result', handleResult);
      try {
        bridge.calculatePropertiesAsync(reqId, JSON.stringify(realPaths));
      } catch {
        setCalculating(false);
      }

      return () => {
        window.removeEventListener('android_properties_result', handleResult);
      };
    } else {
      setCalculating(false);
    }
  }, [nodes, allNodes]);

  if (!nodes || nodes.length === 0) return null;

  const isSingle = nodes.length === 1;
  const singleNode = nodes[0];
  const hasFolders = nodes.some((n) => n.kind === 'folder');
  const hasFiles = nodes.some((n) => n.kind !== 'folder');
  const typeSummary = isSingle
    ? singleNode.kind
    : hasFolders && hasFiles
      ? 'Mixed (Folders & Files)'
      : hasFolders
        ? 'Folders'
        : 'Files';

  const pathLabel = isSingle
    ? getNodePath(singleNode.id, allNodes)
    : `${nodes.length} selected in ${
        singleNode.parentId ? getNodePath(singleNode.parentId, allNodes) : 'Storage'
      }`;

  const latestModified = nodes.reduce(
    (max, n) => (n.modifiedAt > max ? n.modifiedAt : max),
    nodes[0].modifiedAt
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {isSingle ? 'Properties' : `Properties (${nodes.length} items)`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close properties"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Name</span>
            <span className="font-medium text-slate-900 dark:text-slate-100 text-right break-all">
              {isSingle ? singleNode.name : `${nodes.length} items selected`}
            </span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Type</span>
            <span className="text-slate-900 dark:text-slate-100 capitalize">{typeSummary}</span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Contains</span>
            <span className="tabular-nums text-slate-900 dark:text-slate-100">
              {calculating ? (
                <span className="text-blue-600 dark:text-blue-400">Calculating...</span>
              ) : (
                `${stats.folderCount} ${stats.folderCount === 1 ? 'folder' : 'folders'}, ${stats.fileCount} ${stats.fileCount === 1 ? 'file' : 'files'}`
              )}
            </span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Location</span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 text-right break-all">
              {pathLabel}
            </span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Total Size</span>
            <span className="tabular-nums font-semibold text-slate-900 dark:text-slate-100 text-right">
              {calculating ? (
                <span className="text-blue-600 dark:text-blue-400 font-normal">Scanning...</span>
              ) : (
                <>
                  {formatBytes(stats.totalBytes, 2)}{' '}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    ({stats.totalBytes.toLocaleString()} B)
                  </span>
                </>
              )}
            </span>
          </div>

          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">
              {isSingle ? 'Modified' : 'Latest Modified'}
            </span>
            <span className="tabular-nums text-slate-900 dark:text-slate-100">
              {formatDateTime(latestModified)}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

interface FileViewerDialogProps {
  file: FileNode | null;
  onClose: () => void;
  onSaveText: (id: string, content: string) => void;
  onDownloadFile: (file: FileNode) => void;
  onOpenExternal?: (file: FileNode) => void;
}

export const FileViewerDialog: React.FC<FileViewerDialogProps> = ({
  file,
  onClose,
  onSaveText,
  onDownloadFile,
  onOpenExternal,
}) => {
  const [textDraft, setTextDraft] = useState('');
  const [textEditMode, setTextEditMode] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  // Image zoom & pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; origX: number; origY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const pinchDistRef = useRef<number | null>(null);
  const pinchBaseZoomRef = useRef<number>(1);
  const lastTapRef = useRef<number>(0);

  // Built-in PDF reader state
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfPageIndex, setPdfPageIndex] = useState(0);
  const [pdfPageDataUrl, setPdfPageDataUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(1);

  const isPdf = Boolean(file && file.name.toLowerCase().endsWith('.pdf'));

  useEffect(() => {
    setTextDraft(file?.content || '');
    setTextEditMode(false);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setPdfPageCount(0);
    setPdfPageIndex(0);
    setPdfPageDataUrl(null);
    setPdfZoom(1);
  }, [file]);

  // Load PDF page count and initial page on Android via PdfRenderer
  useEffect(() => {
    if (!file || !isPdf || !file.realPath) return;
    const bridge = getNativeBridge();
    if (!bridge || typeof bridge.getPdfPageCount !== 'function') return;

    try {
      const count = bridge.getPdfPageCount(file.realPath);
      setPdfPageCount(count);
    } catch {
      setPdfPageCount(0);
    }
  }, [file, isPdf]);

  useEffect(() => {
    if (!file || !isPdf || !file.realPath || pdfPageCount <= 0) return;
    const bridge = getNativeBridge();
    if (!bridge || typeof bridge.renderPdfPageAsync !== 'function') return;

    const reqId = `pdf_${Date.now()}_${pdfPageIndex}`;
    setPdfLoading(true);

    const onPdfPage = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as {
        requestId?: string;
        dataUrl?: string;
      };
      if (!detail || detail.requestId !== reqId) return;
      setPdfPageDataUrl(detail.dataUrl || null);
      setPdfLoading(false);
    };

    window.addEventListener('android_pdf_page_result', onPdfPage);
    try {
      bridge.renderPdfPageAsync(reqId, file.realPath, pdfPageIndex);
    } catch {
      setPdfLoading(false);
    }

    return () => {
      window.removeEventListener('android_pdf_page_result', onPdfPage);
    };
  }, [file, isPdf, pdfPageCount, pdfPageIndex]);

  if (!file) return null;

  const isImage = file.kind === 'image';
  const isVideo = file.kind === 'video';
  const isAudio = file.kind === 'audio';
  const isText = file.kind === 'text';

  const mediaSrc =
    file.mediaUrl ||
    file.thumbnailUrl ||
    (file.realPath ? `file://${encodeURI(file.realPath).replace(/#/g, '%23')}` : undefined);

  const clampZoom = (z: number) => Math.min(5, Math.max(1, Number(z.toFixed(2))));

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDistRef.current = Math.hypot(dx, dy);
      pinchBaseZoomRef.current = zoom;
      dragRef.current.active = false;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 280) {
        if (zoom > 1.1) {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        } else {
          setZoom(2.4);
        }
        lastTapRef.current = 0;
        return;
      }
      lastTapRef.current = now;
      if (zoom > 1) {
        dragRef.current = {
          active: true,
          startX: e.touches[0].clientX,
          startY: e.touches[0].clientY,
          origX: pan.x,
          origY: pan.y,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const nextZoom = clampZoom(pinchBaseZoomRef.current * (dist / pinchDistRef.current));
      setZoom(nextZoom);
      if (nextZoom === 1) setPan({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && dragRef.current.active && zoom > 1) {
      setPan({
        x: dragRef.current.origX + (e.touches[0].clientX - dragRef.current.startX),
        y: dragRef.current.origY + (e.touches[0].clientY - dragRef.current.startY),
      });
    }
  };

  const handleTouchEnd = () => {
    pinchDistRef.current = null;
    dragRef.current.active = false;
  };

  const lines = textDraft.split('\n');
  const extLabel = getExtension(file.name).toUpperCase() || file.kind.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {file.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {extLabel} · {formatBytes(file.size)} · {formatDateTime(file.modifiedAt)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenExternal && (
              <button
                type="button"
                onClick={() => onOpenExternal(file)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1.5"
                title="Open with external app"
              >
                <ExternalLink size={14} />
                <span className="hidden sm:inline">Open with</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Close viewer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 flex flex-col">
          {isImage && mediaSrc ? (
            <div className="relative flex-1 min-h-[320px] flex flex-col bg-slate-950 select-none overflow-hidden">
              <div
                className="flex-1 flex items-center justify-center overflow-hidden touch-none cursor-grab active:cursor-grabbing"
                onWheel={(e) => {
                  e.preventDefault();
                  const next = clampZoom(zoom + (e.deltaY < 0 ? 0.25 : -0.25));
                  setZoom(next);
                  if (next === 1) setPan({ x: 0, y: 0 });
                }}
                onMouseDown={(e) => {
                  if (zoom <= 1) return;
                  dragRef.current = {
                    active: true,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: pan.x,
                    origY: pan.y,
                  };
                }}
                onMouseMove={(e) => {
                  if (!dragRef.current.active || zoom <= 1) return;
                  setPan({
                    x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
                    y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
                  });
                }}
                onMouseUp={() => {
                  dragRef.current.active = false;
                }}
                onMouseLeave={() => {
                  dragRef.current.active = false;
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <img
                  src={mediaSrc}
                  alt={file.name}
                  draggable={false}
                  referrerPolicy="no-referrer"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transition: dragRef.current.active ? 'none' : 'transform 120ms ease-out',
                  }}
                  className="max-w-full max-h-[64vh] object-contain pointer-events-none"
                />
              </div>

              {/* Zoom Toolbar */}
              <div className="px-4 py-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-center gap-2 text-white">
                <button
                  type="button"
                  onClick={() => {
                    const next = clampZoom(zoom - 0.5);
                    setZoom(next);
                    if (next === 1) setPan({ x: 0, y: 0 });
                  }}
                  className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-40"
                  disabled={zoom <= 1}
                  aria-label="Zoom out"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono tabular-nums min-w-[54px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(clampZoom(zoom + 0.5))}
                  className="p-2 rounded-lg hover:bg-slate-800 disabled:opacity-40"
                  disabled={zoom >= 5}
                  aria-label="Zoom in"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setPan({ x: 0, y: 0 });
                  }}
                  className="p-2 rounded-lg hover:bg-slate-800 ml-1"
                  aria-label="Reset zoom"
                >
                  <RotateCcw size={15} />
                </button>
              </div>
            </div>
          ) : isVideo && mediaSrc ? (
            <div className="flex-1 min-h-[260px] bg-black flex items-center justify-center p-2">
              <video
                src={mediaSrc}
                controls
                autoPlay
                playsInline
                className="w-full max-h-[65vh] rounded-lg outline-none"
              />
            </div>
          ) : isAudio && mediaSrc ? (
            <div className="flex-1 p-8 flex flex-col items-center justify-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Music size={38} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Built-in Audio Player
                </p>
              </div>
              <audio src={mediaSrc} controls autoPlay className="w-full max-w-md" />
            </div>
          ) : isPdf ? (
            <div className="flex-1 flex flex-col min-h-[380px]">
              {pdfPageCount > 0 ? (
                <>
                  <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-slate-200 dark:bg-slate-950">
                    {pdfLoading || !pdfPageDataUrl ? (
                      <div className="py-16 flex flex-col items-center gap-2 text-xs text-slate-500">
                        <div className="w-6 h-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                        <span>Rendering PDF page {pdfPageIndex + 1}...</span>
                      </div>
                    ) : (
                      <img
                        src={pdfPageDataUrl}
                        alt={`Page ${pdfPageIndex + 1}`}
                        style={{ width: `${Math.round(pdfZoom * 100)}%` }}
                        className="max-w-none bg-white shadow-lg rounded-md"
                      />
                    )}
                  </div>
                  <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={pdfPageIndex <= 0}
                        onClick={() => setPdfPageIndex((p) => Math.max(0, p - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span className="px-2 font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        Page {pdfPageIndex + 1} / {pdfPageCount}
                      </span>
                      <button
                        type="button"
                        disabled={pdfPageIndex >= pdfPageCount - 1}
                        onClick={() => setPdfPageIndex((p) => Math.min(pdfPageCount - 1, p + 1))}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
                        aria-label="Next page"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPdfZoom((z) => Math.max(0.75, Number((z - 0.25).toFixed(2))))}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Zoom out PDF"
                      >
                        <ZoomOut size={15} />
                      </button>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {Math.round(pdfZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setPdfZoom((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label="Zoom in PDF"
                      >
                        <ZoomIn size={15} />
                      </button>
                    </div>
                  </div>
                </>
              ) : mediaSrc ? (
                <object
                  data={mediaSrc}
                  type="application/pdf"
                  className="w-full flex-1 min-h-[420px]"
                >
                  <div className="p-10 text-center space-y-3">
                    <FileText size={36} className="mx-auto text-blue-600" />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      PDF Document Ready
                    </p>
                    {onOpenExternal && (
                      <button
                        type="button"
                        onClick={() => onOpenExternal(file)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white"
                      >
                        Open with System PDF Viewer
                      </button>
                    )}
                  </div>
                </object>
              ) : (
                <div className="p-10 text-center space-y-3">
                  <FileText size={36} className="mx-auto text-blue-600" />
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Unable to preview PDF directly in browser.
                  </p>
                </div>
              )}
            </div>
          ) : isText ? (
            <div className="flex-1 flex flex-col min-h-[340px]">
              <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {lines.length} {lines.length === 1 ? 'line' : 'lines'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWordWrap((w) => !w)}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium ${
                      wordWrap
                        ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <WrapText size={13} />
                    <span>Wrap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTextEditMode((m) => !m)}
                    className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-medium ${
                      textEditMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {textEditMode ? <Code2 size={13} /> : <Edit3 size={13} />}
                    <span>{textEditMode ? 'Preview' : 'Edit'}</span>
                  </button>
                </div>
              </div>

              {textEditMode ? (
                <textarea
                  value={textDraft}
                  onChange={(e) => setTextDraft(e.target.value)}
                  className={`flex-1 w-full p-4 bg-slate-50 dark:bg-slate-950 font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none resize-none ${
                    wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                  }`}
                />
              ) : (
                <div className="flex-1 overflow-auto p-3 sm:p-4 bg-slate-50 dark:bg-slate-950 allow-text-select">
                  <pre
                    className={`font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 ${
                      wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
                    }`}
                  >
                    {textDraft || '(Empty file)'}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-10 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
                <FileGlyph size={28} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {file.kind === 'apk'
                    ? 'Android Package Archive (.apk)'
                    : `${extLabel} File`}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No built-in preview available for this format. Use &ldquo;Open with&rdquo; to launch in an installed app.
                </p>
              </div>
              {onOpenExternal && (
                <button
                  type="button"
                  onClick={() => onOpenExternal(file)}
                  className="min-h-[40px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2"
                >
                  <ExternalLink size={16} />
                  <span>Open with</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => onDownloadFile(file)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-xs sm:text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Export Copy
          </button>

          <div className="flex items-center gap-2">
            {onOpenExternal && (
              <button
                type="button"
                onClick={() => onOpenExternal(file)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Open with</span>
              </button>
            )}
            {isText && textEditMode && (
              <button
                type="button"
                onClick={() => {
                  onSaveText(file.id, textDraft);
                  onClose();
                }}
                className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface DeleteConfirmDialogProps {
  open: boolean;
  itemCount: number;
  singleItemName?: string;
  permanentOnly?: boolean;
  isEmptyBin?: boolean;
  onCancel: () => void;
  onMoveToBin?: () => void;
  onDeletePermanently: () => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  open,
  itemCount,
  singleItemName,
  permanentOnly = false,
  isEmptyBin = false,
  onCancel,
  onMoveToBin,
  onDeletePermanently,
}) => {
  if (!open) return null;

  const title = isEmptyBin
    ? 'Empty Recycle Bin?'
    : permanentOnly
      ? itemCount === 1 && singleItemName
        ? `Delete "${singleItemName}" permanently?`
        : `Delete ${itemCount} items permanently?`
      : itemCount === 1 && singleItemName
        ? `Delete "${singleItemName}"?`
        : `Delete ${itemCount} items?`;

  const description = isEmptyBin
    ? 'All files in the Recycle Bin will be permanently deleted from your phone storage.'
    : permanentOnly
      ? 'This will permanently delete the selected items from your phone storage and cannot be undone.'
      : 'Move to Recycle Bin to restore later, or delete permanently from your phone storage.';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 break-words">
              {title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {!permanentOnly && onMoveToBin && (
            <button
              type="button"
              onClick={onMoveToBin}
              className="w-full min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              Move to Recycle Bin
            </button>
          )}
          <button
            type="button"
            onClick={onDeletePermanently}
            className="w-full min-h-[42px] px-4 py-2 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isEmptyBin ? 'Empty Recycle Bin' : 'Delete Permanently'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
