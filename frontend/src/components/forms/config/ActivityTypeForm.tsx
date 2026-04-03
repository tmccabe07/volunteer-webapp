'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export interface ActivityTypeData {
  id?: string;
  name: string;
  pointValue: number;
  category: 'LOW' | 'MEDIUM' | 'HIGH' | 'SPECIAL';
  description?: string;
}

interface ActivityTypeFormProps {
  initialData?: ActivityTypeData;
  onSubmit: (data: Omit<ActivityTypeData, 'id'>) => Promise<void>;
  onCancel?: () => void;
}

const CATEGORY_RANGES = {
  LOW: { min: 1, max: 5, label: 'Low (1-5 points)' },
  MEDIUM: { min: 6, max: 10, label: 'Medium (6-10 points)' },
  HIGH: { min: 11, max: 20, label: 'High (11-20 points)' },
  SPECIAL: { min: 1, max: 1000, label: 'Special (any positive)' }
};

export function ActivityTypeForm({ initialData, onSubmit, onCancel }: ActivityTypeFormProps) {
  const [formData, setFormData] = useState<Omit<ActivityTypeData, 'id'>>({
    name: initialData?.name || '',
    pointValue: initialData?.pointValue || 1,
    category: initialData?.category || 'LOW',
    description: initialData?.description || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Activity name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Activity name must be 100 characters or less';
    }

    if (formData.pointValue < 1) {
      newErrors.pointValue = 'Point value must be positive';
    }

    if (!Number.isInteger(formData.pointValue)) {
      newErrors.pointValue = 'Point value must be an integer';
    }

    // Validate point value matches category range
    const categoryRange = CATEGORY_RANGES[formData.category];
    if (formData.pointValue < categoryRange.min || formData.pointValue > categoryRange.max) {
      newErrors.pointValue = `Point value must match category range: ${categoryRange.label}`;
    }

    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await onSubmit(formData);
    } catch (error: any) {
      if (error.response?.data?.details) {
        setErrors({ general: error.response.data.details.join(', ') });
      } else {
        setErrors({ general: error.response?.data?.error || 'Failed to save activity type' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear field error
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        {initialData ? 'Edit Activity Type' : 'Create Activity Type'}
      </h2>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Activity Name *
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            disabled={isLoading}
            className={errors.name ? 'border-red-500' : ''}
            placeholder="e.g., Pack Meeting Helper"
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            Category *
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={e => handleChange('category', e.target.value as typeof formData.category)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(CATEGORY_RANGES).map(([key, value]) => (
              <option key={key} value={key}>
                {value.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="pointValue" className="block text-sm font-medium mb-1">
            Point Value *
          </label>
          <Input
            id="pointValue"
            type="number"
            min="1"
            value={formData.pointValue}
            onChange={e => handleChange('pointValue', parseInt(e.target.value, 10) || 0)}
            disabled={isLoading}
            className={errors.pointValue ? 'border-red-500' : ''}
          />
          {errors.pointValue && (
            <p className="text-red-600 text-sm mt-1">{errors.pointValue}</p>
          )}
          <p className="text-gray-600 text-xs mt-1">
            Must match category range: {CATEGORY_RANGES[formData.category].label}
          </p>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={e => handleChange('description', e.target.value)}
            disabled={isLoading}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.description ? 'border-red-500' : ''
            }`}
            rows={3}
            placeholder="Optional description of this activity type"
          />
          {errors.description && (
            <p className="text-red-600 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
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
