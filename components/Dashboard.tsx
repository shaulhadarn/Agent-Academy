
import React, { useState, useEffect, useRef } from 'react';
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
    uri?: string;
    title?: string;
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
  
  // File Upload State for Zetta
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
    setAttachedFile(null); // Reset file on agent switch
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

  // Helper to read file as base64 (for Gemini/Images/PDFs)
  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Remove "data:*/*;base64," prefix for API
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  // Helper to read file as text (for OpenAI/Code/Text)
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
  };
  
  const processCommand = async (cmdText: string) => {
    if (!cmdText.trim() && !attachedFile) return;
    setSending(true);
    setGroundingSources([]);
    setResponse(null);
    
    try {
      const isNewsAgent = agent.type === 'news';
      const isResearcher = agent.type === 'researcher'; // Zetta
      
      let basePrompt = `You are ${agent.name}, a ${agent.type} agent. Specialty: ${agent.specialty}.
        Command: "${cmdText}".`;

      if (isNewsAgent) {
          basePrompt += "For news: Provide clear text with double line breaks between sections. For specific news items, start the line with 'REPORT:' followed by the news. **Do not use markdown formatting** (no bolding, no headers). Be playful and whimsical like a digital news-hound.";
      } else if (isResearcher && attachedFile) {
          basePrompt += `\n\nAnalyze the attached file named "${attachedFile.name}". Provide a detailed, academic yet whimsical breakdown based on the user's question.`;
      } else {
          basePrompt += "Respond in character, whimsically and shortly. No markdown.";
      }

      let resultText = "";

      if (aiConfig.provider === 'openai') {
        // OpenAI Logic
        if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
        
        const openai = new OpenAI({
            apiKey: aiConfig.apiKey,
            dangerouslyAllowBrowser: true 
        });

        if (isNewsAgent) {
            // --- OPENAI RESPONSES API FOR WEB SEARCH ---
            try {
                // Cast to any to access the new Responses API if types are outdated
                const clientAny = openai as any;
                
                // Using the specific Responses API structure from documentation
                const response = await clientAny.responses.create({
                    model: aiConfig.model || 'gpt-4o', 
                    tools: [
                        { type: "web_search" }
                    ],
                    input: basePrompt
                });
                
                resultText = response.output_text || "No text output received.";
                
                // Map OpenAI Sources to GroundingChunks format for UI compatibility
                if (response.sources && Array.isArray(response.sources)) {
                    const sources = response.sources.map((src: any) => ({
                        web: {
                            uri: src.url || src.uri,
                            title: src.title || src.name || 'Web Source'
                        }
                    }));
                    setGroundingSources(sources);
                } else if (response.output_items) {
                    // Fallback check if sources are buried in items
                    // Implementation detail based on doc hints, but sources field is preferred
                }

            } catch (respErr: any) {
                console.warn("Responses API failed, trying fallback...", respErr);
                // Fallback to chat completions if Responses API fails
                // But try to use a search model if possible
                const searchModel = aiConfig.model?.includes('gpt-4') ? 'gpt-4o-search-preview' : 'gpt-4o';
                
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "system", content: basePrompt }],
                    model: searchModel,
                });
                resultText = completion.choices[0].message.content || "No response.";
            }

        } else {
            // --- STANDARD CHAT COMPLETION ---
            let fileContentContext = "";
            
            if (attachedFile) {
                if (attachedFile.type.startsWith('text/') || attachedFile.name.endsWith('.csv') || attachedFile.name.endsWith('.json') || attachedFile.name.endsWith('.js') || attachedFile.name.endsWith('.ts')) {
                    const text = await readFileAsText(attachedFile);
                    fileContentContext = `\n\n--- BEGIN FILE CONTENT (${attachedFile.name}) ---\n${text.substring(0, 20000)}\n--- END FILE CONTENT ---`;
                } else {
                    fileContentContext = `\n\n[SYSTEM NOTICE]: User attached ${attachedFile.name}. I cannot read binary files (PDF/Images) directly in this mode. Please ask the user to switch to Gemini for full document analysis or upload a text file.`;
                }
            }
            
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: basePrompt + fileContentContext }],
                model: aiConfig.model || 'gpt-4o',
            });
            
            resultText = completion.choices[0].message.content || "No response from OpenAI.";
        }

      } else {
        // Gemini Logic
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
        
        let requestContents: any = basePrompt;

        // If file is attached, we construct a parts array
        if (attachedFile) {
            const base64Data = await readFileAsBase64(attachedFile);
            requestContents = {
                parts: [
                    { text: basePrompt },
                    {
                        inlineData: {
                            mimeType: attachedFile.type || 'application/pdf', // Default to PDF if unknown, usually works for text too
                            data: base64Data
                        }
                    }
                ]
            };
        }

        const result = await ai.models.generateContent({
          model: aiConfig.model || 'gemini-3-flash-preview',
          contents: requestContents,
          config: isNewsAgent ? {
            tools: [{ googleSearch: {} }]
          } : undefined
        });
        
        resultText = result.text || "Command processed with 0 errors!";
        if (result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          // Cast to ensure compatibility with local GroundingChunk definition which matches structural needs
          setGroundingSources(result.candidates[0].groundingMetadata.groundingChunks as unknown as GroundingChunk[]);
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
          setResponse(`Beep boop! My communication chip is glitched. Error: ${err.message}`);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        setAttachedFile(e.target.files[0]);
    }
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
            const text = completion.choices[0].message.content || "[]";
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

  // Helper to strip markdown for cleaner display
  const stripMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Links [text](url) -> text
      .replace(/^#+\s/gm, '')          // Headers
      .replace(/`/g, '');              // Code ticks
  };

  // Helper to render the response text beautifully without Markdown
  const renderFormattedResponse = (text: string) => {
    const blocks = text.split('\n\n').filter(b => b.trim().length > 0);
    let reportCounter = 0;
    
    return (
      <div className="space-y-4 pt-2">
        {blocks.map((block, idx) => {
          // Normalize check for report prefix including potential markdown artifacts
          const isReport = block.match(/^(\*\*|)?REPORT:/i);
          
          // Clean the content
          let content = block.replace(/^(\*\*|)?REPORT:(\*\*|)?/i, '').trim();
          content = stripMarkdown(content);
          
          // Match reports to grounding sources if they exist using modulo to cycle through sources if mismatch
          let sourceUrl = '';
          let sourceTitle = 'Source';
          let sourceDomain = '';
          
          if (isReport && groundingSources.length > 0) {
             const sourceIndex = reportCounter % groundingSources.length;
             const source = groundingSources[sourceIndex];
             if (source?.web) {
                 sourceUrl = source.web.uri || '';
                 sourceTitle = source.web.title || 'Source';
                 try {
                   sourceDomain = new URL(sourceUrl).hostname;
                 } catch (e) {}
             }
             reportCounter++;
          }
          
          return (
            <div 
              key={idx} 
              className={`p-4 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all hover:-rotate-1 relative group ${
                isReport 
                  ? 'bg-sky-100 dark:bg-sky-900/40 rounded-3xl' 
                  : 'bg-white dark:bg-zinc-800 rounded-2xl wobbly-border'
              }`}
            >
              {isReport && (
                <div className="flex items-center justify-between mb-3 border-b-2 border-black/10 dark:border-white/10 pb-2">
                  <span className="bg-blue-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] uppercase">
                    LATEST 🗞️
                  </span>
                  {sourceUrl && (
                    <button 
                      onClick={() => window.open(sourceUrl, '_blank')}
                      className="bg-yellow-400 border-2 border-black dark:border-white px-3 py-1 rounded-full text-[9px] font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center gap-1 text-gray-900"
                      title={sourceTitle}
                    >
                      READ MORE 🚀
                    </button>
                  )}
                </div>
              )}

              <div className="flex gap-4 items-start">
                 {/* Thumbnail Column for Reports */}
                 {isReport && (
                   <div className="w-[20%] flex-shrink-0">
                      <div className="aspect-square w-full bg-white dark:bg-zinc-700 border-2 border-black dark:border-white rounded-xl overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center relative">
                          {sourceDomain ? (
                              <img 
                                src={`https://www.google.com/s2/favicons?domain=${sourceDomain}&sz=128`} 
                                alt={sourceDomain}
                                className="w-full h-full object-cover p-3"
                                onError={(e) => {
                                  // Hide image on error, show fallback icon below
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                          ) : null}
                          {/* Fallback Icon inside the same container */}
                          <div className={`absolute inset-0 flex items-center justify-center -z-10 ${sourceDomain ? 'bg-white dark:bg-zinc-800' : 'bg-gray-100 dark:bg-zinc-600'}`}>
                             <span className="text-3xl">📰</span>
                          </div>
                      </div>
                   </div>
                 )}

                 {/* Text Content */}
                 <div className="flex-1">
                   <p className={`text-sm ${isReport ? 'font-medium' : 'font-black'} text-gray-900 dark:text-gray-100 leading-relaxed italic`}>
                     {content}
                   </p>
                 </div>
              </div>
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
        <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white wobbly-border p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] relative overflow-hidden group hover:scale-[1.01] transition-transform">
          <div className="absolute top-2 right-2 text-4xl opacity-10">🤖</div>
          <div className="flex items-center gap-4">
            <div 
              className="w-24 h-24 rounded-3xl border-2 border-black dark:border-white p-1 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] bg-white dark:bg-zinc-700"
            >
              <div className="w-full h-full rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${agent.color}25` }}>
                 <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-contain" />
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-black italic text-gray-900 dark:text-white leading-none">{agent.name}</h2>
              <p className="text-gray-600 dark:text-gray-300 font-bold text-xs uppercase tracking-tighter mt-1 bg-gray-100 dark:bg-zinc-700 px-2 py-0.5 rounded-md inline-block border border-black dark:border-white">
                {agent.type} // {agent.version}
              </p>
              <p className="font-black text-sm mt-2" style={{ color: agent.color }}>{agent.specialty}</p>
            </div>
          </div>
          
          <p className="mt-4 text-xs font-bold text-pink-500 dark:text-pink-400 italic border-l-4 border-pink-400 pl-2">"{agent.catchphrase}"</p>

          {/* Status Report Bubble */}
          <div className="mt-6 bg-blue-50 dark:bg-zinc-900/50 border-2 border-black dark:border-zinc-500 border-dashed rounded-2xl p-3 relative">
            <div className="absolute -top-3 left-6 bg-pink-400 text-[10px] px-2 border-2 border-black dark:border-white font-bold rounded-full text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              STATUS REPORT
            </div>
            <p className="text-sm italic font-medium leading-relaxed text-gray-700 dark:text-gray-300">
              {loading ? "Syncing..." : status}
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-100 dark:bg-green-900/40 border-4 border-black dark:border-white p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-black uppercase text-green-700 dark:text-green-300 tracking-tighter">Subroutines</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{completedCount}/{tasks.length}</p>
            <div className="w-full bg-white dark:bg-zinc-800 h-3 rounded-full mt-2 border-2 border-black dark:border-white overflow-hidden">
              <div 
                className="bg-green-400 h-full transition-all duration-1000" 
                style={{ width: `${(completedCount / (tasks.length || 1)) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-pink-100 dark:bg-pink-900/40 border-4 border-black dark:border-white p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-transform">
            <p className="text-[10px] font-black uppercase text-pink-700 dark:text-pink-300 tracking-tighter">Upgrades</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{upgrades.length}</p>
            <p className="text-[10px] font-bold text-pink-500 uppercase">System stable ✨</p>
          </div>
        </div>
      
         {/* Capabilities Stickers */}
        <div>
          <h3 className="text-lg font-black italic text-gray-900 dark:text-white mb-3 underline decoration-green-400 decoration-4">Capabilities</h3>
          <div className="flex flex-wrap gap-2 pt-1">
            {agent.capabilities.map((cap, i) => (
              <span key={i} className="bg-white dark:bg-zinc-800 border-2 border-black dark:border-white px-3 py-1 rounded-xl text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:rotate-3 transition-transform text-black dark:text-white flex items-center gap-1 cursor-default">
                ✨ {cap}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (Actions, Chat, Mission Log) */}
      <div className="md:col-span-7 lg:col-span-8 space-y-6">
        
        {/* Quick Command Section */}
        <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-6 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <div className="flex justify-between items-center mb-2 ml-1">
             <h4 className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400">Direct Command</h4>
             {/* ZETTA SPECIAL: File Upload Indicator */}
             {agent.type === 'researcher' && (
               <div className="flex items-center gap-2">
                   {attachedFile && (
                       <span className="text-[10px] font-black bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-400">
                           📂 {attachedFile.name} attached
                       </span>
                   )}
               </div>
             )}
          </div>

          {/* ZETTA SPECIAL: Data Ingestion Port (File Upload) */}
          {agent.type === 'researcher' && (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className="mb-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-dashed border-purple-300 dark:border-purple-500 rounded-2xl p-4 text-center cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors group"
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept=".txt,.csv,.json,.pdf,.js,.ts,.docx,image/*"
                />
                <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">📄</div>
                <p className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-300">
                    {attachedFile ? "Change Data Source" : "Drop files for Analysis"}
                </p>
                <p className="text-[9px] font-bold text-gray-400">Supported: PDF, CSV, TXT, Code</p>
            </div>
          )}

          <form onSubmit={handleSendCommand} className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={agent.type === 'news' ? "Search for news items..." : (agent.type === 'researcher' && attachedFile) ? "Ask about the file..." : "Talk to your agent..."}
              className="flex-1 text-sm border-2 border-black dark:border-zinc-500 rounded-2xl px-4 py-4 focus:outline-none text-gray-900 dark:text-white font-bold bg-[#FFFDE7]/30 dark:bg-zinc-900/50"
            />
            <button 
              disabled={sending}
              className="bg-yellow-400 border-2 border-black dark:border-white rounded-2xl px-6 py-2 font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all text-gray-900 hover:bg-yellow-300"
            >
              {sending ? '...' : 'SEND'}
            </button>
          </form>

          {/* Quick Shortcuts Section */}
          <div className="bg-gray-50 dark:bg-zinc-900/30 border-2 border-black dark:border-zinc-600 border-dashed rounded-2xl p-4">
            <div className="flex justify-between items-center mb-2">
              <h5 className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 flex items-center gap-1">
                ⚡ Quick Shortcuts {isEditingCommands && <span className="text-red-500">(Editing)</span>}
              </h5>
              <button 
                onClick={() => isEditingCommands ? saveCommands() : setIsEditingCommands(true)}
                className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg border-2 border-black dark:border-white transition-colors ${
                  isEditingCommands 
                    ? 'bg-green-400 text-white hover:bg-green-500' 
                    : 'bg-white dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-600'
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
                      className="w-full text-[10px] font-bold border-2 border-gray-300 dark:border-zinc-500 bg-white dark:bg-zinc-700 text-black dark:text-white rounded-xl px-2 py-2 focus:border-black dark:focus:border-white focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => executeCommand(cmd)}
                      disabled={sending}
                      className="w-full bg-white dark:bg-zinc-700 border-2 border-black dark:border-white rounded-xl px-3 py-2 text-[10px] font-black text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-blue-50 dark:hover:bg-zinc-600 hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all truncate text-gray-900 dark:text-white"
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
              <h4 className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Transmission</h4>
            </div>
            {renderFormattedResponse(response)}
          </div>
        )}
        
         {/* Grounding Sources */}
        {groundingSources.length > 0 && (
          <div className="animate-in slide-in-from-left-4 duration-300 bg-gray-50/50 dark:bg-zinc-900/50 p-4 rounded-3xl border-2 border-gray-200 dark:border-zinc-700 border-dashed">
            <div className="flex items-center gap-2 mb-2 ml-1">
              <span className="text-xl">🌐</span>
              <h4 className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Digital Proof (Sources)</h4>
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              {groundingSources.map((chunk, i) => (chunk.web && chunk.web.uri) && (
                <a 
                  key={i} 
                  href={chunk.web.uri} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-yellow-50 dark:bg-zinc-800 border-2 border-black dark:border-white px-4 py-2 rounded-2xl text-[10px] font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:bg-yellow-100 hover:-translate-y-1 transition-all text-gray-900 dark:text-white decoration-none"
                >
                  <span className="opacity-60">#{i+1}</span> {chunk.web.title || 'Source'}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Agent Actions */}
          <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-5 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] h-full">
            <h3 className="text-lg font-black italic text-gray-900 dark:text-white mb-4 underline decoration-purple-400 decoration-4">Agent Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={performSpecialAction}
                disabled={isPerforming}
                className="bg-purple-400 border-2 border-black dark:border-white p-4 rounded-2xl text-[11px] font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all uppercase hover:bg-purple-300"
              >
                {isPerforming ? 'Loading...' : '⚡ Special Skill'}
              </button>
              <button className="bg-blue-400 border-2 border-black dark:border-white p-4 rounded-2xl text-[11px] font-black text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all uppercase hover:bg-blue-300">
                🧠 Brainstorm
              </button>
            </div>
          </div>

          {/* Mission Log */}
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border-4 border-black dark:border-white wobbly-border p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] h-full">
            <h3 className="text-lg font-black italic text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              🛰️ Recent Mission Log
            </h3>
            <div className="space-y-3">
              {missions.map((m, i) => (
                <div key={i} className="bg-white/50 dark:bg-zinc-900/60 border-2 border-black dark:border-white border-dotted p-3 rounded-xl flex gap-3 items-start text-gray-900 dark:text-gray-100 hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors">
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
