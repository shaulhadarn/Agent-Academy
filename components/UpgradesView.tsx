import React from 'react';
import { SystemUpgrade } from '../types';
import UpgradeCard from './UpgradeCard';

interface UpgradesViewProps {
  upgrades: SystemUpgrade[];
}

const UpgradesView: React.FC<UpgradesViewProps> = ({ upgrades }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-2xl font-black italic text-gray-900 dark:text-white underline decoration-blue-400">🛰️ System Log</h3>
        <div className="w-10 h-10 bg-blue-400 rounded-full border-2 border-black dark:border-white flex items-center justify-center animate-spin-slow shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
           ⚙️
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {upgrades.map(upgrade => (
          <UpgradeCard key={upgrade.id} upgrade={upgrade} />
        ))}
      </div>
      
      {upgrades.length === 0 && (
        <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white border-dashed rounded-3xl p-12 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <p className="text-6xl mb-4">💎</p>
          <p className="text-2xl font-black italic text-gray-900 dark:text-white">PERFECT BUILD</p>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mt-2">This agent is peak performance!</p>
        </div>
      )}

      <div className="p-6 bg-yellow-100 dark:bg-yellow-900/40 border-4 border-black dark:border-white rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] max-w-2xl">
        <h4 className="font-black text-base mb-2 uppercase tracking-tighter text-gray-900 dark:text-white">Experimental Branch</h4>
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed">
          Beta components available in the next sync cycle. Do not unplug during update! 
          Side effects may include: accidental poetry generation, recursive giggling, or spontaneous color inversion.
        </p>
      </div>
    </div>
  );
};

export default UpgradesView;