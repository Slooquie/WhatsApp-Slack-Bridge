
import React, { useState } from 'react';
import { BridgeConfig } from '../types';
import { Settings, Key, Hash, Network } from 'lucide-react';

interface ConfigPanelProps {
  config: BridgeConfig;
  onUpdate: (config: BridgeConfig) => void;
  locked: boolean;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onUpdate, locked }) => {
  const [localConfig, setLocalConfig] = useState(config);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const next = {
      ...localConfig,
      [name]: value
    };
    setLocalConfig(next);
    onUpdate(next);
  };

  return (
    <div className="bg-terminal-gray/50 rounded-lg border border-terminal-gray p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="text-gray-400" size={18} />
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Bridge Configuration</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Network size={12} /> Backend Service URL
          </label>
          <input
            type="text"
            name="backendUrl"
            value={localConfig.backendUrl}
            onChange={handleChange}
            disabled={locked}
            placeholder="ws://localhost:8080"
            className="w-full bg-terminal-black border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none disabled:opacity-50 font-mono"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Key size={12} /> Slack Bot User OAuth Token
          </label>
          <input
            type="password"
            name="slackBotToken"
            value={localConfig.slackBotToken}
            onChange={handleChange}
            disabled={locked}
            placeholder="xoxb-..."
            className="w-full bg-terminal-black border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none disabled:opacity-50 font-mono"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Key size={12} /> Slack App-Level Token
          </label>
          <input
            type="password"
            name="slackAppToken"
            value={localConfig.slackAppToken}
            onChange={handleChange}
            disabled={locked}
            placeholder="xapp-..."
            className="w-full bg-terminal-black border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none disabled:opacity-50 font-mono"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Hash size={12} /> Slack Channel ID
          </label>
          <input
            type="text"
            name="slackChannelId"
            value={localConfig.slackChannelId}
            onChange={handleChange}
            disabled={locked}
            placeholder="C12345678"
            className="w-full bg-terminal-black border border-gray-700 rounded px-3 py-2 text-sm text-gray-300 focus:border-blue-500 focus:outline-none disabled:opacity-50 font-mono"
          />
        </div>
      </div>

      {!locked && (
        <div className="p-2 mt-4 bg-blue-900/20 border border-blue-800/50 rounded text-[10px] text-blue-300">
          Ensure your backend is running on the specified URL. The backend handles the actual WebSocket connection to WhatsApp and Slack API calls.
        </div>
      )}
    </div>
  );
};

export default ConfigPanel;
