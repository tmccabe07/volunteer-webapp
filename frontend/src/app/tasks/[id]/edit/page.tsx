'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import AdminTaskForm from '@/components/forms/tasks/AdminTaskForm';
import adminTasksService from '@/services/admin-tasks.service';

export default function EditTaskPage() {
  const params = useParams();
  const { user } = useAuth();
  const taskId = params.id as string;

  const [task, setTask] = useState<any | null>(null);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  if (!user || (user.authTier !== 'LEADER' && user.authTier !== 'ADMIN')) {
    redirect('/tasks');
  }

  useEffect(() => {
    Promise.all([loadTask(), loadVolunteerRoles()]);
  }, [taskId]);

  const loadTask = async () => {
    try {
      const data = await adminTasksService.getTask(taskId);
      setTask(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load task');
    }
  };

  const loadVolunteerRoles = async () => {
    try {
      const data = await adminTasksService.getVolunteerRoles();
      setRoles(data || []);
    } catch (err) {
      console.error('Failed to load volunteer roles:', err);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    await adminTasksService.updateTask(taskId, data);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error || 'Task not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Edit Task</h1>
      <AdminTaskForm
        initialData={{
          name: task.name,
          description: task.description,
          dueDate: new Date(task.dueDate).toISOString().slice(0, 16), // Format for datetime-local input
          completionSteps: task.completionSteps,
          isPackWide: task.isPackWide,
          assignedRoleIds: task.assignedRoles.map((role: any) => role.id),
          isRecurring: task.isRecurring,
        }}
        roles={roles}
        onSubmit={handleSubmit}
        submitLabel="Update Task"
      />
    </div>
  );
}
