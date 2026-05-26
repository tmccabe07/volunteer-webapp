import axios from '@/lib/axios';

export type PromptCategory = 'CAMPING' | 'HIKING' | 'SERVICE' | 'REQUIREMENT';
export type PromptStatus = 'PENDING' | 'SENT' | 'ACKNOWLEDGED' | 'DISMISSED';

export interface CategoryPromptInput {
  category: PromptCategory;
  categoryData?: Record<string, unknown>;
  childScoutIds: string[];
}

export interface GeneratePromptsInput {
  categoryPrompts: CategoryPromptInput[];
}

export interface GeneratedPrompt {
  id: string;
  childScoutId: string;
  category: PromptCategory;
  categoryData: Record<string, unknown>;
  status: PromptStatus;
}

export interface GeneratePromptsResponse {
  eventId: string;
  promptsGenerated: number;
  prompts: GeneratedPrompt[];
}

export interface ParentPromptItem {
  id: string;
  childScout: {
    id: string;
    name: string;
  };
  event: {
    id: string;
    title: string;
    eventDate: string;
  };
  category: PromptCategory;
  categoryData: Record<string, unknown>;
  message: string;
  status: PromptStatus;
  generatedAt: string;
  sentAt?: string;
}

class HoursPromptService {
  async generatePrompts(eventId: string, data: GeneratePromptsInput): Promise<GeneratePromptsResponse> {
    const response = await axios.post<GeneratePromptsResponse>(`/events/${eventId}/generate-prompts`, data);
    return response.data;
  }

  async getPrompts(params?: {
    childScoutId?: string;
    status?: PromptStatus;
    category?: PromptCategory;
  }): Promise<{ data: ParentPromptItem[] }> {
    const response = await axios.get<{ data: ParentPromptItem[] }>('/scoutbook-prompts', {
      params,
    });
    return response.data;
  }

  async acknowledgePrompt(promptId: string, notes?: string): Promise<{
    id: string;
    status: PromptStatus;
    acknowledgedAt?: string;
  }> {
    const response = await axios.patch(`/scoutbook-prompts/${promptId}/acknowledge`, {
      ...(notes ? { notes } : {}),
    });
    return response.data;
  }

  async dismissPrompt(promptId: string, notes?: string): Promise<{
    id: string;
    status: PromptStatus;
    dismissedAt?: string;
  }> {
    const response = await axios.patch(`/scoutbook-prompts/${promptId}/dismiss`, {
      ...(notes ? { notes } : {}),
    });
    return response.data;
  }
}

export const hoursPromptService = new HoursPromptService();
