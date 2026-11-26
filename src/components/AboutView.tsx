import React from 'react';
import {
  CheckCircle2,
  Cpu,
  Layers,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from 'lucide-react';
import { AppSettings } from '../types/fileManager';
import { AppLogo } from './AppLogo';

interface AboutViewProps {
  settings: AppSettings;
  onBackHome?: () => void;
  onCheckUpdate?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  settings,
  onCheckUpdate,
}) => {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      {/* App Header Identity Card */}
      <div className="bg-[#18202c] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col items-center text-center space-y-3.5">
        <div className="p-2.5 rounded-2xl bg-[#1e2736] border border-slate-700/60 shadow-md">
          <AppLogo size={68} />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            AG File Manager
          </h2>
          <p className="text-xs sm:text-sm font-medium text-slate-400 tabular-nums">
            Version {settings.currentVersionName}
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
          <CheckCircle2 size={13} className="shrink-0" />
          <span>Latest Stable Release</span>
        </div>
      </div>

      {/* Developer & Contact Card */}
      <div className="bg-[#18202c] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Developer Information
        </h3>
        <div className="divide-y divide-slate-800/80 rounded-2xl bg-[#131922] border border-slate-800/70 overflow-hidden">
          <div className="p-3.5 sm:px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-slate-400">
              <User size={16} className="text-blue-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-slate-300">Developer</span>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-100">
              Abujar Al-Gifari
            </span>
          </div>

          <div className="p-3.5 sm:px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-slate-400">
              <Mail size={16} className="text-blue-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-slate-300">Contact</span>
            </div>
            <a
              href="mailto:abujar287.algifari@gmail.com"
              className="font-mono text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors truncate max-w-[200px] sm:max-w-none"
            >
              abujar287.algifari@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* System & Architecture Specifications */}
      <div className="bg-[#18202c] border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
          Application Details
        </h3>
        <div className="divide-y divide-slate-800/80 rounded-2xl bg-[#131922] border border-slate-800/70 overflow-hidden">
          <div className="p-3.5 sm:px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-slate-400">
              <Layers size={16} className="text-indigo-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-slate-300">Package ID</span>
            </div>
            <span className="font-mono text-xs sm:text-sm text-slate-300">
              com.ag.filemanager
            </span>
          </div>

          <div className="p-3.5 sm:px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-slate-400">
              <Cpu size={16} className="text-indigo-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-slate-300">Architecture</span>
            </div>
            <span className="font-mono text-xs sm:text-sm text-slate-300">
              ARM64 &amp; Universal
            </span>
          </div>

          <div className="p-3.5 sm:px-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-slate-400">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-slate-300">Security</span>
            </div>
            <span className="text-xs sm:text-sm font-medium text-emerald-400 flex items-center gap-1">
              Google Play Protect Verified
            </span>
          </div>
        </div>
      </div>

      {/* Check for Updates Action */}
      {onCheckUpdate && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onCheckUpdate}
            className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-[#1e2736] hover:bg-[#253042] border border-slate-700/80 text-xs sm:text-sm font-semibold text-slate-200 hover:text-white flex items-center justify-center gap-2 transition-colors active:scale-[0.99]"
          >
            <RefreshCw size={15} className="text-blue-400" />
            <span>Check for Updates</span>
          </button>
        </div>
      )}

      {/* Subtle Copyright Footer */}
      <div className="pt-3 text-center">
        <p className="text-[11px] text-slate-400 font-medium">
          &copy; {new Date().getFullYear()} AG File Manager. All rights reserved.
        </p>
      </div>
    </div>
  );
};
