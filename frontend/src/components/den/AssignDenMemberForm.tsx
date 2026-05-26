'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus } from 'lucide-react';
import { denService, type AssignDenMemberData } from '@/services/den.service';
import { childScoutService, type ChildScoutListItem } from '@/services/childScout.service';

interface AssignDenMemberFormProps {
  /**
   * The den ID to assign to
   */
  denId: string;
  /**
   * Optional rank level to filter children
   */
  denRankLevel?: string;
  /**
   * Callback after successful assignment
   */
  onSuccess?: () => void;
  /**
   * Callback on cancel
   */
  onCancel?: () => void;
}

export default function AssignDenMemberForm({
  denId,
  denRankLevel,
  onSuccess,
  onCancel,
}: AssignDenMemberFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableChildren, setAvailableChildren] = useState<ChildScoutListItem[]>([]);
  const [formData, setFormData] = useState<AssignDenMemberData>({
    childScoutId: '',
    effectiveDate: '',
    reason: '',
  });

  useEffect(() => {
    loadAvailableChildren();
  }, [denRankLevel]);

  const loadAvailableChildren = async () => {
    try {
      setIsLoadingChildren(true);
      const response = await childScoutService.listChildScouts({
        rankLevel: denRankLevel,
        isActive: true,
        limit: 100,
      });
      const filteredChildren = denRankLevel
        ? response.data.filter(child => child.currentRank === denRankLevel)
        : response.data;
      setAvailableChildren(filteredChildren);
    } catch (err: any) {
      setError('Failed to load available children');
    } finally {
      setIsLoadingChildren(false);
    }
  };

  const handleChange = (field: keyof AssignDenMemberData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.childScoutId) {
      setError('Please select a child scout');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload: AssignDenMemberData = {
        childScoutId: formData.childScoutId,
        ...(formData.effectiveDate && { effectiveDate: formData.effectiveDate }),
        ...(formData.reason?.trim() && { reason: formData.reason.trim() }),
      };
      
      await denService.assignChildToDen(denId, payload);
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form
      setFormData({
        childScoutId: '',
        effectiveDate: '',
        reason: '',
      });
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('This child is already assigned to this den');
      } else {
        setError(err.response?.data?.error || 'Failed to assign child to den');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Assign Member to Den
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
            <Label htmlFor="childScoutId">Child Scout *</Label>
            <Select
              value={formData.childScoutId}
              onValueChange={(value) => handleChange('childScoutId', value)}
              disabled={isSubmitting || isLoadingChildren}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  isLoadingChildren ? 'Loading...' : 'Select a child scout'
                } />
              </SelectTrigger>
              <SelectContent>
                {availableChildren.length === 0 ? (
                  <div className="p-2 text-sm text-gray-600">
                    No available children found
                  </div>
                ) : (
                  availableChildren.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.firstName} {child.lastName}
                      {child.currentDen && ` (currently in ${child.currentDen.name})`}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {denRankLevel 
                ? `Showing children with matching rank level` 
                : 'Select the child to assign to this den'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Effective Date (Optional)</Label>
            <Input
              id="effectiveDate"
              type="date"
              value={formData.effectiveDate}
              onChange={(e) => handleChange('effectiveDate', e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">Leave blank to use current date</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              type="text"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="Enter reason for assignment"
              maxLength={200}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">Optional note about this assignment</p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting || isLoadingChildren} className="flex-1">
              {isSubmitting ? 'Assigning...' : 'Assign to Den'}
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
