import React from 'react';
import { WhatsAppGroup } from '../types';
import { Users, MessageSquare, Clock } from 'lucide-react';

interface GroupSelectorProps {
  groups: WhatsAppGroup[];
  onSelect: (id: string) => void;
}

const GroupSelector: React.FC<GroupSelectorProps> = ({ groups, onSelect }) => {
  return (
    <div className="bg-terminal-gray/50 rounded-lg border border-terminal-gray p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="text-whatsapp-green" size={18} />
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Select Target Group</h3>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => onSelect(group.id)}
            className="w-full text-left bg-terminal-black border border-gray-700 hover:border-whatsapp-green/50 hover:bg-gray-800/50 p-3 rounded transition-all group"
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-bold text-gray-200 group-hover:text-whatsapp-green transition-colors">
                {group.name}
              </span>
              <span className="text-[10px] text-gray-500 font-mono bg-gray-800 px-1 rounded">
                {group.id.split('@')[0].slice(-4)}...
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-gray-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Users size={10} /> {group.participantCount}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={10} /> {group.lastMessageTime.toLocaleDateString()}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default GroupSelector;