
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  applyEdgeChanges, 
  applyNodeChanges, 
  addEdge,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  useNodesState,
  useEdgesState
} from 'reactflow';
import WorkflowNode from './WorkflowNode';
import { Agent, AIConfig } from '../types';
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";

interface OrchestratorViewProps {
  agents: Agent[];
  aiConfig: AIConfig;
}

const nodeTypes = {
  custom: WorkflowNode,
};

const OrchestratorView: React.FC<OrchestratorViewProps> = ({ agents, aiConfig }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");
  const [consoleLog, setConsoleLog] = useState<string[]>(["Orchestrator v2.0 online. Ready for complex logic."]);

  // --- MODAL STATE ---
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Computed selected node for modal
  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // --- HELPERS ---
  const getAgent = (type: string) => agents.find(a => a.type === type) || agents[0];

  const handleNodeConfig = useCallback((id: string) => {
    setSelectedNodeId(id);
  }, []);

  const updateNodeData = (id: string, newData: any) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === id) {
        return { ...node, data: { ...node.data, ...newData } };
      }
      return node;
    }));
  };

  // Helper to clean AI Output (remove markdown code blocks)
  const cleanAIOutput = (text: any) => {
    if (typeof text !== 'string') return text;
    // Remove ```html ... ``` or just ``` ... ``` wrapper
    return text.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
  };

  // Initial Nodes
  useEffect(() => {
     if (nodes.length === 0) {
         setNodes([
            { 
                id: 'start', 
                type: 'custom', 
                position: { x: 250, y: 0 }, 
                data: { 
                    label: 'Start Trigger', 
                    role: 'System', 
                    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=System', 
                    color: '#000',
                    onConfig: handleNodeConfig,
                    status: 'Ready'
                } 
            },
         ]);
     }
  }, [setNodes, handleNodeConfig, nodes.length]);

  // --- AI EXECUTION HELPER ---
  const executeAgentTask = async (agentRole: string, instructions: string, context: string, modelOverride?: string) => {
      const fullPrompt = `
        You are an AI agent with the role: ${agentRole}.
        
        YOUR INSTRUCTIONS:
        ${instructions}
        
        CONTEXT FROM PREVIOUS STEPS:
        ${context}
        
        Perform the task and provide the output. If generating code or text, just provide the content.
      `;

      if (aiConfig.provider === 'openai') {
          if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
          const openai = new OpenAI({ apiKey: aiConfig.apiKey, dangerouslyAllowBrowser: true });
          
          // Check if this task requires Web Search (e.g. NEWS role)
          if (agentRole.toUpperCase() === 'NEWS') {
             try {
                const clientAny = openai as any;
                const response = await clientAny.responses.create({
                    model: aiConfig.model || 'gpt-4o',
                    tools: [{ type: "web_search" }],
                    input: fullPrompt
                });
                return response.output_text || "No output text";
             } catch (e) {
                console.warn("Responses API failed in workflow, falling back...", e);
             }
          }

          const completion = await openai.chat.completions.create({
              messages: [{ role: "system", content: fullPrompt }],
              model: aiConfig.model || 'gpt-4o',
          });
          return completion.choices[0].message.content || "";
      } else {
          const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
          const isNews = agentRole.toUpperCase() === 'NEWS';
          const result = await ai.models.generateContent({
              model: aiConfig.model || 'gemini-3-flash-preview',
              contents: fullPrompt,
              config: isNews ? { tools: [{ googleSearch: {} }] } : undefined
          });
          return result.text || "";
      }
  };

  // --- AI WORKFLOW GENERATION (Structure) ---
  const generateWorkflowStructure = async () => {
    if (!userPrompt.trim()) return;
    setIsGenerating(true);
    setConsoleLog(prev => [...prev, `🤔 Designing workflow for: "${userPrompt}"...`]);

    try {
        const agentContext = agents.map(a => `- ${a.name} (Type: ${a.type})`).join('\n');
        
        const systemPrompt = `
            Design a sequential workflow JSON for request: "${userPrompt}" using agents: ${agentContext}.
            Format: { "steps": [{ "agentType": "news", "label": "Fetch News", "instructions": "Search for latest news..." }] }
            - "instructions" should be a detailed prompt for that specific agent step.
            - Keep it under 5 steps.
        `;

        let steps: any[] = [];

        try {
            if (aiConfig.provider === 'openai') {
                if (!aiConfig.apiKey) throw new Error("Missing OpenAI API Key");
                const openai = new OpenAI({ apiKey: aiConfig.apiKey, dangerouslyAllowBrowser: true });
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "system", content: systemPrompt }],
                    model: aiConfig.model || 'gpt-4o',
                    response_format: { type: "json_object" }
                });
                steps = JSON.parse(completion.choices[0].message.content || "{}").steps || [];
            } else {
                const ai = new GoogleGenAI({ apiKey: aiConfig.apiKey || process.env.API_KEY });
                const result = await ai.models.generateContent({
                    model: aiConfig.model || 'gemini-3-flash-preview',
                    contents: systemPrompt,
                    config: { responseMimeType: "application/json" }
                });
                steps = JSON.parse(result.text || "{}").steps || [];
            }
        } catch (err) {
             // Fallback
             steps = [
                 { agentType: 'researcher', label: 'Analyze Request', instructions: `Analyze this request: ${userPrompt}` },
                 { agentType: 'writer', label: 'Draft Response', instructions: 'Write a response based on the analysis.' }
             ];
        }

        // Build Graph
        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];
        
        // Start
        newNodes.push({ 
            id: 'start', type: 'custom', position: { x: 250, y: 0 }, 
            data: { label: 'Start', role: 'Trigger', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Start', status: 'Ready', onConfig: handleNodeConfig, output: userPrompt } 
        });

        steps.forEach((step, index) => {
            const agent = getAgent(step.agentType);
            const nodeId = `step-${index}`;
            newNodes.push({
                id: nodeId, type: 'custom', position: { x: 250, y: (index + 1) * 150 },
                data: { 
                    label: step.label, 
                    role: agent.type.toUpperCase(), 
                    avatarUrl: agent.avatarUrl, 
                    color: agent.color, 
                    status: 'Idle',
                    instructions: step.instructions,
                    onConfig: handleNodeConfig
                }
            });
            const sourceId = index === 0 ? 'start' : `step-${index-1}`;
            newEdges.push({ id: `e-${index}`, source: sourceId, target: nodeId, animated: true, style: { stroke: 'black', strokeWidth: 3 } });
        });

        // End
        const lastStepId = `step-${steps.length-1}`;
        newNodes.push({
            id: 'end', type: 'custom', position: { x: 250, y: (steps.length + 1) * 150 },
            data: { label: 'Complete', role: 'Output', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Done', status: 'Pending', onConfig: handleNodeConfig }
        });
        newEdges.push({ id: `e-end`, source: lastStepId, target: 'end', style: { stroke: 'black', strokeWidth: 3 } });

        setNodes(newNodes);
        setEdges(newEdges);
        setConsoleLog(prev => [...prev, "✨ Workflow structure generated."]);
        setUserPrompt("");

    } catch (e: any) {
        setConsoleLog(prev => [...prev, `⚠️ Error: ${e.message}`]);
    } finally {
        setIsGenerating(false);
    }
  };

  // --- TEMPLATES ---
  const loadTemplate = (templateId: number) => {
    let newNodes: Node[] = [];
    let newEdges: Edge[] = [];

    const startNode = { 
        id: 'start', type: 'custom', position: { x: 250, y: 0 }, 
        data: { label: 'User Input', role: 'Trigger', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Input', status: 'Waiting', onConfig: handleNodeConfig, output: userPrompt || "General Topic" } 
    };

    const makeNode = (id: string, x: number, y: number, agentType: string, label: string, instructions: string) => {
        const agent = getAgent(agentType);
        return {
            id, type: 'custom', position: { x, y }, 
            data: { label, role: agent.type.toUpperCase(), avatarUrl: agent.avatarUrl, color: agent.color, status: 'Idle', instructions, onConfig: handleNodeConfig }
        };
    };
    
    const makeEndNode = (x: number, y: number) => ({
        id: 'end', type: 'custom', position: { x, y },
        data: { label: 'Complete', role: 'Output', avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Done', status: 'Pending', onConfig: handleNodeConfig }
    });

    if (templateId === 1) { // News
        newNodes = [
            startNode,
            makeNode('n1', 250, 150, 'news', 'Fetch Trends', 'Search for the top 3 trending news stories related to the input topic. Provide a concise summary for each.'),
            makeNode('n2', 250, 300, 'writer', 'Digest', 'Rewrite the provided news summaries into a fun, easy-to-read "Morning Digest" format. Use emojis.'),
            makeEndNode(250, 450)
        ];
        newEdges = [{id:'e1', source:'start', target:'n1'}, {id:'e2', source:'n1', target:'n2'}, {id:'e3', source:'n2', target:'end'}];
        setConsoleLog(prev => [...prev, "Loaded: 📰 News Briefing"]);
    } else if (templateId === 2) { // Code
        newNodes = [
            startNode,
            makeNode('n1', 250, 150, 'researcher', 'Tech Spec', 'Analyze the user request and create a bulleted technical requirement list for a Typescript implementation.'),
            makeNode('n2', 250, 300, 'coder', 'Implementation', 'Write clean, commented Typescript code based on the technical requirements provided. Do not use markdown blocks, just raw code.'),
            makeEndNode(250, 450)
        ];
        newEdges = [{id:'e1', source:'start', target:'n1'}, {id:'e2', source:'n1', target:'n2'}, {id:'e3', source:'n2', target:'end'}];
        setConsoleLog(prev => [...prev, "Loaded: 🏭 Code Factory"]);
    } else if (templateId === 4) { // Premium Blog
        newNodes = [
            startNode,
            makeNode('n1', 250, 150, 'researcher', 'SEO Research', 'Identify 5 high-traffic keywords and 3 sub-topics related to the input. Provide a target audience persona.'),
            makeNode('n2', 250, 300, 'writer', 'Outline', 'Create a detailed blog post outline with H2 and H3 headers based on the SEO research.'),
            makeNode('n3', 250, 450, 'writer', 'Drafting', 'Write the full blog post based on the outline. Ensure the tone is engaging and professional.'),
            makeNode('n4', 250, 600, 'designer', 'Formatting', 'Wrap the blog post in beautiful HTML with Tailwind CSS classes for typography. Add <div> placeholders for images.'),
            makeEndNode(250, 750)
        ];
        newEdges = [{id:'e1', source:'start', target:'n1'}, {id:'e2', source:'n1', target:'n2'}, {id:'e3', source:'n2', target:'n3'}, {id:'e4', source:'n3', target:'n4'}, {id:'e5', source:'n4', target:'end'}];
        setConsoleLog(prev => [...prev, "Loaded: 💎 Premium Blog Generator"]);
    } else { // Creative
        newNodes = [
            startNode,
            makeNode('n1', 250, 150, 'designer', 'Visual Concept', 'Describe a visual style, color palette, and mood board for the input idea.'),
            makeNode('n2', 250, 300, 'writer', 'Copy', 'Write a catchy tagline and a short paragraph of marketing copy matching the visual style.'),
            makeEndNode(250, 450)
        ];
        newEdges = [{id:'e1', source:'start', target:'n1'}, {id:'e2', source:'n1', target:'n2'}, {id:'e3', source:'n2', target:'end'}];
        setConsoleLog(prev => [...prev, "Loaded: 🎨 Creative Suite"]);
    }

    // Style edges
    newEdges = newEdges.map(e => ({ ...e, animated: true, style: { stroke: 'black', strokeWidth: 3 } }));
    setNodes(newNodes);
    setEdges(newEdges);
  };

  // --- REAL EXECUTION LOGIC ---
  const runWorkflow = async () => {
    if (nodes.length === 0) return;
    setIsRunning(true);
    setConsoleLog(prev => [...prev, "🚀 Starting execution sequence..."]);

    // 1. Get Initial Input from Start Node or User Prompt
    // If Start node has no output set, use userPrompt
    let currentContext = userPrompt || (nodes.find(n => n.id === 'start')?.data.output) || "General Query";

    // Reset statuses
    setNodes(nds => nds.map(n => ({ 
        ...n, 
        data: { 
            ...n.data, 
            status: n.id === 'start' ? 'Ready' : 'Waiting',
            output: n.id === 'start' ? currentContext : null 
        } 
    })));

    try {
        // Find path. Assuming linear for now based on current generator logic
        // Start -> e1 -> n1 -> e2 -> n2 ...
        
        let currentNodeId = 'start';
        let steps = 0;
        
        // Safety loop break
        while (steps < 10) {
            // Find edge out
            const edge = edges.find(e => e.source === currentNodeId);
            if (!edge) break; // End of line

            const nextNode = nodes.find(n => n.id === edge.target);
            if (!nextNode) break;

            if (nextNode.id === 'end') {
                // Final Step
                updateNodeData('end', { status: 'Complete ✅', output: { type: 'html', title: 'Workflow Result', content: currentContext } });
                setConsoleLog(prev => [...prev, "🏁 Workflow Complete!"]);
                break;
            }

            // Processing Node
            const nodeName = nextNode.data.label;
            setConsoleLog(prev => [...prev, `▶️ activating ${nodeName}...`]);
            updateNodeData(nextNode.id, { status: 'Processing... ⏳' });

            // EXECUTE AI
            try {
                const result = await executeAgentTask(
                    nextNode.data.role, 
                    nextNode.data.instructions || "Process the input.", 
                    currentContext
                );
                
                currentContext = result; // Pass forward
                updateNodeData(nextNode.id, { status: 'Done ✅', output: result });
                setConsoleLog(prev => [...prev, `✅ ${nodeName} finished.`]);

            } catch (err: any) {
                console.error(err);
                updateNodeData(nextNode.id, { status: 'Error ❌' });
                setConsoleLog(prev => [...prev, `❌ Error in ${nodeName}: ${err.message}`]);
                // On 429, we might want to pause or simulate, but here we break
                if (err.message?.includes('429')) {
                     setConsoleLog(prev => [...prev, "⚠️ Quota Hit. Stopping."]);
                }
                break;
            }

            currentNodeId = nextNode.id;
            steps++;
        }

    } catch (e) {
        console.error(e);
    } finally {
        setIsRunning(false);
    }
  };

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: 'black', strokeWidth: 3 } }, eds)), [setEdges]);

  // Derived state for modal rendering
  let modalContentToRender = selectedNode?.data.output;
  if (selectedNodeId === 'end' && selectedNode?.data.output?.content) {
      modalContentToRender = selectedNode.data.output.content;
  } else if (selectedNodeId !== 'start' && selectedNode?.data.output) {
      modalContentToRender = selectedNode.data.output;
  }
  
  // Clean content if it's a string
  const cleanContent = cleanAIOutput(typeof modalContentToRender === 'string' ? modalContentToRender : modalContentToRender?.content || "");
  const isHtmlContent = typeof cleanContent === 'string' && (cleanContent.trim().startsWith('<') || cleanContent.includes('</') || cleanContent.includes('</div>'));

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-in fade-in zoom-in-95 duration-500 relative">
      
      {/* NODE DETAILS MODAL */}
      {selectedNode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-[#FFFDE7] dark:bg-zinc-900 w-full max-w-3xl h-[85vh] border-4 border-black dark:border-white rounded-3xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] dark:shadow-[10px_10px_0px_0px_rgba(255,255,255,1)] flex flex-col overflow-hidden relative">
               
               {/* Modal Header */}
               <div className="bg-white dark:bg-zinc-800 border-b-4 border-black dark:border-white p-4 flex justify-between items-center">
                   <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full border-2 border-black dark:border-white overflow-hidden bg-white">
                           <img src={selectedNode.data.avatarUrl} alt="" className="w-full h-full object-contain" />
                       </div>
                       <div>
                           <h3 className="text-xl font-black italic text-gray-900 dark:text-white uppercase">{selectedNode.data.role} Node</h3>
                           <p className="text-xs font-bold text-gray-500 dark:text-gray-400">{selectedNode.data.label} (ID: {selectedNode.id})</p>
                       </div>
                   </div>
                   <button onClick={() => setSelectedNodeId(null)} className="w-10 h-10 bg-red-400 border-2 border-black dark:border-white rounded-xl font-black text-white hover:bg-red-500 transition-colors">
                       ✕
                   </button>
               </div>

               {/* Modal Content */}
               <div className="flex-1 overflow-y-auto p-6 bg-dots-pattern">
                   
                   {/* CONTENT VIEW FOR COMPLETED OUTPUT NODES */}
                   {(selectedNodeId === 'end' && selectedNode.data.status?.includes('Complete')) ? (
                       <div className="space-y-6">
                           <div className="bg-green-100 dark:bg-green-900/30 border-2 border-black dark:border-white rounded-2xl p-4 flex items-center gap-2">
                               <span className="text-2xl">✅</span>
                               <span className="font-black text-green-800 dark:text-green-200 uppercase">Workflow Output Generated</span>
                           </div>

                           <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white rounded-xl overflow-hidden shadow-sm">
                               <div className="bg-gray-100 dark:bg-zinc-700 border-b-2 border-black dark:border-white p-2 flex gap-2">
                                   <div className="w-3 h-3 rounded-full bg-red-400 border border-black"></div>
                                   <div className="w-3 h-3 rounded-full bg-yellow-400 border border-black"></div>
                                   <div className="w-3 h-3 rounded-full bg-green-400 border border-black"></div>
                                   <div className="ml-4 text-[10px] font-mono bg-white dark:bg-black px-2 rounded border border-gray-300 dark:border-gray-600 flex-1 text-center opacity-50">
                                       Final Output
                                   </div>
                               </div>
                               
                               <div className="p-6 prose dark:prose-invert max-w-none font-fredoka">
                                    {/* Render HTML content safely if it's from Premium Blog, otherwise text */}
                                   {isHtmlContent ? (
                                       <div dangerouslySetInnerHTML={{ __html: cleanContent }} />
                                   ) : (
                                       <pre className="whitespace-pre-wrap font-sans text-sm">{cleanContent || JSON.stringify(selectedNode.data.output, null, 2)}</pre>
                                   )}
                               </div>
                           </div>
                       </div>
                   ) : (
                       /* CONFIG / INSTRUCTION VIEW */
                       <div className="space-y-6">
                            {/* Input Prompt Config */}
                            <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                                <h4 className="font-black uppercase text-sm mb-4 border-b-2 border-dashed border-gray-300 pb-2 dark:text-white">Node Configuration</h4>
                                
                                <div className="space-y-4">
                                    {selectedNodeId === 'start' && (
                                         <div>
                                            <label className="block text-xs font-bold uppercase mb-1 text-gray-500">Initial User Request</label>
                                            <textarea 
                                                className="w-full border-2 border-black dark:border-white rounded-xl p-2 font-bold text-sm h-24 resize-none dark:bg-zinc-700 dark:text-white"
                                                value={userPrompt}
                                                onChange={(e) => {
                                                    setUserPrompt(e.target.value);
                                                    updateNodeData('start', { output: e.target.value });
                                                }}
                                                placeholder="What starts this workflow?"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-1 text-gray-500">Label</label>
                                        <input 
                                            type="text" 
                                            value={selectedNode.data.label} 
                                            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                                            className="w-full border-2 border-black dark:border-white rounded-xl p-2 font-bold text-sm dark:bg-zinc-700 dark:text-white" 
                                        />
                                    </div>
                                    
                                    {selectedNode.data.role !== 'Trigger' && selectedNode.data.role !== 'Output' && (
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="text-xs font-bold uppercase text-gray-500">Detailed Instructions</label>
                                                <span className="text-[9px] bg-blue-100 text-blue-600 px-2 rounded-full font-bold">PROMPT ENGINEERING</span>
                                            </div>
                                            <textarea 
                                                className="w-full border-2 border-black dark:border-white rounded-xl p-3 font-bold text-xs h-40 resize-none dark:bg-zinc-700 dark:text-white leading-relaxed focus:ring-4 ring-yellow-200 focus:outline-none" 
                                                placeholder="Enter specific instructions for this agent..."
                                                value={selectedNode.data.instructions || ""}
                                                onChange={(e) => updateNodeData(selectedNode.id, { instructions: e.target.value })}
                                            />
                                            <p className="text-[9px] text-gray-400 mt-1">* This text is sent to the AI model as the system prompt for this step.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Current Output Display if available */}
                            {selectedNode.data.output && selectedNodeId !== 'start' && (
                                <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-5 rounded-2xl shadow-sm opacity-90">
                                     <h4 className="font-black uppercase text-xs mb-2 text-gray-500">Last Run Output</h4>
                                     <div className="bg-gray-100 dark:bg-zinc-900 p-3 rounded-xl max-h-40 overflow-y-auto text-xs font-mono text-gray-600 dark:text-gray-300">
                                         {cleanContent}
                                     </div>
                                </div>
                            )}

                            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 p-4 rounded-xl text-center">
                                <p className="text-xs font-bold text-blue-500">
                                    Current Status: <span className="uppercase">{selectedNode.data.status}</span>
                                </p>
                            </div>
                       </div>
                   )}
               </div>
               
               {/* Modal Footer */}
               <div className="bg-gray-50 dark:bg-zinc-900 border-t-4 border-black dark:border-white p-4 flex justify-end">
                   <button 
                        onClick={() => setSelectedNodeId(null)}
                        className="bg-yellow-400 border-2 border-black dark:border-white px-6 py-2 rounded-xl font-black text-xs uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:translate-y-px hover:shadow-none transition-all text-gray-900"
                   >
                       Save & Close
                   </button>
               </div>
           </div>
        </div>
      )}

      {/* ORCHESTRATOR SIDEBAR */}
      <div className="w-full md:w-80 flex flex-col gap-4">
        <div className="bg-white dark:bg-zinc-800 border-4 border-black dark:border-white p-5 rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] relative overflow-hidden">
             <div className="flex items-center gap-3 mb-4">
                 <div className="w-12 h-12 bg-purple-400 rounded-full border-2 border-black dark:border-white flex items-center justify-center text-2xl shadow-sm">
                    🎼
                 </div>
                 <div>
                     <h2 className="text-xl font-black italic text-gray-900 dark:text-white">Orchestrator</h2>
                     <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Master Controller</p>
                 </div>
             </div>
             
             {/* AI Input Area */}
             <div className="mb-4">
               <textarea 
                  value={userPrompt}
                  onChange={(e) => {
                      setUserPrompt(e.target.value);
                      updateNodeData('start', { output: e.target.value });
                  }}
                  placeholder="Describe your workflow... (e.g., 'Analyze crypto trends')"
                  className="w-full h-20 p-2 text-xs border-2 border-black dark:border-white rounded-xl bg-gray-50 dark:bg-zinc-700 focus:outline-none focus:ring-2 ring-purple-300 dark:text-white resize-none font-bold"
               />
               <button 
                  onClick={generateWorkflowStructure}
                  disabled={isGenerating || !userPrompt.trim()}
                  className="w-full mt-2 bg-purple-100 dark:bg-purple-900/40 border-2 border-black dark:border-white rounded-lg py-1 text-[10px] font-black uppercase hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors disabled:opacity-50 text-gray-900 dark:text-white"
               >
                  {isGenerating ? 'Generating...' : '✨ Create Workflow'}
               </button>
             </div>

             <button 
                 onClick={runWorkflow}
                 disabled={isRunning}
                 className={`w-full py-3 rounded-xl border-2 border-black dark:border-white font-black uppercase text-sm shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-y-0.5 active:shadow-none transition-all ${
                     isRunning ? 'bg-gray-300 dark:bg-zinc-600' : 'bg-green-400 text-white hover:bg-green-300'
                 }`}
             >
                 {isRunning ? 'Executing...' : 'Run Workflow ▶️'}
             </button>
        </div>

        <div className="bg-blue-100 dark:bg-zinc-900 border-4 border-black dark:border-white wobbly-border p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex-1 flex flex-col">
            <h3 className="text-sm font-black uppercase text-gray-900 dark:text-white mb-3 underline decoration-blue-400">Workflow Templates</h3>
            <div className="space-y-2 overflow-y-auto pr-2 pl-1 py-2 no-scrollbar">
                <button onClick={() => loadTemplate(4)} className="w-full text-left p-3 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white rounded-xl text-xs font-black shadow-sm hover:-translate-y-1 transition-transform text-gray-900 dark:text-white group relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    💎 Premium Blog Generator
                </button>
                <button onClick={() => loadTemplate(1)} className="w-full text-left p-3 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white rounded-xl text-xs font-black shadow-sm hover:-translate-y-1 transition-transform text-gray-900 dark:text-white">
                    📰 News Briefing
                </button>
                <button onClick={() => loadTemplate(2)} className="w-full text-left p-3 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white rounded-xl text-xs font-black shadow-sm hover:-translate-y-1 transition-transform text-gray-900 dark:text-white">
                    🏭 Code Factory
                </button>
                <button onClick={() => loadTemplate(3)} className="w-full text-left p-3 bg-white dark:bg-zinc-800 border-2 border-black dark:border-white rounded-xl text-xs font-black shadow-sm hover:-translate-y-1 transition-transform text-gray-900 dark:text-white">
                    🎨 Creative Suite
                </button>
            </div>
            
            <div className="mt-4 pt-4 border-t-2 border-dashed border-black dark:border-gray-600 flex-1">
                 <h3 className="text-[10px] font-black uppercase text-gray-500 mb-2">System Logs</h3>
                 <div className="h-full max-h-[150px] overflow-y-auto font-mono text-[10px] bg-black dark:bg-black/50 text-green-400 p-2 rounded-lg">
                     {consoleLog.map((log, i) => (
                         <div key={i} className="mb-1">{`> ${log}`}</div>
                     ))}
                     {isRunning && <div className="animate-pulse">_</div>}
                 </div>
            </div>
        </div>
      </div>

      {/* CANVAS AREA */}
      <div className="flex-1 bg-gray-50 dark:bg-zinc-900/50 border-4 border-black dark:border-white rounded-3xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] overflow-hidden h-[600px] md:h-auto relative">
         <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            className="bg-dots-pattern"
            onNodeClick={(e, node) => handleNodeConfig(node.id)}
         >
             <Background color="#ccc" gap={20} />
             <Controls />
         </ReactFlow>
         <div className="absolute top-4 left-4 bg-white/80 dark:bg-zinc-800/80 backdrop-blur border-2 border-black dark:border-white px-3 py-1 rounded-full text-[10px] font-black uppercase z-10">
             Canvas Active
         </div>
      </div>

    </div>
  );
};

export default OrchestratorView;
