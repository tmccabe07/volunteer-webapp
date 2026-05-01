'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import adminTasksService from '@/services/admin-tasks.service';
import { useAuth } from '@/lib/auth-context';
import { redirect } from 'next/navigation';

export default function TaskCompletionsPage() {
  const params = useParams();
  const { user } = useAuth();
  const taskId = params.id as string;

  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check permissions
  if (!user || (user.authTier !== 'LEADER' && user.authTier !== 'ADMIN')) {
    redirect('/tasks');
  }

  useEffect(() => {
    loadCompletions();
  }, [taskId]);

  const loadCompletions = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await adminTasksService.getTaskCompletions(taskId);
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to load task completions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading completions...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
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
        <Link href={`/tasks/${taskId}`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Task
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{data.task.name}</CardTitle>
          <CardDescription>
            Due: {new Date(data.task.dueDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-700">{data.stats.totalAssigned}</p>
              <p className="text-sm text-gray-600">Total Assigned</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-700">{data.stats.totalCompleted}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-700">{data.stats.completionRate}%</p>
              <p className="text-sm text-gray-600">Completion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Completed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Completed ({data.completions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.completions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No completions yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.completions.map((completion: any) => (
                    <TableRow key={completion.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{completion.volunteer.name}</p>
                          <p className="text-sm text-gray-500">{completion.volunteer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(completion.completedAt).toLocaleDateString('en-US')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Incomplete */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Incomplete ({data.assignedVolunteers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.assignedVolunteers.length === 0 ? (
              <p className="text-green-600 text-center py-4 font-medium">
                All assigned volunteers have completed this task!
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Volunteer</TableHead>
                    <TableHead>Roles</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.assignedVolunteers.map((volunteer: any) => (
                    <TableRow key={volunteer.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{volunteer.name}</p>
                          <p className="text-sm text-gray-500">{volunteer.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {volunteer.roles.map((role: any, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
