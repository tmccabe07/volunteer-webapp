'use client';

import { useRequireAuth, useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, isLoading } = useRequireAuth();
  const { logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // useRequireAuth will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                CS
              </div>
              <span className="text-xl font-bold text-gray-900">Cub Scout Volunteers</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">Welcome, {user.name}!</span>
              <Button variant="outline" onClick={() => logout()}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* User Info Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> {user.name}
              </div>
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              {user.phone && (
                <div>
                  <span className="font-medium">Phone:</span> {user.phone}
                </div>
              )}
              <div>
                <span className="font-medium">Role:</span>{' '}
                <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                  {user.authTier}
                </span>
              </div>
            </div>
          </Card>

          {/* Points Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Your Points</h2>
            <div className="space-y-3">
              <div>
                <div className="text-3xl font-bold text-blue-600">
                  {user.pointBalance?.currentYearPoints || 0}
                </div>
                <div className="text-gray-600 text-sm">Points This Year</div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-700">
                  {user.pointBalance?.totalPoints || 0}
                </div>
                <div className="text-gray-600 text-sm">Total Points</div>
              </div>
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button className="w-full" variant="outline">
                View Events
              </Button>
              <Button className="w-full" variant="outline">
                My Tasks
              </Button>
              <Button className="w-full" variant="outline">
                Leaderboard
              </Button>
            </div>
          </Card>
        </div>

        {/* Placeholder sections */}
        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
            <p className="text-gray-600 text-sm">No events scheduled yet.</p>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <p className="text-gray-600 text-sm">No recent activity.</p>
          </Card>
        </div>
      </main>
    </div>
  );
}
