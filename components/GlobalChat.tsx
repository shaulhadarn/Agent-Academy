
import React, { useState, useRef, useEffect } from 'react';
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

interface GlobalChatProps {
  agents: Agent[];
  aiConfig: AIConfig;
}

const GlobalChat: React.FC<GlobalChatProps> = ({ agents, aiConfig }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      senderName: 'System',
      senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=System',
      text: "The Agent Academy Council is now in session! How can we help?",
      isUser: false,
      color: '#000000'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

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
    setIsTyping(true);

    try {
      const agentDescriptions = agents.map(a => `${a.name} (${a.type}, expert in ${a.specialty})`).join(', ');
      
      const prompt = `
        The user is talking to a team of whimsical AI agents: ${agentDescriptions}.
        User says: "${currentInput}"
        
        Respond as one or more of these agents in a group chat style. 
        Keep it short, cute, and playful. 
        Format your response as a JSON array of objects with 'agentName' and 'text'.
        Example: [{"agentName": "Sparky", "text": "I can code that!"}, {"agentName": "Glitch", "text": "And I'll make it pretty!"}]
      `;

      let responses = [];

      if (aiConfig.provider === 'openai') {
        if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
        const openai = new OpenAI({ apiKey: aiConfig.apiKey, dangerouslyAllowBrowser: true });
        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: prompt }],
            model: aiConfig.model || 'gpt-4o',
            response_format: { type: "json_object" }
        });
        const text = completion.choices[0].message.content || "[]";
        // OpenAI might wrap the array in a key like "response" if not perfectly prompted for top-level array in json_object mode, 
        // but often it follows the example. Let's try parsing. 
        // Note: OpenAI 'json_object' format requires the word 'json' in prompt, which we have. 
        // Sometimes it returns { "agents": [...] }. We might need to handle that or standard prompt.
        // A safer prompt for OpenAI JSON mode usually asks for a specific schema, but let's try direct parse.
        // Or we can fallback to text mode and parse. 
        // Actually for multi-agent, let's keep it simple.
        try {
            responses = JSON.parse(text);
             // If wrapped in object keys
            if (!Array.isArray(responses) && typeof responses === 'object') {
                responses = Object.values(responses)[0] as any || [];
            }
        } catch (e) {
            responses = [];
        }

      } else {
        const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
        const result = await ai.models.generateContent({
            model: aiConfig.model || 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        responses = JSON.parse(result.text || "[]");
      }
      
      if (!Array.isArray(responses)) responses = [];

      const newAiMessages: Message[] = responses.map((resp: any, index: number) => {
        const agent = agents.find(a => a.name === resp.agentName) || agents[0];
        return {
          id: `ai-${Date.now()}-${index}`,
          senderName: resp.agentName,
          senderAvatar: agent.avatarUrl,
          text: resp.text,
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
      setIsTyping(false);
    }
  };

  return (
    // h-full allows it to take the flex-1 space from the App layout
    <div className="flex flex-col h-[calc(100vh-200px)] md:h-[calc(100vh-140px)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="px-2 mb-4">
        <h3 className="text-2xl font-black italic text-gray-900 underline decoration-green-400 decoration-4">Global Council 💬</h3>
        <p className="text-[10px] font-black uppercase text-gray-500">Chat with the whole squad</p>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 p-4 mb-4 bg-white/60 border-4 border-black wobbly-border shadow-[inset_4px_4px_10px_rgba(0,0,0,0.1)] no-scrollbar"
      >
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-2 ${msg.isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div 
              className="w-10 h-10 rounded-full border-2 border-black overflow-hidden flex-shrink-0 bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              style={{ borderColor: msg.isUser ? 'black' : msg.color }}
            >
              <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-contain" />
            </div>
            <div className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] font-black uppercase text-gray-800 mb-0.5 tracking-tighter ml-1 mr-1">{msg.senderName}</span>
              <div 
                className={`max-w-[280px] md:max-w-md p-3 rounded-2xl border-2 border-black text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-gray-900 ${
                  msg.isUser ? 'bg-blue-100' : 'bg-white'
                }`}
                style={{ borderLeftColor: msg.isUser ? 'black' : msg.color, borderLeftWidth: !msg.isUser ? '6px' : '2px' }}
              >
                {msg.text}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 animate-pulse">
            <div className="w-8 h-8 rounded-full border-2 border-dashed border-gray-400"></div>
            <div className="bg-gray-100 p-2 rounded-xl text-[10px] font-black text-gray-600">AGENTS ARE DISCUSSING...</div>
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="relative">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Summon the council..."
          className="w-full bg-gray-900 border-4 border-black p-4 pr-16 rounded-3xl focus:outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-white font-black placeholder-gray-400 transition-colors"
        />
        <button 
          type="submit"
          className="absolute right-3 top-3 bg-green-400 border-2 border-black p-2 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all hover:bg-green-300"
        >
          🚀
        </button>
      </form>
    </div>
  );
};

export default GlobalChat;
