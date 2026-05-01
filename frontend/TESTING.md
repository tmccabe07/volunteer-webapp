# Frontend Testing Guide

This frontend uses **Vitest** with **React Testing Library** for component and unit testing.

## Running Tests

```bash
# Run tests in watch mode (interactive)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI dashboard
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test File Structure

- Place test files next to the code they test with `.test.ts` or `.test.tsx` extension
- Or place them in `src/test/` directory
- Example: `Button.tsx` → `Button.test.tsx`

## Writing Tests

### Basic Component Test

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Testing User Interactions

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    
    render(<button onClick={handleClick}>Click</button>);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Testing Async Operations

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('AsyncComponent', () => {
  it('loads and displays data', async () => {
    render(<AsyncComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Data loaded')).toBeInTheDocument();
    });
  });
});
```

### Mocking Functions

```tsx
import { vi } from 'vitest';

// Mock a function
const mockFn = vi.fn();
mockFn.mockReturnValue(42);

// Mock a module
vi.mock('@/services/api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'test' }),
}));
```

## Available Test Utilities

- `describe()` - Group related tests
- `it()` / `test()` - Define a test case
- `expect()` - Make assertions
- `vi.fn()` - Create mock functions
- `vi.mock()` - Mock modules
- `beforeEach()` / `afterEach()` - Setup/cleanup hooks
- `beforeAll()` / `afterAll()` - One-time setup/cleanup

## Testing Library Queries

Prefer queries in this order (most to least preferred):

1. `getByRole()` - Most accessible
2. `getByLabelText()` - Form elements
3. `getByPlaceholderText()` - Form elements
4. `getByText()` - Non-interactive content
5. `getByTestId()` - Last resort

Use `findBy*` for async elements that appear after some time.
Use `queryBy*` when checking that something doesn't exist.

## Coverage

Coverage reports are generated in `coverage/` directory when running `npm run test:coverage`.

Minimum coverage thresholds (can be configured in `vitest.config.ts`):
- Statements: Target 80%+
- Branches: Target 80%+
- Functions: Target 80%+
- Lines: Target 80%+

## Configuration

Testing configuration is in `vitest.config.ts`:
- Environment: jsdom (browser simulation)
- Global test APIs enabled
- Setup file: `src/test/setup.ts`
- Coverage provider: v8

## Tips

1. **Test user behavior, not implementation**: Focus on what users see and do
2. **Use semantic queries**: Prefer `getByRole` over `getByTestId`
3. **Avoid testing styles**: Test functionality, not CSS
4. **Keep tests simple**: One concept per test
5. **Use descriptive test names**: Make test failures clear
6. **Mock external dependencies**: Keep tests isolated and fast

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
