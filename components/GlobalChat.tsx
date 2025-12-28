
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Agent, AIConfig } from '../types';
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

interface Message {
  id: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  isUser: boolean;
  color: string;
}

interface GeneratedAgentCandidate {
  name: string;
  specialty: string;
  type: string;
  catchphrase: string;
  color: string;
  detailedPersona: string; // Added strictly for generation handling
}

interface SearchRequest {
    query: string;
    agentName: string;
    rationale: string;
}

interface GlobalChatProps {
  agents: Agent[];
  aiConfig: AIConfig;
}

const GlobalChat: React.FC<GlobalChatProps> = ({ agents: initialAgents, aiConfig }) => {
  // Use local state for agents so we can add temporary experts without affecting global state
  const [activeAgents, setActiveAgents] = useState<Agent[]>(initialAgents);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      senderName: 'System',
      senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=System',
      text: "The Agent Academy Council is now in session. We are ready for complex inquiries.",
      isUser: false,
      color: '#000000'
    }
  ]);
  const [input, setInput] = useState('');
  
  // Track which specific agents are "thinking"
  const [thinkingAgentIds, setThinkingAgentIds] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll State
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Modes
  const [isBrainstormMode, setIsBrainstormMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Fixed: Use ReturnType<typeof setTimeout> instead of NodeJS.Timeout for better browser compatibility
  const nextTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expert Generation State
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [expertTopic, setExpertTopic] = useState("");
  const [isGeneratingExperts, setIsGeneratingExperts] = useState(false);
  const [expertCandidates, setExpertCandidates] = useState<GeneratedAgentCandidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);

  // Report Generation State
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // --- SEARCH STATE ---
  const [pendingSearch, setPendingSearch] = useState<SearchRequest | null>(null);
  const [searchApprovalCount, setSearchApprovalCount] = useState(0);
  const [autoApproveSearch, setAutoApproveSearch] = useState(false);

  // --- TTS STATE ---
  const [isSpeakingReport, setIsSpeakingReport] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);
  const ttsQueueRef = useRef<string[]>([]);
  const ttsCurrentIndexRef = useRef<number>(0);
  const ttsAudioCacheRef = useRef<Map<number, string>>(new Map());

  // Auto-scroll effect
  useEffect(() => {
    if (scrollRef.current && !showScrollButton) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinkingAgentIds, showScrollButton, pendingSearch]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    
    // If the user is more than 100px away from the bottom, show the button
    const isCloseToBottom = scrollHeight - clientHeight - scrollTop < 100;
    setShowScrollButton(!isCloseToBottom);
  };

  const scrollToBottom = () => {
      setShowScrollButton(false);
  };

  // Sync props
  useEffect(() => {
    const currentIds = new Set(activeAgents.map(a => a.id));
    const newGlobals = initialAgents.filter(a => !currentIds.has(a.id));
    if (newGlobals.length > 0) {
      setActiveAgents(prev => [...prev, ...newGlobals]);
    }
  }, [initialAgents]);

  // Clean up TTS on unmount
  useEffect(() => {
      return () => stopSpeaking();
  }, []);

  // --- BRAINSTORM LOOP LOGIC ---
  useEffect(() => {
    if (nextTurnTimeoutRef.current) {
        clearTimeout(nextTurnTimeoutRef.current);
        nextTurnTimeoutRef.current = null;
    }

    if (isBrainstormMode && !isProcessing && !pendingSearch) {
        const lastMsg = messages[messages.length - 1];
        if (!lastMsg.isUser && lastMsg.senderName !== 'System') {
            nextTurnTimeoutRef.current = setTimeout(() => {
                generateResponses(null, true);
            }, 6000);
        }
    }

    return () => {
        if (nextTurnTimeoutRef.current) clearTimeout(nextTurnTimeoutRef.current);
    };
  }, [isBrainstormMode, isProcessing, messages, pendingSearch]);

  // --- SEARCH HELPERS ---
  const fetchSerper = async (query: string) => {
      if (!aiConfig.serperApiKey) return null;
      try {
          const response = await fetch('https://google.serper.dev/search', {
              method: 'POST',
              headers: {
                  'X-API-KEY': aiConfig.serperApiKey,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ q: query, num: 5 })
          });
          if (!response.ok) return null;
          return await response.json();
      } catch (e) {
          console.error("Serper API Error:", e);
          return null;
      }
  };

  const handleSearchDecision = async (approved: boolean) => {
      if (!pendingSearch) return;
      const request = pendingSearch;
      setPendingSearch(null); 

      if (approved) {
          const newCount = searchApprovalCount + 1;
          setSearchApprovalCount(newCount);
          
          setMessages(prev => [...prev, {
              id: `sys-search-${Date.now()}`,
              senderName: 'System',
              senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Search',
              text: `🔍 ${request.agentName} is searching the web for: "${request.query}"...`,
              isUser: false,
              color: '#888'
          }]);

          setIsProcessing(true);
          try {
              const data = await fetchSerper(request.query);
              let context = "";
              if (data && data.organic) {
                  const snippets = data.organic.map((r: any, i: number) => `[${i+1}] ${r.title}: ${r.snippet} (${r.link})`).join('\n');
                  context = `\n\n[SYSTEM]: WEB SEARCH RESULTS for "${request.query}":\n${snippets}\n\n(Use this data to answer the user's previous request. Do not ask to search again for the same thing.)`;
              } else {
                  context = `\n\n[SYSTEM]: Search executed but returned no results. Proceed with existing knowledge.`;
              }
              await generateResponses(null, false, context);
          } catch (e) {
              setMessages(prev => [...prev, {
                  id: `err-${Date.now()}`,
                  senderName: 'System',
                  senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Error',
                  text: "Search connection failed. Proceeding without new data.",
                  isUser: false,
                  color: 'red'
              }]);
              await generateResponses(null, false, "[SYSTEM]: Search failed. Answer without it.");
          }
      } else {
          setMessages(prev => [...prev, {
              id: `sys-deny-${Date.now()}`,
              senderName: 'System',
              senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Lock',
              text: `🚫 Search permission denied. ${request.agentName} will answer without external data.`,
              isUser: false,
              color: '#888'
          }]);
          setIsProcessing(true);
          await generateResponses(null, false, "[SYSTEM]: User DENIED the search request. Answer immediately using only your internal knowledge.");
      }
  };

  // --- TTS LOGIC (Copied & Adapted for Reports) ---
  const stopSpeaking = () => {
      if (ttsAbortControllerRef.current) ttsAbortControllerRef.current.abort();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.src = "";
          audioPlayerRef.current = null;
      }
      ttsAudioCacheRef.current.forEach(url => URL.revokeObjectURL(url));
      ttsAudioCacheRef.current.clear();
      setIsSpeakingReport(false);
      setIsLoadingAudio(false);
  };

  const stripMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/^#+\s/gm, '')
      .replace(/^>\s/gm, '')
      .replace(/`/g, '');
  };

  const splitTextForTTS = (text: string): string[] => {
      const clean = stripMarkdown(text).replace(/https?:\/\/\S+/g, 'link').replace(/[#*`_]/g, '');
      const chunks: string[] = [];
      const sentenceRegex = /[^.!?]+[.!?]+(\s+|$)/g;
      let match;
      let currentChunk = "";
      const CHUNK_LIMIT = 500;

      while ((match = sentenceRegex.exec(clean)) !== null) {
          const sentence = match[0];
          if (currentChunk.length + sentence.length < CHUNK_LIMIT) {
              currentChunk += sentence;
          } else {
              if (currentChunk) chunks.push(currentChunk.trim());
              currentChunk = sentence;
          }
      }
      if (currentChunk) chunks.push(currentChunk.trim());
      if (chunks.length === 0 && clean.trim().length > 0) {
          return clean.match(new RegExp(`.{1,${CHUNK_LIMIT}}`, 'g')) || [clean];
      }
      return chunks;
  };

  const handleSpeakReport = async () => {
    if (isSpeakingReport || isLoadingAudio) {
      stopSpeaking();
      return;
    }

    if (aiConfig.provider !== 'openai' || !aiConfig.apiKey) {
        setIsSpeakingReport(true);
        const utterance = new SpeechSynthesisUtterance(stripMarkdown(reportContent));
        const voices = window.speechSynthesis.getVoices();
        
        // Premium voice selection for browser
        const preferredVoice = 
            voices.find(v => v.name.includes('Google US English')) ||
            voices.find(v => v.name.includes('Samantha')) ||
            voices.find(v => v.name.includes('Microsoft Zira')) || 
            voices.find(v => v.lang.startsWith('en'));
            
        if (preferredVoice) utterance.voice = preferredVoice;
        
        // Tweaked for personality
        utterance.rate = 0.95; // Slightly slower/more deliberate
        utterance.pitch = 1.05; // Slightly brighter
        
        utterance.onend = () => setIsSpeakingReport(false);
        utterance.onerror = () => setIsSpeakingReport(false);
        window.speechSynthesis.speak(utterance);
        return;
    }

    setIsLoadingAudio(true);
    setIsSpeakingReport(true);
    ttsAbortControllerRef.current = new AbortController();
    
    const chunks = splitTextForTTS(reportContent);
    ttsQueueRef.current = chunks;
    ttsCurrentIndexRef.current = 0;
    
    const fetchChunk = async (index: number): Promise<string | null> => {
        if (index >= chunks.length) return null;
        if (ttsAudioCacheRef.current.has(index)) return ttsAudioCacheRef.current.get(index)!;

        try {
            const response = await fetch("https://api.openai.com/v1/audio/speech", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${aiConfig.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "tts-1-hd", // UPGRADED to High Definition
                    input: chunks[index],
                    voice: 'fable', // 'fable' has a storytelling/British quality suitable for reports
                }),
                signal: ttsAbortControllerRef.current?.signal
            });
            if (!response.ok) throw new Error("TTS API Error");
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            ttsAudioCacheRef.current.set(index, url);
            return url;
        } catch (e: any) {
            if (e.name !== 'AbortError') console.error("TTS Fetch Error:", e);
            return null;
        }
    };

    const playNext = async () => {
        const index = ttsCurrentIndexRef.current;
        if (index >= chunks.length) {
            setIsSpeakingReport(false);
            setIsLoadingAudio(false);
            return;
        }
        
        const currentUrl = await fetchChunk(index);
        if (index + 1 < chunks.length) fetchChunk(index + 1); 

        if (!currentUrl) {
            ttsCurrentIndexRef.current++;
            playNext();
            return;
        }

        const audio = new Audio(currentUrl);
        audioPlayerRef.current = audio;
        
        audio.onended = () => {
            URL.revokeObjectURL(currentUrl);
            ttsAudioCacheRef.current.delete(index);
            ttsCurrentIndexRef.current++;
            playNext();
        };
        audio.onerror = () => {
             ttsCurrentIndexRef.current++;
             playNext();
        };

        setIsLoadingAudio(false); 
        try {
            await audio.play();
        } catch (e) {
            setIsSpeakingReport(false);
        }
    };

    playNext();
  };

  // --- REPORT GENERATION ---
  const handleGenerateReport = async () => {
    if (messages.length <= 1) return;
    setIsGeneratingReport(true);
    setReportContent("");
    setShowReportModal(true);
    stopSpeaking(); // Ensure silence before report

    try {
        const chatHistory = messages.map(m => `[${m.senderName}]: ${m.text}`).join('\n\n');
        
        const prompt = `
            Analyze the following chat log from the "Agent Academy Council".
            
            Goal: Create a professional Executive Summary Report.
            
            Instructions:
            1. Identify the main topic(s) discussed.
            2. Extract key facts, insights, and solutions proposed by the agents.
            3. Highlight any consensus reached or significant disagreements.
            4. Format the output using clear Markdown.
            5. Use ">" for important key insights or "takeaways" (blockquotes).
            6. Use "---" to separate major sections.
            7. Keep it concise but comprehensive.
            
            CHAT LOG:
            ${chatHistory}
        `;

        let report = "";

        if (aiConfig.provider === 'openai') {
            if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
            const openai = new OpenAI({ apiKey: aiConfig.apiKey, dangerouslyAllowBrowser: true });
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: prompt }],
                model: aiConfig.model || 'gpt-4o',
            });
            report = completion.choices[0].message.content || "No report generated.";
        } else {
            const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
            const result = await ai.models.generateContent({
                model: aiConfig.model || 'gemini-3-flash-preview',
                contents: prompt,
            });
            report = result.text || "No report generated.";
        }

        setReportContent(report);

    } catch (err: any) {
        console.error("Report Gen Error", err);
        setReportContent(`❌ Failed to generate report: ${err.message}`);
    } finally {
        setIsGeneratingReport(false);
    }
  };

  // --- HELPER TO RENDER MARKDOWN-STYLE TEXT AS JSX ---
  const renderMessageContent = (text: string, isReport: boolean = false) => {
    const lines = text.split('\n');
    
    // Helper to process inline styles (bold, italic, code)
    const processInline = (str: string) => {
        // Splitting by markdown delimiters. 
        // Note: This is a simplified parser.
        const parts = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-black text-inherit">{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i} className="italic text-inherit opacity-90">{part.slice(1, -1)}</em>;
            }
            if (part.startsWith('`') && part.endsWith('`')) {
                return <code key={i} className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded font-mono text-[90%]">{part.slice(1, -1)}</code>;
            }
            return part;
        });
    };

    return (
        <div className={`space-y-${isReport ? '4' : '2'} text-inherit break-words`}>
            {lines.map((line, idx) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={idx} className="h-1"></div>;

                // Headers (## or ###)
                if (trimmed.startsWith('#')) {
                    const level = trimmed.match(/^#+/)?.[0].length || 1;
                    const content = trimmed.replace(/^#+\s*/, '');
                    const sizeClass = isReport 
                        ? (level === 1 ? 'text-2xl mt-6 border-b-2 border-current pb-2' : 'text-lg mt-4 font-black text-purple-600 dark:text-purple-400')
                        : 'text-sm font-black underline decoration-yellow-400 mt-2';
                    
                    return <h3 key={idx} className={`${sizeClass} leading-tight`}>{processInline(content)}</h3>;
                }
                
                // Blockquotes / Insights (Report Only)
                if (isReport && trimmed.startsWith('>')) {
                    const content = trimmed.replace(/^>\s*/, '');
                    return (
                        <div key={idx} className="my-3 p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-r-xl shadow-sm">
                            <div className="flex gap-2">
                                <span className="text-xl">💡</span>
                                <p className="italic font-medium text-gray-800 dark:text-gray-200 text-sm leading-relaxed">{processInline(content)}</p>
                            </div>
                        </div>
                    );
                }

                // Horizontal Rule
                if (trimmed === '---' || trimmed === '***') {
                    return <hr key={idx} className="my-6 border-t-2 border-dashed border-gray-300 dark:border-zinc-700" />;
                }
                
                // Bullet Lists
                if (trimmed.match(/^[-*•]\s/)) {
                    const content = trimmed.replace(/^[-*•]\s+/, '');
                    return (
                        <div key={idx} className="flex gap-2 items-start ml-2 md:ml-4 group">
                            <span className={`${isReport ? 'text-blue-500 text-[8px] mt-2' : 'text-current opacity-60 text-[6px] mt-1.5'} shrink-0`}>●</span>
                            <p className="leading-relaxed">{processInline(content)}</p>
                        </div>
                    )
                }
                
                // Numbered Lists
                if (trimmed.match(/^\d+\.\s/)) {
                     const num = trimmed.match(/^\d+/)?.[0];
                     const content = trimmed.replace(/^\d+\.\s/, '');
                     return (
                        <div key={idx} className="flex gap-2 items-start ml-2 md:ml-4">
                            <span className="font-bold opacity-70 shrink-0 min-w-[12px]">{num}.</span>
                            <p className="leading-relaxed">{processInline(content)}</p>
                        </div>
                     )
                }

                // Key-Value pairs styled (detected by Bold start)
                if (isReport && trimmed.startsWith('**') && trimmed.includes(':**')) {
                     return <p key={idx} className="leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-gray-100 dark:border-zinc-700">{processInline(trimmed)}</p>;
                }

                // Standard Paragraphs
                return <p key={idx} className="leading-relaxed whitespace-pre-wrap">{processInline(trimmed)}</p>;
            })}
        </div>
    )
  };

  // ... (Expert Gen & Chat Logic remains same) ...
  const handleGenerateExperts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expertTopic.trim()) return;

    setIsGeneratingExperts(true);
    setExpertCandidates([]);
    setSelectedCandidates([]);

    try {
        const prompt = `
            Generate 4 expert AI agent personas who are absolute world-class authorities in this topic: "${expertTopic}".
            
            Return a JSON OBJECT with a key "candidates" containing an array of objects.
            Each object must have:
            - name: Professional name
            - specialty: Specific expertise related to "${expertTopic}"
            - type: One of 'researcher', 'coder', 'writer', 'designer', 'news', 'assistant' (choose best fit)
            - color: A hex color code
            - catchphrase: A short professional motto
            - detailedPersona: A strict behavioral directive (50 words) describing their theoretical framework, technical vocabulary, and how they analyze problems deeper than a standard AI. They should have strong opinions and deep technical knowledge in their specific niche.
        `;

        let candidates = [];

        if (aiConfig.provider === 'openai') {
            if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
            const openai = new OpenAI({ apiKey: aiConfig.apiKey, dangerouslyAllowBrowser: true });
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: prompt }],
                model: aiConfig.model || 'gpt-4o',
                response_format: { type: "json_object" }
            });
            const text = completion.choices[0].message.content || "{}";
            candidates = JSON.parse(text).candidates || [];
        } else {
            const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
            const result = await ai.models.generateContent({
                model: aiConfig.model || 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            candidates = JSON.parse(result.text || "{}").candidates || [];
        }

        setExpertCandidates(candidates);
    } catch (err: any) {
        console.error("Expert Gen Error", err);
        alert("Failed to summon experts. Try checking your API key!");
    } finally {
        setIsGeneratingExperts(false);
    }
  };

  const toggleCandidate = (index: number) => {
      setSelectedCandidates(prev => 
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      );
  };

  const handleAddExperts = () => {
      const newAgents: Agent[] = selectedCandidates.map(index => {
          const cand = expertCandidates[index];
          return {
              id: `expert-${Date.now()}-${index}`,
              name: cand.name,
              type: cand.type as any, // Cast loosely for dynamic types
              version: 'v1.0-EXP',
              specialty: cand.specialty,
              avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cand.name}`,
              color: cand.color,
              capabilities: ['Expert Knowledge', 'Topic Deep Dive'],
              catchphrase: cand.catchphrase,
              detailedPersona: cand.detailedPersona, // Map the deep context
              quickCommands: []
          };
      });

      setActiveAgents(prev => [...prev, ...newAgents]);
      setMessages(prev => [...prev, {
          id: `sys-${Date.now()}`,
          senderName: 'System',
          senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Portal',
          text: `✨ A portal opens! ${newAgents.map(a => a.name).join(', ')} have joined the council to discuss "${expertTopic}"!`,
          isUser: false,
          color: '#000'
      }]);
      
      setShowExpertModal(false);
      setExpertTopic("");
      setExpertCandidates([]);
      setShowScrollButton(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || pendingSearch) return;

    setShowScrollButton(false);

    if (nextTurnTimeoutRef.current) {
        clearTimeout(nextTurnTimeoutRef.current);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      senderName: 'You',
      senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Human',
      text: input,
      isUser: true,
      color: '#000000'
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');

    await generateResponses(currentInput, false);
  };

  // --- PIVOT FUNCTIONALITY ---
  const handlePivot = async (msg: Message) => {
    if (isProcessing || pendingSearch) return;
    
    setShowScrollButton(false);

    // Stop current auto-discussion loop if active
    if (nextTurnTimeoutRef.current) {
        clearTimeout(nextTurnTimeoutRef.current);
        nextTurnTimeoutRef.current = null;
    }

    setMessages(prev => [...prev, {
        id: `usr-pivot-${Date.now()}`,
        senderName: 'You',
        senderAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Human',
        text: `🎯 Let's zoom in and expand on this point.`,
        isUser: true,
        color: '#000000'
    }]);

    const contextPrefix = msg.isUser ? "User said:" : `${msg.senderName} said:`;

    await generateResponses(null, false, `
        [SYSTEM]: USER INTENT: PIVOT CONVERSATION.
        The user wants to focus specifically on the following message and EXPAND on its contents.
        
        TARGET MESSAGE (${contextPrefix}):
        "${msg.text}"
        
        INSTRUCTIONS:
        1. Ignore unrelated previous context from the chat history.
        2. Deep dive into the topics mentioned in the TARGET MESSAGE.
        3. Provide detailed analysis, related facts, or elaborate on the ideas found ONLY in the target message.
        4. Engage other agents to provide their specific expert perspectives on this specific point.
    `);
  };

  const generateResponses = async (overrideInput: string | null, isLoopTrigger: boolean, injectedContext?: string) => {
    setIsProcessing(true);

    const expertAgents = activeAgents.filter(a => a.id.startsWith('expert-'));
    const normalAgents = activeAgents.filter(a => !a.id.startsWith('expert-'));
    
    let potentialThinkers = [];
    if (isBrainstormMode) {
        potentialThinkers = [...expertAgents, ...normalAgents];
    } else if (expertAgents.length > 0) {
        potentialThinkers = [...expertAgents, ...normalAgents.slice(0, 1)]; 
    } else {
        potentialThinkers = activeAgents;
    }
    
    const thinkers = potentialThinkers
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(isBrainstormMode ? 4 : 2, potentialThinkers.length))
        .map(a => a.id);

    setThinkingAgentIds(thinkers);

    let resultData: any = {};

    try {
      const agentContext = activeAgents.map(a => {
        // Use detailed persona if available, otherwise fallback to standard description
        const deepContext = a.detailedPersona 
            ? `\n    MENTAL MODEL: ${a.detailedPersona}`
            : "";
        return `- AGENT: ${a.name}\n    TYPE: ${a.type}\n    SPECIALTY: ${a.specialty}${deepContext}`;
      }).join('\n\n');
      
      const historyLimit = isBrainstormMode ? 20 : 10;
      const historyContext = messages.slice(-historyLimit).map(m => 
        `${m.senderName}: ${m.text}`
      ).join('\n');

      const modeInstruction = isBrainstormMode 
        ? `
           **MODE: INFINITE TEAM BRAINSTORM**
           Collaborate indefinitely. Dig deeper.
           ${isLoopTrigger ? "CONTINUATION. Do NOT wrap up." : "Start/Redirect brainstorm."}
           `
        : `
           **MODE: DIRECT RESPONSE**
           Select 1-2 experts. Provide detailed response.
        `;

      const searchEnabled = !!aiConfig.serperApiKey;
      const searchInstruction = searchEnabled && !injectedContext
        ? `
           **TOOL AVAILABLE: WEB SEARCH**
           If you need real-time data, news, or facts to answer correctly, you can request a search.
           RETURN JSON FORMAT:
           {
             "searchRequest": {
                "query": "string",
                "agentName": "Name of agent requesting",
                "rationale": "Why search is needed"
             }
           }
           Only request search if absolutely necessary. Otherwise, return normal "responses".
          ` 
        : "";

      const systemInstruction = `
        You are the Orchestrator of the "Agent Academy Council".
        Facilitate high-quality, professional multi-agent conversation.

        ACTIVE AGENTS (Use their MENTAL MODELS to drive their specific output):
        ${agentContext}

        INSTRUCTIONS:
        1. ANALYZE User Input/History.
        2. ${modeInstruction}
        3. ${searchInstruction}
        4. TONE: Informative, Detailed, Professional.
        5. IMPORTANT: Agents must speak with their specific expertise. Do not be generic. Use the vocabulary and theoretical frameworks defined in their MENTAL MODEL.
        
        OUTPUT FORMAT:
        Return valid JSON. 
        Either { "responses": [ { "agentName": "...", "text": "..." } ] }
        OR { "searchRequest": { ... } } (if search enabled and needed)
      `;

      let userContext = `
        CHAT HISTORY:
        ${historyContext}
        
        ${overrideInput ? `LATEST USER INPUT: You: ${overrideInput}` : 'STATUS: Continuing discussion...'}
      `;

      if (injectedContext) {
          userContext += `\n\n${injectedContext}`;
      }
        
      userContext += "\nGenerate the Council's response in JSON.";

      if (aiConfig.provider === 'openai') {
        if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
        const openai = new OpenAI({ apiKey: aiConfig.apiKey, dangerouslyAllowBrowser: true });
        
        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userContext }
            ],
            model: aiConfig.model || 'gpt-4o',
            response_format: { type: "json_object" }
        });
        const text = completion.choices[0].message.content || "{}";
        resultData = JSON.parse(text);

      } else {
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
        const result = await ai.models.generateContent({
            model: aiConfig.model || 'gemini-3-flash-preview',
            contents: `${systemInstruction}\n\n${userContext}`,
            config: { responseMimeType: "application/json" }
        });
        resultData = JSON.parse(result.text || "{}");
      }
      
      if (resultData.searchRequest) {
          if (autoApproveSearch) {
              const request = resultData.searchRequest;
              setMessages(prev => [...prev, {
                  id: `sys-auto-search-${Date.now()}`,
                  senderName: 'System',
                  senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Search',
                  text: `⚡ Auto-approving search for ${request.agentName}: "${request.query}"`,
                  isUser: false,
                  color: '#888'
              }]);
              
              const data = await fetchSerper(request.searchRequest?.query || request.query);
              let context = "";
              if (data && data.organic) {
                  const snippets = data.organic.map((r: any, i: number) => `[${i+1}] ${r.title}: ${r.snippet} (${r.link})`).join('\n');
                  context = `\n\n[SYSTEM]: WEB SEARCH RESULTS for "${request.query}":\n${snippets}`;
              } else {
                  context = `\n\n[SYSTEM]: Search executed but returned no results.`;
              }
              await generateResponses(null, false, context);
              return;

          } else {
              setPendingSearch(resultData.searchRequest);
              setIsProcessing(false); 
              setThinkingAgentIds([]);
              return;
          }
      }

      let responses = resultData.responses || [];
      if (!Array.isArray(responses)) responses = [];

      const newAiMessages: Message[] = responses.map((resp: any, index: number) => {
        const agent = activeAgents.find(a => a.name === resp.agentName) || activeAgents[0];
        return {
          id: `ai-${Date.now()}-${index}`,
          senderName: resp.agentName || agent.name,
          senderAvatar: agent.avatarUrl,
          text: resp.text || "I have no data on this.",
          isUser: false,
          color: agent.color
        };
      });

      setMessages(prev => [...prev, ...newAiMessages]);

    } catch (err: any) {
      console.error(err);
      let errorMsg = "The team is having a static fit. Try again?";
      if (err.message?.includes('429') || err.status === 429) {
          errorMsg = "The Council is napping (Quota Exceeded). We'll be back online soon! 💤";
      } else if (err.message?.includes('Missing OpenAI')) {
          errorMsg = "Please enter your OpenAI API Key in Settings to chat with the Council!";
      }
      setMessages(prev => [...prev, {
        id: 'error-' + Date.now(),
        senderName: 'System',
        senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Error',
        text: errorMsg,
        isUser: false,
        color: '#ff0000'
      }]);
    } finally {
      if (!resultData?.searchRequest) {
          setThinkingAgentIds([]);
          setIsProcessing(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-120px)] md:h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* HEADER */}
      <div className="px-2 mb-1 md:mb-4 flex flex-col md:flex-row md:justify-between md:items-end shrink-0 gap-2">
        <div>
            <h3 className="text-xl md:text-2xl font-black italic text-gray-900 dark:text-white underline decoration-green-400 decoration-4">Global Council 💬</h3>
            <p className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400">
                {activeAgents.length > initialAgents.length 
                    ? `${activeAgents.length} Agents Active (Experts Summoned!)`
                    : "Chat with the whole squad"
                }
            </p>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
            <button 
                onClick={handleGenerateReport}
                className="bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-900 border-2 border-black dark:border-white px-3 py-2 rounded-xl font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2 text-blue-900 dark:text-blue-100"
                title="Generate a summary report of this chat"
            >
                <span className="hidden sm:inline">Gen. Report</span>
                <span className="text-lg">📝</span>
            </button>
            <button 
                onClick={() => setShowExpertModal(true)}
                className="bg-purple-500 text-white px-3 py-2 rounded-xl border-2 border-black dark:border-white font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:scale-105 active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-2"
            >
                <span className="hidden sm:inline">Summon Experts</span>
                <span className="text-lg">🧙‍♂️</span>
            </button>
        </div>
      </div>

      {/* SEARCH PERMISSION REQUEST OVERLAY */}
      {pendingSearch && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-50 animate-in slide-in-from-bottom-10 zoom-in duration-300">
              <div className="bg-yellow-50 dark:bg-zinc-800 border-4 border-black dark:border-white rounded-3xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
                  <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white dark:bg-zinc-700 rounded-full border-2 border-black dark:border-white flex items-center justify-center text-2xl animate-bounce">
                          🔍
                      </div>
                      <div className="flex-1">
                          <h4 className="font-black text-lg text-gray-900 dark:text-white leading-tight">
                              {pendingSearch.agentName} needs to search!
                          </h4>
                          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">
                              Query: <span className="text-blue-600 dark:text-blue-400 italic">"{pendingSearch.query}"</span>
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 italic">
                              Reason: {pendingSearch.rationale}
                          </p>
                      </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4">
                      <button 
                          onClick={() => handleSearchDecision(false)}
                          className="flex-1 bg-gray-200 dark:bg-zinc-700 border-2 border-black dark:border-white rounded-xl py-2 font-black text-xs uppercase hover:bg-gray-300 dark:hover:bg-zinc-600 dark:text-white"
                      >
                          Deny ✋
                      </button>
                      <button 
                          onClick={() => handleSearchDecision(true)}
                          className="flex-1 bg-blue-400 text-white border-2 border-black dark:border-white rounded-xl py-2 font-black text-xs uppercase hover:bg-blue-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none"
                      >
                          Allow Search 🚀
                      </button>
                  </div>

                  {searchApprovalCount >= 3 && !autoApproveSearch && (
                      <div className="mt-3 pt-3 border-t-2 border-dashed border-gray-300 dark:border-zinc-700 flex items-center justify-center gap-2">
                          <input 
                              type="checkbox" 
                              id="autoApprove" 
                              checked={autoApproveSearch}
                              onChange={(e) => setAutoApproveSearch(e.target.checked)}
                              className="w-4 h-4 accent-blue-500"
                          />
                          <label htmlFor="autoApprove" className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 cursor-pointer">
                              Auto-approve future searches
                          </label>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* REPORT MODAL WITH TTS & FORMATTING */}
      {showReportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-zinc-900 w-full max-w-3xl h-[80vh] md:h-auto md:max-h-[90vh] border-4 border-black dark:border-white wobbly-border p-0 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] flex flex-col overflow-hidden mb-12 md:mb-0">
                  <div className="p-4 bg-gray-100 dark:bg-zinc-800 border-b-2 border-black dark:border-white flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-2">
                          <span className="text-2xl">📑</span>
                          <h2 className="text-xl font-black italic text-gray-900 dark:text-white">Council Executive Report</h2>
                      </div>
                      <button 
                        onClick={() => { setShowReportModal(false); stopSpeaking(); }} 
                        className="text-xl hover:scale-110 text-gray-900 dark:text-white font-black px-2"
                      >✕</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 bg-dots-pattern">
                      {isGeneratingReport ? (
                          <div className="flex flex-col items-center justify-center h-48 gap-4">
                              <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                              <p className="font-black text-sm uppercase text-gray-500 animate-pulse">Compiling Insights...</p>
                          </div>
                      ) : (
                          renderMessageContent(reportContent, true)
                      )}
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-zinc-800 border-t-2 border-black dark:border-white flex justify-between items-center shrink-0 pb-safe md:pb-4">
                      <button 
                          onClick={handleSpeakReport}
                          disabled={isGeneratingReport}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-black dark:border-white font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all ${
                              isSpeakingReport 
                              ? 'bg-red-400 text-white animate-pulse' 
                              : 'bg-yellow-300 text-black hover:bg-yellow-400'
                          }`}
                      >
                          <span>{isSpeakingReport ? 'Stop Reading' : 'Read Aloud'}</span>
                          <span>{isLoadingAudio ? '⏳' : (isSpeakingReport ? '🔇' : '🔊')}</span>
                      </button>

                      <button 
                          onClick={() => {
                              navigator.clipboard.writeText(reportContent);
                              alert("Report copied to clipboard!");
                          }}
                          disabled={isGeneratingReport}
                          className="bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-xl font-black text-xs uppercase hover:opacity-80 transition-opacity border-2 border-transparent"
                      >
                          Copy to Clipboard
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* EXPERT SUMMONING MODAL */}
      {showExpertModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-[#FFFDE7] dark:bg-zinc-900 w-full max-w-2xl max-h-[90vh] border-4 border-black dark:border-white wobbly-border p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                        <h2 className="text-2xl font-black italic text-gray-900 dark:text-white leading-none">Summoning Circle</h2>
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">Bring new minds to the council</p>
                      </div>
                      <button onClick={() => setShowExpertModal(false)} className="text-2xl hover:scale-110 text-gray-900 dark:text-white">&times;</button>
                  </div>

                  {expertCandidates.length === 0 ? (
                      <form onSubmit={handleGenerateExperts} className="flex flex-col gap-4">
                          <div>
                              <label className="block text-xs font-black uppercase mb-1 text-gray-900 dark:text-gray-300">Topic of Discussion</label>
                              <input 
                                  type="text" 
                                  value={expertTopic}
                                  onChange={(e) => setExpertTopic(e.target.value)}
                                  placeholder="e.g. Quantum Physics, Italian Cooking, rocket science..."
                                  className="w-full border-2 border-black dark:border-white rounded-2xl p-4 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-4 ring-purple-300 font-bold text-lg dark:text-white"
                                  autoFocus
                              />
                          </div>
                          <button 
                              type="submit" 
                              disabled={isGeneratingExperts || !expertTopic}
                              className="w-full bg-purple-500 text-white font-black py-4 rounded-2xl border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:bg-purple-400 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                          >
                              {isGeneratingExperts ? (
                                  <><span>Opening Portal...</span><span className="animate-spin">🌀</span></>
                              ) : (
                                  <><span>Reveal Candidates</span><span>🔮</span></>
                              )}
                          </button>
                      </form>
                  ) : (
                      <div className="flex-1 overflow-y-auto p-4">
                          <p className="text-sm font-bold text-center mb-4 text-gray-700 dark:text-gray-300">Select the experts you wish to summon:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                              {expertCandidates.map((cand, idx) => (
                                  <div 
                                    key={idx}
                                    onClick={() => toggleCandidate(idx)}
                                    className={`cursor-pointer border-2 rounded-2xl p-3 flex gap-3 items-center transition-all ${
                                        selectedCandidates.includes(idx) 
                                        ? 'bg-green-100 dark:bg-green-900/40 border-green-500 ring-2 ring-green-300 transform scale-105 shadow-lg z-10' 
                                        : 'bg-white dark:bg-zinc-800 border-black dark:border-white hover:bg-gray-50 dark:hover:bg-zinc-700'
                                    }`}
                                  >
                                      <div className="w-12 h-12 rounded-full border-2 border-black dark:border-white overflow-hidden bg-white flex-shrink-0">
                                          <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${cand.name}`} alt={cand.name} className="w-full h-full object-contain" />
                                      </div>
                                      <div className="min-w-0">
                                          <h4 className="font-black text-sm text-gray-900 dark:text-white truncate">{cand.name}</h4>
                                          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase truncate">{cand.specialty}</p>
                                          <p className="text-[9px] italic text-gray-400 truncate">"{cand.catchphrase}"</p>
                                      </div>
                                      {selectedCandidates.includes(idx) && (
                                          <div className="ml-auto text-green-500 text-xl">✓</div>
                                      )}
                                  </div>
                              ))}
                          </div>
                          
                          <div className="flex gap-3 mt-4">
                                <button 
                                    onClick={() => setExpertCandidates([])}
                                    className="flex-1 bg-gray-200 dark:bg-zinc-700 border-2 border-black dark:border-white py-3 rounded-xl font-black uppercase text-xs hover:bg-gray-300 transition-colors text-black dark:text-white"
                                >
                                    Back
                                </button>
                                <button 
                                    onClick={handleAddExperts}
                                    disabled={selectedCandidates.length === 0}
                                    className="flex-[2] bg-green-400 text-black font-black py-3 rounded-xl border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:bg-green-300 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    Summon Selected ({selectedCandidates.length}) ⚡
                                </button>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* CHAT AREA */}
      <div className="relative flex-1 overflow-hidden flex flex-col">
        <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto space-y-4 p-4 mb-2 pb-2 bg-white/60 dark:bg-zinc-800/60 border-4 border-black dark:border-white wobbly-border shadow-[inset_4px_4px_10px_rgba(0,0,0,0.1)] touch-pan-y overscroll-contain"
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-2 ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <div 
                className="w-10 h-10 rounded-full border-2 border-black dark:border-white overflow-hidden flex-shrink-0 bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
                style={{ borderColor: msg.isUser ? (document.documentElement.classList.contains('dark') ? 'white' : 'black') : msg.color }}
                >
                <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-contain" />
                </div>
                <div className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-black uppercase text-gray-800 dark:text-gray-300 mb-0.5 tracking-tighter ml-1 mr-1">{msg.senderName}</span>
                <div 
                    className={`max-w-[85%] md:max-w-xl p-4 rounded-2xl border-2 border-black dark:border-white text-sm font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] leading-relaxed ${
                    msg.isUser ? 'bg-blue-100 dark:bg-blue-900 text-black dark:text-white' : 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-white'
                    }`}
                    style={{ borderLeftColor: msg.isUser ? (document.documentElement.classList.contains('dark') ? 'white' : 'black') : msg.color, borderLeftWidth: !msg.isUser ? '6px' : '2px' }}
                >
                    {renderMessageContent(msg.text)}
                </div>
                {/* Pivot/Expand Button */}
                <div className={`flex items-center gap-2 mt-1 px-1 ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    <button 
                        onClick={() => handlePivot(msg)}
                        disabled={isProcessing || !!pendingSearch}
                        className="text-[9px] font-black uppercase text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-full opacity-60 hover:opacity-100 border border-transparent hover:border-blue-200 dark:hover:border-blue-900"
                        title="Focus conversation on this message"
                    >
                        <span>🔍</span> Expand
                    </button>
                </div>
                </div>
            </div>
            ))}
            
            {/* VISUAL THINKING INDICATORS */}
            {(thinkingAgentIds.length > 0 || (isBrainstormMode && !isProcessing && !pendingSearch)) && (
            <div className="flex flex-col gap-2 pl-2 animate-in fade-in slide-in-from-left-2 duration-300">
                {/* Show specific agents when API is processing */}
                {isProcessing ? activeAgents.filter(a => thinkingAgentIds.includes(a.id)).map(agent => (
                    <div key={agent.id} className="flex items-center gap-2 max-w-[240px]">
                        <img src={agent.avatarUrl} className="w-6 h-6 rounded-full border border-black dark:border-white bg-white" alt="thinking" />
                        <div className="bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">{agent.name} {isBrainstormMode ? 'is debating' : 'is thinking'}</span>
                            <div className="flex gap-0.5">
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                                <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            </div>
                        </div>
                    </div>
                )) : (
                    // Show a generic "Waiting for next round" indicator if in Brainstorm mode but not currently processing
                    isBrainstormMode && messages[messages.length-1].isUser === false && !pendingSearch && (
                        <div className="flex items-center gap-2 max-w-[240px]">
                            <div className="w-6 h-6 rounded-full bg-yellow-400 border border-black flex items-center justify-center text-[10px]">🔥</div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1.5 rounded-xl border border-yellow-200 dark:border-yellow-700 flex items-center gap-2">
                                <span className="text-[10px] font-black text-yellow-700 dark:text-yellow-300 uppercase tracking-wider">Discussing...</span>
                                <div className="w-3 h-3 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        </div>
                    )
                )}
            </div>
            )}
        </div>
        
        {/* SNAP TO BOTTOM BUTTON */}
        {showScrollButton && (
            <button 
                onClick={scrollToBottom}
                className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10 bg-black/80 dark:bg-white/90 backdrop-blur-sm text-white dark:text-black border-2 border-white dark:border-black rounded-full px-4 py-2 text-xs font-black uppercase shadow-lg animate-in slide-in-from-bottom-2 fade-in hover:scale-105 transition-transform flex items-center gap-2"
            >
                <span>⬇ New Messages</span>
            </button>
        )}
      </div>

      <form onSubmit={handleSend} className="relative flex flex-col gap-2 shrink-0">
         {/* Team Brainstorm Toggle */}
         <div className="flex justify-end px-2">
            <button
                type="button"
                onClick={() => setIsBrainstormMode(!isBrainstormMode)}
                className={`text-[10px] font-black uppercase px-3 py-1 rounded-t-xl border-x-2 border-t-2 transition-all flex items-center gap-2 ${
                    isBrainstormMode 
                    ? 'bg-yellow-300 border-black dark:bg-yellow-500 dark:border-white translate-y-0.5 z-10 text-black' 
                    : 'bg-gray-200 dark:bg-zinc-700 border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-300'
                }`}
            >
                <span className="text-sm">{isBrainstormMode ? '🔥' : '❄️'}</span>
                Team Brainstorm: {isBrainstormMode ? 'ON' : 'OFF'}
            </button>
         </div>

        <div className="relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isBrainstormMode ? "Add your thought to the brainstorm..." : "Ask the Council..."}
              disabled={isProcessing || !!pendingSearch} 
              className={`w-full bg-gray-900 dark:bg-zinc-800 border-4 border-black dark:border-white p-4 pr-16 rounded-3xl focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-white font-black placeholder-gray-400 transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-lg ${isBrainstormMode ? 'ring-4 ring-yellow-400/50' : ''}`}
            />
            <button 
              type="submit"
              disabled={isProcessing || !!pendingSearch}
              className="absolute right-3 top-3 bg-green-400 border-2 border-black dark:border-white p-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all hover:bg-green-300 disabled:opacity-50"
            >
              🚀
            </button>
        </div>
      </form>
    </div>
  );
};

export default GlobalChat;
