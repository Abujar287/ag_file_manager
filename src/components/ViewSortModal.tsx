import React from 'react';
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  FileType2,
  Grid2X2,
  HardDrive,
  List,
  Rows3,
  Text,
  X,
} from 'lucide-react';
import { SortBy, SortOrder, ViewMode } from '../types/fileManager';

interface ViewSortModalProps {
  open: boolean;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onChangeViewMode: (mode: ViewMode) => void;
  onChangeSort: (sortBy: SortBy, sortOrder?: SortOrder) => void;
  onClose: () => void;
}

export const ViewSortModal: React.FC<ViewSortModalProps> = ({
  open,
  viewMode,
  sortBy,
  sortOrder,
  onChangeViewMode,
  onChangeSort,
  onClose,
}) => {
  if (!open) return null;

  const viewModes: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
    { id: 'list', label: 'List', icon: <List size={18} /> },
    { id: 'grid', label: 'Grid', icon: <Grid2X2 size={18} /> },
    { id: 'detail', label: 'Detail', icon: <Rows3 size={18} /> },
  ];

  const sortOptions: { id: SortBy; label: string; icon: React.ReactNode }[] = [
    { id: 'name', label: 'Name', icon: <Text size={16} /> },
    { id: 'date', label: 'Date', icon: <Calendar size={16} /> },
    { id: 'size', label: 'Size', icon: <HardDrive size={16} /> },
    { id: 'type', label: 'Type', icon: <FileType2 size={16} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="View and Sort options"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            View &amp; Sort
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Top Section: View Mode */}
        <div className="p-5 space-y-3 border-b border-slate-100 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            View Mode
          </div>
          <div className="grid grid-cols-3 gap-2">
            {viewModes.map((m) => {
              const active = viewMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeViewMode(m.id)}
                  className={`min-h-[64px] px-3 py-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: Sort Criteria + ASC/DESC Toggle */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Sort By
            </span>
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <button
                type="button"
                onClick={() => onChangeSort(sortBy, 'asc')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  sortOrder === 'asc'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowUpAZ size={14} />
                <span>ASC</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeSort(sortBy, 'desc')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  sortOrder === 'desc'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ArrowDownAZ size={14} />
                <span>DESC</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {sortOptions.map((opt) => {
              const active = sortBy === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeSort(opt.id, sortOrder)}
                  className={`min-h-[44px] px-3.5 py-2.5 rounded-xl border flex items-center gap-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-600 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[42px] rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
