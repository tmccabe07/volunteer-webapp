'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';
import AdminTaskForm from '@/components/forms/tasks/AdminTaskForm';
import adminTasksService from '@/services/admin-tasks.service';

export default function CreateTaskPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check permissions
  if (!user || (user.authTier !== 'LEADER' && user.authTier !== 'ADMIN')) {
    redirect('/tasks');
  }

  useEffect(() => {
    loadVolunteerRoles();
  }, []);

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
    await adminTasksService.createTask(data);
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

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create Administrative Task</h1>
      <AdminTaskForm
        roles={roles}
        onSubmit={handleSubmit}
        submitLabel="Create Task"
      />
    </div>
  );
}
