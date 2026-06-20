'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, CheckCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import TaskDetails from '@/components/shared/tasks/TaskDetails';
import SendReminderButton from '@/components/admin/tasks/SendReminderButton';
import adminTasksService from '@/services/admin-tasks.service';
import { useAuth } from '@/lib/auth-context';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const taskId = params.id as string;

  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [uncompleting, setUncompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = user?.authTier === 'LEADER' || user?.authTier === 'ADMIN';
  const canComplete = task && !task.currentUserCompletion;
  const canUncomplete = task && task.currentUserCompletion;

  useEffect(() => {
    loadTask();
  }, [taskId]);

  const loadTask = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await adminTasksService.getTask(taskId);
      console.log('Loaded task data:', data);
      console.log('currentUserCompletion:', data.currentUserCompletion);
      setTask(data);
    } catch (err: any) {
      console.error('Failed to load task:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this task as complete?')) {
      return;
    }

    setCompleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await adminTasksService.completeTask(taskId);
      setSuccessMessage('Task marked as complete!');
      await loadTask(); // Reload to show completed status
    } catch (err: any) {
      console.error('Failed to complete task:', err);
      
      // Handle specific error cases
      if (err.response?.status === 409) {
        // Task already completed - just reload to show current state
        setSuccessMessage('This task has already been marked as complete.');
        await loadTask();
      } else {
        const errorMsg = err.response?.data?.error || err.message || 'Failed to complete task';
        setError(errorMsg);
      }
    } finally {
      setCompleting(false);
    }
  };

  const handleUncomplete = async () => {
    if (!confirm('Undo completion? This will mark the task as incomplete.')) {
      return;
    }

    setUncompleting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await adminTasksService.uncompleteTask(taskId);
      setSuccessMessage('Task marked as incomplete.');
      await loadTask(); // Reload to show incomplete status
    } catch (err: any) {
      console.error('Failed to uncomplete task:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to undo completion';
      setError(errorMsg);
    } finally {
      setUncompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await adminTasksService.deleteTask(taskId);
      router.push('/tasks');
    } catch (err: any) {
      setError(err.message || 'Failed to delete task');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading task...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error || 'Task not found'}
        </div>
        <Link href="/tasks">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <Link href="/tasks">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Button>
        </Link>

        <div className="flex gap-2">
          {user?.authTier === 'ADMIN' && task?.dueDate && (
            <SendReminderButton taskId={taskId} dueDate={task.dueDate} />
          )}
          {canComplete && (
            <Button onClick={handleComplete} disabled={completing} variant="outline">
              <CheckCircle className="h-4 w-4 mr-2" />
              {completing ? 'Completing...' : 'Mark Complete'}
            </Button>
          )}
          {canUncomplete && (
            <Button onClick={handleUncomplete} disabled={uncompleting} variant="outline">
              {uncompleting ? 'Undoing...' : 'Undo Completion'}
            </Button>
          )}
          {canEdit && (
            <>
              <Link href={`/tasks/${taskId}/edit`}>
                <Button variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Task
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={handleDelete} 
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 mb-6 bg-green-50 border border-green-200 rounded-lg text-green-800">
          {successMessage}
        </div>
      )}

      {task && <TaskDetails task={task} />}
    </div>
  );
}
