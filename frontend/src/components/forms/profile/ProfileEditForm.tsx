'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export interface ProfileData {
  name: string;
  phone: string;
  leaderboardOptIn: boolean;
}

interface ProfileEditFormProps {
  initialData: ProfileData;
  onSubmit: (data: ProfileData) => Promise<void>;
  onCancel?: () => void;
}

export function ProfileEditForm({ initialData, onSubmit, onCancel }: ProfileEditFormProps) {
  const [formData, setFormData] = useState<ProfileData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Name must be 100 characters or less';
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
        setErrors({ general: error.response?.data?.error || 'Failed to update profile' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof ProfileData, value: string | boolean) => {
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
      <h2 className="text-2xl font-bold mb-6">Edit Profile</h2>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name *
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            disabled={isLoading}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Phone
          </label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={e => handleChange('phone', e.target.value)}
            disabled={isLoading}
            placeholder="(555) 555-5555"
          />
        </div>

        {/* Leaderboard Opt-In Toggle with Visual Indicator */}
        <div className="pt-2">
          <label className="block text-sm font-medium mb-2">
            Leaderboard Visibility
          </label>
          <div 
            className={`p-4 rounded-lg border-2 transition-colors ${
              formData.leaderboardOptIn 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center h-5">
                <input
                  id="leaderboardOptIn"
                  type="checkbox"
                  checked={formData.leaderboardOptIn}
                  onChange={e => handleChange('leaderboardOptIn', e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label 
                  htmlFor="leaderboardOptIn" 
                  className="font-medium text-sm cursor-pointer"
                >
                  Show me on the public leaderboard
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.leaderboardOptIn ? (
                    <span className="text-green-700">
                      ✓ Your profile and points will be <strong>visible</strong> to all volunteers on the leaderboard
                    </span>
                  ) : (
                    <span className="text-gray-600">
                      Your profile will be <strong>hidden</strong> from the leaderboard (you can still earn points)
                    </span>
                  )}
                </p>
              </div>
              <div 
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  formData.leaderboardOptIn
                    ? 'bg-green-200 text-green-800'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {formData.leaderboardOptIn ? 'PUBLIC' : 'PRIVATE'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
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
