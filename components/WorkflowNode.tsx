
import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';

const WorkflowNode = ({ data, id }: any) => {
  return (
    <div className={`
      relative min-w-[180px] bg-white dark:bg-zinc-800 border-4 border-black dark:border-white rounded-2xl p-3 
      shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]
      transition-all hover:scale-105 group
    `}>
      <Handle type="target" position={Position.Top} className="!bg-black dark:!bg-white !w-3 !h-3 !border-2 !border-white dark:!border-black" />
      
      {/* Config Button - Triggers the detailed view */}
      <button 
        onClick={(e) => {
          e.stopPropagation(); // Prevent node selection
          if (data.onConfig) data.onConfig(id, data);
        }}
        className="absolute -top-3 -right-3 w-8 h-8 bg-yellow-400 border-2 border-black dark:border-white rounded-full flex items-center justify-center text-sm shadow-sm hover:scale-110 active:scale-95 transition-transform z-10 cursor-pointer"
        title="View Details"
      >
        ⚙️
      </button>

      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-full border-2 border-black dark:border-white overflow-hidden bg-white flex-shrink-0"
          style={{ borderColor: data.color || 'black' }}
        >
          <img src={data.avatarUrl} alt="" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 leading-none mb-1">{data.role}</div>
          <div className="text-sm font-black text-gray-900 dark:text-white leading-none">{data.label}</div>
        </div>
      </div>

      {data.status && (
         <div className={`mt-2 rounded-lg p-1 text-[9px] font-bold text-center border border-black dark:border-white border-dashed ${
            data.status.includes('Complete') 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
              : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400'
         }`}>
            {data.status}
         </div>
      )}

      {data.output && (
        <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full border border-black">
          HAS OUTPUT
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="!bg-black dark:!bg-white !w-3 !h-3 !border-2 !border-white dark:!border-black" />
    </div>
  );
};

export default memo(WorkflowNode);
