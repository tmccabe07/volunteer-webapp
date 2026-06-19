'use client';

import { useEffect, useState } from 'react';
import { useRequireTier } from '@/lib/auth-context';
import CreateDenChiefForm from '@/components/den-chief/CreateDenChiefForm';
import DenChiefList from '@/components/den-chief/DenChiefList';
import { denChiefService, type DenChief } from '@/services/denChiefService';

export default function DenChiefsPage() {
  const { user, isLoading } = useRequireTier('ADMIN');
  const [denChiefs, setDenChiefs] = useState<DenChief[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const results = await denChiefService.list();
      setDenChiefs(results);
      setError('');
    } catch {
      setError('Failed to load Den Chiefs');
    }
  };

  useEffect(() => {
    if (!isLoading && user) {
      void load();
    }
  }, [isLoading, user]);

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Den Chiefs</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <CreateDenChiefForm onCreated={load} />
      <DenChiefList denChiefs={denChiefs} />
    </div>
  );
}
