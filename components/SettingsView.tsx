
import React, { useState } from 'react';
import { Agent, AIConfig } from '../types';

interface SettingsViewProps {
  agent: Agent;
  aiConfig: AIConfig;
  onUpdateAiConfig: (config: AIConfig) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ agent, aiConfig, onUpdateAiConfig, theme, setTheme }) => {
  const [toggles, setToggles] = useState({
    cuteness: true,
    sleep: false,
    experimental: false,
    verbosity: true
  });
  
  const [localAiConfig, setLocalAiConfig] = useState<AIConfig>(aiConfig);
  const [isSaved, setIsSaved] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);

  const toggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAiConfigChange = (field: keyof AIConfig, value: string) => {
    setLocalAiConfig(prev => {
        const next = { ...prev, [field]: value };
        // Reset model default if provider changes
        if (field === 'provider' && value !== prev.provider) {
            next.model = value === 'openai' ? 'gpt-4o' : 'gemini-3-flash-preview';
            next.apiKey = ''; // Clear key on provider switch for security/ux
            setIsCustomModel(false);
        }
        return next;
    });
    setIsSaved(false);
  };

  const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value === 'custom') {
          setIsCustomModel(true);
          setLocalAiConfig(prev => ({ ...prev, model: '' }));
      } else {
          setIsCustomModel(false);
          handleAiConfigChange('model', value);
      }
  };

  const saveAiConfig = () => {
      onUpdateAiConfig(localAiConfig);
      setIsSaved(true);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-10">
      <div className="px-2">
        <h3 className="text-2xl font-black italic text-gray-900 dark:text-white underline decoration-pink-400">⚙️ Core Config</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">Fine-tune your tiny genius</p>
      </div>

      {/* THEME TOGGLE */}
      <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-3">
             <div className="text-3xl">{theme === 'dark' ? '🌙' : '☀️'}</div>
             <div>
                 <h4 className="font-black text-lg text-gray-900 dark:text-white">Interface Theme</h4>
                 <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                     {theme === 'dark' ? 'Dark Mode (Neon Dreams)' : 'Light Mode (Sunshine)'}
                 </p>
             </div>
        </div>
        <button 
             onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
             className={`w-16 h-8 rounded-full border-2 border-black dark:border-white relative transition-colors ${theme === 'dark' ? 'bg-purple-600' : 'bg-yellow-300'}`}
        >
             <div className={`absolute top-0.5 w-6 h-6 bg-white rounded-full border border-black dark:border-white transition-all shadow-sm ${theme === 'dark' ? 'right-1' : 'left-1'}`}></div>
        </button>
      </div>

      {/* AI BRAIN CONFIGURATION */}
      <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-colors duration-300">
        <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🧠</span>
            <h4 className="font-black text-lg text-gray-900 dark:text-white">AI Brain Module</h4>
        </div>
        
        <div className="space-y-4">
            <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => handleAiConfigChange('provider', 'gemini')}
                        className={`p-3 rounded-xl border-2 font-black text-xs transition-all ${
                            localAiConfig.provider === 'gemini' 
                            ? 'bg-blue-100 dark:bg-blue-900/50 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-blue-900 dark:text-blue-100' 
                            : 'bg-gray-50 dark:bg-zinc-700 border-gray-200 dark:border-zinc-600 text-gray-400 dark:text-gray-500'
                        }`}
                    >
                        GOOGLE GEMINI 💎
                    </button>
                    <button 
                        onClick={() => handleAiConfigChange('provider', 'openai')}
                        className={`p-3 rounded-xl border-2 font-black text-xs transition-all ${
                            localAiConfig.provider === 'openai' 
                            ? 'bg-green-100 dark:bg-green-900/50 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] text-green-900 dark:text-green-100' 
                            : 'bg-gray-50 dark:bg-zinc-700 border-gray-200 dark:border-zinc-600 text-gray-400 dark:text-gray-500'
                        }`}
                    >
                        OPENAI GPT 🤖
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 mb-1">Model Config</label>
                <select 
                    value={isCustomModel ? 'custom' : localAiConfig.model}
                    onChange={handleModelSelect}
                    className="w-full border-2 border-black dark:border-zinc-500 rounded-xl p-2 font-bold text-sm focus:outline-none bg-white dark:bg-zinc-700 dark:text-white"
                >
                    {localAiConfig.provider === 'gemini' ? (
                        <>
                            <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast & Fun)</option>
                            <option value="gemini-3-pro-preview">Gemini 3 Pro (Smart & Deep)</option>
                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (Legacy)</option>
                        </>
                    ) : (
                        <>
                            <option value="gpt-4o">GPT-4o (Omni - Best Overall)</option>
                            <option value="gpt-5">GPT-5 (Preview / Beta)</option>
                            <option value="gpt-4o-search-preview">GPT-4o Search Preview</option>
                            <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
                            <option value="o1-preview">OpenAI o1 Preview (Reasoning)</option>
                            <option value="gpt-4">GPT-4 (Classic)</option>
                            <option value="custom">✨ Enter Custom Model ID</option>
                        </>
                    )}
                </select>
            </div>

             {/* Custom Model Input Field */}
             {(isCustomModel || (localAiConfig.provider === 'openai' && !['gpt-4o', 'gpt-5', 'gpt-4o-search-preview', 'gpt-4o-mini', 'o1-preview', 'gpt-4'].includes(localAiConfig.model))) && (
               <div className="animate-in fade-in slide-in-from-top-2">
                 <label className="block text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 mb-1">Custom Model ID</label>
                 <input 
                    type="text" 
                    value={localAiConfig.model === 'custom' ? '' : localAiConfig.model}
                    onChange={(e) => {
                        setIsCustomModel(true);
                        handleAiConfigChange('model', e.target.value);
                    }}
                    placeholder="e.g. o3-deep-research"
                    className="w-full border-2 border-purple-400 rounded-xl p-2 font-bold text-sm focus:outline-none bg-purple-50 dark:bg-zinc-900 text-purple-900 dark:text-purple-300 placeholder-purple-300"
                />
                <p className="text-[9px] font-bold text-purple-400 mt-1">
                  * Use this for new models like o3-deep-research!
                </p>
               </div>
            )}

            <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 mb-1">
                    API Key {localAiConfig.provider === 'gemini' ? '(Optional if using default env)' : '(Required)'}
                </label>
                <input 
                    type="password" 
                    value={localAiConfig.apiKey}
                    onChange={(e) => handleAiConfigChange('apiKey', e.target.value)}
                    placeholder={localAiConfig.provider === 'gemini' ? "Using System Default..." : "sk-..."}
                    className="w-full border-2 border-black dark:border-zinc-500 rounded-xl p-2 font-bold text-sm focus:outline-none bg-gray-50 dark:bg-zinc-700 dark:text-white dark:placeholder-gray-500"
                />
            </div>

            <button 
                onClick={saveAiConfig}
                className={`w-full py-3 rounded-xl border-2 border-black dark:border-white font-black text-sm uppercase transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none ${
                    isSaved ? 'bg-green-400 text-white' : 'bg-yellow-400 text-black hover:bg-yellow-300'
                }`}
            >
                {isSaved ? 'Configuration Saved! ✅' : 'Save Brain Config 💾'}
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white wobbly-border p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] space-y-4 transition-colors duration-300">
        <h4 className="font-black text-lg text-gray-900 dark:text-white mb-2">Agent Personality</h4>
        
        {/* Toggle Item */}
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle('cuteness')}>
          <div>
            <p className="font-black text-sm text-gray-900 dark:text-white">Cuteness Levels</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">Affects emoji frequency</p>
          </div>
          <div className={`w-12 h-6 rounded-full border-2 border-black dark:border-white relative transition-colors ${toggles.cuteness ? 'bg-pink-400' : 'bg-gray-200 dark:bg-zinc-600'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full border border-black dark:border-white transition-all ${toggles.cuteness ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle('sleep')}>
          <div>
            <p className="font-black text-sm text-gray-900 dark:text-white">Energy Save Mode</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">Dream of electric sheep</p>
          </div>
          <div className={`w-12 h-6 rounded-full border-2 border-black dark:border-white relative transition-colors ${toggles.sleep ? 'bg-blue-400' : 'bg-gray-200 dark:bg-zinc-600'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full border border-black dark:border-white transition-all ${toggles.sleep ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle('verbosity')}>
          <div>
            <p className="font-black text-sm text-gray-900 dark:text-white">High Verbosity</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">Lengthy agent explanations</p>
          </div>
          <div className={`w-12 h-6 rounded-full border-2 border-black dark:border-white relative transition-colors ${toggles.verbosity ? 'bg-green-400' : 'bg-gray-200 dark:bg-zinc-600'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full border border-black dark:border-white transition-all ${toggles.verbosity ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle('experimental')}>
          <div>
            <p className="font-black text-sm text-gray-900 dark:text-white">Experimental Sync</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">Unstable beta features</p>
          </div>
          <div className={`w-12 h-6 rounded-full border-2 border-black dark:border-white relative transition-colors ${toggles.experimental ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-zinc-600'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full border border-black dark:border-white transition-all ${toggles.experimental ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-black dark:border-white border-dashed">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2">Danger Zone</p>
          <button className="w-full bg-red-100 dark:bg-red-900/40 border-2 border-black dark:border-white py-2 rounded-xl text-red-600 dark:text-red-400 font-black text-xs hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none">
            WIPE NEURAL CACHE
          </button>
        </div>
      </div>

      <div className="bg-blue-400 dark:bg-blue-600 border-4 border-black dark:border-white p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-white text-center">
        <p className="font-black italic text-sm">"I love my human! 01001100 01101111 01110110 01100101"</p>
        <p className="text-[10px] font-bold mt-1 opacity-80">- {agent.name}</p>
      </div>
    </div>
  );
};

export default SettingsView;
