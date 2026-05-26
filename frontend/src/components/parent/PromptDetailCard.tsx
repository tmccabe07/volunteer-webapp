'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ParentPromptItem } from '@/services/hoursPromptService';

interface PromptDetailCardProps {
  prompt: ParentPromptItem;
  onAcknowledge: (prompt: ParentPromptItem) => void;
  onDismiss: (prompt: ParentPromptItem) => void;
}

export default function PromptDetailCard({
  prompt,
  onAcknowledge,
  onDismiss,
}: PromptDetailCardProps) {
  const renderSuggestedData = () => {
    if (prompt.category === 'REQUIREMENT') {
      const adventureName = String(prompt.categoryData.adventureName || 'Adventure');
      const requirementText = String(prompt.categoryData.requirementText || 'Requirement update');
      return `${adventureName}: ${requirementText}`;
    }

    return JSON.stringify(prompt.categoryData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span>{prompt.childScout.name} • {prompt.category}</span>
          <Badge variant="outline">{prompt.status}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-gray-700">{prompt.message}</p>
        <p className="text-xs text-gray-600">
          Event: {prompt.event.title} on {new Date(prompt.event.eventDate).toLocaleDateString()}
        </p>

        <div className="text-xs text-gray-700 bg-gray-50 border rounded p-2">
          Suggested data: {renderSuggestedData()}
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            onClick={() => onAcknowledge(prompt)}
            disabled={prompt.status === 'ACKNOWLEDGED'}
          >
            Mark Entered in Scoutbook
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDismiss(prompt)}
            disabled={prompt.status === 'DISMISSED'}
          >
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
