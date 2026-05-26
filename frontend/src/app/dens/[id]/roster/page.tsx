'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react';
import DenRoster from '@/components/den/DenRoster';
import AssignDenMemberForm from '@/components/den/AssignDenMemberForm';
import { denService, type DenRoster as DenRosterType } from '@/services/den.service';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';

interface DenRosterPageProps {
  params: Promise<{ id: string }>;
}

export default function DenRosterPage({ params }: DenRosterPageProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [roster, setRoster] = useState<DenRosterType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [denId, setDenId] = useState<string | null>(null);
  const [isDeletingDen, setIsDeletingDen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => setDenId(p.id));
  }, [params]);

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

    if (user && denId) {
      loadRoster();
    }
  }, [user, authLoading, denId, router]);

  const loadRoster = async () => {
    if (!denId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const data = await denService.getDenRoster(denId);
      setRoster(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Den not found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view this den');
      } else {
        setError(err.response?.data?.error || 'Failed to load den roster');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignSuccess = () => {
    setShowAssignForm(false);
    loadRoster(); // Reload roster to show new member
  };

  const handleRemoveMember = async (childScoutId: string, fullName: string) => {
    if (!denId) return;

    const confirmed = window.confirm(`Remove ${fullName} from this den?`);
    if (!confirmed) return;

    try {
      setRemovingMemberId(childScoutId);
      setError(null);
      await denService.removeChildFromDen(denId, childScoutId);
      await loadRoster();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member from den');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleRemoveDen = async () => {
    if (!denId || !roster) return;

    const confirmed = window.confirm(
      `Remove den ${roster.den.name}? This will mark the den inactive. The den must have no current members.`
    );
    if (!confirmed) return;

    try {
      setIsDeletingDen(true);
      setError(null);
      await denService.deleteDen(denId);
      router.push('/dens');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove den');
    } finally {
      setIsDeletingDen(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => router.push('/dens')} variant="outline">
              Back to Dens List
            </Button>
            {error !== 'Den not found' && (
              <Button onClick={loadRoster}>Try Again</Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (!roster) {
    return null;
  }

  const isLeaderOrAdmin = !!user && ['LEADER', 'ADMIN'].includes(user.authTier);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dens">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dens
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">{roster.den.name} Roster</h1>
          <div className="flex gap-2">
            {isLeaderOrAdmin && (
              <Button onClick={() => setShowAssignForm(!showAssignForm)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {showAssignForm ? 'Cancel' : 'Assign Member'}
              </Button>
            )}
            {user?.authTier === 'ADMIN' && (
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-400"
                onClick={handleRemoveDen}
                disabled={isDeletingDen}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeletingDen ? 'Removing...' : 'Remove Den'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showAssignForm && (
        <div className="mb-6">
          <AssignDenMemberForm
            denId={roster.den.id}
            denRankLevel={roster.den.rankLevel}
            onSuccess={handleAssignSuccess}
            onCancel={() => setShowAssignForm(false)}
          />
        </div>
      )}

      <DenRoster
        roster={roster}
        canRemoveMembers={isLeaderOrAdmin}
        removingMemberId={removingMemberId}
        onRemoveMember={handleRemoveMember}
      />
    </div>
  );
}
