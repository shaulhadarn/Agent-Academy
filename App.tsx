
import React, { useState, useEffect, useRef } from 'react';
import { Agent, AgentTask, SystemUpgrade, AIConfig, WorkflowLog } from './types';
import Header from './components/Header';
import AgentSelector from './components/AgentSelector';
import Dashboard from './components/Dashboard';
import AddAgentModal from './components/AddAgentModal';
import TasksView from './components/TasksView';
import UpgradesView from './components/UpgradesView';
import SettingsView from './components/SettingsView';
import GlobalChat from './components/GlobalChat';
import OrchestratorView from './components/OrchestratorView';
import OnboardingModal from './components/OnboardingModal';

const INITIAL_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Sparky',
    type: 'coder',
    version: 'v2.4.0',
    specialty: 'Typescript Wizardry',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sparky',
    color: '#03A9F4',
    capabilities: ['Logic Juggling', 'Bug Squashing', 'Coffee Processing'],
    catchphrase: "I don't have bugs, I have unplanned features!",
    quickCommands: ["Build Landing Page 🚀", "Review this code 🐛", "Explain this concept 💡"]
  },
  {
    id: 'news-agent',
    name: 'Nova',
    type: 'news',
    version: 'v4.0.1',
    specialty: 'Real-time Intelligence',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Nova',
    color: '#4CAF50',
    capabilities: ['Web Scouring', 'Fact Checking', 'Trend Spotting'],
    catchphrase: "If it happened a microsecond ago, I already know!",
    quickCommands: ["Fetch latest AI news report 🗞️", "Summarize tech trends 📉", "Fact check this claim 🔍"]
  },
  {
    id: '2',
    name: 'Inkwell',
    type: 'writer',
    version: 'v1.0.2',
    specialty: 'Poetic Prose',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Inkwell',
    color: '#F06292',
    capabilities: ['Metaphor Mining', 'Rhyme Synthesis', 'Ink Recycling'],
    catchphrase: "Words are just code for the soul.",
    quickCommands: ["Write a Haiku 🌸", "Proofread this text ✏️", "Brainstorm blog titles 💭"]
  },
  {
    id: '3',
    name: 'Glitch',
    type: 'designer',
    version: 'v3.1.4',
    specialty: 'Pixel Perfection',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Glitch',
    color: '#FF9800',
    capabilities: ['Hex-code Dreaming', 'Vector Stretching', 'Aesthetic Tuning', 'Image Generation'],
    catchphrase: "Everything looks better with a drop shadow.",
    quickCommands: ["Generate a pixel art character 👾", "Suggest a color palette 🎨", "Critique this UI layout 📐"]
  },
  {
    id: '4',
    name: 'Zetta',
    type: 'researcher',
    version: 'v0.9.9',
    specialty: 'Quantum Analysis',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zetta',
    color: '#9C27B0',
    capabilities: ['Data Snacking', 'Heuristic Hopping', 'Fact Polishing'],
    catchphrase: "I've analyzed the probabilities: we need more snacks.",
    quickCommands: ["Summarize this topic 📚", "Find academic sources 🎓", "Explain like I'm 5 👶"]
  }
];

const INITIAL_TASKS: AgentTask[] = [
  { id: 't1', agentId: '1', title: 'Refactor Blobs', type: 'debugging', priority: 'high', completed: true },
  { id: 't2', agentId: '1', title: 'Unit Test Sprinkles', type: 'processing', priority: 'medium', completed: false },
  { id: 't3', agentId: '2', title: 'Drafting Stardust', type: 'learning', priority: 'low', completed: false },
  { id: 't4', agentId: '3', title: 'Gradient Tuning', type: 'processing', priority: 'high', completed: false },
  { id: 't5', agentId: '3', title: 'Icon Polishing', type: 'deploying', priority: 'medium', completed: true },
  { id: 't6', agentId: '4', title: 'Data Scraping', type: 'learning', priority: 'high', completed: false },
  { id: 't7', agentId: '4', title: 'Heuristic Review', type: 'processing', priority: 'low', completed: true },
];

const INITIAL_WORKFLOWS: WorkflowLog[] = [
  {
    id: 'w1',
    title: 'Morning News Briefing',
    timestamp: 'Today, 8:00 AM',
    status: 'success',
    steps: [
      { agentName: 'Nova', role: 'NEWS', status: 'Found 10 articles' },
      { agentName: 'Inkwell', role: 'WRITER', status: 'Summarized content' }
    ],
    output: {
      type: 'html',
      title: 'Daily Digest',
      content: '<h3>Good Morning!</h3><p>Here is your daily dose of sunshine and tech news...</p>'
    }
  },
  {
    id: 'w2',
    title: 'Crypto Market Analysis',
    timestamp: 'Yesterday, 4:30 PM',
    status: 'success',
    steps: [
      { agentName: 'Zetta', role: 'RESEARCHER', status: 'Analyzed trends' },
      { agentName: 'Sparky', role: 'CODER', status: 'Generated chart data' }
    ],
    output: {
      type: 'text',
      title: 'Market Report',
      content: 'Market is volatile. Suggest HODLing onto your digital hats.'
    }
  }
];

const INITIAL_UPGRADES: SystemUpgrade[] = [
  { id: 'u1', agentId: '1', title: 'Kernel Patch', date: 'Oct 31, 2025', component: 'Logic Engine' },
  { id: 'u2', agentId: '3', title: 'GPU Booster', date: 'Nov 05, 2025', component: 'Visual Processor' },
  { id: 'u3', agentId: '4', title: 'Neural Link v2', date: 'Dec 12, 2025', component: 'Memory Bank' },
];

type ViewState = 'home' | 'tasks' | 'upgrades' | 'settings' | 'chat' | 'orchestrator';

const AI_CONFIG_KEY = 'agent_academy_config_v1';
const THEME_KEY = 'agent_academy_theme_v1';
const WORKFLOW_LOGS_KEY = 'agent_academy_workflows_v1';
const ONBOARDING_KEY = 'agent_academy_has_seen_onboarding';

const App: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(INITIAL_AGENTS[0].id);
  const [tasks, setTasks] = useState<AgentTask[]>(INITIAL_TASKS);
  const [workflowLogs, setWorkflowLogs] = useState<WorkflowLog[]>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(WORKFLOW_LOGS_KEY);
        if (saved) {
            try { return JSON.parse(saved); } catch (e) {}
        }
    }
    return INITIAL_WORKFLOWS;
  });

  const [upgrades, setUpgrades] = useState<SystemUpgrade[]>(INITIAL_UPGRADES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Onboarding State
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<ViewState>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [orchestratorPrompt, setOrchestratorPrompt] = useState("");
  
  const mainContentRef = useRef<HTMLElement>(null);

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(THEME_KEY);
        return (saved === 'dark' || saved === 'light') ? saved : 'light';
    }
    return 'light';
  });

  // AI Config State with LocalStorage Persistence
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(AI_CONFIG_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error("Failed to parse saved AI config", e);
      }
    }
    return {
      provider: 'gemini',
      apiKey: '', // Defaults to using process.env for Gemini if empty
      model: 'gemini-3-flash-preview'
    };
  });

  // Check for onboarding on first load
  useEffect(() => {
    const hasSeen = localStorage.getItem(ONBOARDING_KEY);
    if (!hasSeen) {
        setIsOnboardingOpen(true);
    }
  }, []);

  const handleCloseOnboarding = () => {
      setIsOnboardingOpen(false);
      localStorage.setItem(ONBOARDING_KEY, 'true');
  };

  const handleStartOnboarding = () => {
      setIsOnboardingOpen(true);
  };

  // Scroll to top on tab change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
    window.scrollTo(0, 0);
  }, [activeTab]);

  // Save AI Config to LocalStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(aiConfig));
  }, [aiConfig]);

  // Save Theme to LocalStorage
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Save Workflow Logs
  useEffect(() => {
    localStorage.setItem(WORKFLOW_LOGS_KEY, JSON.stringify(workflowLogs));
  }, [workflowLogs]);

  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  const handleAddAgent = (newAgent: Agent) => {
    setAgents([...agents, newAgent]);
    setSelectedAgentId(newAgent.id);
    setIsModalOpen(false);
  };

  const handleUpdateAgent = (updatedAgent: Agent) => {
    setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
  };

  const handleWorkflowComplete = (log: WorkflowLog) => {
      setWorkflowLogs(prev => [log, ...prev]);
  };

  // --- WORKFLOW LOG HANDLERS ---
  const handleClearLogs = () => {
    if (window.confirm("Are you sure you want to delete all mission history?")) {
      setWorkflowLogs([]);
    }
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm("Delete this mission record?")) {
      setWorkflowLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const handleRerunLog = (log: WorkflowLog) => {
      // Try to extract the prompt from the title "Workflow: [Prompt]"
      const prompt = log.title.startsWith('Workflow: ') 
        ? log.title.replace('Workflow: ', '') 
        : log.title;
      
      setOrchestratorPrompt(prompt);
      setActiveTab('orchestrator');
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Dashboard 
            agent={activeAgent} 
            tasks={tasks.filter(t => t.agentId === selectedAgentId)} 
            upgrades={upgrades.filter(u => u.agentId === selectedAgentId)}
            onToggleTask={handleToggleTask}
            onUpdateAgent={handleUpdateAgent}
            aiConfig={aiConfig}
          />
        );
      case 'tasks':
        return (
          <TasksView 
            workflowLogs={workflowLogs}
            onClearLogs={handleClearLogs}
            onDeleteLog={handleDeleteLog}
            onRerunLog={handleRerunLog}
          />
        );
      case 'upgrades':
        return (
          <UpgradesView 
            upgrades={upgrades.filter(u => u.agentId === selectedAgentId)} 
          />
        );
      case 'settings':
        return (
          <SettingsView 
            agent={activeAgent} 
            aiConfig={aiConfig}
            onUpdateAiConfig={setAiConfig}
            theme={theme}
            setTheme={setTheme}
            onStartOnboarding={handleStartOnboarding}
          />
        );
      case 'chat':
        return (
          <GlobalChat 
            agents={agents} 
            aiConfig={aiConfig}
          />
        );
      case 'orchestrator':
        return (
          <OrchestratorView 
            agents={agents} 
            aiConfig={aiConfig}
            onWorkflowComplete={handleWorkflowComplete}
            initialPrompt={orchestratorPrompt}
            onPromptHandled={() => setOrchestratorPrompt("")}
          />
        );
      default:
        return null;
    }
  };

  const NavButton = ({ tab, icon, label }: { tab: ViewState, icon: string, label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`
        relative group flex items-center justify-center md:justify-start md:px-4 md:w-full md:h-14 transition-all duration-200 
        ${activeTab === tab ? 'md:bg-yellow-200 md:translate-x-2 dark:md:bg-yellow-500' : 'hover:md:bg-white/50 dark:hover:md:bg-white/10 hover:md:translate-x-1'}
        ${activeTab === tab ? 'scale-125 translate-y-[-4px] md:scale-100 md:translate-y-0 drop-shadow-lg md:shadow-none' : 'opacity-40 grayscale md:opacity-100 md:grayscale-0 md:text-gray-500 dark:md:text-gray-400'}
      `}
    >
      <span className="text-2xl">{icon}</span>
      <span className={`hidden md:block ml-3 font-black text-sm uppercase tracking-wide ${activeTab === tab ? 'text-black dark:text-gray-900' : 'dark:text-gray-300'}`}>{label}</span>
      
      {/* Active Indicator Desktop */}
      {activeTab === tab && (
        <div className="hidden md:block absolute left-0 w-1 h-8 bg-black dark:bg-white rounded-r-full"></div>
      )}
    </button>
  );

  return (
    <div className={`${theme}`}>
      <div className="min-h-screen bg-[#FFFDE7] dark:bg-zinc-950 text-gray-900 dark:text-white font-sans relative overflow-x-hidden transition-colors duration-300">
        {/* Fixed Background Elements */}
        <div className="fixed top-[-50px] right-[-50px] w-48 h-48 md:w-96 md:h-96 bg-[#03A9F4] dark:bg-blue-600 opacity-10 blob-1 animate-bounce-slow pointer-events-none z-0"></div>
        <div className="fixed bottom-[100px] left-[-40px] w-40 h-40 md:w-80 md:h-80 bg-[#F06292] dark:bg-pink-600 opacity-10 blob-2 animate-pulse pointer-events-none z-0"></div>
        <div className="fixed top-[40%] left-[50%] w-64 h-64 bg-yellow-300 dark:bg-yellow-600 opacity-5 rounded-full blur-3xl pointer-events-none z-0"></div>

        <div className="relative z-10 flex flex-col md:flex-row min-h-screen">
          
          {/* Desktop Sidebar */}
          <nav className={`hidden md:flex flex-col bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm h-screen sticky top-0 z-50 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 border-r-4 border-black dark:border-white opacity-100' : 'w-0 border-r-0 opacity-0 overflow-hidden'}`}>
             <div className="p-6 relative">
               {/* Collapse Button */}
               <button 
                 onClick={() => setIsSidebarOpen(false)}
                 className="absolute top-2 right-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                 title="Collapse Menu"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
                 </svg>
               </button>

               <div className="flex items-center gap-2 mb-8 mt-2">
                  <div className="w-10 h-10 flex-shrink-0 bg-yellow-400 border-2 border-black dark:border-white rounded-full flex items-center justify-center text-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] animate-bounce-slow">
                    🤖
                  </div>
                  <h1 className="text-xl font-black italic leading-none dark:text-white whitespace-nowrap">Agent<br/>Academy</h1>
               </div>
               
               <div className="space-y-2">
                  <NavButton tab="home" icon="🤖" label="Dashboard" />
                  <NavButton tab="tasks" icon="📜" label="Logs" />
                  <NavButton tab="chat" icon="💬" label="Council" />
                  <NavButton tab="orchestrator" icon="🎼" label="Orchestrator" />
                  <NavButton tab="upgrades" icon="🛰️" label="Upgrades" />
                  <NavButton tab="settings" icon="⚙️" label="Config" />
               </div>
             </div>

             <div className="mt-auto p-6 border-t-2 border-dashed border-gray-300 dark:border-zinc-700 whitespace-nowrap">
               <div className="bg-pink-100 dark:bg-zinc-800 border-2 border-black dark:border-white p-3 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                  <p className="text-[10px] font-black uppercase text-pink-500 dark:text-pink-400">System Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${aiConfig.provider === 'openai' ? 'bg-green-600' : 'bg-blue-600'}`}></span>
                    <span className="text-xs font-bold dark:text-gray-200">{aiConfig.provider === 'openai' ? 'OpenAI Online' : 'Gemini Online'}</span>
                  </div>
               </div>
             </div>
          </nav>

          {/* Main Content Area */}
          <main ref={mainContentRef} className="flex-1 flex flex-col h-full max-h-screen overflow-y-auto relative">
            
            {/* Desktop Expand Button (Visible only when sidebar is closed) */}
            {!isSidebarOpen && (
               <div className="hidden md:block fixed top-6 left-6 z-50 animate-in fade-in slide-in-from-left-2 duration-300">
                  <button 
                    onClick={() => setIsSidebarOpen(true)} 
                    className="bg-yellow-400 border-2 border-black dark:border-white rounded-full px-4 py-2 font-black text-xs shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:scale-105 active:scale-95 transition-all text-gray-900 flex items-center gap-2"
                  >
                    <span>MENU</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
               </div>
            )}

            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full pb-28 md:pb-8 transition-all duration-300">
              <div className="md:hidden">
                <Header />
              </div>

              {/* Desktop Header for context */}
              <div className="hidden md:flex justify-between items-center mb-6">
                 <div className={`${!isSidebarOpen ? 'ml-12' : ''} transition-all duration-300`}>
                    <h2 className="text-3xl font-black italic underline decoration-yellow-400 dark:decoration-yellow-500 dark:text-white">
                      {activeTab === 'home' && 'Command Center'}
                      {activeTab === 'tasks' && 'Workflow Logs'}
                      {activeTab === 'chat' && 'The Council'}
                      {activeTab === 'orchestrator' && 'Flow Studio'}
                      {activeTab === 'upgrades' && 'System Patch'}
                      {activeTab === 'settings' && 'Core Bios'}
                    </h2>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Welcome back, Human!</p>
                 </div>
              </div>
              
              {activeTab !== 'chat' && activeTab !== 'orchestrator' && (
                <AgentSelector 
                  agents={agents} 
                  selectedId={selectedAgentId} 
                  onSelect={setSelectedAgentId} 
                  onAddClick={() => setIsModalOpen(true)}
                />
              )}

              <div className="mt-6 transition-all duration-300 h-full">
                {renderActiveView()}
              </div>
            </div>
          </main>
        </div>

        {isModalOpen && (
          <AddAgentModal 
            onClose={() => setIsModalOpen(false)} 
            onAdd={handleAddAgent} 
          />
        )}
        
        {isOnboardingOpen && (
            <OnboardingModal onClose={handleCloseOnboarding} />
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-sm h-16 bg-white dark:bg-zinc-900 border-4 border-black dark:border-white wobbly-border flex items-center justify-around z-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
          <NavButton tab="home" icon="🤖" label="Home" />
          <NavButton tab="tasks" icon="📜" label="Logs" />
          <NavButton tab="chat" icon="💬" label="Chat" />
          <NavButton tab="orchestrator" icon="🎼" label="Flow" />
          <NavButton tab="settings" icon="⚙️" label="Set" />
        </nav>
      </div>
    </div>
  );
};

export default App;
