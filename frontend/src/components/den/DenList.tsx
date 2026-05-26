'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Filter, UserCircle } from 'lucide-react';
import { denService, type DenListItem } from '@/services/den.service';

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

interface DenListProps {
  /**
   * Optional filter by rank level
   */
  initialRankFilter?: string;
  /**
   * Whether to show filters
   */
  showFilters?: boolean;
  /**
   * Whether to show inactive dens
   */
  showInactive?: boolean;
}

export default function DenList({
  initialRankFilter,
  showFilters = true,
  showInactive = false,
}: DenListProps) {
  const [dens, setDens] = useState<DenListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rankFilter, setRankFilter] = useState(initialRankFilter || 'ALL');
  const [isActiveFilter, setIsActiveFilter] = useState(!showInactive);

  useEffect(() => {
    loadDens();
  }, [rankFilter, isActiveFilter]);

  const loadDens = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await denService.listDens({
        rankLevel: rankFilter !== 'ALL' ? rankFilter : undefined,
        isActive: isActiveFilter,
      });
      
      setDens(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dens');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && dens.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-gray-600">Loading dens...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 bg-red-50 border-red-200">
        <p className="text-red-800">{error}</p>
        <Button onClick={loadDens} className="mt-4" variant="outline">
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
                id="show-inactive-dens"
                checked={!isActiveFilter}
                onChange={(e) => setIsActiveFilter(!e.target.checked)}
                className="rounded"
              />
              <label htmlFor="show-inactive-dens" className="text-sm text-gray-600">
                Include Inactive
              </label>
            </div>
          </div>
        </Card>
      )}

      {/* Dens List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dens.map((den) => (
          <Link key={den.id} href={`/dens/${den.id}/roster`}>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{den.name}</h3>
                      {!den.isActive && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">Den {den.denNumber}</p>
                  </div>
                </div>

                <Badge className={`${RANK_COLORS[den.rankLevel] || 'bg-gray-100 text-gray-800'} text-sm`}>
                  {RANK_LABELS[den.rankLevel] || den.rankLevel}
                </Badge>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{den.currentMemberCount} {den.currentMemberCount === 1 ? 'scout' : 'scouts'}</span>
                  </div>

                  {den.leaders.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <UserCircle className="h-4 w-4" />
                      <span>{den.leaders.length} {den.leaders.length === 1 ? 'leader' : 'leaders'}</span>
                    </div>
                  )}
                </div>

                {/* Leaders */}
                {den.leaders.length > 0 && (
                  <div className="space-y-1">
                    {den.leaders.slice(0, 2).map((leader) => (
                      <div key={leader.id} className="text-xs text-gray-600">
                        {leader.name} <span className="text-gray-400">({leader.role})</span>
                      </div>
                    ))}
                    {den.leaders.length > 2 && (
                      <div className="text-xs text-gray-400">
                        +{den.leaders.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {dens.length === 0 && !isLoading && (
        <Card className="p-8 text-center text-gray-600">
          <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="font-medium">No dens found</p>
          <p className="text-sm mt-1">
            {rankFilter !== 'ALL' 
              ? `Try adjusting your filters` 
              : 'No dens have been created yet'}
          </p>
        </Card>
      )}
    </div>
  );
}
