import React from 'react';
import { Package, RefreshCw, Download, Loader2 } from 'lucide-react';
import { VersionInfo } from '../types';

interface UpdatePanelProps {
  info: VersionInfo | null;
  onCheck: () => void;
  onApply: () => void;
}

export const UpdatePanel: React.FC<UpdatePanelProps> = ({ info, onCheck, onApply }) => {
  if (!info) return null;

  const updateAvailable = !!info.updateAvailable;
  const restarting = !!info.restarting;

  return (
    <div className="bg-[#1e293b]/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Package size={20} className="text-blue-400" />
          Version
        </h3>
        <button
          onClick={onCheck}
          disabled={restarting}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600 transition-colors"
          title="Check GitHub for a newer release"
        >
          <RefreshCw size={12} />
          Check
        </button>
      </div>

      <div className="bg-gray-800/60 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-gray-400 text-sm">Running</span>
        <span className="font-mono text-white text-sm">{info.version}</span>
      </div>

      {info.latest && (
        <div className="bg-gray-800/60 rounded-lg px-4 py-3 mt-2 flex items-center justify-between">
          <span className="text-gray-400 text-sm">Latest</span>
          <span className={`font-mono text-sm ${updateAvailable ? 'text-green-400' : 'text-gray-400'}`}>
            {info.latest}
          </span>
        </div>
      )}

      {restarting && (
        <div className="mt-4 flex items-center gap-2 text-sm text-blue-300">
          <Loader2 size={16} className="animate-spin" />
          Restarting — reload this page in a few seconds.
        </div>
      )}

      {!restarting && updateAvailable && info.canSelfUpdate && (
        <button
          onClick={onApply}
          className="w-full mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-green-600/20"
        >
          <Download size={16} />
          Update to {info.latest}
        </button>
      )}

      {!restarting && updateAvailable && !info.canSelfUpdate && (
        <p className="text-xs text-gray-500 mt-3">
          {info.packaged
            ? 'Self-update needs systemd to restart the service. Run ./update.sh instead.'
            : 'Running from source — use git pull, or download a release binary.'}
        </p>
      )}

      {!restarting && info.checked && !updateAvailable && !info.error && (
        <p className="text-xs text-gray-500 mt-3">You are on the latest release.</p>
      )}

      {info.error && <p className="text-xs text-red-400 mt-3">{info.error}</p>}
    </div>
  );
};
