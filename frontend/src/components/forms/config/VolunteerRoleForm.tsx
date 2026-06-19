'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export interface VolunteerRoleData {
  id?: string;
  name: string;
  description?: string;
  roleType: 'PARENT_GUARDIAN' | 'COMMITTEE' | 'DEN_LEADER' | 'ASSISTANT_DEN_LEADER' | 'ASSISTANT_CUB_MASTER' | 'LION_GUIDE' | 'SCOUTER_RESERVE';
  specialty?: string;
  rankLevel?: 'LION' | 'TIGER' | 'WOLF' | 'BEAR' | 'WEBELOS' | 'AOL';
  grantsTier?: 'PARENT' | 'LEADER' | 'DEN_CHIEF' | 'ADMIN';
}

interface VolunteerRoleFormProps {
  initialData?: VolunteerRoleData;
  onSubmit: (data: Omit<VolunteerRoleData, 'id'>) => Promise<void>;
  onCancel?: () => void;
  isEdit?: boolean;
}

const ROLE_TYPES: Array<{ value: string; label: string }> = [
  { value: 'PARENT_GUARDIAN', label: 'Parent/Guardian' },
  { value: 'COMMITTEE', label: 'Committee Member' },
  { value: 'DEN_LEADER', label: 'Den Leader' },
  { value: 'ASSISTANT_DEN_LEADER', label: 'Assistant Den Leader' },
  { value: 'ASSISTANT_CUB_MASTER', label: 'Assistant Cub Master' },
  { value: 'LION_GUIDE', label: 'Lion Guide' },
  { value: 'SCOUTER_RESERVE', label: 'Scouter Reserve' },
];

const RANK_LEVELS: Array<{ value: string; label: string }> = [
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
];

const TIER_LEVELS: Array<{ value: string; label: string }> = [
  { value: 'PARENT', label: 'Parent (Tier 1)' },
  { value: 'LEADER', label: 'Leader (Tier 2)' },
  { value: 'ADMIN', label: 'Admin (Tier 3)' },
];

export function VolunteerRoleForm({ initialData, onSubmit, onCancel, isEdit = false }: VolunteerRoleFormProps) {
  const [formData, setFormData] = useState<Omit<VolunteerRoleData, 'id'>>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    roleType: initialData?.roleType || 'PARENT_GUARDIAN',
    specialty: initialData?.specialty || '',
    rankLevel: initialData?.rankLevel || undefined,
    grantsTier: initialData?.grantsTier || undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const requiresSpecialty = formData.roleType === 'COMMITTEE';
  const requiresRankLevel = formData.roleType === 'DEN_LEADER';

  // Determine the authorization tier based on role type
  const getDefaultTierForRoleType = (roleType: string): 'PARENT' | 'LEADER' | 'DEN_CHIEF' | 'ADMIN' => {
    switch (roleType) {
      case 'PARENT_GUARDIAN':
        return 'PARENT';
      case 'COMMITTEE':
      case 'DEN_LEADER':
      case 'ASSISTANT_DEN_LEADER':
      case 'ASSISTANT_CUB_MASTER':
      case 'LION_GUIDE':
      case 'SCOUTER_RESERVE':
        return 'LEADER';
      default:
        return 'PARENT';
    }
  };

  // Auto-calculated tier based on role type
  const autoTier = getDefaultTierForRoleType(formData.roleType);
  
  // Display tier (use explicit if set in edit mode, otherwise use auto-calculated)
  const displayTier = isEdit && formData.grantsTier ? formData.grantsTier : autoTier;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name || formData.name.trim().length === 0) {
      newErrors.name = 'Role name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Role name must be 100 characters or less';
    }

    if (requiresSpecialty && (!formData.specialty || formData.specialty.trim().length === 0)) {
      newErrors.specialty = 'Committee role type requires a specialty';
    }

    if (requiresRankLevel && !formData.rankLevel) {
      newErrors.rankLevel = 'Den Leader role type requires a rank level';
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
      // Prepare submit data - let backend auto-assign tier if not explicitly in edit mode
      const submitData = {
        name: formData.name,
        description: formData.description,
        roleType: formData.roleType,
        // Only include grantsTier if explicitly set in edit mode, otherwise let backend auto-assign
        grantsTier: isEdit && formData.grantsTier ? formData.grantsTier : undefined,
        // Clean up optional fields based on roleType
        specialty: requiresSpecialty ? formData.specialty : undefined,
        rankLevel: requiresRankLevel ? formData.rankLevel : undefined,
      };

      await onSubmit(submitData as Omit<VolunteerRoleData, 'id'>);
    } catch (error: any) {
      if (error.response?.data?.details) {
        setErrors({ general: error.response.data.details.join(', ') });
      } else {
        setErrors({ general: error.response?.data?.error || 'Failed to save volunteer role' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: any) => {
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
        {isEdit ? 'Edit Volunteer Role' : 'Create Volunteer Role'}
      </h2>

      {errors.general && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Role Name *
          </label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={e => handleChange('name', e.target.value)}
            disabled={isLoading}
            className={errors.name ? 'border-red-500' : ''}
            placeholder="e.g., Den Leader - Wolf"
          />
          {errors.name && (
            <p className="text-red-600 text-sm mt-1">{errors.name}</p>
          )}
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
            placeholder="Optional description of this role"
          />
          {errors.description && (
            <p className="text-red-600 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        <div>
          <label htmlFor="roleType" className="block text-sm font-medium mb-1">
            Role Type *
          </label>
          <select
            id="roleType"
            value={formData.roleType}
            onChange={e => handleChange('roleType', e.target.value)}
            disabled={isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLE_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {isEdit && (
            <p className="text-amber-600 text-xs mt-1">
              ⚠️ Changing role type may affect existing volunteer assignments
            </p>
          )}
        </div>

        {requiresSpecialty && (
          <div>
            <label htmlFor="specialty" className="block text-sm font-medium mb-1">
              Committee Specialty *
            </label>
            <Input
              id="specialty"
              type="text"
              value={formData.specialty}
              onChange={e => handleChange('specialty', e.target.value)}
              disabled={isLoading}
              className={errors.specialty ? 'border-red-500' : ''}
              placeholder="e.g., Treasurer, Secretary"
            />
            {errors.specialty && (
              <p className="text-red-600 text-sm mt-1">{errors.specialty}</p>
            )}
          </div>
        )}

        {requiresRankLevel && (
          <div>
            <label htmlFor="rankLevel" className="block text-sm font-medium mb-1">
              Den Rank Level *
            </label>
            <select
              id="rankLevel"
              value={formData.rankLevel || ''}
              onChange={e => handleChange('rankLevel', e.target.value || undefined)}
              disabled={isLoading}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.rankLevel ? 'border-red-500' : ''
              }`}
            >
              <option value="">Select rank level</option>
              {RANK_LEVELS.map(rank => (
                <option key={rank.value} value={rank.value}>
                  {rank.label}
                </option>
              ))}
            </select>
            {errors.rankLevel && (
              <p className="text-red-600 text-sm mt-1">{errors.rankLevel}</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="grantsTier" className="block text-sm font-medium mb-1">
            Authorization Tier
          </label>
          <div className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-md text-gray-700">
            {displayTier === 'PARENT' && 'Parent (Tier 1)'}
            {displayTier === 'LEADER' && 'Leader (Tier 2)'}
            {displayTier === 'ADMIN' && 'Admin (Tier 3)'}
          </div>
          <p className="text-gray-600 text-xs mt-1">
            Automatically assigned based on role type
          </p>
        </div>

        {isEdit && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-900">
            <strong>⚠️ Important:</strong> Changes to role type, specialty, rank level, or authorization tier 
            will affect all volunteers currently assigned to this role. Please ensure this is intentional.
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" variant="outline" disabled={isLoading}>
            {isLoading ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
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
