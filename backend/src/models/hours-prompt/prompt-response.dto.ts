import { PromptCategory, PromptStatus } from '@prisma/client';

export interface ScoutbookPromptResponseDto {
  id: string;
  childScoutId: string;
  category: PromptCategory;
  categoryData: Record<string, unknown>;
  status: PromptStatus;
}

export interface ListScoutbookPromptResponseDto {
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
