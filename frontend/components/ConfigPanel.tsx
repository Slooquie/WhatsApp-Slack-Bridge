import React, { useState } from 'react';
import { BridgeConfig } from '../types';
import { Settings, Key, Hash, Network, Play, Power } from 'lucide-react';

interface ConfigPanelProps {
  config: BridgeConfig;
  setConfig: React.Dispatch<React.SetStateAction<BridgeConfig>>;
  onStart: () => void;
  onStop: () => void;
  isConnected: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, onStart, onStop, isConnected }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="bg-[#1e293b]/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings size={20} className="text-blue-400" />
          Configuration
        </h3>
        {isConnected ? (
          <button
            onClick={onStop}
            className="flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
          >
            <Power size={16} /> Disconnect
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-green-500/20 hover:scale-105"
          >
            <Play size={16} /> Start Bridge
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-1.5">
            <Network size={14} /> Backend Service URL
          </label>
          <input
            type="text"
            name="backendUrl"
            value={config.backendUrl}
            onChange={handleChange}
            disabled={isConnected}
            placeholder="ws://localhost:8080"
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none disabled:opacity-50 transition-all font-mono"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-1.5">
            <Key size={14} /> Slack Bot User OAuth Token
          </label>
          <input
            type="password"
            name="slackBotToken"
            value={config.slackBotToken}
            onChange={handleChange}
            disabled={isConnected}
            placeholder="xoxb-..."
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none disabled:opacity-50 transition-all font-mono"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-400 mb-1.5">
            <Key size={14} /> Slack App-Level Token
          </label>
          <input
            type="password"
            name="slackAppToken"
            value={config.slackAppToken}
            onChange={handleChange}
            disabled={isConnected}
            placeholder="xapp-..."
            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none disabled:opacity-50 transition-all font-mono"
          />
        </div>
      </div>
    </div>
  );
};
