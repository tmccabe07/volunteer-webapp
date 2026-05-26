'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Filter } from 'lucide-react';
import { childScoutService, type ChildScoutListItem } from '@/services/childScout.service';
import { useAuth } from '@/lib/auth-context';

const RANK_LABELS: Record<string, string> = {
  LION: 'Lion',
  TIGER: 'Tiger',
  WOLF: 'Wolf',
  BEAR: 'Bear',
  WEBELOS: 'Webelos',
  AOL: 'Arrow of Light',
};

const RANK_COLORS: Record<string, string> = {
  LION: 'bg-yellow-100 text-yellow-800',
  TIGER: 'bg-orange-100 text-orange-800',
  WOLF: 'bg-blue-100 text-blue-800',
  BEAR: 'bg-green-100 text-green-800',
  WEBELOS: 'bg-purple-100 text-purple-800',
  AOL: 'bg-red-100 text-red-800',
};

interface ChildScoutListProps {
  /**
   * Optional filter by rank level
   */
  initialRankFilter?: string;
  /**
   * Optional filter by den ID
   */
  denId?: string;
  /**
   * Whether to show filters
   */
  showFilters?: boolean;
  /**
   * Whether to show inactive children
   */
  showInactive?: boolean;
}

export default function ChildScoutList({
  initialRankFilter,
  denId,
  showFilters = true,
  showInactive = false,
}: ChildScoutListProps) {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildScoutListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showParentLinkCta, setShowParentLinkCta] = useState(false);
  const [rankFilter, setRankFilter] = useState(initialRankFilter || 'ALL');
  const [isActiveFilter, setIsActiveFilter] = useState(!showInactive);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });

  const loadChildren = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setShowParentLinkCta(false);
      
      const response = await childScoutService.listChildScouts({
        rankLevel: rankFilter !== 'ALL' ? rankFilter : undefined,
        denId: denId,
        isActive: isActiveFilter,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setChildren(response.data);
      setPagination(response.pagination);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { status?: number; data?: { error?: string } } }).response;
        const status = response?.status;

        if ((status === 403 || status === 404) && user?.authTier === 'PARENT') {
          setError('No linked Cub Scouts, submit a parent-link request.');
          setShowParentLinkCta(true);
        } else {
          setError(response?.data?.error || 'Failed to load children');
        }
      } else {
        setError('Failed to load children');
      }
    } finally {
      setIsLoading(false);
    }
  }, [rankFilter, denId, isActiveFilter, pagination.page, pagination.limit, user?.authTier]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  if (isLoading && children.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-600">Loading children...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <p className="text-red-800">{error}</p>
        {showParentLinkCta && (
          <Link href="/parent/links">
            <Button className="mt-3" variant="outline">
              Request Parent Link
            </Button>
          </Link>
        )}
        <Button onClick={loadChildren} className="mt-4" variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <Card className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Rank:</label>
              <Select value={rankFilter} onValueChange={setRankFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Ranks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Ranks</SelectItem>
                  <SelectItem value="LION">Lion</SelectItem>
                  <SelectItem value="TIGER">Tiger</SelectItem>
                  <SelectItem value="WOLF">Wolf</SelectItem>
                  <SelectItem value="BEAR">Bear</SelectItem>
                  <SelectItem value="WEBELOS">Webelos</SelectItem>
                  <SelectItem value="AOL">Arrow of Light</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="show-inactive"
                checked={!isActiveFilter}
                onChange={(e) => setIsActiveFilter(!e.target.checked)}
                className="rounded"
              />
              <label htmlFor="show-inactive" className="text-sm text-gray-600">
                Include Inactive
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Children List */}
      <div className="space-y-3">
        {children.map((child) => (
          <Link key={child.id} href={`/cubs/${child.id}`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">
                      {child.firstName} {child.lastName}
                    </h3>
                    {!child.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  
                  <div className="mt-2 flex gap-2 flex-wrap items-center">
                    <Badge className={RANK_COLORS[child.currentRank] || 'bg-gray-100 text-gray-800'}>
                      {RANK_LABELS[child.currentRank] || child.currentRank}
                    </Badge>
                    
                    {child.currentDen && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{child.currentDen.name}</span>
                      </div>
                    )}
                  </div>
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
            disabled={pagination.page === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages || isLoading}
          >
            Next
          </Button>
        </div>
      )}

      {/* Empty State */}
      {children.length === 0 && !isLoading && (
        <Card className="p-8 text-center text-gray-600">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          {user?.authTier === 'PARENT' && rankFilter === 'ALL' && !denId ? (
            <>
              <p className="font-medium">No linked Cub Scouts</p>
              <p className="text-sm mt-1">Submit a parent-link request to access your Cub Scouts.</p>
              <Link href="/parent/links">
                <Button className="mt-4" variant="outline">
                  Request Parent Link
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="font-medium">No children found</p>
              <p className="text-sm mt-1">
                {rankFilter !== 'ALL' 
                  ? 'Try adjusting your filters' 
                  : 'No children have been added yet'}
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  );
}
