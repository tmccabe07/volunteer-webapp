'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import TaskCard from '@/components/shared/tasks/TaskCard';
import adminTasksService from '@/services/admin-tasks.service';
import { useAuth } from '@/lib/auth-context';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'All Tasks' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'complete', label: 'Complete' },
  { value: 'overdue', label: 'Overdue' },
];

export default function TasksPage() {
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [status, setStatus] = useState('ALL');
  const [assignedToMe, setAssignedToMe] = useState(true);

  const canCreateTasks = user?.authTier === 'LEADER' || user?.authTier === 'ADMIN';

  useEffect(() => {
    loadTasks();
  }, [status, assignedToMe, pagination.page]);

  const loadTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        assignedToMe,
      };

      // Only include status if a specific status is selected (not 'ALL')
      if (status && status !== 'ALL') {
        params.status = status;
      }

      const result = await adminTasksService.listTasks(params);

      setTasks(result.tasks);
      setPagination(result.pagination);
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Administrative Tasks</h1>
          <p className="text-gray-600 mt-1">Manage and complete administrative tasks for the pack</p>
        </div>
        {canCreateTasks && (
          <Link href="/tasks/create">
            <Button variant="outline">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All tasks" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map(filter => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={assignedToMe}
                onChange={(e) => setAssignedToMe(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Assigned to me</span>
            </label>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      )}

      {/* Tasks List */}
      {!loading && tasks.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-4">No tasks found matching your filters</p>
          {canCreateTasks && (
            <Link href="/tasks/create">
              <Button variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            </Link>
          )}
        </Card>
      )}

      {!loading && tasks.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="mt-6 flex justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Previous
              </Button>
              <div className="flex items-center px-4">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
              </div>
              <Button
                variant="outline"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
