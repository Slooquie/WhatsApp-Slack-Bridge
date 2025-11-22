import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal } from 'lucide-react';

interface LogPanelProps {
    logs: LogEntry[];
}

export const LogPanel: React.FC<LogPanelProps> = ({ logs }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="bg-[#1e293b]/50 border border-gray-700/50 rounded-2xl p-6 backdrop-blur-sm flex flex-col h-[400px]">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Terminal size={20} className="text-gray-400" />
                System Logs
            </h3>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto font-mono text-xs space-y-1 pr-2 custom-scrollbar"
            >
                {logs.length === 0 && (
                    <div className="text-gray-600 italic text-center mt-10">No logs yet...</div>
                )}
                {logs.map((log) => (
                    <div key={log.id} className="flex gap-2 hover:bg-white/5 p-1 rounded transition-colors">
                        <span className="text-gray-500 shrink-0">
                            [{log.timestamp.toLocaleTimeString()}]
                        </span>
                        <span className={`font-bold shrink-0 w-20 ${log.level === 'error' ? 'text-red-400' :
                                log.level === 'warning' ? 'text-yellow-400' :
                                    log.level === 'success' ? 'text-green-400' :
                                        'text-blue-400'
                            }`}>
                            {log.source}
                        </span>
                        <span className={`break-all ${log.level === 'error' ? 'text-red-300' :
                                log.level === 'warning' ? 'text-yellow-300' :
                                    'text-gray-300'
                            }`}>
                            {log.message}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};
