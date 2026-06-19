'use client';

import { FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { denChiefService } from '@/services/denChiefService';

interface Props {
  onCreated?: () => void;
}

export default function CreateDenChiefForm({ onCreated }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await denChiefService.create({ firstName, lastName, email, password });
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      onCreated?.();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to create Den Chief');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md border p-4">
      <h3 className="text-sm font-semibold">Create Den Chief</h3>
      <input className="w-full rounded border px-3 py-2 text-sm" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
      <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} required type="password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">Create</Button>
    </form>
  );
}
