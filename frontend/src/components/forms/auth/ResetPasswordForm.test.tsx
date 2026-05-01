import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResetPasswordForm } from './ResetPasswordForm';

const mockResetPassword = vi.fn();

vi.mock('@/services/auth.service', () => ({
  authService: {
    get resetPassword() {
      return mockResetPassword;
    },
  },
}));

describe('ResetPasswordForm', () => {
  beforeEach(() => {
    mockResetPassword.mockClear();
    mockResetPassword.mockResolvedValue({ message: 'Success' });
  });
  
  afterEach(() => {
    mockResetPassword.mockRestore();
    vi.useRealTimers();
  });

  describe('Without Token - Instructions Mode', () => {
    it('renders instructions when no token provided', () => {
      render(<ResetPasswordForm />);

      expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      expect(screen.getByText(/need to reset your password\?/i)).toBeInTheDocument();
      expect(screen.getByText(/for security, password resets are handled by your pack administrator/i)).toBeInTheDocument();
    });

    it('displays contact instructions', () => {
      render(<ResetPasswordForm />);

      expect(screen.getByText(/please contact:/i)).toBeInTheDocument();
      expect(screen.getByText(/your cubmaster or committee chair/i)).toBeInTheDocument();
      expect(screen.getByText(/any pack administrator/i)).toBeInTheDocument();
    });

    it('displays step-by-step guide', () => {
      render(<ResetPasswordForm />);

      expect(screen.getByText(/how it works:/i)).toBeInTheDocument();
      expect(screen.getByText(/contact your pack administrator/i)).toBeInTheDocument();
      expect(screen.getByText(/they'll provide you with a temporary password/i)).toBeInTheDocument();
      expect(screen.getByText(/log in with the temporary password/i)).toBeInTheDocument();
      expect(screen.getByText(/you'll be prompted to create a new password/i)).toBeInTheDocument();
    });

    it('renders login link', () => {
      render(<ResetPasswordForm />);

      const loginLink = screen.getByRole('link', { name: /log in/i });
      expect(loginLink).toBeInTheDocument();
      expect(loginLink).toHaveAttribute('href', '/auth/login');
    });

    it('does not render password form fields', () => {
      render(<ResetPasswordForm />);

      expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reset password/i })).not.toBeInTheDocument();
    });
  });

  describe('With Token - Reset Form Mode', () => {
    it('renders password reset form when token provided', () => {
      render(<ResetPasswordForm token="test-reset-token" />);

      expect(screen.getByRole('heading', { name: /reset password/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    it('displays password requirements hint', () => {
      render(<ResetPasswordForm token="test-reset-token" />);

      expect(screen.getByText(/must be 8\+ characters with uppercase, lowercase, number, and special character/i)).toBeInTheDocument();
    });

    it('does not render instructions when token provided', () => {
      render(<ResetPasswordForm token="test-reset-token" />);

      expect(screen.queryByText(/need to reset your password\?/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/for security, password resets are handled by your pack administrator/i)).not.toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error when password is missing', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="test-reset-token" />);

      const submitButton = screen.getByRole('button', { name: /reset password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('shows error when password is too short', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'Short1!');
      await user.type(confirmPasswordInput, 'Short1!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('shows error when password missing uppercase', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'password123!');
      await user.type(confirmPasswordInput, 'password123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must include uppercase letter/i)).toBeInTheDocument();
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('shows error when password missing lowercase', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'PASSWORD123!');
      await user.type(confirmPasswordInput, 'PASSWORD123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must include lowercase letter/i)).toBeInTheDocument();
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('shows error when password missing number', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'SecurePassword!');
      await user.type(confirmPasswordInput, 'SecurePassword!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must include number/i)).toBeInTheDocument();
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('shows error when password missing special character', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'SecurePassword123');
      await user.type(confirmPasswordInput, 'SecurePassword123');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must include special character/i)).toBeInTheDocument();
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'SecurePass123!');
      await user.type(confirmPasswordInput, 'DifferentPass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
      expect(mockResetPassword).not.toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('allows user to type in new password field', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i) as HTMLInputElement;
      await user.type(newPasswordInput, 'SecurePass123!');

      expect(newPasswordInput.value).toBe('SecurePass123!');
    });

    it('allows user to type in confirm password field', async () => {
      const user = userEvent.setup();
      render(<ResetPasswordForm token="test-reset-token" />);

      const confirmPasswordInput = screen.getByLabelText(/confirm password/i) as HTMLInputElement;
      await user.type(confirmPasswordInput, 'SecurePass123!');

      expect(confirmPasswordInput.value).toBe('SecurePass123!');
    });
  });

  describe('Form Submission - Success', () => {
    it('calls resetPassword with correct token and password', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ message: 'Password reset successful' });
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockResetPassword).toHaveBeenCalledWith('test-reset-token', 'NewSecurePass123!');
      });
    });

    it('displays success message', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ message: 'Password reset successful' });
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password reset successful')).toBeInTheDocument();
      });
    });

    it('shows login link after successful reset', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ message: 'Password reset successful' });
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        const loginLink = screen.getByRole('link', { name: /return to login/i });
        expect(loginLink).toBeInTheDocument();
        expect(loginLink).toHaveAttribute('href', '/auth/login');
      });
    });

    it('calls onSuccess callback after successful reset', async () => {
      const onSuccess = vi.fn();
      mockResetPassword.mockResolvedValue({ message: 'Password reset successful' });
      
      render(<ResetPasswordForm token="test-reset-token" onSuccess={onSuccess} />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });
      const user = userEvent.setup();

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      // Wait for success message to appear
      await waitFor(() => {
        expect(screen.getByText('Password reset successful')).toBeInTheDocument();
      });
      
      // Wait for the callback to be invoked (it has a 2 second delay)
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('disables form after successful reset', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockResolvedValue({ message: 'Password reset successful' });
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Password reset successful')).toBeInTheDocument();
      });

      expect(newPasswordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Form Submission - Errors', () => {
    it('displays error for invalid or expired token (400)', async () => {
      const user = userEvent.setup();
      const error = {
        response: { status: 400, data: {} },
      };
      mockResetPassword.mockRejectedValue(error);
      render(<ResetPasswordForm token="expired-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid or expired reset token/i)).toBeInTheDocument();
      });
    });

    it('displays custom error message from server', async () => {
      const user = userEvent.setup();
      const error = {
        response: { status: 500, data: { error: 'Server error' } },
      };
      mockResetPassword.mockRejectedValue(error);
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('displays generic error for network issues', async () => {
      const user = userEvent.setup();
      mockResetPassword.mockRejectedValue(new Error('Network error'));
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading text when submitting', async () => {
      const user = userEvent.setup();
      let resolveReset: () => void;
      const resetPromise = new Promise<{ message: string }>((resolve) => {
        resolveReset = () => resolve({ message: 'Success' });
      });
      mockResetPassword.mockReturnValue(resetPromise);

      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: /resetting/i })).toBeInTheDocument();

      // Clean up
      resolveReset!();
      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });

    it('disables form fields while loading', async () => {
      const user = userEvent.setup();
      let resolveReset: () => void;
      const resetPromise = new Promise<{ message: string }>((resolve) => {
        resolveReset = () => resolve({ message: 'Success' });
      });
      mockResetPassword.mockReturnValue(resetPromise);

      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await user.type(newPasswordInput, 'NewSecurePass123!');
      await user.type(confirmPasswordInput, 'NewSecurePass123!');
      await user.click(submitButton);

      expect(newPasswordInput).toBeDisabled();
      expect(confirmPasswordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();

      // Clean up
      resolveReset!();
      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for password fields', () => {
      render(<ResetPasswordForm token="test-reset-token" />);

      const newPasswordInput = screen.getByLabelText(/new password/i);
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

      expect(newPasswordInput).toHaveAttribute('id', 'newPassword');
      expect(confirmPasswordInput).toHaveAttribute('id', 'confirmPassword');
    });
  });
});
