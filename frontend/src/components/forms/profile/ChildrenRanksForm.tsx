'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const RANK_OPTIONS = [
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
];

interface ChildrenRanksFormProps {
  initialRanks: string[];
  onSubmit: (ranks: string[]) => Promise<void>;
  onCancel?: () => void;
}

export function ChildrenRanksForm({ initialRanks, onSubmit, onCancel }: ChildrenRanksFormProps) {
  const [selectedRanks, setSelectedRanks] = useState<string[]>(initialRanks);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setErrors({});

    try {
      await onSubmit(selectedRanks);
    } catch (error: any) {
      if (error.response?.data?.details) {
        setErrors({ general: error.response.data.details.join(', ') });
      } else {
        setErrors({ general: error.response?.data?.error || 'Failed to update children ranks' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRank = (rank: string) => {
    if (selectedRanks.includes(rank)) {
      setSelectedRanks(prev => prev.filter(r => r !== rank));
    } else {
      setSelectedRanks(prev => [...prev, rank]);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Children&apos;s Ranks</h2>
      <p className="text-sm text-gray-600 mb-6">
        Select the ranks of your children in the pack. This helps us tailor event recommendations.
      </p>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          {RANK_OPTIONS.map(option => (
            <div key={option.value} className="flex items-center">
              <input
                id={`rank-${option.value}`}
                type="checkbox"
                checked={selectedRanks.includes(option.value)}
                onChange={() => toggleRank(option.value)}
                disabled={isLoading}
                className="mr-2"
              />
              <label htmlFor={`rank-${option.value}`} className="text-sm">
                {option.label}
              </label>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Ranks'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
