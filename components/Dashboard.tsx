
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

interface InputRequest {
  command: string;
  label: string;
  placeholder?: string;
}

interface AgentAction {
    label: string;
    icon: string;
    prompt: string;
    requiresInput?: boolean;
    inputLabel?: string;
    inputPlaceholder?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ agent, tasks, upgrades, onUpdateAgent, aiConfig }) => {
  const [status, setStatus] = useState<string>("Initializing neural pathways... 🧠");
  const [loading, setLoading] = useState(false);
  const [command, setCommand] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [missions, setMissions] = useState<string[]>([]);
  const [groundingSources, setGroundingSources] = useState<GroundingChunk[]>([]);
  
  // File Upload State for Zetta
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for editing quick commands
  const [isEditingCommands, setIsEditingCommands] = useState(false);
  const [editedCommands, setEditedCommands] = useState<string[]>([]);

  // BUILDER MODE STATE
  const [builderMode, setBuilderMode] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // TTS State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  
  // TTS Queue Refs for handling long text
  const ttsQueueRef = useRef<string[]>([]); // Holds text chunks
  const ttsAudioCacheRef = useRef<Map<number, string>>(new Map()); // Cache blob URLs by index
  const ttsCurrentIndexRef = useRef<number>(0);
  const ttsAbortControllerRef = useRef<AbortController | null>(null);

  // Input Request State (for Quick Commands)
  const [inputRequest, setInputRequest] = useState<InputRequest | null>(null);
  const [inputValue, setInputValue] = useState("");

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
    setBuilderMode(false); // Reset builder mode
    setPreviewHtml(null);
    setEditedCommands(agent.quickCommands || ["Do something cool ✨", "Check status 📊", "Tell me a joke 😂"]);
    setInputRequest(null);
    setInputValue("");
    
    // Stop speaking when switching agents
    stopSpeaking();
    
    // Simulate a micro-interaction
    setTimeout(() => {
        setStatus(getRandomStatus(agent.name, agent.type));
        setMissions(getRandomMissions(agent.specialty));
        setResponse(null);
        setGroundingSources([]);
        setLoading(false);
    }, 300); // 300ms is enough to feel like a "refresh" without being annoying
    
  }, [agent]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
        stopSpeaking();
    };
  }, []);

  const stopSpeaking = () => {
      // Cancel any ongoing fetch operations
      if (ttsAbortControllerRef.current) {
          ttsAbortControllerRef.current.abort();
      }
      
      if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
      }
      if (audioPlayerRef.current) {
          audioPlayerRef.current.pause();
          audioPlayerRef.current.src = ""; // Clear src to stop buffering
          audioPlayerRef.current = null;
      }

      // Revoke all blob URLs to prevent memory leaks
      ttsAudioCacheRef.current.forEach((url) => URL.revokeObjectURL(url));
      ttsAudioCacheRef.current.clear();
      ttsQueueRef.current = [];
      ttsCurrentIndexRef.current = 0;

      setIsSpeaking(false);
      setIsLoadingAudio(false);
  };

  const getAgentActions = (type: string): AgentAction[] => {
    switch (type) {
      case 'coder': return [
        { 
          label: 'Code Review', 
          icon: '🐛', 
          prompt: 'Review this code snippet for bugs, security issues, and best practices:', 
          requiresInput: true, 
          inputLabel: "Paste your code snippet:", 
          inputPlaceholder: "const foo = 'bar'..."
        },
        { 
          label: 'Explain Concept', 
          icon: '💡', 
          prompt: 'Explain the following programming concept simply, like I am 5 years old:', 
          requiresInput: true, 
          inputLabel: "What concept is confusing?", 
          inputPlaceholder: "e.g. Recursion, Dependency Injection"
        },
        { 
          label: 'Gen Unit Tests', 
          icon: '🧪', 
          prompt: 'Generate comprehensive unit tests (using Jest/Vitest) for the following function:', 
          requiresInput: true, 
          inputLabel: "Paste function to test:", 
          inputPlaceholder: "function add(a, b) { return a + b }"
        },
        { 
          label: 'Optimize', 
          icon: '🚀', 
          prompt: 'Suggest 3 ways to optimize the performance of:', 
          requiresInput: true, 
          inputLabel: "What needs optimization?", 
          inputPlaceholder: "e.g. React re-renders, SQL Query..."
        }
      ];
      case 'news': return [
        { label: 'Flash Update', icon: '⚡', prompt: 'Give me a breaking news flash update on the most important tech event happening right now.' },
        { 
          label: 'Trend Watch', 
          icon: '📈', 
          prompt: 'What are the top 3 trending topics on the internet today regarding:', 
          requiresInput: true, 
          inputLabel: "Topic/Category", 
          inputPlaceholder: "e.g. AI, Crypto, Pop Culture"
        },
        { label: 'Crypto Check', icon: '🪙', prompt: 'Briefly summarize the current state of major cryptocurrencies (BTC, ETH) today.' },
        { label: 'Good News', icon: '🌈', prompt: 'Find me one positive, uplifting technology news story from this week.' }
      ];
      case 'writer': return [
        { 
          label: 'Polisher', 
          icon: '💅', 
          prompt: 'Rewrite the following text to be more concise, punchy, and professional:', 
          requiresInput: true, 
          inputLabel: "Paste text to polish:", 
          inputPlaceholder: "Original text..."
        },
        { 
          label: 'Idea Spark', 
          icon: '✨', 
          prompt: 'Generate 5 unique and creative blog post ideas about:', 
          requiresInput: true, 
          inputLabel: "Topic or Niche", 
          inputPlaceholder: "e.g. Urban Gardening, AI Ethics"
        },
        { 
          label: 'Article Gen', 
          icon: '📄', 
          prompt: 'Write a comprehensive, engaging, and well-structured blog article (approx 500-800 words) about the following topic. Include a catchy title, introduction, key points, and conclusion:', 
          requiresInput: true, 
          inputLabel: "Article Topic", 
          inputPlaceholder: "e.g. The Future of AI in Healthcare"
        },
        { 
          label: 'TL;DR This', 
          icon: '✂️', 
          prompt: 'Provide a bulleted "Too Long; Didn\'t Read" summary of the following text:', 
          requiresInput: true, 
          inputLabel: "Paste long text:", 
          inputPlaceholder: "Long article text..."
        }
      ];
      case 'designer': return [
        { 
          label: 'Gen Palette', 
          icon: '🎨', 
          prompt: 'Generate a unique 5-color palette (with Hex codes) for a brand/theme described as:', 
          requiresInput: true, 
          inputLabel: "Brand Vibe or Theme", 
          inputPlaceholder: "e.g. Cyberpunk Coffee Shop, Organic Spa"
        },
        { 
          label: 'UX Audit', 
          icon: '🧐', 
          prompt: 'Provide a UX critique and improvement list for:', 
          requiresInput: true, 
          inputLabel: "Description of UI/App", 
          inputPlaceholder: "e.g. A login screen with too many popups..."
        },
        { 
          label: 'Font Pair', 
          icon: '🅰️', 
          prompt: 'Suggest 2 modern Google Font pairings for a website with this style:', 
          requiresInput: true, 
          inputLabel: "Website Style", 
          inputPlaceholder: "e.g. Minimalist Portfolio, Kids Education"
        },
        { 
          label: 'Logo Concept', 
          icon: '🖼️', 
          prompt: 'Describe 3 creative logo concepts for:', 
          requiresInput: true, 
          inputLabel: "Company Name & Industry", 
          inputPlaceholder: "e.g. 'Bolt' - fast food delivery"
        }
      ];
      case 'researcher': return [
        { 
          label: 'Deep Dive', 
          icon: '🤿', 
          prompt: 'Provide a comprehensive deep dive summary, including history and key concepts, for:', 
          requiresInput: true, 
          inputLabel: "Research Topic", 
          inputPlaceholder: "e.g. Quantum Computing, Roman Empire"
        },
        { 
          label: 'Fact Check', 
          icon: '🔍', 
          prompt: 'Fact check the following claim and provide context:', 
          requiresInput: true, 
          inputLabel: "Claim to verify", 
          inputPlaceholder: "e.g. The moon is made of cheese"
        },
        { 
          label: 'ELI5', 
          icon: '👶', 
          prompt: 'Explain this complex topic as if I were a 5-year-old:', 
          requiresInput: true, 
          inputLabel: "Topic", 
          inputPlaceholder: "e.g. Inflation, Black Holes"
        },
        { 
          label: 'Key Takeaways', 
          icon: '🔑', 
          prompt: 'List the top 5 key takeaways from this text:', 
          requiresInput: true, 
          inputLabel: "Paste text:", 
          inputPlaceholder: "Article or document text..." 
        }
      ];
      default: return [
        { 
          label: 'Prioritize', 
          icon: '✅', 
          prompt: 'Help me prioritize this list of tasks using the Eisenhower Matrix:', 
          requiresInput: true, 
          inputLabel: "List of tasks", 
          inputPlaceholder: "e.g. Email boss, Buy milk, Code feature..."
        },
        { label: 'Motivate', icon: '🔥', prompt: 'Give me a high-energy, funny pep talk to get me working!' },
        { 
          label: 'Email Draft', 
          icon: '✉️', 
          prompt: 'Draft a professional email for this situation:', 
          requiresInput: true, 
          inputLabel: "Email Context", 
          inputPlaceholder: "e.g. Asking for a raise, Declining a meeting"
        },
        { 
          label: 'Meeting Prep', 
          icon: '🤝', 
          prompt: 'List 5 key things to prepare for a meeting about:', 
          requiresInput: true, 
          inputLabel: "Meeting Topic", 
          inputPlaceholder: "e.g. Q4 Marketing Strategy"
        }
      ];
    }
  };

  const getCommandInputConfig = (cmd: string): InputRequest | null => {
    const lower = cmd.toLowerCase();
    
    if (lower.includes("explain like i'm 5")) {
      return { command: cmd, label: "What topic should I explain?", placeholder: "e.g. Quantum Computing, Photosynthesis..." };
    }
    if (lower.includes("explain this concept")) {
      return { command: cmd, label: "What concept is confusing you?", placeholder: "e.g. Recursion, The Blockchain..." };
    }
    if (lower.includes("review this code")) {
      return { command: cmd, label: "Paste the code snippet:", placeholder: "const foo = 'bar'..." };
    }
    if (lower.includes("fact check")) {
      return { command: cmd, label: "What claim needs verifying?", placeholder: "e.g. The moon is made of cheese..." };
    }
    if (lower.includes("write a haiku")) {
      return { command: cmd, label: "Haiku topic (optional):", placeholder: "e.g. Cherry blossoms, Coding errors..." };
    }
    if (lower.includes("proofread")) {
      return { command: cmd, label: "Paste text to proofread:", placeholder: "Your text here..." };
    }
    if (lower.includes("brainstorm blog")) {
      return { command: cmd, label: "What is the blog about?", placeholder: "e.g. AI Gardening, Retro gaming..." };
    }
    if (lower.includes("pixel art")) {
      return { command: cmd, label: "Describe the character:", placeholder: "e.g. A cyberpunk cat with sunglasses..." };
    }
    if (lower.includes("color palette")) {
      return { command: cmd, label: "What vibe or theme?", placeholder: "e.g. Sunset, Cyberpunk, Forest..." };
    }
    if (lower.includes("critique this ui")) {
      return { command: cmd, label: "Describe the UI or Paste URL/Context:", placeholder: "e.g. A login page with red buttons..." };
    }
    if (lower.includes("summarize this")) {
      return { command: cmd, label: "What topic or text?", placeholder: "e.g. The history of the internet..." };
    }
    if (lower.includes("academic sources")) {
      return { command: cmd, label: "Research Topic:", placeholder: "e.g. Machine Learning efficiency..." };
    }

    return null; // Immediate execution for others
  }

  // Handler for Agent Action Buttons
  const handleActionClick = (action: AgentAction) => {
    if (action.requiresInput) {
        setInputRequest({
            command: action.prompt,
            label: action.inputLabel || "Additional Input Required:",
            placeholder: action.inputPlaceholder || "Type here..."
        });
        setInputValue("");
    } else {
        executeCommand(action.prompt);
    }
  };

  const executeCommand = (cmdText: string) => {
    // If user clicks "Build Landing Page", trigger mode immediately
    if (cmdText.includes("Build Landing Page")) {
        setBuilderMode(true);
        setResponse("🏗️ **BUILDER MODE ACTIVE**\n\nI'm ready to architect! Describe the landing page or mini-app you want (e.g., 'A pizza shop with a dark theme', 'A calculator', 'A portfolio for a cat').");
        setCommand("");
        return;
    }

    // Check for interactive commands (legacy string matching for Quick Commands)
    // Only check if NOT triggered via handleActionClick (which passes direct prompts)
    // However, since executeCommand handles text box input too, we keep this.
    const inputConfig = getCommandInputConfig(cmdText);
    if (inputConfig) {
        setInputRequest(inputConfig);
        setInputValue("");
        return;
    }

    setCommand(cmdText);
    processCommand(cmdText);
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputRequest) return;
    
    // Append input to the command/prompt
    const suffix = inputValue.trim() ? ` ${inputValue}` : '';
    const finalCommand = `${inputRequest.command}${suffix}`;

    setInputRequest(null);
    setCommand(finalCommand); 
    processCommand(finalCommand);
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

  // Helper to fetch results from Serper.dev
  const fetchSerper = async (query: string, apiKey: string) => {
      try {
          const response = await fetch('https://google.serper.dev/search', {
              method: 'POST',
              headers: {
                  'X-API-KEY': apiKey,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({ q: query, num: 10 }) // Explicitly request 10
          });
          
          if (!response.ok) return null;
          return await response.json();
      } catch (e) {
          console.error("Serper API Error:", e);
          return null;
      }
  };
  
  const processCommand = async (cmdText: string) => {
    if (!cmdText.trim() && !attachedFile) return;
    setSending(true);
    setGroundingSources([]);
    setResponse(null);
    setPreviewHtml(null); // Clear previous preview
    
    stopSpeaking();
    
    try {
      // BUILDER MODE LOGIC
      if (builderMode) {
          await processBuilderCommand(cmdText);
          setBuilderMode(false); // Reset after build
          setSending(false);
          setCommand("");
          return;
      }

      const isNewsAgent = agent.type === 'news';
      const isResearcher = agent.type === 'researcher'; // Zetta
      
      let basePrompt = `You are ${agent.name}, a ${agent.type} agent. Specialty: ${agent.specialty}.
        Command: "${cmdText}".`;

      if (isNewsAgent) {
          basePrompt += "For news: You must strictly follow this format for each news item:\nHEADLINE: [A short, punchy headline]\nSUMMARY: [A whimsical but informative summary of the event]\nLINK: [The specific URL of the article source]\n\nSeparate each news item with a double line break. Do not use markdown (no ** or #). Be playful like a digital news-hound. **IMPORTANT: Find and list at least 5 to 10 unique news items.**";
      } else if (isResearcher && attachedFile) {
          basePrompt += `\n\nAnalyze the attached file named "${attachedFile.name}". Provide a detailed, academic yet whimsical breakdown based on the user's question.`;
      } else {
          basePrompt += "Respond in character, whimsically and shortly. No markdown.";
      }

      // --- SERPER.DEV INTEGRATION ---
      let serperContext = "";
      if (aiConfig.serperApiKey && (isNewsAgent || cmdText.toLowerCase().includes('search') || cmdText.toLowerCase().includes('find') || isResearcher)) {
          const serperResults = await fetchSerper(cmdText, aiConfig.serperApiKey);
          
          if (serperResults && serperResults.organic) {
              const organic = serperResults.organic.slice(0, 10).map((r: any, idx: number) => 
                  `[Source ${idx+1}]: ${r.title} - ${r.snippet} (Link: ${r.link})`
              ).join("\n\n");
              
              serperContext = `\n\n--- REAL-TIME WEB SEARCH DATA (Use this to answer) ---\n${organic}\n--- END WEB DATA ---\n\nIf using this data, ensure you populate HEADLINE, SUMMARY and LINK fields based on it. Try to use all provided sources to create a comprehensive list of at least 5-10 items.`;
              
              const chunks: GroundingChunk[] = serperResults.organic.map((r: any) => ({
                  web: { uri: r.link, title: r.title }
              }));
              setGroundingSources(chunks);
          }
      }

      basePrompt += serperContext;

      let resultText = "";

      if (aiConfig.provider === 'openai') {
        if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
        
        const openai = new OpenAI({
            apiKey: aiConfig.apiKey,
            dangerouslyAllowBrowser: true 
        });

        if (isNewsAgent && !serperContext) {
            try {
                // OpenAI Web Search Integration using 'web_search' tool
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "system", content: basePrompt }],
                    model: aiConfig.model || 'gpt-4o',
                    // Explicitly cast to any to allow 'web_search' tool type for enabled models
                    tools: [{ type: "web_search" } as any],
                });
                
                resultText = completion.choices[0].message.content || "No text output received.";
                
                // --- CITATION HANDLING ---
                // Parse response for standard Markdown links and custom LINK: format to populate grounding sources
                const extractedSources: GroundingChunk[] = [];
                
                // 1. Regex to find markdown links: [Title](URL)
                const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
                let match;
                while ((match = markdownLinkRegex.exec(resultText)) !== null) {
                    extractedSources.push({
                        web: { title: match[1], uri: match[2] }
                    });
                }
                
                // 2. Regex to find our specific "LINK: URL" format from system prompt
                const customLinkRegex = /LINK:\s*(https?:\/\/\S+)/gi;
                while ((match = customLinkRegex.exec(resultText)) !== null) {
                     // Try to find the preceding HEADLINE for the title if possible, otherwise generic
                     extractedSources.push({
                        web: { title: 'News Source', uri: match[1] }
                    });
                }

                if (extractedSources.length > 0) {
                    setGroundingSources(extractedSources);
                }

            } catch (respErr: any) {
                console.warn("OpenAI Web Search API failed, trying fallback...", respErr);
                const searchModel = aiConfig.model?.includes('gpt-4') ? 'gpt-4o' : 'gpt-3.5-turbo';
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "system", content: basePrompt }],
                    model: searchModel,
                });
                resultText = completion.choices[0].message.content || "No response.";
            }

        } else {
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
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
        
        let requestContents: any = basePrompt;

        if (attachedFile) {
            const base64Data = await readFileAsBase64(attachedFile);
            requestContents = {
                parts: [
                    { text: basePrompt },
                    {
                        inlineData: {
                            mimeType: attachedFile.type || 'application/pdf',
                            data: base64Data
                        }
                    }
                ]
            };
        }

        const useNativeSearch = isNewsAgent && !serperContext;

        const result = await ai.models.generateContent({
          model: aiConfig.model || 'gemini-3-flash-preview',
          contents: requestContents,
          config: useNativeSearch ? {
            tools: [{ googleSearch: {} }]
          } : undefined
        });
        
        resultText = result.text || "Command processed with 0 errors!";
        
        if (useNativeSearch && result.candidates?.[0]?.groundingMetadata?.groundingChunks) {
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

  // --- SPECIALIZED BUILDER FUNCTION ---
  const processBuilderCommand = async (request: string) => {
    const builderSystemPrompt = `
      You are an expert Frontend Architect and Tailwind CSS Wizard.
      Goal: Build a single-file HTML5 landing page or mini-app based on this request: "${request}".
      
      Requirements:
      1. Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
      2. Use FontAwesome via CDN for icons.
      3. Use Google Fonts (e.g., 'Inter' or 'Fredoka').
      4. Make it fully responsive, beautiful, and modern.
      5. Include minimal vanilla JS if interactivity is needed (e.g., for a calculator or toggle).
      6. OUTPUT FORMAT: Return the explanation first, then the code inside a standard markdown code block like:
         \`\`\`html
         <!DOCTYPE html>
         ...
         \`\`\`
    `;

    try {
        let rawText = "";

        if (aiConfig.provider === 'openai') {
            if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
            const openai = new OpenAI({ apiKey: aiConfig.apiKey, dangerouslyAllowBrowser: true });
            const completion = await openai.chat.completions.create({
                messages: [{ role: "system", content: builderSystemPrompt }],
                model: aiConfig.model || 'gpt-4o',
            });
            rawText = completion.choices[0].message.content || "";
        } else {
            const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
            const result = await ai.models.generateContent({
                model: aiConfig.model || 'gemini-3-flash-preview',
                contents: builderSystemPrompt,
            });
            rawText = result.text || "";
        }

        setResponse(rawText);
        
        // Extract HTML
        const htmlMatch = rawText.match(/```html\s*([\s\S]*?)\s*```/i);
        if (htmlMatch && htmlMatch[1]) {
            setPreviewHtml(htmlMatch[1]);
        }

    } catch (err: any) {
        setResponse(`❌ Builder Error: ${err.message}`);
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

  const stripMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
      .replace(/\*(.*?)\*/g, '$1')     // Italic
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // Links [text](url) -> text
      .replace(/^#+\s/gm, '')          // Headers
      .replace(/`/g, '');              // Code ticks
  };

  // --- TTS LOGIC (PREMIUM & FALLBACK) ---
  const getOpenAIVoice = (type: string) => {
      switch (type) {
          case 'coder': return 'echo'; // Male, deeper, steady
          case 'news': return 'onyx'; // Authoritative, deep
          case 'writer': return 'fable'; // Storyteller, British-ish
          case 'researcher': return 'shimmer'; // Clear, female, high quality
          case 'designer': return 'nova'; // Energetic, dynamic
          default: return 'alloy'; // Neutral, versatile
      }
  };

  // Helper to split long text into sensible chunks for TTS
  // This avoids the 4096 character limit of OpenAI and helps with faster start times
  const splitTextForTTS = (text: string): string[] => {
      // Clean standard markdown first
      const clean = stripMarkdown(text)
        .replace(/https?:\/\/\S+/g, 'link') 
        .replace(/[#*`_]/g, '');

      // Split by sentence terminators, keeping the terminator
      const chunks: string[] = [];
      // Regex matches sentences ending in . ! ? followed by space or end of string
      const sentenceRegex = /[^.!?]+[.!?]+(\s+|$)/g;
      
      let match;
      let currentChunk = "";
      const CHUNK_LIMIT = 500; // Optimal chunk size for OpenAI latency

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
      
      // Fallback if no punctuation found (e.g. one giant sentence)
      if (chunks.length === 0 && clean.trim().length > 0) {
          // Hard chop if necessary
          return clean.match(new RegExp(`.{1,${CHUNK_LIMIT}}`, 'g')) || [clean];
      }
      
      return chunks;
  };

  const handleSpeak = async (text: string) => {
    // 1. Stop if currently speaking
    if (isSpeaking || isLoadingAudio) {
      stopSpeaking();
      return;
    }

    // 2. Browser Fallback (If no OpenAI API Key or user prefers system voice)
    if (aiConfig.provider !== 'openai' || !aiConfig.apiKey) {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(stripMarkdown(text));
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = 
            voices.find(v => v.name.includes('Google US English')) || 
            voices.find(v => v.name.includes('Microsoft Zira')) || 
            voices.find(v => v.lang.startsWith('en'));
        
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.pitch = agent.type === 'news' ? 0.9 : 1.05; 
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
        return;
    }

    // 3. Premium OpenAI Chunked Streaming (Parallel Processing)
    setIsLoadingAudio(true);
    setIsSpeaking(true);
    ttsAbortControllerRef.current = new AbortController();
    
    // Prepare Queue
    const chunks = splitTextForTTS(text);
    ttsQueueRef.current = chunks;
    ttsCurrentIndexRef.current = 0;
    
    // Function to fetch a specific chunk
    const fetchChunk = async (index: number): Promise<string | null> => {
        if (index >= chunks.length) return null;
        if (ttsAudioCacheRef.current.has(index)) return ttsAudioCacheRef.current.get(index)!;

        try {
            const voice = getOpenAIVoice(agent.type);
            const response = await fetch("https://api.openai.com/v1/audio/speech", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${aiConfig.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "tts-1", // Use tts-1 for low latency
                    input: chunks[index],
                    voice: voice,
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

    // Recursive function to play queue sequentially
    const playNext = async () => {
        const index = ttsCurrentIndexRef.current;
        if (index >= chunks.length) {
            setIsSpeaking(false);
            setIsLoadingAudio(false);
            return;
        }

        // Parallel Processing:
        // 1. Ensure current is ready (should be if pipeline is working)
        // 2. Start fetching NEXT chunk while current plays
        
        const currentUrl = await fetchChunk(index);
        
        // Trigger pre-fetch for next chunk immediately
        if (index + 1 < chunks.length) {
            fetchChunk(index + 1); 
        }

        if (!currentUrl) {
            // Skip broken chunk
            ttsCurrentIndexRef.current++;
            playNext();
            return;
        }

        const audio = new Audio(currentUrl);
        audioPlayerRef.current = audio;
        
        audio.onended = () => {
            URL.revokeObjectURL(currentUrl); // Cleanup memory
            ttsAudioCacheRef.current.delete(index);
            ttsCurrentIndexRef.current++;
            playNext();
        };

        audio.onerror = () => {
             console.error("Audio Playback Error");
             ttsCurrentIndexRef.current++;
             playNext();
        };

        setIsLoadingAudio(false); // First chunk ready, stop loading spinner
        try {
            await audio.play();
        } catch (e) {
            console.error("Autoplay blocked", e);
            setIsSpeaking(false);
        }
    };

    // Kickstart the chain
    playNext();
  };

  const renderFormattedResponse = (text: string) => {
    const isStructuredNews = text.includes("HEADLINE:") && text.includes("SUMMARY:");
    
    if (isStructuredNews) {
        const parts = text.split(/HEADLINE:/i);
        const preamble = parts[0].trim();
        const newsItems = parts.slice(1);

        return (
            <div className="space-y-3 pt-2">
                {preamble && (
                    <div className="p-3 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 italic">
                            {stripMarkdown(preamble)}
                        </p>
                    </div>
                )}

                {newsItems.map((itemRaw, idx) => {
                    // Optimized parsing logic to handle HEADLINE, SUMMARY, and LINK
                    const [headlineRaw, rest] = itemRaw.split(/SUMMARY:/i);
                    // Split remaining part by LINK: to separate summary and link
                    const linkSplit = rest ? rest.split(/LINK:/i) : ["", ""];
                    const summaryRaw = linkSplit[0];
                    let linkRaw = linkSplit.length > 1 ? linkSplit[1] : "";
                    
                    const headline = stripMarkdown(headlineRaw || "").trim();
                    const summary = stripMarkdown(summaryRaw || "").trim();
                    let sourceUrl = stripMarkdown(linkRaw || "").trim();

                    // If the link looks like markdown [Link](url), extract url
                    const markdownLinkMatch = sourceUrl.match(/\((https?:\/\/[^\)]+)\)/);
                    if (markdownLinkMatch) {
                        sourceUrl = markdownLinkMatch[1];
                    }

                    let sourceDomain = '';
                    if (sourceUrl) {
                        try { sourceDomain = new URL(sourceUrl).hostname.replace(/^www\./, ''); } catch(e){}
                    }

                    return (
                        <div key={idx} className="group flex bg-[#E0F7FA] dark:bg-[#00334a] border-2 border-black dark:border-white rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:scale-[1.01] transition-transform overflow-hidden">
                             {/* Left Column: Icon/Image - Full Height */}
                             <div className="w-16 md:w-20 flex-shrink-0 bg-white dark:bg-zinc-800 border-r-2 border-black dark:border-white flex items-center justify-center p-2">
                                {sourceDomain ? (
                                    <img 
                                        src={`https://www.google.com/s2/favicons?domain=${sourceDomain}&sz=128`} 
                                        alt="icon" 
                                        className="w-10 h-10 md:w-12 md:h-12 object-contain filter grayscale group-hover:grayscale-0 transition-all"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <span className="text-2xl md:text-3xl">🗞️</span>
                                )}
                             </div>

                             {/* Right Column: Content */}
                             <div className="flex-1 p-3 flex flex-col justify-center min-w-0">
                                 <h4 className="font-black text-sm text-gray-900 dark:text-white leading-tight mb-1 truncate">
                                     {headline}
                                 </h4>
                                 <p className="text-xs font-medium text-gray-600 dark:text-gray-300 leading-snug line-clamp-2 mb-2">
                                     {summary}
                                 </p>
                                 
                                 <div className="flex items-center gap-2 mt-auto">
                                     {sourceDomain && (
                                         <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 truncate max-w-[100px]">
                                             {sourceDomain}
                                         </span>
                                     )}
                                     {sourceUrl && (
                                         <a 
                                            href={sourceUrl} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="text-[9px] font-black uppercase text-gray-400 hover:text-black dark:hover:text-white underline decoration-dotted transition-colors cursor-pointer ml-auto flex-shrink-0"
                                         >
                                             Read ↗
                                         </a>
                                     )}
                                 </div>
                             </div>
                        </div>
                    );
                })}
            </div>
        );
    }

    const blocks = text.split(/\n\n+/).filter(b => b.trim().length > 0);
    return (
      <div className="space-y-4 pt-2">
        {previewHtml && (
             <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 border-2 border-black dark:border-white rounded-2xl shadow-sm text-center">
                 <p className="font-black text-sm mb-2 text-gray-900 dark:text-white">🚀 LANDING PAGE GENERATED!</p>
                 <button 
                     onClick={() => setShowPreviewModal(true)}
                     className="bg-black text-white dark:bg-white dark:text-black px-6 py-3 rounded-xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(128,128,128,0.5)] active:translate-y-0.5 active:shadow-none transition-all hover:scale-105"
                 >
                     👁️ Open Live Preview
                 </button>
             </div>
        )}

        {blocks.map((block, idx) => {
          const isReport = block.match(/^(\*\*|)?REPORT:/i);
          // If it's a code block, format it simply
          if (block.includes('```')) {
              return (
                  <div key={idx} className="bg-black text-green-400 p-4 rounded-xl font-mono text-xs overflow-x-auto border-2 border-gray-700">
                      <pre>{block.replace(/```[a-z]*/g, '')}</pre>
                  </div>
              );
          }

          const content = stripMarkdown(block.replace(/^(\*\*|)?REPORT:(\*\*|)?/i, '').trim());
          
          return (
            <div 
              key={idx} 
              className={`p-4 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] rounded-2xl ${
                isReport ? 'bg-sky-100 dark:bg-sky-900/40' : 'bg-white dark:bg-zinc-800 wobbly-border'
              }`}
            >
              <p className={`text-sm ${isReport ? 'font-medium' : 'font-black'} text-gray-900 dark:text-gray-100 leading-relaxed`}>
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
      
      {/* INPUT REQUEST MODAL */}
      {inputRequest && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-zinc-900 w-full max-w-md border-4 border-black dark:border-white wobbly-border p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] dark:shadow-[10px_10px_0px_0px_rgba(255,255,255,1)]">
                <h3 className="text-xl font-black italic text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📝</span> Input Required
                </h3>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300 mb-4">{inputRequest.label}</p>
                
                <form onSubmit={handleInputSubmit}>
                  <input 
                     autoFocus
                     type="text" 
                     value={inputValue}
                     onChange={(e) => setInputValue(e.target.value)}
                     placeholder={inputRequest.placeholder}
                     className="w-full border-2 border-black dark:border-white rounded-xl p-3 bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-4 ring-yellow-200 font-bold mb-6 text-gray-900 dark:text-white text-base md:text-sm"
                  />
                  <div className="flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setInputRequest(null)}
                        className="flex-1 bg-gray-200 dark:bg-zinc-700 border-2 border-black dark:border-white rounded-xl py-3 font-black uppercase text-xs hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors dark:text-white"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 bg-black dark:bg-white text-white dark:text-black border-2 border-black dark:border-white rounded-xl py-3 font-black uppercase text-xs hover:scale-105 transition-transform"
                      >
                        Send ↵
                      </button>
                  </div>
                </form>
            </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {showPreviewModal && previewHtml && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-3xl border-4 border-black overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="bg-gray-100 p-3 border-b-2 border-black flex justify-between items-center">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-400 border border-black"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400 border border-black"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400 border border-black"></div>
                    </div>
                    <span className="font-mono text-xs text-gray-500">preview-mode.html</span>
                    <button 
                        onClick={() => setShowPreviewModal(false)}
                        className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-black border-2 border-black hover:bg-red-600"
                    >
                        CLOSE ✕
                    </button>
                </div>
                <iframe 
                    title="Preview"
                    srcDoc={previewHtml}
                    className="flex-1 w-full h-full bg-white"
                    sandbox="allow-scripts"
                />
            </div>
        </div>
      )}

      {/* LEFT COLUMN (Agent Card & Status) */}
      <div className="md:col-span-5 lg:col-span-4 space-y-6">
        {/* Agent Card */}
        <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white wobbly-border p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] relative overflow-hidden group transition-transform hover:-translate-y-1">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-gray-100 dark:to-zinc-700 opacity-50 rounded-bl-[100px] pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center text-center sm:text-left sm:items-start sm:flex-row gap-5">
            {/* Avatar Container */}
            <div className="relative group-hover:scale-105 transition-transform duration-300">
                <div 
                  className="w-28 h-28 rounded-3xl border-4 border-black dark:border-white bg-white dark:bg-zinc-700 p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden"
                >
                  <div className="w-full h-full rounded-2xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: `${agent.color}15` }}>
                     <img src={agent.avatarUrl} alt={agent.name} className="w-full h-full object-cover transform translate-y-2" />
                  </div>
                </div>
                {/* Online Indicator */}
                <div className="absolute -bottom-2 -right-2 bg-green-400 border-2 border-black dark:border-white w-6 h-6 rounded-full flex items-center justify-center animate-bounce-slow shadow-sm" title="Online">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
            </div>

            {/* Agent Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                      <h2 className="text-4xl font-black italic text-gray-900 dark:text-white leading-none tracking-tight">{agent.name}</h2>
                      <span className="bg-black dark:bg-white text-white dark:text-black text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm transform -rotate-2">
                          {agent.version}
                      </span>
                  </div>
                  
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2 flex-wrap">
                      <span className="bg-gray-100 dark:bg-zinc-700 border-2 border-black dark:border-zinc-500 px-3 py-1 rounded-xl text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 tracking-wider flex items-center gap-1">
                          {agent.type === 'coder' && '💻'}
                          {agent.type === 'writer' && '✍️'}
                          {agent.type === 'designer' && '🎨'}
                          {agent.type === 'researcher' && '🧠'}
                          {agent.type === 'news' && '📰'}
                          {agent.type}
                      </span>
                      <div className="hidden sm:block h-1 w-1 bg-gray-300 rounded-full"></div>
                      <p className="font-black text-sm uppercase truncate" style={{ color: agent.color }}>{agent.specialty}</p>
                  </div>
              </div>
              
              <div className="mt-4 bg-gray-50 dark:bg-zinc-900/30 border-l-4 pl-3 py-2 pr-1" style={{ borderColor: agent.color }}>
                 <p className="text-xs font-bold text-gray-600 dark:text-gray-400 italic leading-tight">"{agent.catchphrase}"</p>
              </div>
            </div>
          </div>

          {/* Status Report Bubble */}
          <div className="mt-6 bg-blue-50 dark:bg-zinc-900/50 border-2 border-black dark:border-white border-dashed rounded-2xl p-4 relative group-hover:bg-blue-100 dark:group-hover:bg-zinc-900/80 transition-colors">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 bg-blue-500 text-[9px] px-3 py-0.5 border-2 border-black dark:border-white font-black rounded-full text-white shadow-sm uppercase tracking-wider">
              System Status
            </div>
            <p className="text-sm font-bold text-center sm:text-left leading-relaxed text-gray-800 dark:text-gray-200">
              {loading ? "Syncing..." : status}
            </p>
          </div>
        </div>

        {/* Quick Stats Grid - Updated Look */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-transform relative overflow-hidden">
             <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full z-0"></div>
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl">⚡</span>
                    <span className="text-[9px] font-black uppercase bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Tasks</span>
                </div>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{completedCount}<span className="text-gray-400 text-lg">/{tasks.length}</span></p>
                <div className="w-full bg-gray-100 dark:bg-zinc-700 h-2 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${(completedCount / (tasks.length || 1)) * 100}%` }}
                  ></div>
                </div>
             </div>
          </div>
          
          <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-transform relative overflow-hidden">
             <div className="absolute -right-4 -top-4 w-16 h-16 bg-pink-100 dark:bg-pink-900/50 rounded-full z-0"></div>
             <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-2xl">🆙</span>
                    <span className="text-[9px] font-black uppercase bg-pink-100 text-pink-800 px-2 py-0.5 rounded-full">Level</span>
                </div>
                <p className="text-3xl font-black text-gray-900 dark:text-white">{upgrades.length}</p>
                <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">Modules Active</p>
             </div>
          </div>
        </div>
      
         {/* Capabilities Stickers */}
        <div>
          <h3 className="text-xs font-black uppercase text-gray-400 dark:text-gray-500 mb-2 ml-1">Installed Modules</h3>
          <div className="flex flex-wrap gap-2">
            {agent.capabilities.map((cap, i) => (
              <div key={i} className="group relative">
                  <span className="block bg-yellow-300 dark:bg-yellow-600 border-2 border-black dark:border-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] group-hover:-translate-y-0.5 transition-transform cursor-default text-black dark:text-white">
                    {cap}
                  </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN (Actions, Chat, Mission Log) */}
      <div className="md:col-span-7 lg:col-span-8 space-y-6">
        
        {/* Quick Command Section */}
        <div className={`bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-6 rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] relative transition-all duration-300 ${builderMode ? 'ring-4 ring-purple-400' : ''}`}>
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-20"></div>
          
          <div className="flex justify-between items-center mb-4 ml-1">
             <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${builderMode ? 'bg-purple-500' : 'bg-red-500'}`}></div>
                <h4 className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">
                    {builderMode ? '🏗️ LANDING PAGE BUILDER ACTIVE' : 'Direct Uplink'}
                </h4>
             </div>
             {/* ZETTA SPECIAL: File Upload Indicator */}
             {agent.type === 'researcher' && (
               <div className="flex items-center gap-2">
                   {attachedFile && (
                       <span className="text-[10px] font-black bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 px-3 py-1 rounded-lg border border-purple-400 flex items-center gap-1">
                           <span>📂</span> {attachedFile.name}
                       </span>
                   )}
               </div>
             )}
          </div>

          {/* ZETTA SPECIAL: Data Ingestion Port (File Upload) */}
          {agent.type === 'researcher' && (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className={`mb-4 border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all group relative overflow-hidden ${attachedFile ? 'bg-purple-50 border-purple-400 dark:bg-purple-900/30' : 'bg-gray-50 border-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:bg-zinc-900 dark:border-zinc-700'}`}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept=".txt,.csv,.json,.pdf,.js,.ts,.docx,image/*"
                />
                <div className="relative z-10">
                    <div className="text-2xl mb-1 group-hover:scale-110 transition-transform duration-300">
                        {attachedFile ? '📊' : '📥'}
                    </div>
                    <p className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-300 group-hover:text-purple-700">
                        {attachedFile ? "Change Data Source" : "Drop Data Files Here"}
                    </p>
                </div>
            </div>
          )}

          <form onSubmit={handleSendCommand} className="flex gap-3 mb-6">
            <div className="relative flex-1">
                <input 
                  type="text" 
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder={
                      builderMode 
                        ? "Describe the landing page you want (e.g. 'Coffee shop')..." 
                        : (agent.type === 'news' 
                            ? "Search for news items..." 
                            : (agent.type === 'researcher' && attachedFile) 
                                ? "Ask about the file..." 
                                : "Talk to your agent...")
                  }
                  className={`w-full text-base md:text-sm border-2 border-black dark:border-white rounded-2xl pl-4 pr-4 py-4 focus:outline-none focus:ring-4 font-bold transition-all shadow-inner ${
                      builderMode 
                        ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-white ring-purple-200' 
                        : 'bg-gray-50 dark:bg-zinc-900 text-gray-900 dark:text-white ring-yellow-200'
                  }`}
                  autoFocus={builderMode}
                />
            </div>
            <button 
              disabled={sending}
              className={`text-white dark:text-black border-2 border-black dark:border-white rounded-2xl px-6 py-2 font-black text-xs shadow-[4px_4px_0px_0px_rgba(128,128,128,0.5)] active:translate-y-0.5 active:shadow-none transition-all hover:scale-105 flex items-center gap-2 ${
                  builderMode ? 'bg-purple-600 dark:bg-purple-300' : 'bg-black dark:bg-white'
              }`}
            >
              {sending ? <span className="animate-spin">⌛</span> : <span>{builderMode ? 'BUILD 🔨' : 'SEND ↵'}</span>}
            </button>
          </form>

          {/* Quick Shortcuts Section */}
          <div className="bg-blue-50/50 dark:bg-zinc-900/30 border-2 border-blue-200 dark:border-zinc-700 border-dashed rounded-2xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h5 className="text-[10px] font-black uppercase text-blue-400 dark:text-blue-300 flex items-center gap-1">
                ⚡ Rapid Commands {isEditingCommands && <span className="text-red-500 animate-pulse">● Editing</span>}
              </h5>
              <button 
                onClick={() => isEditingCommands ? saveCommands() : setIsEditingCommands(true)}
                className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border-2 transition-colors ${
                  isEditingCommands 
                    ? 'bg-green-400 border-green-600 text-white hover:bg-green-500' 
                    : 'bg-white dark:bg-zinc-800 border-gray-300 dark:border-zinc-600 text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {isEditingCommands ? 'Save Changes' : 'Customize'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {editedCommands.map((cmd, idx) => (
                <div key={idx}>
                  {isEditingCommands ? (
                    <input
                      type="text"
                      value={cmd}
                      onChange={(e) => handleCommandChange(idx, e.target.value)}
                      className="w-full text-base md:text-[10px] font-bold border-2 border-blue-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-black dark:text-white rounded-xl px-3 py-2 focus:border-blue-400 focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => executeCommand(cmd)}
                      disabled={sending}
                      className="w-full group bg-white dark:bg-zinc-800 border-2 border-black dark:border-zinc-500 rounded-xl px-3 py-2.5 text-[10px] font-black text-left shadow-sm hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-md transition-all truncate text-gray-700 dark:text-gray-200 flex items-center justify-between"
                    >
                      <span>{cmd}</span>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">→</span>
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
            <div className="flex justify-between items-center mb-2 ml-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h4 className="text-[10px] font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest">Transmission</h4>
              </div>

              {/* TTS Button */}
              <button 
                onClick={() => handleSpeak(response)}
                disabled={isLoadingAudio}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-[10px] font-black uppercase transition-all shadow-sm active:translate-y-0.5 active:shadow-none ${
                  isSpeaking || isLoadingAudio
                    ? 'bg-red-100 border-red-400 text-red-600' 
                    : 'bg-white dark:bg-zinc-800 border-black dark:border-white hover:bg-yellow-100 dark:hover:bg-zinc-700 text-gray-900 dark:text-white'
                }`}
              >
                <span>
                    {isLoadingAudio ? 'Loading Audio...' : (isSpeaking ? 'Stop Voice' : 'Read Aloud')}
                </span>
                <span className={`text-sm ${isSpeaking && 'animate-pulse'}`}>
                    {isLoadingAudio ? '⏳' : (isSpeaking ? '🔇' : '🔊')}
                </span>
              </button>
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
            <h3 className="text-sm font-black italic text-gray-900 dark:text-white mb-4 underline decoration-purple-400 decoration-4">
               {agent.type.toUpperCase()} SKILLS
            </h3>
            <div className="grid grid-cols-2 gap-3 h-full content-start">
              {getAgentActions(agent.type).map((action, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleActionClick(action)}
                    disabled={sending}
                    className="bg-purple-100 dark:bg-zinc-900 border-2 border-black dark:border-white p-3 rounded-2xl text-[10px] font-black text-purple-900 dark:text-purple-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all uppercase hover:bg-purple-200 dark:hover:bg-zinc-800 flex flex-col items-center justify-center gap-1 group disabled:opacity-50 disabled:shadow-none"
                  >
                    <span className="text-xl group-hover:scale-125 transition-transform duration-300">{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
              ))}
            </div>
          </div>

          {/* Mission Log */}
          <div className="bg-yellow-100 dark:bg-yellow-900/30 border-4 border-black dark:border-white wobbly-border p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] h-full">
            <h3 className="text-sm font-black italic text-gray-900 dark:text-white mb-4 flex items-center gap-2">
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
