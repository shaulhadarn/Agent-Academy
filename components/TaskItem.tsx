
import React from 'react';
import { AgentTask } from '../types';

interface TaskItemProps {
  task: AgentTask;
  onToggle: (id: string) => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle }) => {
  const getIcon = () => {
    switch(task.type) {
      case 'processing': return '⚙️';
      case 'learning': return '🧠';
      case 'debugging': return '🐛';
      case 'deploying': return '🚀';
      default: return '✨';
    }
  };

  const getPriorityColor = () => {
    switch(task.priority) {
      case 'high': return 'bg-red-200';
      case 'medium': return 'bg-orange-200';
      default: return 'bg-blue-200';
    }
  };

  return (
    <div 
      onClick={() => onToggle(task.id)}
      className={`group flex items-center gap-3 p-3 bg-white border-2 border-black cursor-pointer transition-all hover:-translate-y-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] rounded-2xl ${task.completed ? 'opacity-50 grayscale' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${getPriorityColor()} border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <h4 className={`font-black text-sm text-gray-900 ${task.completed ? 'line-through' : ''}`}>
          {task.title}
        </h4>
        <span className="text-[10px] text-gray-800 font-black uppercase tracking-tight">
          {task.type} • {task.priority} prio
        </span>
      </div>
      <div className={`w-6 h-6 border-2 border-black rounded-full flex items-center justify-center transition-colors ${task.completed ? 'bg-blue-500' : 'bg-white'}`}>
        {task.completed && (
          <svg className="w-4 h-4 text-white stroke-[4px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </div>
  );
};

export default TaskItem;
