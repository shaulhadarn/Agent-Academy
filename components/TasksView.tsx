import React, { useState } from 'react';
import { AgentTask } from '../types';
import TaskItem from './TaskItem';
import AddTaskModal from './AddTaskModal';

interface TasksViewProps {
  agentId: string;
  tasks: AgentTask[];
  onToggleTask: (id: string) => void;
  onAddTask: (task: AgentTask) => void;
}

const TasksView: React.FC<TasksViewProps> = ({ agentId, tasks, onToggleTask, onAddTask }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-2xl font-black italic text-gray-900 dark:text-white underline decoration-yellow-400">⚡ Subroutines</h3>
        <span className="bg-black dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-full text-[10px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
          {tasks.filter(t => t.completed).length}/{tasks.length} DONE
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.map(task => (
          <TaskItem key={task.id} task={task} onToggle={onToggleTask} />
        ))}
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="min-h-[80px] flex flex-col items-center justify-center py-6 border-4 border-dashed border-gray-400 dark:border-zinc-600 rounded-2xl text-gray-500 dark:text-gray-400 font-black text-sm hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white transition-colors bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 shadow-sm active:scale-[0.98] group"
        >
          <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">+</span>
          ADD NEW SUBROUTINE
        </button>
      </div>

      {tasks.length === 0 && (
        <div className="text-center py-20 bg-white/40 dark:bg-zinc-800/40 border-4 border-dashed border-black dark:border-white rounded-3xl opacity-80">
          <p className="text-6xl mb-4">😴</p>
          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">No tasks found for this agent.</p>
        </div>
      )}

      {isModalOpen && (
        <AddTaskModal 
          agentId={agentId}
          onClose={() => setIsModalOpen(false)}
          onAdd={onAddTask}
        />
      )}
    </div>
  );
};

export default TasksView;