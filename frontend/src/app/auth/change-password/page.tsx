'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import axios from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Validate new password meets requirements
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      await axios.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      // Password changed successfully
      alert('Password changed successfully! Please log in with your new password.');
      
      // Logout user and redirect to login
      await logout();
      router.push('/auth/login');
    } catch (err: any) {
      console.error('Change password error:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        'Failed to change password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect if user is not logged in
  if (!user) {
    router.push('/auth/login');
    return null;
  }

  const isRequired = user.mustChangePassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <Card>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isRequired ? 'Change Password Required' : 'Change Password'}
            </h2>
            {isRequired && (
              <p className="mt-2 text-sm text-orange-600">
                Your password was reset by an administrator. 
                You must change it before continuing.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium mb-1">
                Current Password
              </label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium mb-1">
                New Password
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Enter new password"
              />
              <p className="mt-1 text-xs text-gray-500">
                Min 8 chars, uppercase, lowercase, number, special character
              </p>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
                Confirm New Password
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                placeholder="Confirm new password"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </Button>

            {!isRequired && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}
