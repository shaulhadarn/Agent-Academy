import React from 'react';
import { SystemUpgrade } from '../types';

interface UpgradeCardProps {
  upgrade: SystemUpgrade;
}

const UpgradeCard: React.FC<UpgradeCardProps> = ({ upgrade }) => {
  return (
    <div className="relative bg-white dark:bg-zinc-800 border-2 border-black dark:border-white p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] group hover:rotate-1 transition-transform">
      <div className="absolute -top-3 -right-2 bg-yellow-400 border-2 border-black dark:border-white px-2 py-0.5 rounded-full text-[10px] font-black uppercase transform rotate-6 text-black">
        PENDING
      </div>
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-full border-2 border-black dark:border-white flex items-center justify-center text-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
          🛰️
        </div>
        <div>
          <h4 className="font-black text-lg text-blue-600 dark:text-blue-400">{upgrade.title}</h4>
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{upgrade.component}</p>
          <div className="flex items-center gap-1 text-[10px] font-black text-gray-400 dark:text-gray-500 mt-1">
            <span>📅</span> NEXT SYNC: {upgrade.date}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeCard;