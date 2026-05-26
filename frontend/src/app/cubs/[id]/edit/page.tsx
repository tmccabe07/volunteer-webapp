'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { childScoutService, type ChildScoutDetail } from '@/services/childScout.service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CubEditPageProps {
  params: Promise<{ id: string }>;
}

const RANK_OPTIONS = [
  { value: 'LION', label: 'Lion' },
  { value: 'TIGER', label: 'Tiger' },
  { value: 'WOLF', label: 'Wolf' },
  { value: 'BEAR', label: 'Bear' },
  { value: 'WEBELOS', label: 'Webelos' },
  { value: 'AOL', label: 'Arrow of Light' },
];

export default function CubEditPage({ params }: CubEditPageProps) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [childId, setChildId] = useState<string | null>(null);
  const [child, setChild] = useState<ChildScoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentRank, setCurrentRank] = useState('');

  useEffect(() => {
    params.then(p => setChildId(p.id));
  }, [params]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (user && childId) {
      loadChild(childId);
    }
  }, [authLoading, user, childId, router]);

  const loadChild = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await childScoutService.getChildScout(id);
      setChild(data);
      setFirstName(data.firstName);
      setLastName(data.lastName);
      setCurrentRank(data.currentRank);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Cub Scout not found');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to edit this Cub Scout');
      } else {
        setError(err.response?.data?.error || 'Failed to load Cub Scout');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId) return;

    if (!firstName.trim() || !lastName.trim() || !currentRank) {
      setError('First name, last name, and rank are required');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      await childScoutService.updateChildScout(childId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        currentRank,
      });

      router.push(`/cubs/${childId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update Cub Scout');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  if (!childId) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <Link href={`/cubs/${childId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Cub Scout
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-6">Edit Cub Scout</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                maxLength={50}
                disabled={isSaving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                maxLength={50}
                disabled={isSaving}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentRank">Current Rank</Label>
            <Select value={currentRank} onValueChange={setCurrentRank} disabled={isSaving}>
              <SelectTrigger id="currentRank">
                <SelectValue placeholder="Select rank" />
              </SelectTrigger>
              <SelectContent>
                {RANK_OPTIONS.map(rank => (
                  <SelectItem key={rank.value} value={rank.value}>
                    {rank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push(`/cubs/${childId}`)} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
