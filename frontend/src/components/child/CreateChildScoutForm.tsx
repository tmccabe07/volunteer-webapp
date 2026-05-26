'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { childScoutService, type CreateChildScoutData } from '@/services/childScout.service';

const RANK_OPTIONS = [
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
];

interface CreateChildScoutFormProps {
  /**
   * Callback after successful creation
   */
  onSuccess?: (childId: string) => void;
  /**
   * Callback on cancel
   */
  onCancel?: () => void;
}

export default function CreateChildScoutForm({ onSuccess, onCancel }: CreateChildScoutFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateChildScoutData>({
    firstName: '',
    lastName: '',
    currentRank: '',
    scoutbookId: '',
  });

  const handleChange = (field: keyof CreateChildScoutData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return;
    }
    if (!formData.currentRank) {
      setError('Current rank is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        currentRank: formData.currentRank,
        ...(formData.scoutbookId?.trim() && { scoutbookId: formData.scoutbookId.trim() }),
      };
      
      const newChild = await childScoutService.createChildScout(payload);
      
      if (onSuccess) {
        onSuccess(newChild.id);
      } else {
        router.push(`/cubs/${newChild.id}`);
      }
    } catch (err: unknown) {
      const maybeResponse = (err as { response?: { data?: { error?: string } } }).response;
      setError(maybeResponse?.data?.error || 'Failed to create child scout');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add New Cub Scout
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="Enter first name"
                maxLength={50}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Enter last name"
                maxLength={50}
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentRank">Current Rank *</Label>
            <Select
              value={formData.currentRank}
              onValueChange={(value) => handleChange('currentRank', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rank" />
              </SelectTrigger>
              <SelectContent>
                {RANK_OPTIONS.map((rank) => (
                  <SelectItem key={rank.value} value={rank.value}>
                    {rank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scoutbookId">Scoutbook ID (Optional)</Label>
            <Input
              id="scoutbookId"
              type="text"
              value={formData.scoutbookId}
              onChange={(e) => handleChange('scoutbookId', e.target.value)}
              placeholder="Enter Scoutbook ID"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Creating...' : 'Create Cub Scout'}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
