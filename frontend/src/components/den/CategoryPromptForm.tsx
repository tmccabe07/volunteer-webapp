'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PromptCategory } from '@/services/hoursPromptService';

export interface CategoryPromptDraft {
  enabled: boolean;
  childScoutIds: string[];
  categoryData: {
    nights?: number;
    location?: string;
    miles?: number;
    trailName?: string;
    hours?: number;
    projectName?: string;
  };
}

interface ChildOption {
  id: string;
  name: string;
}

interface CategoryPromptFormProps {
  category: PromptCategory;
  label: string;
  draft: CategoryPromptDraft;
  childrenOptions: ChildOption[];
  onChange: (next: CategoryPromptDraft) => void;
}

export default function CategoryPromptForm({
  category,
  label,
  draft,
  childrenOptions,
  onChange,
}: CategoryPromptFormProps) {
  const updateData = (key: string, value: string | number) => {
    onChange({
      ...draft,
      categoryData: {
        ...draft.categoryData,
        [key]: value,
      },
    });
  };

  const toggleChild = (childId: string) => {
    const nextIds = draft.childScoutIds.includes(childId)
      ? draft.childScoutIds.filter((id) => id !== childId)
      : [...draft.childScoutIds, childId];

    onChange({
      ...draft,
      childScoutIds: nextIds,
    });
  };

  return (
    <div className="border rounded-md p-4 space-y-3">
      <label className="flex items-center gap-2">
        <Checkbox
          checked={draft.enabled}
          onCheckedChange={(checked) => onChange({ ...draft, enabled: Boolean(checked) })}
        />
        <span className="font-medium">Enable {label} Prompt</span>
      </label>

      {draft.enabled && (
        <>
          <div className="space-y-2">
            <Label>Suggested Values</Label>
            {category === 'CAMPING' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={draft.categoryData.nights ?? 1}
                  onChange={(e) => updateData('nights', Number(e.target.value))}
                  aria-label="Camping nights"
                />
                <Input
                  value={draft.categoryData.location ?? ''}
                  onChange={(e) => updateData('location', e.target.value)}
                  placeholder="Location"
                  aria-label="Camping location"
                />
              </div>
            )}

            {category === 'HIKING' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  value={draft.categoryData.miles ?? 1}
                  onChange={(e) => updateData('miles', Number(e.target.value))}
                  aria-label="Hiking miles"
                />
                <Input
                  value={draft.categoryData.trailName ?? ''}
                  onChange={(e) => updateData('trailName', e.target.value)}
                  placeholder="Trail name"
                  aria-label="Trail name"
                />
              </div>
            )}

            {category === 'SERVICE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={0}
                  step="0.25"
                  value={draft.categoryData.hours ?? 1}
                  onChange={(e) => updateData('hours', Number(e.target.value))}
                  aria-label="Service hours"
                />
                <Input
                  value={draft.categoryData.projectName ?? ''}
                  onChange={(e) => updateData('projectName', e.target.value)}
                  placeholder="Project name"
                  aria-label="Project name"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Children to Prompt</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {childrenOptions.map((child) => (
                <label key={child.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.childScoutIds.includes(child.id)}
                    onCheckedChange={() => toggleChild(child.id)}
                  />
                  <span>{child.name}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
