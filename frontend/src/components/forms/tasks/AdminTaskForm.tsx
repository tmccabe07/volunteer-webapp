'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2 } from 'lucide-react';

interface CompletionStep {
  step: string;
  url?: string;
}

interface AdminTaskFormData {
  name: string;
  description?: string;
  dueDate: string;
  completionSteps?: CompletionStep[];
  isPackWide?: boolean;
  assignedRoleIds?: string[];
  isRecurring?: boolean;
}

interface VolunteerRole {
  id: string;
  name: string;
  roleType: string;
}

interface AdminTaskFormProps {
  initialData?: Partial<AdminTaskFormData>;
  roles: VolunteerRole[];
  onSubmit: (data: AdminTaskFormData) => Promise<void>;
  submitLabel?: string;
}

export default function AdminTaskForm({ 
  initialData, 
  roles, 
  onSubmit, 
  submitLabel = 'Create Task' 
}: AdminTaskFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<AdminTaskFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    dueDate: initialData?.dueDate || '',
    completionSteps: initialData?.completionSteps || [],
    isPackWide: initialData?.isPackWide || false,
    assignedRoleIds: initialData?.assignedRoleIds || [],
    isRecurring: initialData?.isRecurring || false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof AdminTaskFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCompletionStepChange = (index: number, field: keyof CompletionStep, value: string) => {
    const newSteps = [...(formData.completionSteps || [])];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData(prev => ({ ...prev, completionSteps: newSteps }));
  };

  const addCompletionStep = () => {
    setFormData(prev => ({
      ...prev,
      completionSteps: [...(prev.completionSteps || []), { step: '', url: '' }],
    }));
  };

  const removeCompletionStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      completionSteps: (prev.completionSteps || []).filter((_, i) => i !== index),
    }));
  };

  const handleRoleToggle = (roleId: string, checked: boolean) => {
    setFormData(prev => {
      const assignedRoleIds = prev.assignedRoleIds || [];
      if (checked) {
        return { ...prev, assignedRoleIds: [...assignedRoleIds, roleId] };
      } else {
        return { ...prev, assignedRoleIds: assignedRoleIds.filter(id => id !== roleId) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!formData.name || formData.name.length < 3) {
        throw new Error('Task name must be at least 3 characters');
      }

      if (!formData.dueDate) {
        throw new Error('Due date is required');
      }

      const dueDate = new Date(formData.dueDate);
      if (isNaN(dueDate.getTime())) {
        throw new Error('Invalid due date');
      }

      if (dueDate <= new Date()) {
        throw new Error('Due date must be in the future');
      }

      if (!formData.isPackWide && (!formData.assignedRoleIds || formData.assignedRoleIds.length === 0)) {
        throw new Error('Please select at least one role or mark as pack-wide');
      }

      // Filter out empty completion steps
      const filteredSteps = (formData.completionSteps || []).filter(step => step.step.trim() !== '');

      const submissionData: AdminTaskFormData = {
        ...formData,
        dueDate: dueDate.toISOString(),
        completionSteps: filteredSteps.length > 0 ? filteredSteps : undefined,
      };

      await onSubmit(submissionData);
      router.push('/tasks');
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
          <CardDescription>Basic information about the administrative task</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Task Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Submit Medical Forms"
              required
              minLength={3}
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Provide additional details about the task..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="dueDate">Due Date *</Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRecurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => handleChange('isRecurring', checked)}
            />
            <Label htmlFor="isRecurring" className="font-normal">
              Recurring (auto-sets end date to year-end)
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completion Steps</CardTitle>
          <CardDescription>Optional step-by-step instructions with reference URLs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(formData.completionSteps || []).map((step, index) => (
            <div key={index} className="flex gap-2 items-start">
              <div className="flex-1 space-y-2">
                <Input
                  placeholder={`Step ${index + 1}`}
                  value={step.step}
                  onChange={(e) => handleCompletionStepChange(index, 'step', e.target.value)}
                  maxLength={500}
                />
                <Input
                  type="url"
                  placeholder="Optional URL"
                  value={step.url || ''}
                  onChange={(e) => handleCompletionStepChange(index, 'url', e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeCompletionStep(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={addCompletionStep}
            className="w-full"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Completion Step
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
          <CardDescription>Who should complete this task?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPackWide"
              checked={formData.isPackWide}
              onCheckedChange={(checked) => handleChange('isPackWide', checked)}
            />
            <Label htmlFor="isPackWide" className="font-normal">
              Pack-Wide (assign to all volunteers)
            </Label>
          </div>

          {!formData.isPackWide && (
            <div className="space-y-2">
              <Label>Assigned Roles *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 border rounded-lg p-4">
                {roles.map(role => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={formData.assignedRoleIds?.includes(role.id)}
                      onCheckedChange={(checked) => handleRoleToggle(role.id, checked as boolean)}
                    />
                    <Label htmlFor={`role-${role.id}`} className="font-normal">
                      {role.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
