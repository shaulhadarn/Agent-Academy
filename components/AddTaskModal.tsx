
import React, { useState } from 'react';
import { AgentTask } from '../types';

interface AddTaskModalProps {
  agentId: string;
  onClose: () => void;
  onAdd: (task: AgentTask) => void;
}

const AddTaskModal: React.FC<AddTaskModalProps> = ({ agentId, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AgentTask['type']>('processing');
  const [priority, setPriority] = useState<AgentTask['priority']>('medium');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: AgentTask = {
      id: 't' + Date.now(),
      agentId,
      title,
      type,
      priority,
      completed: false
    };
    onAdd(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-[#FFFDE7] dark:bg-zinc-900 w-full max-w-sm border-4 border-black dark:border-white wobbly-border p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black italic underline decoration-blue-400 decoration-4 text-gray-900 dark:text-white">New Subroutine ⚡</h2>
          <button onClick={onClose} className="text-4xl hover:scale-110 text-gray-900 dark:text-white">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase mb-1 text-gray-900 dark:text-gray-300">Task Description</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-2 border-black dark:border-white rounded-2xl p-3 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 ring-yellow-300 font-bold text-gray-900 dark:text-white text-base md:text-sm"
              placeholder="e.g. Optimize Sparkles"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase mb-1 text-gray-900 dark:text-gray-300">Process Type</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as AgentTask['type'])}
                className="w-full border-2 border-black dark:border-white rounded-2xl p-3 bg-white dark:bg-zinc-800 focus:outline-none font-bold text-base md:text-sm text-gray-900 dark:text-white"
              >
                <option value="processing">Processing ⚙️</option>
                <option value="learning">Learning 🧠</option>
                <option value="debugging">Debugging 🐛</option>
                <option value="deploying">Deploying 🚀</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1 text-gray-900 dark:text-gray-300">Urgency</label>
              <select 
                value={priority}
                onChange={(e) => setPriority(e.target.value as AgentTask['priority'])}
                className="w-full border-2 border-black dark:border-white rounded-2xl p-3 bg-white dark:bg-zinc-800 focus:outline-none font-bold text-base md:text-sm text-gray-900 dark:text-white"
              >
                <option value="low">Low 💤</option>
                <option value="medium">Medium 🎈</option>
                <option value="high">High 🔥</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-400 text-white font-black py-4 rounded-3xl border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-none transition-all mt-4 uppercase tracking-widest text-lg"
          >
            Assign Mission! 🫡
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTaskModal;
