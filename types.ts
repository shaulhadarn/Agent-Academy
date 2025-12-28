
export type AgentType = 'researcher' | 'coder' | 'writer' | 'assistant' | 'designer' | 'news';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  version: string;
  specialty: string;
  avatarUrl: string;
  color: string;
  capabilities: string[];
  catchphrase: string;
  quickCommands: string[];
  detailedPersona?: string; // New field for deep expert context
}

export interface AgentTask {
  id: string;
  agentId: string;
  title: string;
  type: 'processing' | 'learning' | 'debugging' | 'deploying';
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
}

export interface WorkflowLog {
  id: string;
  title: string;
  timestamp: string;
  status: 'success' | 'failed' | 'partial';
  steps: {
    agentName: string;
    role: string;
    status: string;
  }[];
  output?: {
    type: 'html' | 'text' | 'json';
    content: string;
    title?: string;
  };
}

export interface SystemUpgrade {
  id: string;
  agentId: string;
  title: string;
  date: string;
  component: string;
}

// Fixed: Re-added legacy pet types to resolve build errors in existing components
export type PetType = 'dog' | 'cat' | 'rabbit' | 'bird' | 'hamster';

export interface Pet {
  id: string;
  name: string;
  type: PetType;
  age: string;
  breed: string;
  avatarUrl: string;
  color: string;
}

export interface Appointment {
  id: string;
  title: string;
  date: string;
  location: string;
}

// Mission log interface for agent activity tracking
export interface Mission {
  id: string;
  agentId: string;
  timestamp: string;
  log: string;
  success: boolean;
}

export interface AIConfig {
  provider: 'gemini' | 'openai';
  apiKey: string;
  model: string;
  serperApiKey?: string;
}
