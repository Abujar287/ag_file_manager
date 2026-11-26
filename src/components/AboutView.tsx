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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 sm:py-4 space-y-4">

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6">
        <div className="flex items-center gap-4">
          <AppLogo size={56} />
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              AG File Manager
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
              Version {settings.currentVersionName} · File Manager
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
          <div className="py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-slate-500 dark:text-slate-400">Apps Owner Name</span>
            <span className="font-medium text-slate-900 dark:text-slate-100 break-words">
              Abujar Al-Gifari
            </span>
          </div>
          <div className="py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-slate-500 dark:text-slate-400">Email</span>
            <span className="font-mono text-xs sm:text-sm text-slate-900 dark:text-slate-100 break-all">
              abujar287.algifari@gmail.com
            </span>
          </div>
          <div className="py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <span className="text-slate-500 dark:text-slate-400">Version</span>
            <span className="font-mono text-slate-900 dark:text-slate-100 tabular-nums break-words">
              {settings.currentVersionName} (Build {settings.currentVersionCode})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
