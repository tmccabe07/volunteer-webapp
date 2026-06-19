'use client';

import Link from 'next/link';
import { type DenChief } from '@/services/denChiefService';

interface Props {
  denChiefs: DenChief[];
}

export default function DenChiefList({ denChiefs }: Props) {
  if (denChiefs.length === 0) {
    return <p className="text-sm text-gray-500">No Den Chiefs found.</p>;
  }

  return (
    <div className="rounded-md border">
      <div className="divide-y">
        {denChiefs.map((denChief) => (
          <div key={denChief.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{denChief.firstName} {denChief.lastName}</p>
                <p className="text-xs text-gray-600">{denChief.email}</p>
              </div>
              <Link href={`/admin/den-chiefs/${denChief.id}`} className="text-sm text-blue-600 hover:underline">
                View profile
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
