'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { roleService, type RoleScope, type RankLevel } from '@/services/roleService';

interface Props {
  onAssigned?: () => void;
}

export default function ScopedRoleAssignmentForm({ onAssigned }: Props) {
  const [volunteerId, setVolunteerId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [scopeType, setScopeType] = useState<RoleScope>('DEN');
  const [denNumber, setDenNumber] = useState('');
  const [rankLevel, setRankLevel] = useState<RankLevel>('WOLF');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await roleService.assignScoped({
        volunteerId,
        roleId,
        scopeType,
        ...(scopeType === 'DEN' ? { denNumber: Number(denNumber) } : {}),
        ...(scopeType === 'RANK' ? { rankLevel } : {}),
      });
      setVolunteerId('');
      setRoleId('');
      setDenNumber('');
      onAssigned?.();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to assign scoped role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border p-4">
      <h3 className="text-sm font-semibold">Assign Scoped Role</h3>

      <input
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder="Volunteer ID"
        value={volunteerId}
        onChange={(e) => setVolunteerId(e.target.value)}
        required
      />

      <input
        className="w-full rounded border px-3 py-2 text-sm"
        placeholder="Role ID"
        value={roleId}
        onChange={(e) => setRoleId(e.target.value)}
        required
      />

      <select
        className="w-full rounded border px-3 py-2 text-sm"
        value={scopeType}
        onChange={(e) => setScopeType(e.target.value as RoleScope)}
      >
        <option value="DEN">DEN</option>
        <option value="RANK">RANK</option>
        <option value="PACK">PACK</option>
      </select>

      {scopeType === 'DEN' && (
        <input
          className="w-full rounded border px-3 py-2 text-sm"
          placeholder="Den number"
          value={denNumber}
          onChange={(e) => setDenNumber(e.target.value)}
          required
        />
      )}

      {scopeType === 'RANK' && (
        <select
          className="w-full rounded border px-3 py-2 text-sm"
          value={rankLevel}
          onChange={(e) => setRankLevel(e.target.value as RankLevel)}
        >
          <option value="LION">LION</option>
          <option value="TIGER">TIGER</option>
          <option value="WOLF">WOLF</option>
          <option value="BEAR">BEAR</option>
          <option value="WEBELOS">WEBELOS</option>
          <option value="AOL">AOL</option>
        </select>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Assigning...' : 'Assign Role'}
      </Button>
    </form>
  );
}
