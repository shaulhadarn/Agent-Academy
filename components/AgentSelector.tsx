import React from 'react';
import { Agent } from '../types';

interface AgentSelectorProps {
  agents: Agent[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddClick: () => void;
}

const AgentSelector: React.FC<AgentSelectorProps> = ({ agents, selectedId, onSelect, onAddClick }) => {
  return (
    // Increased container padding to prevent clipping of "pop-out" UI elements (badges, shadows, scaling)
    <div className="flex gap-6 overflow-x-auto pt-12 pb-8 px-6 no-scrollbar items-center">
      {agents.map((agent) => (
        <button
          key={agent.id}
          onClick={() => onSelect(agent.id)}
          className={`relative group flex-shrink-0 transition-all duration-300 transform-gpu ${
            selectedId === agent.id ? 'scale-110 z-10' : 'scale-95 opacity-70 hover:scale-100 hover:opacity-90'
          }`}
        >
          <div 
            className="w-16 h-16 md:w-20 md:h-20 border-4 border-black dark:border-white rounded-3xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-white dark:bg-zinc-800 p-1 transition-colors"
            style={{ borderColor: selectedId === agent.id ? agent.color : (document.documentElement.classList.contains('dark') ? 'white' : 'black') }}
          >
            <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-contain" />
          </div>
          <span className={`block mt-2 text-[10px] md:text-xs font-black uppercase text-center tracking-tighter transition-colors ${
            selectedId === agent.id ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'
          }`}>
            {agent.name}
          </span>
          {selectedId === agent.id && (
            <div className="absolute -top-3 -right-3 bg-green-400 border-2 border-black dark:border-white rounded-full px-2 py-0.5 flex items-center justify-center text-[9px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] animate-bounce-slow z-20 text-black">
              ACTIVE
            </div>
          )}
        </button>
      ))}
      <button 
        onClick={onAddClick}
        className="w-16 h-16 md:w-20 md:h-20 border-4 border-dashed border-gray-400 dark:border-gray-500 rounded-3xl flex items-center justify-center text-2xl text-gray-400 dark:text-gray-500 flex-shrink-0 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white hover:scale-105 transition-all mb-4 bg-white/20 dark:bg-white/5"
      >
        +
      </button>
    </div>
  );
};

export default AgentSelector;