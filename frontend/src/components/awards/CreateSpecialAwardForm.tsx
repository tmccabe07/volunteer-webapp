'use client';

import { useState } from 'react';
import { awardService, type SpecialAward } from '@/services/awardService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateSpecialAwardFormProps {
  onCreated: (award: SpecialAward) => void;
}

export default function CreateSpecialAwardForm({ onCreated }: CreateSpecialAwardFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [requiresNomination, setRequiresNomination] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      const created = await awardService.createSpecialAward({
        name: name.trim(),
        category: category.trim(),
        description: description.trim() || undefined,
        requiresNomination,
      });

      onCreated(created);
      setName('');
      setCategory('');
      setDescription('');
      setRequiresNomination(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to create special award');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4 rounded-lg border p-4" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold">Create Special Award</h2>

      <div className="space-y-2">
        <Label htmlFor="specialAwardName">Name</Label>
        <Input id="specialAwardName" value={name} onChange={(event) => setName(event.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="specialAwardCategory">Category</Label>
        <Input id="specialAwardCategory" value={category} onChange={(event) => setCategory(event.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="specialAwardDescription">Description</Label>
        <Textarea
          id="specialAwardDescription"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requiresNomination}
          onChange={(event) => setRequiresNomination(event.target.checked)}
        />
        Requires nomination
      </label>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{error}</div>}

      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Special Award'}</Button>
    </form>
  );
}
