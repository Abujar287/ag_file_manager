import React, { useMemo, useState } from 'react';
import { FileNode } from '../types/fileManager';
import { getBaseName, getExtension } from '../utils/formatters';

interface BatchRenameDialogProps {
  items: FileNode[];
  onCancel: () => void;
  onConfirm: (renames: { id: string; newName: string }[]) => void;
}

type RenameMode = 'new_name_number' | 'prefix_original';

export const BatchRenameDialog: React.FC<BatchRenameDialogProps> = ({
  items,
  onCancel,
  onConfirm,
}) => {
  const [mode, setMode] = useState<RenameMode>('new_name_number');
  const [newName, setNewName] = useState(() =>
    items.length === 1 ? getBaseName(items[0].name) : 'File'
  );
  const [startNumber, setStartNumber] = useState('1');
  const [prefix, setPrefix] = useState('AG_');
  const [extensionOverride, setExtensionOverride] = useState('');

  const previewList = useMemo(() => {
    const startNum = Number.parseInt(startNumber, 10);
    const baseNum = Number.isNaN(startNum) ? 1 : startNum;
    const cleanExt = extensionOverride.trim().replace(/^\.+/, '');

    return items.map((item, idx) => {
      const origBase = item.kind === 'folder' ? item.name : getBaseName(item.name);
      const origExt = item.kind === 'folder' ? '' : getExtension(item.name);
      const targetExt = item.kind === 'folder' ? '' : cleanExt || origExt;

      let computedBase = '';
      if (mode === 'new_name_number') {
        const stem = newName.trim() || 'File';
        computedBase = items.length === 1 && startNumber === '' ? stem : `${stem}_${baseNum + idx}`;
      } else {
        computedBase = `${prefix}${origBase}`;
      }

      const finalName = targetExt ? `${computedBase}.${targetExt}` : computedBase;
      return {
        id: item.id,
        oldName: item.name,
        newName: finalName,
      };
    });
  }, [items, mode, newName, startNumber, prefix, extensionOverride]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(previewList.map(({ id, newName: next }) => ({ id, newName: next })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-rename-title"
      >
        <form onSubmit={handleSubmit}>
          <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <h2
              id="batch-rename-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {items.length > 1 ? `Batch Rename (${items.length} items)` : 'Rename'}
            </h2>
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setMode('new_name_number')}
                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  mode === 'new_name_number'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                New Name + Number
              </button>
              <button
                type="button"
                onClick={() => setMode('prefix_original')}
                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  mode === 'prefix_original'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Prefix + Original Name
              </button>
            </div>

            {/* Mode Inputs */}
            {mode === 'new_name_number' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    New Name
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Photo"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    Start Number
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={startNumber}
                    onChange={(e) => setStartNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Prefix
                </label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder="e.g. Backup_"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>
            )}

            {/* Extension Editor */}
            {items.some((i) => i.kind !== 'folder') && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  Extension Editor (optional)
                </label>
                <input
                  type="text"
                  value={extensionOverride}
                  onChange={(e) => setExtensionOverride(e.target.value)}
                  placeholder="Leave blank to keep original extension (e.g. jpg, txt)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-600"
                />
              </div>
            )}

            {/* Live Preview */}
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                Preview
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-40 overflow-y-auto bg-slate-50/70 dark:bg-slate-950/60">
                {previewList.map((row) => (
                  <div
                    key={row.id}
                    className="px-3.5 py-2 text-xs flex items-center justify-between gap-3"
                  >
                    <span className="text-slate-500 dark:text-slate-400 truncate max-w-[44%]">
                      {row.oldName}
                    </span>
                    <span className="text-slate-400 shrink-0">→</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100 truncate max-w-[48%] font-mono">
                      {row.newName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[42px] px-5 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
