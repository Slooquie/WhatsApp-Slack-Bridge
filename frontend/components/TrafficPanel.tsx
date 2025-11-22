import React from 'react';
import { MessageTraffic } from '../types';
import { ArrowRightLeft, MessageSquare, Hash } from 'lucide-react';

interface TrafficPanelProps {
    traffic: MessageTraffic[];
}

export const TrafficPanel: React.FC<TrafficPanelProps> = ({ traffic }) => {
    return (
        <div className="bg-[#1e293b]/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ArrowRightLeft size={20} className="text-blue-400" />
                Live Traffic
            </h3>

            <div className="space-y-3">
                {traffic.length === 0 && (
                    <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-700 rounded-xl">
                        Waiting for messages...
                    </div>
                )}
                {traffic.map((msg) => (
                    <div key={msg.id} className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className={`p-2 rounded-full ${msg.platform === 'whatsapp' ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-[#4A154B]/20 text-[#4A154B]'
                            }`}>
                            {msg.platform === 'whatsapp' ? <MessageSquare size={16} /> : <Hash size={16} />}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="font-bold text-gray-200 text-sm">{msg.sender}</span>
                                <span className="text-xs text-gray-500">{msg.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <p className="text-gray-400 text-sm truncate">{msg.content}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
