
import React, { useState } from 'react';
import { Agent, AgentType } from '../types';

interface AddAgentModalProps {
  onClose: () => void;
  onAdd: (agent: Agent) => void;
}

const AddAgentModal: React.FC<AddAgentModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<AgentType>('assistant');
  const [specialty, setSpecialty] = useState('');
  const [version, setVersion] = useState('v1.0.0');

  const getDefaultsForType = (type: AgentType) => {
    switch (type) {
      case 'coder': 
        return ["Build Landing Page 🚀", "Generate Unit Tests 🧪", "Explain concept 💡"];
      case 'news':
        return ["Latest Tech News 🗞️", "Summarize Trends 📉", "Fact Check 🔍"];
      case 'writer':
        return ["Proofread text 📝", "Haiku mode 🌸", "Blog ideas 💭"];
      case 'designer':
        return ["Color palette 🎨", "Logo ideas 🖼️", "Critique UI 📐"];
      case 'researcher':
        return ["Summarize topic 📚", "Find sources 🎓", "Explain simply 👶"];
      default:
        return ["Status Report 📊", "Tell a joke 😂", "Quick Tips 💡"];
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !specialty) return;

    // Fixed: Added missing capabilities and catchphrase properties to satisfy the Agent interface
    const newAgent: Agent = {
      id: Date.now().toString(),
      name,
      type,
      version,
      specialty,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
      color: type === 'coder' ? '#03A9F4' : '#F06292',
      capabilities: ['Standard Logic', 'Cloud Sync'],
      catchphrase: "Initial boot sequence complete!",
      quickCommands: getDefaultsForType(type)
    };
    onAdd(newAgent);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
      <div className="bg-[#FFFDE7] dark:bg-zinc-900 w-full max-w-sm border-4 border-black dark:border-white wobbly-border p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black italic underline decoration-pink-400 decoration-4 text-gray-900 dark:text-white">New Agent Core ⚡</h2>
          <button onClick={onClose} className="text-4xl hover:scale-110 text-gray-900 dark:text-white">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase mb-1 text-gray-900 dark:text-gray-300">Agent Handle</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-2 border-black dark:border-white rounded-2xl p-3 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 ring-blue-300 font-bold dark:text-white text-base md:text-sm"
              placeholder="e.g. Proto-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase mb-1 text-gray-900 dark:text-gray-300">Architecture</label>
              <select 
                value={type}
                onChange={(e) => setType(e.target.value as AgentType)}
                className="w-full border-2 border-black dark:border-white rounded-2xl p-3 bg-white dark:bg-zinc-800 focus:outline-none font-bold text-base md:text-sm dark:text-white"
              >
                <option value="researcher">Researcher 🧠</option>
                <option value="coder">Coder 💻</option>
                <option value="writer">Writer 📝</option>
                <option value="assistant">Assistant 🤝</option>
                <option value="designer">Designer 🎨</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-1 text-gray-900 dark:text-gray-300">OS Version</label>
              <input 
                type="text" 
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full border-2 border-black dark:border-white rounded-2xl p-3 bg-white dark:bg-zinc-800 focus:outline-none font-bold text-base md:text-sm dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase mb-1 text-gray-900 dark:text-gray-300">Primary Specialty</label>
            <input 
              type="text" 
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full border-2 border-black dark:border-white rounded-2xl p-3 bg-white dark:bg-zinc-800 focus:outline-none font-bold dark:text-white text-base md:text-sm"
              placeholder="e.g. Data Crunching"
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-pink-400 text-white font-black py-4 rounded-3xl border-4 border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] active:translate-y-1 active:shadow-none transition-all mt-4 uppercase tracking-widest text-lg"
          >
            Initiate Boot! 🚀
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAgentModal;
