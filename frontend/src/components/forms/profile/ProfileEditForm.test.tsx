import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileEditForm, ProfileData } from './ProfileEditForm';

// Mock UI components to avoid dependencies
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

describe('ProfileEditForm', () => {
  const mockInitialData: ProfileData = {
    name: 'John Doe',
    phone: '555-1234',
    leaderboardOptIn: true,
  };

  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockResolvedValue(undefined);
    mockOnCancel.mockClear();
  });

  afterEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
    cleanup();
  });

  describe('Initial Rendering', () => {
    it('should render the form with initial data', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe');
      expect(screen.getByLabelText(/phone/i)).toHaveValue('555-1234');
      expect(screen.getByLabelText(/show me on the public leaderboard/i)).toBeChecked();
    });

    it('should render all form fields', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show me on the public leaderboard/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    it('should show cancel button when onCancel is provided', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not show cancel button when onCancel is not provided', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('should display "Edit Profile" heading', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByRole('heading', { name: /edit profile/i })).toBeInTheDocument();
    });

    it('should mark name field as required', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      // Look for the asterisk in the label
      expect(screen.getByText(/name \*/i)).toBeInTheDocument();
    });

    it('should show phone placeholder', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByPlaceholderText(/\(555\) 555-5555/i)).toBeInTheDocument();
    });
  });

  describe('Leaderboard Opt-In Toggle', () => {
    it('should show PUBLIC badge when opted in', () => {
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, leaderboardOptIn: true }}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('PUBLIC')).toBeInTheDocument();
      expect(screen.getByText(/your profile and points will be/i)).toBeInTheDocument();
      expect(screen.getByText(/visible/i)).toBeInTheDocument();
    });

    it('should show PRIVATE badge when opted out', () => {
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, leaderboardOptIn: false }}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('PRIVATE')).toBeInTheDocument();
      expect(screen.getByText(/your profile will be/i)).toBeInTheDocument();
      expect(screen.getByText(/hidden/i)).toBeInTheDocument();
    });

    it('should toggle leaderboard opt-in when checkbox is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, leaderboardOptIn: true }}
          onSubmit={mockOnSubmit}
        />
      );

      const checkbox = screen.getByLabelText(/show me on the public leaderboard/i);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
      expect(screen.getByText('PRIVATE')).toBeInTheDocument();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByText('PUBLIC')).toBeInTheDocument();
    });

    it('should submit with updated leaderboard preference', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, leaderboardOptIn: true }}
          onSubmit={mockOnSubmit}
        />
      );

      const checkbox = screen.getByLabelText(/show me on the public leaderboard/i);
      await user.click(checkbox);

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          phone: '555-1234',
          leaderboardOptIn: false,
        });
      });
    });
  });

  describe('Form Interactions', () => {
    it('should update name field when typing', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');

      expect(nameInput).toHaveValue('Jane Smith');
    });

    it('should update phone field when typing', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '555-9999');

      expect(phoneInput).toHaveValue('555-9999');
    });

    it('should clear field error when user starts typing', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, name: '' }}
          onSubmit={mockOnSubmit}
        />
      );

      // Submit to trigger validation error
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      // Verify error appears
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // Type in the field
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'John');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Validation', () => {
    it('should show error when name is empty', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, name: '' }}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when name is only whitespace', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, name: '   ' }}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should show error when name exceeds 100 characters', async () => {
      const user = userEvent.setup();
      const longName = 'a'.repeat(101);
      
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, name: longName }}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name must be 100 characters or less/i)).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should accept name with exactly 100 characters', async () => {
      const user = userEvent.setup();
      const exactlyHundredChars = 'a'.repeat(100);
      
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, name: exactlyHundredChars }}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: exactlyHundredChars,
          phone: '555-1234',
          leaderboardOptIn: true,
        });
      });
    });

    it('should not validate phone field (optional)', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, phone: '' }}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          phone: '',
          leaderboardOptIn: true,
        });
      });
    });

    it('should apply error styling to name field when validation fails', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, name: '' }}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/name/i);
        expect(nameInput).toHaveClass('border-red-500');
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          phone: '555-1234',
          leaderboardOptIn: true,
        });
      });
    });

    it('should submit form with updated data', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      const phoneInput = screen.getByLabelText(/phone/i);

      await user.clear(nameInput);
      await user.type(nameInput, 'Jane Smith');
      await user.clear(phoneInput);
      await user.type(phoneInput, '555-8888');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Jane Smith',
          phone: '555-8888',
          leaderboardOptIn: true,
        });
      });
    });

    it('should submit form when pressing Enter in name field', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.click(nameInput);
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(mockInitialData);
      });
    });

    it('should clear validation errors before submitting', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, name: '' }}
          onSubmit={mockOnSubmit}
        />
      );

      // First submission fails
      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      // Fix the error
      const nameInput = screen.getByLabelText(/name/i);
      await user.type(nameInput, 'John Doe');

      // Second submission succeeds
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          phone: '555-1234',
          leaderboardOptIn: true,
        });
      });

      // Error message should be gone
      expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading text during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: any;
      const slowSubmit = vi.fn(() => new Promise(resolve => {
        resolveSubmit = resolve;
      }));

      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={slowSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByRole('button', { name: /saving.../i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /saving.../i })).toBeDisabled();

      // Resolve and check it returns to normal
      resolveSubmit();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
      });
    });

    it('should disable all inputs during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: any;
      const slowSubmit = vi.fn(() => new Promise(resolve => {
        resolveSubmit = resolve;
      }));

      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={slowSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      // All inputs should be disabled
      expect(screen.getByLabelText(/name/i)).toBeDisabled();
      expect(screen.getByLabelText(/phone/i)).toBeDisabled();
      expect(screen.getByLabelText(/show me on the public leaderboard/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();

      // Resolve and check they're enabled again
      resolveSubmit();
      await waitFor(() => {
        expect(screen.getByLabelText(/name/i)).not.toBeDisabled();
      });
    });

    it('should not allow re-submission while loading', async () => {
      const user = userEvent.setup();
      let resolveSubmit: any;
      const slowSubmit = vi.fn(() => new Promise(resolve => {
        resolveSubmit = resolve;
      }));

      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={slowSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      // Try to click again while loading
      const loadingButton = screen.getByRole('button', { name: /saving.../i });
      await user.click(loadingButton);

      // Should only be called once
      expect(slowSubmit).toHaveBeenCalledTimes(1);

      resolveSubmit();
    });
  });

  describe('Error Handling', () => {
    it('should show general error message when submission fails', async () => {
      const user = userEvent.setup();
      const error = {
        response: {
          data: {
            error: 'Server error occurred',
          },
        },
      };
      mockOnSubmit.mockRejectedValueOnce(error);

      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/server error occurred/i)).toBeInTheDocument();
      });
    });

    it('should show details error when multiple validation errors occur', async () => {
      const user = userEvent.setup();
      const error = {
        response: {
          data: {
            details: ['Name is invalid', 'Phone format is incorrect'],
          },
        },
      };
      mockOnSubmit.mockRejectedValueOnce(error);

      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/name is invalid, phone format is incorrect/i)).toBeInTheDocument();
      });
    });

    it('should show generic error message when no specific error provided', async () => {
      const user = userEvent.setup();
      mockOnSubmit.mockRejectedValueOnce(new Error('Network failure'));

      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
      });
    });

    it('should clear general error when resubmitting', async () => {
      const user = userEvent.setup();
      const error = {
        response: {
          data: {
            error: 'Server error',
          },
        },
      };
      mockOnSubmit.mockRejectedValueOnce(error);

      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      
      // First submission fails
      await user.click(submitButton);
      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });

      // Second submission succeeds
      mockOnSubmit.mockResolvedValueOnce(undefined);
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/server error/i)).not.toBeInTheDocument();
      });
    });

    it('should re-enable form after error', async () => {
      const user = userEvent.setup();
      const error = {
        response: {
          data: {
            error: 'Server error',
          },
        },
      };
      mockOnSubmit.mockRejectedValueOnce(error);

      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/server error/i)).toBeInTheDocument();
      });

      // Form should be enabled again
      expect(screen.getByLabelText(/name/i)).not.toBeDisabled();
      expect(screen.getByLabelText(/phone/i)).not.toBeDisabled();
      expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not submit form when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should cancel even if form has unsaved changes', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // Make changes
      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Changed Name');

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form fields', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show me on the public leaderboard/i)).toBeInTheDocument();
    });

    it('should have semantic form structure', () => {
      const { container } = render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should have submit button with type="submit"', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      expect(submitButton).toHaveAttribute('type', 'submit');
    });

    it('should have cancel button with type="button"', () => {
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveAttribute('type', 'button');
    });

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={{ ...mockInitialData, name: '' }}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/name is required/i);
        expect(errorMessage).toBeInTheDocument();
        
        // Error should be near the input
        const nameInput = screen.getByLabelText(/name/i);
        const inputParent = nameInput.closest('div');
        expect(inputParent).toContainElement(errorMessage);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty initial data', () => {
      const emptyData: ProfileData = {
        name: '',
        phone: '',
        leaderboardOptIn: false,
      };

      render(
        <ProfileEditForm
          initialData={emptyData}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/name/i)).toHaveValue('');
      expect(screen.getByLabelText(/phone/i)).toHaveValue('');
      expect(screen.getByLabelText(/show me on the public leaderboard/i)).not.toBeChecked();
    });

    it('should handle special characters in name', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, "O'Brien-Smith, Jr.");

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: "O'Brien-Smith, Jr.",
          phone: '555-1234',
          leaderboardOptIn: true,
        });
      });
    });

    it('should handle phone numbers with various formats', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const phoneInput = screen.getByLabelText(/phone/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '(555) 123-4567 ext. 890');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'John Doe',
          phone: '(555) 123-4567 ext. 890',
          leaderboardOptIn: true,
        });
      });
    });

    it('should preserve whitespace in name (except leading/trailing)', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, '  John   Doe  ');

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: '  John   Doe  ',
          phone: '555-1234',
          leaderboardOptIn: true,
        });
      });
    });

    it('should handle rapid toggling of leaderboard checkbox', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const checkbox = screen.getByLabelText(/show me on the public leaderboard/i);
      
      // Initial state: checked (true)
      expect(checkbox).toBeChecked();
      
      // Rapidly toggle 4 times: unchecked -> checked -> unchecked -> checked
      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);

      // Should end in the correct state (checked after even number of toggles)
      expect(checkbox).toBeChecked();
      expect(screen.getByText('PUBLIC')).toBeInTheDocument();
    });

    it('should handle submission with unchanged data', async () => {
      const user = userEvent.setup();
      render(
        <ProfileEditForm
          initialData={mockInitialData}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', { name: /save changes/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(mockInitialData);
      });
    });
  });
});
