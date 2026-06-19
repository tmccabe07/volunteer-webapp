'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';

interface DenOption {
  id: string;
  name: string;
  denNumber: number;
}

interface Props {
  denOptions: DenOption[];
  onAssign: (denId: string) => Promise<void>;
}

export default function AssignDenChiefDialog({ denOptions, onAssign }: Props) {
  const [denId, setDenId] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await onAssign(denId);
      setDenId('');
    } catch {
      setError('Failed to assign Den Chief');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      <select
        value={denId}
        onChange={(e) => setDenId(e.target.value)}
        className="w-full rounded border px-3 py-2 text-sm"
        required
      >
        <option value="">Select a den</option>
        {denOptions.map((den) => (
          <option key={den.id} value={den.id}>
            {den.name} (#{den.denNumber})
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <Button type="submit" size="sm">Assign</Button>
    </form>
  );
}
