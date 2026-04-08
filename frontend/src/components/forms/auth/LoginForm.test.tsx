import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginForm } from './LoginForm';

// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock auth context
const mockLogin = vi.fn();
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders login form with all fields', () => {
      render(<LoginForm />);

      expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /remember me/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
    });

    it('renders forgot password link', () => {
      render(<LoginForm />);

      const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i });
      expect(forgotPasswordLink).toBeInTheDocument();
      expect(forgotPasswordLink).toHaveAttribute('href', '/auth/reset-password');
      expect(forgotPasswordLink).toHaveAttribute('title', 'Contact your pack administrator to reset your password');
    });

    it('renders sign up link', () => {
      render(<LoginForm />);

      const signUpLink = screen.getByRole('link', { name: /sign up/i });
      expect(signUpLink).toBeInTheDocument();
      expect(signUpLink).toHaveAttribute('href', '/auth/register');
    });
  });

  describe('Form Validation', () => {
    it('shows error when submitting empty form', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /log in/i });
      await user.click(submitButton);

      expect(screen.getByText(/email and password are required/i)).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows error when email is missing', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, 'password123');

      const submitButton = screen.getByRole('button', { name: /log in/i });
      await user.click(submitButton);

      expect(screen.getByText(/email and password are required/i)).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('shows error when password is missing', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      const submitButton = screen.getByRole('button', { name: /log in/i });
      await user.click(submitButton);

      expect(screen.getByText(/email and password are required/i)).toBeInTheDocument();
      expect(mockLogin).not.toHaveBeenCalled();
    });

    it('clears error message when user types', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      // Submit empty form to trigger error
      const submitButton = screen.getByRole('button', { name: /log in/i });
      await user.click(submitButton);

      expect(screen.getByText(/email and password are required/i)).toBeInTheDocument();

      // Type in email field
      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, 'test@example.com');

      // Error should be cleared
      expect(screen.queryByText(/email and password are required/i)).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('allows user to type in email field', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
      await user.type(emailInput, 'test@example.com');

      expect(emailInput.value).toBe('test@example.com');
    });

    it('allows user to type in password field', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const passwordInput = screen.getByLabelText(/^password$/i) as HTMLInputElement;
      await user.type(passwordInput, 'SecurePass123!');

      expect(passwordInput.value).toBe('SecurePass123!');
    });

    it('allows user to toggle remember me checkbox', async () => {
      const user = userEvent.setup();
      render(<LoginForm />);

      const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i }) as HTMLInputElement;
      expect(rememberMeCheckbox.checked).toBe(false);

      await user.click(rememberMeCheckbox);
      expect(rememberMeCheckbox.checked).toBe(true);

      await user.click(rememberMeCheckbox);
      expect(rememberMeCheckbox.checked).toBe(false);
    });
  });

  describe('Form Submission - Success', () => {
    it('calls login with correct credentials', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({});
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'SecurePass123!', false);
      });
    });

    it('calls login with rememberMe when checked', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({});
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.click(rememberMeCheckbox);
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'SecurePass123!', true);
      });
    });

    it('redirects to home page on successful login', async () => {
      const user = userEvent.setup();
      mockLogin.mockResolvedValue({});
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });

    it('calls onSuccess callback when provided', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockLogin.mockResolvedValue({});
      render(<LoginForm onSuccess={onSuccess} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'SecurePass123!');
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(mockPush).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission - Errors', () => {
    it('displays error for invalid credentials (401)', async () => {
      const user = userEvent.setup();
      const error = {
        response: { status: 401, data: {} },
      };
      mockLogin.mockRejectedValue(error);
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'WrongPassword');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    it('displays error for rate limiting (429)', async () => {
      const user = userEvent.setup();
      const error = {
        response: { status: 429, data: {} },
      };
      mockLogin.mockRejectedValue(error);
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument();
      });
    });

    it('displays custom error message from server', async () => {
      const user = userEvent.setup();
      const error = {
        response: { status: 500, data: { error: 'Server is down' } },
      };
      mockLogin.mockRejectedValue(error);
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Server is down')).toBeInTheDocument();
      });
    });

    it('displays generic error for network issues', async () => {
      const user = userEvent.setup();
      mockLogin.mockRejectedValue(new Error('Network error'));
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading text when submitting', async () => {
      const user = userEvent.setup();
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      expect(screen.getByRole('button', { name: /logging in/i })).toBeInTheDocument();

      // Clean up
      resolveLogin!();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /^log in$/i })).toBeInTheDocument();
      });
    });

    it('disables form fields while loading', async () => {
      const user = userEvent.setup();
      let resolveLogin: () => void;
      const loginPromise = new Promise<void>((resolve) => {
        resolveLogin = resolve;
      });
      mockLogin.mockReturnValue(loginPromise);

      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);
      const rememberMeCheckbox = screen.getByRole('checkbox', { name: /remember me/i });
      const submitButton = screen.getByRole('button', { name: /log in/i });

      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password');
      await user.click(submitButton);

      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(rememberMeCheckbox).toBeDisabled();
      expect(submitButton).toBeDisabled();

      // Clean up
      resolveLogin!();
      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper labels for form fields', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      expect(emailInput).toHaveAttribute('id', 'email');
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('has proper autocomplete attributes', () => {
      render(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/^password$/i);

      expect(emailInput).toHaveAttribute('autocomplete', 'email');
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');
    });
  });
});
