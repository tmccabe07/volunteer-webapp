'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { ActivitySlotStep } from '@/services/events.service';

interface StepManagerProps {
  steps: ActivitySlotStep[];
  onChange: (steps: ActivitySlotStep[]) => void;
}

const MAX_STEPS = 20;
const MAX_STEP_LENGTH = 200;

export default function StepManager({ steps, onChange }: StepManagerProps) {
  const [localSteps, setLocalSteps] = useState<ActivitySlotStep[]>(steps || []);

  const handleAddStep = () => {
    if (localSteps.length >= MAX_STEPS) return;
    
    const newStep: ActivitySlotStep = {
      orderIndex: localSteps.length,
      stepText: '',
    };
    
    const updated = [...localSteps, newStep];
    setLocalSteps(updated);
    onChange(updated);
  };

  const handleRemoveStep = (index: number) => {
    const updated = localSteps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, orderIndex: i })); // Renumber
    
    setLocalSteps(updated);
    onChange(updated);
  };

  const handleStepTextChange = (index: number, text: string) => {
    if (text.length > MAX_STEP_LENGTH) return;
    
    const updated = localSteps.map((step, i) =>
      i === index ? { ...step, stepText: text } : step
    );
    
    setLocalSteps(updated);
    onChange(updated);
  };

  if (localSteps.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Activity Steps (optional)</Label>
        <div className="p-4 border rounded-lg border-dashed bg-gray-50 text-center">
          <p className="text-sm text-gray-600 mb-3">
            No steps added. Click &quot;Add Step&quot; to create a numbered list of instructions.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddStep}
            disabled={localSteps.length >= MAX_STEPS}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Step
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Activity Steps ({localSteps.length}/{MAX_STEPS})</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddStep}
          disabled={localSteps.length >= MAX_STEPS}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Step
        </Button>
      </div>

      <div className="space-y-2">
        {localSteps.map((step, index) => (
          <div key={index} className="flex gap-2 items-start">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 font-semibold rounded-full text-sm shrink-0 mt-1">
              {index + 1}
            </div>
            <div className="flex-1 space-y-1">
              <Input
                value={step.stepText}
                onChange={(e) => handleStepTextChange(index, e.target.value)}
                placeholder={`Step ${index + 1} instructions`}
                maxLength={MAX_STEP_LENGTH}
              />
              <p className="text-xs text-gray-500">
                {step.stepText.length} / {MAX_STEP_LENGTH} characters
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveStep(index)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 mt-1"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {localSteps.length >= MAX_STEPS && (
        <p className="text-xs text-orange-600">
          Maximum of {MAX_STEPS} steps reached
        </p>
      )}
    </div>
  );
}
