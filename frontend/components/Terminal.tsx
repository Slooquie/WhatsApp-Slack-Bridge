import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';
import { Terminal as TerminalIcon, Activity } from 'lucide-react';

interface TerminalProps {
  logs: LogEntry[];
}

const Terminal: React.FC<TerminalProps> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return 'text-blue-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-500';
      case 'debug': return 'text-gray-500';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="flex flex-col h-full bg-terminal-black border border-terminal-gray rounded-lg overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-terminal-gray border-b border-gray-700">
        <div className="flex items-center gap-2">
          <TerminalIcon size={16} className="text-gray-400" />
          <span className="text-xs font-mono text-gray-400 uppercase tracking-wider">System Log</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5">
        {logs.length === 0 && (
          <div className="text-gray-600 italic opacity-50">Waiting for process start...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2">
            <span className="text-gray-600 shrink-0">
              [{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}.{log.timestamp.getMilliseconds().toString().padStart(3, '0')}]
            </span>
            <span className={`font-bold w-20 shrink-0 ${log.source === 'WHATSAPP' ? 'text-whatsapp-green' : log.source === 'SLACK' ? 'text-slack-purple' : 'text-purple-400'}`}>
              {log.source}
            </span>
            <span className={`${getLevelColor(log.level)} break-all`}>
              {log.source === 'CRYPTO' && <Activity size={10} className="inline mr-1" />}
              {log.message}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default Terminal;