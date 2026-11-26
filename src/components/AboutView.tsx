import { AppSettings } from '../types/fileManager';
import { AppLogo } from './AppLogo';

interface AboutViewProps {
  settings: AppSettings;
  onBackHome?: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({
  settings,
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="p-1 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 shadow-xs">
            <AppLogo size={64} />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              AG File Manager
            </h3>
            <p className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 tabular-nums">
              Version {settings.currentVersionName} · Professional Edition
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AG File Manager is a fast, lightweight, and modern file management application designed for seamless device storage organization, APK management, media browsing, and rapid navigation.
        </p>

        <div className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm pt-2">
          <div className="py-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Developer &amp; Owner</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              Abujar Al-Gifari
            </span>
          </div>
          <div className="py-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Contact Email</span>
            <span className="font-mono text-xs sm:text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">
              abujar287.algifari@gmail.com
            </span>
          </div>
          <div className="py-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">App Version</span>
            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              v{settings.currentVersionName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
