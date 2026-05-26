'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';
import { denService, type CreateDenData } from '@/services/den.service';

const RANK_OPTIONS = [
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
];

interface CreateDenFormProps {
  /**
   * Callback after successful creation
   */
  onSuccess?: (denId: string) => void;
  /**
   * Callback on cancel
   */
  onCancel?: () => void;
}

export default function CreateDenForm({ onSuccess, onCancel }: CreateDenFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateDenData>({
    name: '',
    denNumber: 0,
    rankLevel: '',
  });

  const handleChange = (field: keyof CreateDenData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Den name is required');
      return;
    }
    if (formData.denNumber <= 0) {
      setError('Den number must be a positive integer');
      return;
    }
    if (!formData.rankLevel) {
      setError('Rank level is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload = {
        name: formData.name.trim(),
        denNumber: Number(formData.denNumber),
        rankLevel: formData.rankLevel,
      };
      
      const newDen = await denService.createDen(payload);
      
      if (onSuccess) {
        onSuccess(newDen.id);
      } else {
        router.push(`/dens/${newDen.id}/roster`);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('A den with this den number already exists');
      } else {
        setError(err.response?.data?.error || 'Failed to create den');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create New Den
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Den Name *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter den name (e.g., 'Wolf Den 3')"
              maxLength={100}
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">Give this den a descriptive name</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="denNumber">Den Number *</Label>
            <Input
              id="denNumber"
              type="number"
              min="1"
              step="1"
              value={formData.denNumber || ''}
              onChange={(e) => handleChange('denNumber', e.target.value)}
              placeholder="Enter den number"
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">A unique number for this den within the pack</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rankLevel">Rank Level *</Label>
            <Select
              value={formData.rankLevel}
              onValueChange={(value) => handleChange('rankLevel', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rank level" />
              </SelectTrigger>
              <SelectContent>
                {RANK_OPTIONS.map((rank) => (
                  <SelectItem key={rank.value} value={rank.value}>
                    {rank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">The rank level for this den</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? 'Creating...' : 'Create Den'}
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
