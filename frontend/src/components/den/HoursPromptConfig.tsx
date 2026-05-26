'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { ChildAttendanceDetail } from '@/services/attendance.service';
import { hoursPromptService } from '@/services/hoursPromptService';
import CategoryPromptForm, { type CategoryPromptDraft } from './CategoryPromptForm';

interface HoursPromptConfigProps {
  eventId: string;
  attendanceRecords: ChildAttendanceDetail[];
  onGenerated?: (count: number) => void;
}

const defaultDraft: CategoryPromptDraft = {
  enabled: false,
  childScoutIds: [],
  categoryData: {},
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (response?.data?.error) {
      return response.data.error;
    }
  }

  return fallback;
}

export default function HoursPromptConfig({
  eventId,
  attendanceRecords,
  onGenerated,
}: HoursPromptConfigProps) {
  const presentChildren = useMemo(
    () =>
      attendanceRecords
        .filter((record) => record.attendanceStatus === 'PRESENT')
        .map((record) => ({
          id: record.child.id,
          name: `${record.child.firstName} ${record.child.lastName}`,
        })),
    [attendanceRecords],
  );

  const [camping, setCamping] = useState<CategoryPromptDraft>(defaultDraft);
  const [hiking, setHiking] = useState<CategoryPromptDraft>(defaultDraft);
  const [service, setService] = useState<CategoryPromptDraft>(defaultDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildPayload = () => {
    const categoryPrompts: Array<{
      category: 'CAMPING' | 'HIKING' | 'SERVICE';
      categoryData: Record<string, unknown>;
      childScoutIds: string[];
    }> = [];

    if (camping.enabled && camping.childScoutIds.length > 0) {
      categoryPrompts.push({
        category: 'CAMPING',
        categoryData: camping.categoryData,
        childScoutIds: camping.childScoutIds,
      });
    }

    if (hiking.enabled && hiking.childScoutIds.length > 0) {
      categoryPrompts.push({
        category: 'HIKING',
        categoryData: hiking.categoryData,
        childScoutIds: hiking.childScoutIds,
      });
    }

    if (service.enabled && service.childScoutIds.length > 0) {
      categoryPrompts.push({
        category: 'SERVICE',
        categoryData: service.categoryData,
        childScoutIds: service.childScoutIds,
      });
    }

    return { categoryPrompts };
  };

  const handleGenerate = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      setMessage(null);

      const payload = buildPayload();
      if (payload.categoryPrompts.length === 0) {
        setError('Select at least one prompt category and child before generating.');
        return;
      }

      const result = await hoursPromptService.generatePrompts(eventId, payload);
      setMessage(`Generated ${result.promptsGenerated} Scoutbook prompt(s).`);
      if (onGenerated) {
        onGenerated(result.promptsGenerated);
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to generate Scoutbook prompts'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scoutbook Hours Prompt Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {presentChildren.length === 0 ? (
          <p className="text-sm text-gray-600">
            Record PRESENT attendance before generating Scoutbook hour prompts.
          </p>
        ) : (
          <>
            <CategoryPromptForm
              category="CAMPING"
              label="Camping"
              draft={camping}
              childrenOptions={presentChildren}
              onChange={setCamping}
            />
            <CategoryPromptForm
              category="HIKING"
              label="Hiking"
              draft={hiking}
              childrenOptions={presentChildren}
              onChange={setHiking}
            />
            <CategoryPromptForm
              category="SERVICE"
              label="Service"
              draft={service}
              childrenOptions={presentChildren}
              onChange={setService}
            />

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                Prompts suggest values for parent Scoutbook entry and do not create in-app hour totals.
              </p>
              <Button onClick={handleGenerate} disabled={isSubmitting}>
                {isSubmitting ? 'Generating...' : 'Generate Prompts'}
              </Button>
            </div>
          </>
        )}

        {message && (
          <div className="p-3 text-sm rounded border border-green-200 bg-green-50 text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="p-3 text-sm rounded border border-red-200 bg-red-50 text-red-800">{error}</div>
        )}
      </CardContent>
    </Card>
  );
}
