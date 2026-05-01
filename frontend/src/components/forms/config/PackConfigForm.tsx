'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export interface PackConfigData {
  id?: string;
  packName: string;
  packNumber: string;
  yearStartDate: string; // ISO 8601 date
  yearEndDate: string;   // ISO 8601 date
  activeRanks: Array<'LION' | 'TIGER' | 'WOLF' | 'BEAR' | 'WEBELOS' | 'AOL'>;
}

interface PackConfigFormProps {
  initialData: PackConfigData;
  onSubmit: (data: Partial<PackConfigData>) => Promise<void>;
  onCancel?: () => void;
}

const AVAILABLE_RANKS: Array<{ value: string; label: string }> = [
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
];

export function PackConfigForm({ initialData, onSubmit, onCancel }: PackConfigFormProps) {
  const [formData, setFormData] = useState<PackConfigData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.packName || formData.packName.trim().length === 0) {
      newErrors.packName = 'Pack name is required';
    } else if (formData.packName.length > 100) {
      newErrors.packName = 'Pack name must be 100 characters or less';
    }

    if (!formData.packNumber || formData.packNumber.trim().length === 0) {
      newErrors.packNumber = 'Pack number is required';
    } else if (formData.packNumber.length > 20) {
      newErrors.packNumber = 'Pack number must be 20 characters or less';
    }

    if (!formData.yearStartDate) {
      newErrors.yearStartDate = 'Year start date is required';
    }

    if (!formData.yearEndDate) {
      newErrors.yearEndDate = 'Year end date is required';
    }

    // Validate yearStartDate < yearEndDate
    if (formData.yearStartDate && formData.yearEndDate) {
      const startDate = new Date(formData.yearStartDate);
      const endDate = new Date(formData.yearEndDate);
      if (startDate >= endDate) {
        newErrors.yearEndDate = 'Year end date must be after year start date';
      }
    }

    if (formData.activeRanks.length === 0) {
      newErrors.activeRanks = 'At least one rank must be selected';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Only send changed fields
      const changes: Partial<PackConfigData> = {};
      if (formData.packName !== initialData.packName) changes.packName = formData.packName;
      if (formData.packNumber !== initialData.packNumber) changes.packNumber = formData.packNumber;
      if (formData.yearStartDate !== initialData.yearStartDate) changes.yearStartDate = formData.yearStartDate;
      if (formData.yearEndDate !== initialData.yearEndDate) changes.yearEndDate = formData.yearEndDate;
      if (JSON.stringify(formData.activeRanks) !== JSON.stringify(initialData.activeRanks)) {
        changes.activeRanks = formData.activeRanks;
      }

      await onSubmit(changes);
    } catch (error: any) {
      if (error.response?.data?.details) {
        setErrors({ general: error.response.data.details.join(', ') });
      } else {
        setErrors({ general: error.response?.data?.error || 'Failed to save pack configuration' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof PackConfigData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const handleRankToggle = (rank: string) => {
    const currentRanks = formData.activeRanks;
    const newRanks = currentRanks.includes(rank as any)
      ? currentRanks.filter(r => r !== rank)
      : [...currentRanks, rank as any];
    handleChange('activeRanks', newRanks);
  };

  // Convert date from ISO string to input date format (YYYY-MM-DD)
  const formatDateForInput = (isoDate: string): string => {
    if (!isoDate) return '';
    return isoDate.split('T')[0];
  };

  // Convert input date format to ISO string
  const formatDateToISO = (dateString: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toISOString();
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        Pack Configuration
      </h2>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="packName" className="block text-sm font-medium mb-1">
            Pack Name *
          </label>
          <Input
            id="packName"
            type="text"
            value={formData.packName}
            onChange={e => handleChange('packName', e.target.value)}
            disabled={isLoading}
            className={errors.packName ? 'border-red-500' : ''}
            placeholder="e.g., Cub Scout Pack 123"
          />
          {errors.packName && (
            <p className="text-red-600 text-sm mt-1">{errors.packName}</p>
          )}
        </div>

        <div>
          <label htmlFor="packNumber" className="block text-sm font-medium mb-1">
            Pack Number *
          </label>
          <Input
            id="packNumber"
            type="text"
            value={formData.packNumber}
            onChange={e => handleChange('packNumber', e.target.value)}
            disabled={isLoading}
            className={errors.packNumber ? 'border-red-500' : ''}
            placeholder="e.g., 123"
          />
          {errors.packNumber && (
            <p className="text-red-600 text-sm mt-1">{errors.packNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="yearStartDate" className="block text-sm font-medium mb-1">
              Scouting Year Start Date *
            </label>
            <Input
              id="yearStartDate"
              type="date"
              value={formatDateForInput(formData.yearStartDate)}
              onChange={e => handleChange('yearStartDate', formatDateToISO(e.target.value))}
              disabled={isLoading}
              className={errors.yearStartDate ? 'border-red-500' : ''}
            />
            {errors.yearStartDate && (
              <p className="text-red-600 text-sm mt-1">{errors.yearStartDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="yearEndDate" className="block text-sm font-medium mb-1">
              Scouting Year End Date *
            </label>
            <Input
              id="yearEndDate"
              type="date"
              value={formatDateForInput(formData.yearEndDate)}
              onChange={e => handleChange('yearEndDate', formatDateToISO(e.target.value))}
              disabled={isLoading}
              className={errors.yearEndDate ? 'border-red-500' : ''}
            />
            {errors.yearEndDate && (
              <p className="text-red-600 text-sm mt-1">{errors.yearEndDate}</p>
            )}
            <p className="text-gray-600 text-xs mt-1">
              Changing this date will update all recurring events and tasks
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Active Ranks *
          </label>
          <div className="space-y-2">
            {AVAILABLE_RANKS.map(rank => (
              <div key={rank.value} className="flex items-center">
                <input
                  type="checkbox"
                  id={`rank-${rank.value}`}
                  checked={formData.activeRanks.includes(rank.value as any)}
                  onChange={() => handleRankToggle(rank.value)}
                  disabled={isLoading}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label
                  htmlFor={`rank-${rank.value}`}
                  className="ml-2 text-sm text-gray-700"
                >
                  {rank.label}
                </label>
              </div>
            ))}
          </div>
          {errors.activeRanks && (
            <p className="text-red-600 text-sm mt-1">{errors.activeRanks}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" variant="outline" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Configuration'}
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
