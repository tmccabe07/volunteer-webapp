'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { authService } from '@/services/auth.service';

interface ResetPasswordFormProps {
  token?: string;
  onSuccess?: () => void;
}

export function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Reset password with token (for admin-provided reset links)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    // Password validation
    if (!newPassword) {
      newErrors.newPassword = 'Password is required';
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(newPassword)) {
      newErrors.newPassword = 'Password must include uppercase letter';
    } else if (!/[a-z]/.test(newPassword)) {
      newErrors.newPassword = 'Password must include lowercase letter';
    } else if (!/[0-9]/.test(newPassword)) {
      newErrors.newPassword = 'Password must include number';
    } else if (!/[^A-Za-z0-9]/.test(newPassword)) {
      newErrors.newPassword = 'Password must include special character';
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const data = await authService.resetPassword(token!, newPassword);
      setSuccessMessage(data.message);
      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (error: any) {
      if (error.response) {
        const { status, data } = error.response;
        if (status === 400) {
          setErrors({ general: 'Invalid or expired reset token' });
        } else {
          setErrors({ general: data.error || 'Password reset failed' });
        }
      } else {
        setErrors({ general: 'An unexpected error occurred' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show reset password form if token provided
  if (token) {
    return (
      <Card className="p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-6">Reset Password</h2>

        {errors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm">
            {errors.general}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-800 text-sm">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium mb-1">
              New Password *
            </label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              disabled={isLoading || !!successMessage}
              className={errors.newPassword ? 'border-red-500' : ''}
            />
            {errors.newPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Must be 8+ characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
              Confirm Password *
            </label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={isLoading || !!successMessage}
              className={errors.confirmPassword ? 'border-red-500' : ''}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
            )}
          </div>

          <Button type="submit" disabled={isLoading || !!successMessage} className="w-full">
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </form>

        {successMessage && (
          <p className="mt-4 text-center text-sm text-gray-600">
            <a href="/auth/login" className="text-blue-600 hover:underline">
              Return to login
            </a>
          </p>
        )}
      </Card>
    );
  }

  // Show admin-assisted reset instructions
  return (
    <Card className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6">Reset Password</h2>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">Need to Reset Your Password?</h3>
        <p className="text-sm text-blue-800 mb-3">
          For security, password resets are handled by your pack administrator.
        </p>
        <div className="text-sm text-blue-900">
          <p className="mb-2"><strong>Please contact:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Your Cubmaster or Committee Chair</li>
            <li>Any Pack Administrator</li>
          </ul>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
        <h4 className="font-medium text-gray-900 mb-2">How it works:</h4>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
          <li>Contact your pack administrator</li>
          <li>They'll provide you with a temporary password</li>
          <li>Log in with the temporary password</li>
          <li>You'll be prompted to create a new password</li>
        </ol>
      </div>

      <p className="text-center text-sm text-gray-600">
        Remember your password?{' '}
        <a href="/auth/login" className="text-blue-600 hover:underline">
          Log in
        </a>
      </p>
    </Card>
  );
}
