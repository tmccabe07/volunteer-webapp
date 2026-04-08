'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { volunteerApi, type VolunteerListItem, type ListVolunteersResponse } from '@/services/volunteer.service';
import { useAuth } from '@/lib/auth-context';

export default function VolunteersListPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    // Check if user has Tier 2+ access
    if (user && user.authTier === 'PARENT') {
      setError('You need Leader or Admin access to view the volunteer list');
      setIsLoading(false);
      return;
    }

    if (user) {
      loadVolunteers();
    }
  }, [user, authLoading, pagination.page]);

  const loadVolunteers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await volunteerApi.listVolunteers({
        page: pagination.page,
        limit: pagination.limit,
        search: search || undefined,
      });
      setVolunteers(data.volunteers);
      setPagination(data.pagination);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('You do not have permission to view the volunteer list');
      } else {
        setError(err.response?.data?.error || 'Failed to load volunteers');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadVolunteers();
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (authLoading || (isLoading && volunteers.length === 0)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading volunteers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-red-800">{error}</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">Volunteers</h1>
        
        {/* Search Bar */}
        <div className="flex gap-3 max-w-md">
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>
      </div>

      {/* Volunteers List */}
      <div className="space-y-3">
        {volunteers.map(volunteer => (
          <Link key={volunteer.id} href={`/volunteers/${volunteer.id}`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{volunteer.name}</h3>
                  <p className="text-sm text-gray-600">{volunteer.email}</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {volunteer.roles.map((role, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded"
                      >
                        {role.roleName}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Points</p>
                  <p className="font-semibold text-xl">{volunteer.pointBalance.totalPoints}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {volunteer.authTier === 'ADMIN' ? 'Admin' : 
                     volunteer.authTier === 'LEADER' ? 'Leader' : 'Parent'}
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {volunteers.length === 0 && !isLoading && (
        <Card className="p-8 text-center text-gray-600">
          <p>No volunteers found</p>
        </Card>
      )}
    </div>
  );
}
