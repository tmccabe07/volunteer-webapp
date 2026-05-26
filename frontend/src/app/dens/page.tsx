'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import DenList from '@/components/den/DenList';
import CreateDenForm from '@/components/den/CreateDenForm';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';

export default function DensListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    // Check if user has Leader+ access
    if (user && user.authTier === 'PARENT') {
      router.push('/');
      return;
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user || user.authTier === 'PARENT') {
    return null;
  }

  const isAdmin = user.authTier === 'ADMIN';

  const handleCreateSuccess = (denId: string) => {
    setShowCreateForm(false);
    router.push(`/dens/${denId}/roster`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dens</h1>
          {isAdmin && !showCreateForm && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Users className="h-4 w-4 mr-2" />
              Create Den
            </Button>
          )}
        </div>
        <p className="text-gray-600 mt-2">
          Manage and view den information and rosters
        </p>
      </div>

      {showCreateForm ? (
        <div className="mb-6">
          <CreateDenForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      ) : (
        <DenList showFilters={true} />
      )}
    </div>
  );
}
