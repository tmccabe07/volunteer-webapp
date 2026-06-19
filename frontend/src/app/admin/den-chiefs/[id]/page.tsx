'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import DenChiefProfile from '@/components/den-chief/DenChiefProfile';
import AssignDenChiefDialog from '@/components/den-chief/AssignDenChiefDialog';
import { denChiefService, type DenChief } from '@/services/denChiefService';
import { denService } from '@/services/den.service';

export default function DenChiefProfilePage() {
  const params = useParams<{ id: string }>();
  const denChiefId = params.id;
  const [denChief, setDenChief] = useState<DenChief | null>(null);
  const [dens, setDens] = useState<Array<{ id: string; name: string; denNumber: number }>>([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [denChiefs, denData] = await Promise.all([
        denChiefService.list(),
        denService.listDens({ isActive: true }),
      ]);

      const selected = denChiefs.find((item) => item.id === denChiefId) ?? null;
      setDenChief(selected);
      setDens((denData.data || []).map((d) => ({ id: d.id, name: d.name, denNumber: d.denNumber })));
      setError('');
    } catch {
      setError('Failed to load Den Chief profile');
    }
  };

  useEffect(() => {
    void load();
  }, [denChiefId]);

  const availableDens = useMemo(() => {
    if (!denChief) return dens;
    const activeAssignmentDens = new Set(denChief.assignments.filter((a) => !a.validTo).map((a) => a.denId));
    return dens.filter((den) => !activeAssignmentDens.has(den.id));
  }, [dens, denChief]);

  const handleAssign = async (denId: string) => {
    await denChiefService.assignDen(denChiefId, { denId });
    await load();
  };

  const handleRemove = async (assignmentId: string) => {
    await denChiefService.removeAssignment(denChiefId, assignmentId);
    await load();
  };

  if (!denChief) {
    return <div className="p-6">Loading profile...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Den Chief Profile</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <DenChiefProfile denChief={denChief} onRemoveAssignment={handleRemove} />
      <div className="rounded-md border p-4">
        <h3 className="mb-2 text-sm font-semibold">Assign to Den</h3>
        <AssignDenChiefDialog denOptions={availableDens} onAssign={handleAssign} />
      </div>
    </div>
  );
}
