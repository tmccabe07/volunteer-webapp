'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { hoursPromptService, type ParentPromptItem } from '@/services/hoursPromptService';
import PromptDetailCard from './PromptDetailCard';
import AcknowledgePromptDialog from './AcknowledgePromptDialog';

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) {
      return response.data.error;
    }
  }

  return fallback;
}

interface ParentPromptsListProps {
  childScoutId?: string;
}

export default function ParentPromptsList({ childScoutId }: ParentPromptsListProps) {
  const [prompts, setPrompts] = useState<ParentPromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<ParentPromptItem | null>(null);
  const [dialogMode, setDialogMode] = useState<'acknowledge' | 'dismiss'>('acknowledge');
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadPrompts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await hoursPromptService.getPrompts({
        status: 'PENDING',
        ...(childScoutId ? { childScoutId } : {}),
      });
      setPrompts(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load Scoutbook prompts'));
    } finally {
      setIsLoading(false);
    }
  }, [childScoutId]);

  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  const openDialog = (prompt: ParentPromptItem, mode: 'acknowledge' | 'dismiss') => {
    setSelectedPrompt(prompt);
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const handleConfirm = async (promptId: string, notes?: string) => {
    if (dialogMode === 'acknowledge') {
      await hoursPromptService.acknowledgePrompt(promptId, notes);
    } else {
      await hoursPromptService.dismissPrompt(promptId, notes);
    }

    await loadPrompts();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          Scoutbook Prompt Queue
          {childScoutId ? ' (Filtered by Cub Scout)' : ''}
        </h2>
        <Button variant="outline" size="sm" onClick={loadPrompts}>Refresh</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-600">Loading prompts...</p>
      ) : error ? (
        <div className="p-3 rounded border border-red-200 bg-red-50 text-sm text-red-800">{error}</div>
      ) : prompts.length === 0 ? (
        <p className="text-sm text-gray-600">No pending prompts.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {prompts.map((prompt) => (
            <PromptDetailCard
              key={prompt.id}
              prompt={prompt}
              onAcknowledge={(item) => openDialog(item, 'acknowledge')}
              onDismiss={(item) => openDialog(item, 'dismiss')}
            />
          ))}
        </div>
      )}

      <AcknowledgePromptDialog
        open={dialogOpen}
        prompt={selectedPrompt}
        mode={dialogMode}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
