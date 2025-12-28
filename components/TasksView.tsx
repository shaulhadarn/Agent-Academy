
import React, { useState } from 'react';
import { WorkflowLog } from '../types';

interface TasksViewProps {
  workflowLogs: WorkflowLog[];
  onClearLogs?: () => void;
  onDeleteLog?: (id: string) => void;
  onRerunLog?: (log: WorkflowLog) => void;
}

const TasksView: React.FC<TasksViewProps> = ({ workflowLogs, onClearLogs, onDeleteLog, onRerunLog }) => {
  const [selectedLog, setSelectedLog] = useState<WorkflowLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

  const filteredLogs = workflowLogs.filter(log => {
      if (filter === 'all') return true;
      if (filter === 'success') return log.status === 'success';
      if (filter === 'failed') return log.status === 'failed' || log.status === 'partial';
      return true;
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'success': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-300';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-300';
      default: return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300 border-yellow-300';
    }
  };

  const getRoleIcon = (role: string) => {
      const r = role.toUpperCase();
      if (r.includes('NEWS')) return '📰';
      if (r.includes('CODER')) return '💻';
      if (r.includes('WRITER')) return '✍️';
      if (r.includes('DESIGNER')) return '🎨';
      if (r.includes('RESEARCHER')) return '🧠';
      return '🤖';
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
             <h3 className="text-2xl font-black italic text-gray-900 dark:text-white underline decoration-yellow-400">📜 Workflow Logs</h3>
             <span className="bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-full text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
               {workflowLogs.length} RECORDED
             </span>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
             {/* Filter Chips */}
             <div className="bg-white dark:bg-zinc-800 p-1 rounded-xl border-2 border-black dark:border-white flex gap-1 shadow-sm">
                {(['all', 'success', 'failed'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                            filter === f 
                            ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm' 
                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-700'
                        }`}
                    >
                        {f}
                    </button>
                ))}
             </div>

             {onClearLogs && workflowLogs.length > 0 && (
                <button 
                  onClick={onClearLogs}
                  className="bg-red-100 dark:bg-red-900/40 hover:bg-red-200 border-2 border-black dark:border-white p-2 rounded-xl text-red-600 dark:text-red-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all"
                  title="Clear All History"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
             )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {filteredLogs.map(log => (
          <div 
            key={log.id} 
            className="group relative bg-white dark:bg-zinc-800 border-4 border-black dark:border-white rounded-3xl p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-transform hover:-translate-y-1"
          >
             <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <div className={`w-14 h-14 flex-shrink-0 rounded-2xl border-2 flex items-center justify-center text-2xl shadow-sm ${getStatusColor(log.status)}`}>
                        {log.status === 'success' ? '✅' : '⚠️'}
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-black text-lg text-gray-900 dark:text-white leading-tight truncate">{log.title}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{log.timestamp}</span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getStatusColor(log.status)} bg-opacity-50`}>{log.status}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    {/* AGENT PARTICIPANTS - VISIBLE NOW */}
                    <div className="flex flex-wrap gap-2 mr-4 justify-end">
                        {log.steps.map((step, i) => (
                            <div 
                                key={i} 
                                className="flex items-center gap-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full pl-1 pr-2 py-0.5 border border-black dark:border-white"
                                title={`${step.agentName} - ${step.role}`}
                            >
                                <img 
                                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${step.agentName}`} 
                                    alt={step.agentName}
                                    className="w-5 h-5 rounded-full bg-white border border-gray-300"
                                />
                                <span className="text-[9px] font-black uppercase text-gray-600 dark:text-gray-300 hidden sm:inline-block">
                                    {step.agentName}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2">
                        {onRerunLog && (
                             <button
                                onClick={(e) => { e.stopPropagation(); onRerunLog(log); }}
                                className="bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-900 border-2 border-black dark:border-white rounded-xl p-2 text-purple-900 dark:text-purple-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all"
                                title="Re-Run Workflow"
                             >
                                🔄
                             </button>
                        )}
                        
                        <button 
                            onClick={() => setSelectedLog(log)}
                            className="bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900 border-2 border-black dark:border-white rounded-xl px-4 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all text-blue-900 dark:text-blue-100 whitespace-nowrap"
                        >
                            View Report 📄
                        </button>
                        
                        {onDeleteLog && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteLog(log.id); }}
                                className="bg-gray-100 dark:bg-zinc-700 hover:bg-red-100 dark:hover:bg-red-900/40 border-2 border-black dark:border-white rounded-xl p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all"
                                title="Delete Log"
                            >
                                🗑️
                            </button>
                        )}
                    </div>
                </div>
             </div>
          </div>
        ))}
        
        {filteredLogs.length === 0 && (
            <div className="text-center py-20 bg-white/40 dark:bg-zinc-800/40 border-4 border-dashed border-black dark:border-white rounded-3xl opacity-80">
              <p className="text-6xl mb-4">🕸️</p>
              <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">No missions found.</p>
              <p className="text-xs text-gray-500 mt-2">
                  {filter !== 'all' ? `Try changing the filter from '${filter}'.` : 'Run a workflow in the Orchestrator!'}
              </p>
            </div>
        )}
      </div>

      {/* REPORT MODAL */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#FFFDE7] dark:bg-zinc-900 w-full max-w-4xl max-h-[90vh] border-4 border-black dark:border-white rounded-3xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] dark:shadow-[10px_10px_0px_0px_rgba(255,255,255,1)] flex flex-col overflow-hidden relative">
                
                {/* Header */}
                <div className="bg-white dark:bg-zinc-800 border-b-4 border-black dark:border-white p-4 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-black italic text-gray-900 dark:text-white leading-none">Mission Report</h2>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-widest">ID: {selectedLog.id}</p>
                    </div>
                    <button onClick={() => setSelectedLog(null)} className="w-12 h-12 bg-red-400 border-2 border-black dark:border-white rounded-xl font-black text-white hover:bg-red-500 hover:scale-105 transition-all text-xl">
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 lg:p-8 bg-dots-pattern">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT COLUMN: INFO & STEPS */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                                <h4 className="font-black uppercase text-xs mb-4 text-gray-400 dark:text-gray-500 border-b-2 border-dashed border-gray-200 pb-2">Mission Details</h4>
                                <div className="space-y-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-gray-500">Objective</p>
                                        <p className="font-bold text-gray-900 dark:text-white leading-tight">{selectedLog.title}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-gray-500">Timestamp</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{selectedLog.timestamp}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-gray-500">Final Status</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-black uppercase rounded border ${getStatusColor(selectedLog.status)}`}>
                                            {selectedLog.status}
                                        </span>
                                    </div>
                                </div>
                                {onRerunLog && (
                                     <button 
                                        onClick={() => { setSelectedLog(null); onRerunLog(selectedLog); }}
                                        className="w-full mt-4 bg-purple-100 dark:bg-purple-900/30 border-2 border-black dark:border-white py-2 rounded-xl text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center justify-center gap-2"
                                     >
                                         <span>🔄 Re-Run Workflow</span>
                                     </button>
                                )}
                            </div>

                            <div className="relative pl-4 border-l-4 border-dashed border-gray-300 dark:border-zinc-700 space-y-6">
                                {selectedLog.steps.map((step, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-[25px] top-0 w-4 h-4 rounded-full bg-black dark:bg-white border-4 border-gray-300 dark:border-zinc-700"></div>
                                        <div className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-white p-3 rounded-xl shadow-sm">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-black uppercase text-blue-500 dark:text-blue-400">{step.role}</span>
                                                <span className="text-[10px] font-bold text-gray-400">Step {idx+1}</span>
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <img 
                                                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${step.agentName}`} 
                                                    alt={step.agentName}
                                                    className="w-8 h-8 rounded-full border border-black dark:border-white bg-gray-100"
                                                />
                                                <p className="font-black text-sm text-gray-900 dark:text-white">{step.agentName}</p>
                                            </div>
                                            <p className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-zinc-900 p-2 rounded-lg italic">
                                                "{step.status}"
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT COLUMN: OUTPUT PREVIEW */}
                        <div className="lg:col-span-2">
                            <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white rounded-2xl overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] h-full flex flex-col">
                                <div className="bg-gray-100 dark:bg-zinc-700 border-b-2 border-black dark:border-white p-3 flex gap-2 items-center">
                                    <div className="w-3 h-3 rounded-full bg-red-400 border border-black"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400 border border-black"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400 border border-black"></div>
                                    <div className="ml-2 text-xs font-black uppercase text-gray-500 tracking-wider">
                                        {selectedLog.output?.title || "Output Console"}
                                    </div>
                                </div>
                                
                                <div className="flex-1 p-6 md:p-8 bg-white dark:bg-zinc-900 overflow-y-auto max-h-[500px]">
                                    {selectedLog.output ? (
                                        selectedLog.output.type === 'html' ? (
                                            <div className="prose dark:prose-invert max-w-none font-fredoka" dangerouslySetInnerHTML={{ __html: selectedLog.output.content }} />
                                        ) : (
                                            <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-300">
                                                {selectedLog.output.content}
                                            </pre>
                                        )
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                                            <span className="text-4xl mb-2">🚫</span>
                                            <span className="font-black uppercase text-xs">No Output Generated</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="p-4 border-t-2 border-black dark:border-white bg-gray-50 dark:bg-zinc-800 flex justify-end">
                                    <button 
                                        onClick={() => {
                                            // Simple print/copy logic could go here
                                            navigator.clipboard.writeText(selectedLog.output?.content || "");
                                            alert("Content copied to clipboard!");
                                        }}
                                        className="text-xs font-black uppercase text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-2"
                                    >
                                        <span>Copy Content</span>
                                        <span>📋</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default TasksView;
