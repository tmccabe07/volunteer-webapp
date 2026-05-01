import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

// Example component for testing
function ExampleButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return <button onClick={onClick}>{label}</button>;
}

describe('ExampleButton', () => {
  it('renders button with correct label', () => {
    render(<ExampleButton label="Click me" />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<ExampleButton label="Click me" onClick={handleClick} />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
