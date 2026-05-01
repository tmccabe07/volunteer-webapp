'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * ReportFilters Component
 * 
 * Provides date range, rank level, and format selection for reports
 * Feature: 001-volunteer-management - User Story 9
 */

export interface ReportFilterProps {
  onFilterChange: (filters: ReportFilters) => void;
  showRankFilter?: boolean;
  showStatusFilter?: boolean;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  rankLevel?: string;
  status?: string;
  format: 'summary' | 'detailed';
}

export function ReportFilters({
  onFilterChange,
  showRankFilter = false,
  showStatusFilter = false,
}: ReportFilterProps) {
  const [filters, setFilters] = useState<ReportFilters>({
    format: 'summary',
  });

  const handleFilterUpdate = (key: keyof ReportFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(filters);
  };

  const handleReset = () => {
    const resetFilters: ReportFilters = { format: 'summary' };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="text-lg font-semibold">Report Filters</h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterUpdate('startDate', e.target.value)}
          />
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterUpdate('endDate', e.target.value)}
          />
        </div>

        {/* Rank Level Filter */}
        {showRankFilter && (
          <div className="space-y-2">
            <Label htmlFor="rankLevel">Rank Level</Label>
            <Select
              value={filters.rankLevel || 'ALL'}
              onValueChange={(value) =>
                handleFilterUpdate('rankLevel', value === 'ALL' ? '' : value)
              }
            >
              <SelectTrigger id="rankLevel">
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
                <SelectItem value="PACK_WIDE">Pack-Wide</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Filter */}
        {showStatusFilter && (
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={filters.status || 'ALL'}
              onValueChange={(value) =>
                handleFilterUpdate('status', value === 'ALL' ? '' : value)
              }
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tasks</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Format Selection */}
        <div className="space-y-2">
          <Label htmlFor="format">Report Format</Label>
          <Select
            value={filters.format}
            onValueChange={(value) =>
              handleFilterUpdate('format', value as 'summary' | 'detailed')
            }
          >
            <SelectTrigger id="format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="detailed">Detailed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleApplyFilters}>Apply Filters</Button>
        <Button variant="outline" onClick={handleReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
