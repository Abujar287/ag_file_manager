import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { FileNode } from '../types/fileManager';
import { formatBytes, formatDateTime, getNodePath } from '../utils/formatters';

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
  node: FileNode | null;
  allNodes: FileNode[];
  onClose: () => void;
}

export const PropertiesDialog: React.FC<PropertiesDialogProps> = ({
  node,
  allNodes,
  onClose,
}) => {
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Properties
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Name</span>
            <span className="font-medium text-slate-900 dark:text-slate-100 text-right break-all">
              {node.name}
            </span>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Type</span>
            <span className="text-slate-900 dark:text-slate-100 capitalize">{node.kind}</span>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Path</span>
            <span className="font-mono text-xs text-slate-800 dark:text-slate-200 text-right break-all">
              {getNodePath(node.id, allNodes)}
            </span>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Size</span>
            <span className="tabular-nums text-slate-900 dark:text-slate-100">
              {formatBytes(node.size)} ({node.size.toLocaleString()} B)
            </span>
          </div>
          <div className="py-2.5 flex justify-between gap-4">
            <span className="text-slate-500 dark:text-slate-400">Modified</span>
            <span className="tabular-nums text-slate-900 dark:text-slate-100">
              {formatDateTime(node.modifiedAt)}
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
}

export const FileViewerDialog: React.FC<FileViewerDialogProps> = ({
  file,
  onClose,
  onSaveText,
  onDownloadFile,
}) => {
  const [textDraft, setTextDraft] = useState('');

  useEffect(() => {
    setTextDraft(file?.content || '');
  }, [file]);

  if (!file) return null;

  const isEditableText = file.kind === 'text';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
              {file.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {formatBytes(file.size)} · {formatDateTime(file.modifiedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {file.kind === 'image' && file.thumbnailUrl ? (
            <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <img
                src={file.thumbnailUrl}
                alt={file.name}
                referrerPolicy="no-referrer"
                className="w-full max-h-[55vh] object-contain"
              />
            </div>
          ) : isEditableText ? (
            <textarea
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              rows={12}
              className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
            />
          ) : (
            <div className="py-8 text-center space-y-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {file.kind === 'apk'
                  ? 'Android Package Archive (.apk)'
                  : `${file.kind.toUpperCase()} File`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {file.kind === 'apk'
                  ? 'Signed package ready for Android PackageInstaller.'
                  : 'Use Save Copy to export this file from AG File Manager.'}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => onDownloadFile(file)}
            className="min-h-[40px] px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            Export Copy
          </button>
          {isEditableText && (
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
  );
};
