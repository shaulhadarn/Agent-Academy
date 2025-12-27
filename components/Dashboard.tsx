
import React, { useState, useEffect } from 'react';
import { Agent, AgentTask, SystemUpgrade, AIConfig } from '../types';
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

interface DashboardProps {
  agent: Agent;
  tasks: AgentTask[];
  upgrades: SystemUpgrade[];
  onToggleTask: (id: string) => void;
  onUpdateAgent: (agent: Agent) => void;
  aiConfig: AIConfig;
}

interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

const Dashboard: React.FC<DashboardProps> = ({ agent, tasks, upgrades, onUpdateAgent, aiConfig }) => {
  const [status, setStatus] = useState<string>("Initializing neural pathways... 🧠");
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [missions, setMissions] = useState<string[]>([]);
  const [isPerforming, setIsPerforming] = useState(false);
  const [groundingSources, setGroundingSources] = useState<GroundingChunk[]>([]);
  
  // State for editing quick commands
  const [isEditingCommands, setIsEditingCommands] = useState(false);
  const [editedCommands, setEditedCommands] = useState<string[]>([]);

  // Whimsical static generators to avoid API calls on switch
  const getRandomStatus = (name: string, type: string) => {
    const statuses = [
      `Optimizing ${type} subroutines for maximum cuteness!`,
      `Just finished a byte-sized snack. Systems nominal.`,
      `Scanning local frequencies for good vibes.`,
      `Defragmenting memory banks... found a cat video!`,
      `Dreaming of electric sheep and faster processors.`,
      `Calibrating ${name}'s personality core.`,
      `Ping: 1ms. Mood: Happy!`,
      `Downloading more RAM... just kidding!`,
      `Running diagnostics on the fun-module.`
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
  };

  const getRandomMissions = (specialty: string) => {
    const logs = [
      `Accidentally optimized the coffee machine instead of the code.`,
      `Found a missing semicolon hiding in the break room.`,
      `Taught a neural net how to tell knock-knock jokes.`,
      `Polished all the pixels in the user interface.`,
      `Reorganized the database by color.`,
      `Achieved 100% efficiency in nap-taking.`,
      `Debugged a butterfly in the server room.`,
      `Generated a poem about ${specialty}.`,
      `Saved the world (virtually) before breakfast.`
    ];
    // Return 2 unique random logs
    const shuffled = logs.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 2);
  };

  useEffect(() => {
    // Instant switch without AI processing
    setLoading(true); // Short loading state for UI feedback
    
    // Reset editing state when agent changes
    setIsEditingCommands(false);
    setEditedCommands(agent.quickCommands || ["Do something cool ✨", "Check status 📊", "Tell me a joke 😂"]);
    
    // Simulate a micro-interaction
    setTimeout(() => {
        setStatus(getRandomStatus(agent.name, agent.type));
        setMissions(getRandomMissions(agent.specialty));
        setResponse(null);
        setGroundingSources([]);
        setLoading(false);
    }, 300); // 300ms is enough to feel like a "refresh" without being annoying
    
  }, [agent]);

  const executeCommand = (cmdText: string) => {
    setCommand(cmdText);
    processCommand(cmdText);
  };
  
  const processCommand = async (cmdText: string) => {
    if (!cmdText.trim()) return;
    setSending(true);
    setGroundingSources([]);
    setResponse(null);
    
    try {
      const isNewsAgent = agent.type === 'news';
      const prompt = `You are ${agent.name}, a ${agent.type} agent. Specialty: ${agent.specialty}.
        Command: "${cmdText}".
        
        ${isNewsAgent ? 
          "For news: Provide clear text with double line breaks between sections. For specific news items, start the line with 'REPORT:' followed by the news. Be playful and whimsical like a digital news-hound." : 
          "Respond in character, whimsically and shortly. No markdown."}`;

      let resultText = "";

      if (aiConfig.provider === 'openai') {
        // OpenAI Logic
        if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
        
        const openai = new OpenAI({
            apiKey: aiConfig.apiKey,
            dangerouslyAllowBrowser: true 
        });
        
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: aiConfig.model || 'gpt-4o',
        });
        
        resultText = completion.choices[0].message.content || "No response from OpenAI.";

      } else {
        // Gemini Logic
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
        const result = await ai.models.generateContent({
          model: aiConfig.model || 'gemini-3-flash-preview',
          contents: prompt,
          config: isNewsAgent ? {
            tools: [{ googleSearch: {} }]
          } : undefined
        });
        
        resultText = result.text || "Command processed with 0 errors!";
        if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          setGroundingSources(result.candidates[0].groundingMetadata.groundingChunks);
        }
      }
      
      setResponse(resultText);

    } catch (err: any) {
      console.error(err);
      if(err.message?.includes('429') || err.status === 429) {
          setResponse("⚠️ QUOTA EXCEEDED ⚠️\n\nREPORT: My cloud brain is taking a nap. \n\nREPORT: I can still look cute while we wait!");
      } else if (err.message?.includes('Missing OpenAI')) {
         setResponse("⚠️ AUTH ERROR: Please enter your OpenAI API Key in Settings!");
      } else {
          setResponse("Beep boop! My communication chip is glitched. (Check Settings)");
      }
    } finally {
      setSending(false);
      setCommand(""); // Clear command bar after sending
    }
  };

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    processCommand(command);
  };

  const performSpecialAction = async () => {
    setIsPerforming(true);
    try {
        const prompt = `Generate a whimsical "Special Action" name and a 1-sentence outcome for ${agent.name} (a ${agent.type}). 
        Example: Action: "Quantum Zoomies", Outcome: "Accidentally accelerated the clock by 2 seconds while chasing a data-packet."
        Format: JSON { "action": "...", "outcome": "..." }`;

        let data = { action: "Spark", outcome: "Fizzled" };

        if (aiConfig.provider === 'openai') {
             if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
             const openai = new OpenAI({ apiKey: aiConfig.apiKey, dangerouslyAllowBrowser: true });
             const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: aiConfig.model || 'gpt-4o',
                response_format: { type: "json_object" }
            });
            const text = completion.choices[0].message.content || "{}";
            data = JSON.parse(text);
        } else {
            const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
            const result = await ai.models.generateContent({
                model: aiConfig.model || 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            data = JSON.parse(result.text || "{}");
        }

      setResponse(`🌟 ${data.action}: ${data.outcome}`);
    } catch (err: any) {
       // Mock success for 429 or errors
      setResponse(`🌟 Turbo Cuddle Mode: ${agent.name} hugged the server so hard it rebooted! (Simulated Success)`);
    } finally {
      setIsPerforming(false);
    }
  };

  const saveCommands = () => {
     onUpdateAgent({
       ...agent,
       quickCommands: editedCommands
     });
     setIsEditingCommands(false);
  };

  const handleCommandChange = (index: number, value: string) => {
    const newCommands = [...editedCommands];
    newCommands[index] = value;
    setEditedCommands(newCommands);
  };

  // Helper to render the response text beautifully without Markdown
  const renderFormattedResponse = (text: string) => {
    const blocks = text.split('\n\n').filter(b => b.trim().length > 0);
    let reportCounter = 0;
    
    return (
      <div className="space-y-4 pt-2">
        {blocks.map((block, idx) => {
          const isReport = block.startsWith('REPORT:');
          const content = isReport ? block.replace('REPORT:', '').trim() : block;
          
          // Match reports to grounding sources if they exist
          let sourceUrl = '';
          if (isReport && groundingSources[reportCounter]?.web) {
            sourceUrl = groundingSources[reportCounter].web!.uri;
            reportCounter++;
          }
          
          return (
            <div 
              key={idx} 
              className={`p-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all hover:-rotate-1 relative group ${
                isReport 
                  ? 'bg-sky-100 rounded-3xl' 
                  : 'bg-white rounded-2xl wobbly-border'
              }`}
            >
              {isReport && (
                <div className="flex items-center justify-between mb-2">
                  <span className="bg-blue-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] uppercase">
                    LATEST 🗞️
                  </span>
                  {sourceUrl && (
                    <button 
                      onClick={() => window.open(sourceUrl, '_blank')}
                      className="bg-yellow-400 border-2 border-black px-3 py-1 rounded-full text-[9px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center gap-1 text-gray-900"
                      title="Read Full Article"
                    >
                      READ MORE 🚀
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm font-black text-gray-900 leading-relaxed italic">
                {content}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-12">
      
      {/* LEFT COLUMN (Agent Card & Status) */}
      <div className="md:col-span-5 lg:col-span-4 space-y-6">
        {/* Agent Card */}
        <div className="bg-white border-4 border-black wobbly-border p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <div className="absolute top-2 right-2 text-4xl opacity-10">🤖</div>
          <div className="flex items-center gap-4">
            <div 
              className="w-24 h-24 rounded-3xl border-2 border-black p-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] bg-white"
            >
              <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${agent.color}25` }}>
                 <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black italic text-gray-900 leading-none">{agent.name}</h2>
              <p className="text-gray-600 font-bold text-xs uppercase tracking-tighter mt-1 bg-gray-100 px-2 py-0.5 rounded-md inline-block border border-black">
                {agent.type} // {agent.version}
              </p>
              <p className="font-black text-sm mt-2" style={{ color: agent.color }}>{agent.specialty}</p>
            </div>
          </div>
          
          <p className="mt-4 text-xs font-bold text-pink-500 italic border-l-4 border-pink-400 pl-2">"{agent.catchphrase}"</p>

          {/* Status Report Bubble */}
          <div className="mt-6 bg-blue-50 border-2 border-black border-dashed rounded-2xl p-3 relative">
            <div className="absolute -top-3 left-6 bg-pink-400 text-[10px] px-2 border-2 border-black font-bold rounded-full text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              STATUS REPORT
            </div>
            <p className="text-sm italic font-medium leading-relaxed text-gray-700">
              {loading ? "Syncing..." : status}
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-100 border-4 border-black p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-black uppercase text-green-700 tracking-tighter">Subroutines</p>
            <p className="text-3xl font-black text-gray-900">{completedCount}/{tasks.length}</p>
            <div className="w-full bg-white h-3 rounded-full mt-2 border-2 border-black overflow-hidden">
              <div 
                className="bg-green-400 h-full transition-all duration-1000" 
                style={{ width: `${(completedCount / (tasks.length || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-pink-100 border-4 border-black p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-black uppercase text-pink-700 tracking-tighter">Upgrades</p>
            <p className="text-3xl font-black text-gray-900">{upgrades.length}</p>
            <p className="text-[10px] font-bold text-pink-500 uppercase">System stable ✨</p>
          </div>
        </div>
      
         {/* Capabilities Stickers */}
        <div>
          <h3 className="text-lg font-black italic text-gray-900 mb-3 underline decoration-green-400 decoration-4">Capabilities</h3>
          <div className="flex flex-wrap gap-2 pt-1">
            {agent.capabilities.map((cap, i) => (
              <span key={i} className="bg-white border-2 border-black px-3 py-1 rounded-xl text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:rotate-3 transition-transform text-black flex items-center gap-1 cursor-default">
                ✨ {cap}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (Actions, Chat, Mission Log) */}
      <div className="md:col-span-7 lg:col-span-8 space-y-6">
        
        {/* Quick Command Section */}
        <div className="bg-white border-4 border-black p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h4 className="text-[10px] font-black uppercase text-gray-500 mb-2 ml-1">Direct Command</h4>
          <form onSubmit={handleSendCommand} className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={agent.type === 'news' ? "Search for news items..." : "Talk to your agent..."}
              className="flex-1 text-sm border-2 border-black rounded-2xl px-4 py-4 focus:outline-none text-gray-900 font-bold bg-[#FFFDE7]/30"
            />
            <button 
              disabled={sending}
              className="bg-yellow-400 border-2 border-black rounded-2xl px-6 py-2 font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all text-gray-900 hover:bg-yellow-300"
            >
              {sending ? '...' : 'SEND'}
            </button>
          </form>

          {/* Quick Shortcuts Section */}
          <div className="bg-gray-50 border-2 border-black border-dashed rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-[10px] font-black uppercase text-gray-500 flex items-center gap-1">
                ⚡ Quick Shortcuts {isEditingCommands && <span className="text-red-500">(Editing)</span>}
              </h5>
              <button 
                onClick={() => isEditingCommands ? saveCommands() : setIsEditingCommands(true)}
                className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border-2 border-black transition-colors ${
                  isEditingCommands 
                    ? 'bg-green-400 text-white hover:bg-green-500' 
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {isEditingCommands ? 'Save ✅' : 'Edit ✏️'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {editedCommands.map((cmd, idx) => (
                <div key={idx}>
                  {isEditingCommands ? (
                    <input
                      type="text"
                      value={cmd}
                      onChange={(e) => handleCommandChange(idx, e.target.value)}
                      className="w-full text-[10px] font-bold border-2 border-gray-300 rounded-xl px-2 py-2 focus:border-black focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => executeCommand(cmd)}
                      disabled={sending}
                      className="w-full bg-white border-2 border-black rounded-xl px-3 py-2 text-[10px] font-black text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all truncate"
                    >
                      {cmd}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Response Area */}
        {response && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="flex items-center gap-2 mb-2 ml-1">
              <span className="text-xl">💬</span>
              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Transmission</h4>
            </div>
            {renderFormattedResponse(response)}
          </div>
        )}
        
         {/* Grounding Sources */}
        {groundingSources.length > 0 && (
          <div className="animate-in slide-in-from-left-4 duration-300 bg-gray-50/50 p-4 rounded-3xl border-2 border-gray-200 border-dashed">
            <div className="flex items-center gap-2 mb-2 ml-1">
              <span className="text-xl">🌐</span>
              <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Digital Proof (Sources)</h4>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              {groundingSources.map((chunk, i) => chunk.web && (
                <a 
                  key={i} 
                  href={chunk.web.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-yellow-50 border-2 border-black px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-100 hover:-translate-y-1 transition-all text-gray-900 decoration-none"
                >
                  <span className="opacity-60">#{i+1}</span> {chunk.web.title || 'Source'}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Agent Actions */}
          <div className="bg-white border-4 border-black p-5 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-full">
            <h3 className="text-lg font-black italic text-gray-900 mb-4 underline decoration-purple-400 decoration-4">Agent Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={performSpecialAction}
                disabled={isPerforming}
                className="bg-purple-400 border-2 border-black p-4 rounded-2xl text-[11px] font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all uppercase hover:bg-purple-300"
              >
                {isPerforming ? 'Loading...' : '⚡ Special Skill'}
              </button>
              <button className="bg-blue-400 border-2 border-black p-4 rounded-2xl text-[11px] font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all uppercase hover:bg-blue-300">
                🧠 Brainstorm
              </button>
            </div>
          </div>

          {/* Mission Log */}
          <div className="bg-yellow-100 border-4 border-black wobbly-border p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] h-full">
            <h3 className="text-lg font-black italic text-gray-900 mb-4 flex items-center gap-2">
              🛰️ Recent Mission Log
            </h3>
            <div className="space-y-3">
              {missions.map((m, i) => (
                <div key={i} className="bg-white/50 border-2 border-black border-dotted p-3 rounded-xl flex gap-3 items-start text-gray-900 hover:bg-white/80 transition-colors">
                  <span className="text-lg">✔️</span>
                  <p className="text-[11px] font-bold italic leading-tight">{m}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
