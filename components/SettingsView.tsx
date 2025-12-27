
import React, { useState } from 'react';
import { Agent, AIConfig } from '../types';

interface SettingsViewProps {
  agent: Agent;
  aiConfig: AIConfig;
  onUpdateAiConfig: (config: AIConfig) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ agent, aiConfig, onUpdateAiConfig }) => {
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
      setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300 pb-10">
      <div className="px-2">
        <h3 className="text-2xl font-black italic text-gray-900 underline decoration-pink-400">⚙️ Core Config</h3>
        <p className="text-xs text-gray-500 font-bold uppercase">Fine-tune your tiny genius</p>
      </div>

      {/* AI BRAIN CONFIGURATION */}
      <div className="bg-white border-4 border-black p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🧠</span>
            <h4 className="font-black text-lg text-gray-900">AI Brain Module</h4>
        </div>
        
        <div className="space-y-4">
            <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Provider</label>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => handleAiConfigChange('provider', 'gemini')}
                        className={`p-3 rounded-xl border-2 font-black text-xs transition-all ${
                            localAiConfig.provider === 'gemini' 
                            ? 'bg-blue-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-blue-900' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}
                    >
                        GOOGLE GEMINI 💎
                    </button>
                    <button 
                        onClick={() => handleAiConfigChange('provider', 'openai')}
                        className={`p-3 rounded-xl border-2 font-black text-xs transition-all ${
                            localAiConfig.provider === 'openai' 
                            ? 'bg-green-100 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-green-900' 
                            : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}
                    >
                        OPENAI GPT 🤖
                    </button>
                </div>
            </div>

            <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Model Config</label>
                <select 
                    value={isCustomModel ? 'custom' : localAiConfig.model}
                    onChange={handleModelSelect}
                    className="w-full border-2 border-black rounded-xl p-2 font-bold text-sm focus:outline-none"
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
                            <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cheap)</option>
                            <option value="o1-preview">OpenAI o1 Preview (Reasoning)</option>
                            <option value="o1-mini">OpenAI o1 Mini (Fast Reasoning)</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo (Legacy High-End)</option>
                            <option value="gpt-4">GPT-4 (Classic)</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy Fast)</option>
                            <option value="custom">✨ Enter Custom Model ID (e.g. GPT-5)</option>
                        </>
                    )}
                </select>
            </div>

            {/* Custom Model Input Field */}
            {(isCustomModel || (localAiConfig.provider === 'openai' && !['gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'].includes(localAiConfig.model))) && (
               <div className="animate-in fade-in slide-in-from-top-2">
                 <label className="block text-[10px] font-black uppercase text-purple-600 mb-1">Custom Model ID</label>
                 <input 
                    type="text" 
                    value={localAiConfig.model === 'custom' ? '' : localAiConfig.model}
                    onChange={(e) => {
                        setIsCustomModel(true);
                        handleAiConfigChange('model', e.target.value);
                    }}
                    placeholder="e.g. gpt-5 or gpt-4.5-preview"
                    className="w-full border-2 border-purple-400 rounded-xl p-2 font-bold text-sm focus:outline-none bg-purple-50 text-purple-900 placeholder-purple-300"
                />
                <p className="text-[9px] font-bold text-purple-400 mt-1">
                  * Use this for new unlisted models like GPT-5!
                </p>
               </div>
            )}

            <div>
                <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">
                    API Key {localAiConfig.provider === 'gemini' ? '(Optional if using default env)' : '(Required)'}
                </label>
                <input 
                    type="password" 
                    value={localAiConfig.apiKey}
                    onChange={(e) => handleAiConfigChange('apiKey', e.target.value)}
                    placeholder={localAiConfig.provider === 'gemini' ? "Using System Default..." : "sk-..."}
                    className="w-full border-2 border-black rounded-xl p-2 font-bold text-sm focus:outline-none bg-gray-50"
                />
            </div>

            <button 
                onClick={saveAiConfig}
                className={`w-full py-3 rounded-xl border-2 border-black font-black text-sm uppercase transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${
                    isSaved ? 'bg-green-400 text-white' : 'bg-yellow-400 text-black hover:bg-yellow-300'
                }`}
            >
                {isSaved ? 'Configuration Saved! ✅' : 'Save Brain Config 💾'}
            </button>
        </div>
      </div>

      <div className="bg-white border-4 border-black wobbly-border p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] space-y-4">
        <h4 className="font-black text-lg text-gray-900 mb-2">Agent Personality</h4>
        
        {/* Toggle Item */}
        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle('cuteness')}>
          <div>
            <p className="font-black text-sm text-gray-900">Cuteness Levels</p>
            <p className="text-[10px] text-gray-500 font-bold">Affects emoji frequency</p>
          </div>
          <div className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${toggles.cuteness ? 'bg-pink-400' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full border border-black transition-all ${toggles.cuteness ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle('sleep')}>
          <div>
            <p className="font-black text-sm text-gray-900">Energy Save Mode</p>
            <p className="text-[10px] text-gray-500 font-bold">Dream of electric sheep</p>
          </div>
          <div className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${toggles.sleep ? 'bg-blue-400' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full border border-black transition-all ${toggles.sleep ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle('verbosity')}>
          <div>
            <p className="font-black text-sm text-gray-900">High Verbosity</p>
            <p className="text-[10px] text-gray-500 font-bold">Lengthy agent explanations</p>
          </div>
          <div className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${toggles.verbosity ? 'bg-green-400' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full border border-black transition-all ${toggles.verbosity ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggle('experimental')}>
          <div>
            <p className="font-black text-sm text-gray-900">Experimental Sync</p>
            <p className="text-[10px] text-gray-500 font-bold">Unstable beta features</p>
          </div>
          <div className={`w-12 h-6 rounded-full border-2 border-black relative transition-colors ${toggles.experimental ? 'bg-yellow-400' : 'bg-gray-200'}`}>
            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full border border-black transition-all ${toggles.experimental ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-black border-dashed">
          <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Danger Zone</p>
          <button className="w-full bg-red-100 border-2 border-black py-2 rounded-xl text-red-600 font-black text-xs hover:bg-red-200 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none">
            WIPE NEURAL CACHE
          </button>
        </div>
      </div>

      <div className="bg-blue-400 border-4 border-black p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white text-center">
        <p className="font-black italic text-sm">"I love my human! 01001100 01101111 01110110 01100101"</p>
        <p className="text-[10px] font-bold mt-1 opacity-80">- {agent.name}</p>
      </div>
    </div>
  );
};

export default SettingsView;
