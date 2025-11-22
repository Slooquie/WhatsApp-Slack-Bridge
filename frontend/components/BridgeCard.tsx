import React from 'react';
import { Power, Settings, MessageSquare, Hash } from 'lucide-react';

interface Bridge {
    id: string;
    name: string;
    active: boolean;
    slackChannelId: string;
    whatsappGroupId: string;
}

interface BridgeCardProps {
    bridge: Bridge;
    onToggle: (id: string, active: boolean) => void;
    onEdit: (bridge: Bridge) => void;
    onDelete: (id: string) => void;
}

export const BridgeCard: React.FC<BridgeCardProps> = ({ bridge, onToggle, onEdit, onDelete }) => {
    return (
        <div className={`bg-gray-800 rounded-xl p-6 border transition-all duration-300 ${bridge.active ? 'border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'border-gray-700'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-white mb-1">{bridge.name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${bridge.active ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                        <span>{bridge.active ? 'Active' : 'Stopped'}</span>
                    </div>
                </div>
                <button
                    onClick={() => onToggle(bridge.id, !bridge.active)}
                    className={`p-3 rounded-full transition-all duration-300 ${bridge.active
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:scale-110 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
                        }`}
                    title={bridge.active ? "Turn Off" : "Turn On"}
                >
                    <Power size={24} />
                </button>
            </div>

            <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                    <MessageSquare size={18} className="text-[#25D366]" />
                    <div className="flex-1 truncate">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">WhatsApp Group</div>
                        <div className="truncate">{bridge.whatsappGroupId || 'Not Configured'}</div>
                    </div>
                </div>

                <div className="flex items-center space-x-3 text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                    <Hash size={18} className="text-[#4A154B]" />
                    <div className="flex-1 truncate">
                        <div className="text-xs text-gray-500 uppercase tracking-wider">Slack Channel</div>
                        <div className="truncate">{bridge.slackChannelId || 'Not Configured'}</div>
                    </div>
                </div>
            </div>

            <div className="flex space-x-2">
                <button
                    onClick={() => onEdit(bridge)}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
                >
                    <Settings size={16} />
                    <span>Configure</span>
                </button>
                <button
                    onClick={() => onDelete(bridge.id)}
                    className="flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 px-4 rounded-lg transition-colors"
                    title="Delete Bridge"
                >
                    Delete
                </button>
            </div>
        </div>
    );
};
