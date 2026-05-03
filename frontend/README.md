# Frontend - Cub Scout Volunteer Management

**Framework**: Next.js 14 with App Router and TypeScript  
**UI Library**: React 18 with TailwindCSS and shadcn/ui  
**Node Version**: 20.x LTS

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Architecture](#architecture)
4. [Development](#development)
5. [Testing](#testing)
6. [Styling](#styling)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- npm 10.x or later
- Backend API running on `http://localhost:3001`

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
```

### Running the Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production build
npm run build

# Run production build locally
npm run start
```

The application will be available at `http://localhost:3000`.

### Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Application Configuration
NEXT_PUBLIC_APP_NAME="Cub Scout Volunteer Management"
```

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser.

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── layout.tsx         # Root layout with providers
│   │   ├── page.tsx           # Home/dashboard page
│   │   ├── not-found.tsx      # 404 page
│   │   ├── error.tsx          # Error boundary
│   │   ├── auth/              # Authentication pages
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── change-password/
│   │   │   └── reset-password/
│   │   ├── profile/           # Profile pages
│   │   │   ├── page.tsx       # View profile
│   │   │   └── edit/
│   │   ├── events/            # Event management
│   │   │   ├── page.tsx       # List events
│   │   │   ├── [id]/          # Event details
│   │   │   ├── create/        # Create event (Tier 2+)
│   │   │   └── [id]/edit/     # Edit event (Tier 2+)
│   │   ├── tasks/             # Administrative tasks
│   │   │   ├── page.tsx       # List tasks
│   │   │   ├── [id]/          # Task details
│   │   │   └── create/        # Create task (Tier 2+)
│   │   ├── points/            # Points and gamification
│   │   │   └── page.tsx       # Point history
│   │   ├── leaderboard/       # Leaderboard
│   │   │   └── page.tsx
│   │   ├── notifications/     # Notifications
│   │   │   └── page.tsx
│   │   ├── reports/           # Reporting (Tier 2+)
│   │   │   ├── page.tsx       # Reports dashboard
│   │   │   ├── participation/
│   │   │   ├── administrative-tasks/
│   │   │   └── upcoming-events/
│   │   ├── volunteers/        # Volunteer management (Tier 2+)
│   │   │   ├── page.tsx       # List volunteers
│   │   │   └── [id]/          # Volunteer details
│   │   └── admin/             # Admin pages (Tier 2+/3)
│   │       ├── volunteers/    # Password reset (Tier 2+)
│   │       ├── activities/    # Activity types (Tier 3)
│   │       ├── roles/         # Volunteer roles (Tier 3)
│   │       └── config/        # Pack config (Tier 3)
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   ├── forms/             # Form components
│   │   │   ├── auth/
│   │   │   ├── profile/
│   │   │   ├── events/
│   │   │   ├── tasks/
│   │   │   ├── config/
│   │   │   └── reports/
│   │   ├── layouts/           # Layout components
│   │   │   ├── header.tsx
│   │   │   ├── navigation.tsx
│   │   │   └── footer.tsx
│   │   └── shared/            # Shared components
│   │       ├── LoadingSpinner.tsx
│   │       ├── ErrorBoundary.tsx
│   │       ├── points/
│   │       ├── events/
│   │       ├── tasks/
│   │       ├── notifications/
│   │       └── reports/
│   ├── services/              # API client services
│   │   ├── auth.service.ts
│   │   ├── volunteer.service.ts
│   │   ├── events.service.ts
│   │   ├── admin-tasks.service.ts
│   │   ├── points.service.ts
│   │   ├── reports.service.ts
│   │   ├── notifications.service.ts
│   │   └── config.service.ts
│   ├── lib/                   # Shared libraries
│   │   ├── axios.ts          # Axios client configuration
│   │   ├── auth-context.tsx  # Authentication context
│   │   └── notification-context.tsx  # Notification context
│   ├── middleware.ts          # Next.js middleware (route protection)
│   └── styles/                # Global styles
│       └── globals.css
├── public/                    # Static assets
│   ├── badges/                # Badge tier icons
│   └── ...
├── test/                      # Tests
│   ├── unit/                  # Vitest unit tests
│   └── e2e/                   # Playwright E2E tests (future)
├── vitest.config.ts           # Vitest configuration
├── tailwind.config.ts         # TailwindCSS configuration
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript configuration
├── postcss.config.mjs         # PostCSS configuration
├── eslint.config.mjs          # ESLint configuration
└── package.json               # Dependencies and scripts
```

---

## Architecture

### App Router (Next.js 14)

This project uses Next.js 14's App Router with the following patterns:

- **Server Components**: Default for all components (better performance)
- **Client Components**: Use `'use client'` directive for interactivity
- **Route Groups**: Organize routes without affecting URL structure
- **Layouts**: Shared UI across routes
- **Loading States**: `loading.tsx` for route-level loading indicators
- **Error Boundaries**: `error.tsx` for route-level error handling

### State Management

- **Server State**: React Query (future enhancement) or fetch with caching
- **Client State**: React Context API for auth and notifications
- **Form State**: Controlled components with React Hook Form (if needed)

### API Communication

All API calls go through service files in `src/services/`:

```typescript
// Example: src/services/auth.service.ts
import { apiClient } from '@/lib/axios';

export const authService = {
  async login(credentials) {
    const response = await apiClient.post('/auth/login', credentials);
    return response.data;
  },
  
  async logout() {
    await apiClient.post('/auth/logout');
  },
  
  // ... more methods
};
```

The Axios client (`src/lib/axios.ts`) handles:
- Token refresh on 401 errors
- Request/response interceptors
- Error handling
- Base URL configuration

### Authentication & Authorization

- **Auth Context** (`src/lib/auth-context.tsx`): Manages user session
- **Middleware** (`src/middleware.ts`): Protects routes based on tier
- **Client-Side Guards**: Components check auth state before rendering

Three-tier authorization:
- **Public Routes**: Login, register
- **Tier 1 (PARENT)**: Dashboard, profile, events, tasks, points
- **Tier 2 (LEADER)**: + Reports, volunteer list, create events/tasks, admin volunteers
- **Tier 3 (ADMIN)**: + Pack config, activity types, role management

### Route Protection

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  
  // Check if route requires authentication
  // Redirect to login if not authenticated
  // Check tier requirements for admin routes
}
```

---

## Development

### Code Style

- Follow TypeScript best practices
- Use ESLint for linting: `npm run lint`
- Format code: TailwindCSS for styling, shadcn/ui for components
- Use meaningful component and variable names
- Add JSDoc comments for complex logic

### Component Guidelines

**Server Components** (default):
```typescript
// No 'use client' directive
export default async function EventsPage() {
  // Can fetch data directly
  const events = await fetch('/api/events').then(r => r.json());
  return <div>{/* Render events */}</div>;
}
```

**Client Components** (interactive):
```typescript
'use client';

import { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  // ... form logic
}
```

### Adding New Pages

1. Create route directory in `src/app/`
2. Add `page.tsx` (the page component)
3. Optionally add `layout.tsx`, `loading.tsx`, `error.tsx`
4. Update navigation in `src/components/layouts/navigation.tsx`
5. Add route protection in `src/middleware.ts` if needed

### Adding shadcn/ui Components

```bash
# Add a new component from shadcn/ui
npx shadcn@latest add <component-name>

# Example: Add a dropdown menu
npx shadcn@latest add dropdown-menu
```

Components are added to `src/components/ui/` and can be imported directly.

### Environment-Specific Behavior

```typescript
// Check environment
if (process.env.NODE_ENV === 'development') {
  // Development-only code
}

// Access public env variables
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

---

## Testing

### Running Tests

```bash
# Unit tests (Vitest)
npm run test

# Unit tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# E2E tests (Playwright) - future
npm run test:e2e
```

### Writing Unit Tests

```typescript
// Example: LoginForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('renders email and password inputs', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
  
  it('calls onSubmit with form data', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Password123!' }
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));
    
    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Password123!'
    });
  });
});
```

See [TESTING.md](./TESTING.md) for detailed testing guidelines.

---

## Styling

### TailwindCSS

Utility-first CSS framework. Common patterns:

```typescript
// Responsive design
<div className="w-full md:w-1/2 lg:w-1/3">

// Dark mode (if implemented)
<div className="bg-white dark:bg-gray-900">

// Hover states
<button className="bg-blue-500 hover:bg-blue-600">

// Flexbox/Grid
<div className="flex items-center justify-between">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

### shadcn/ui Components

Pre-built, customizable components:

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Click Me</Button>
      </CardContent>
    </Card>
  );
}
```

### Custom Styles

Global styles in `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Custom base styles */
}

@layer components {
  /* Custom component classes */
  .btn-primary {
    @apply bg-blue-500 text-white px-4 py-2 rounded;
  }
}
```

### Responsive Design

Mobile-first approach with TailwindCSS breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Accessibility

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- Add ARIA labels: `aria-label`, `aria-describedby`
- Ensure keyboard navigation works
- Use appropriate color contrast ratios
- Test with screen readers

---

## Deployment

### Production Build

```bash
# Build the application
npm run build

# Test production build locally
npm run start
```

The build output is in `.next/` directory.

### Environment Variables

Set production environment variables on your hosting platform:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_APP_NAME="Cub Scout Pack 123"
```

### Deployment Platforms

**Vercel** (recommended for Next.js):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Other Platforms**:
- Netlify: Configure build command `npm run build` and publish directory `.next`
- AWS Amplify: Connect Git repository and configure build settings
- Docker: See Dockerfile example below

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

Update `next.config.ts`:
```typescript
export default {
  output: 'standalone',
  // ... other config
};
```

### Performance Optimization

- Enable Next.js Image Optimization
- Use dynamic imports for large components
- Implement code splitting
- Enable compression
- Use CDN for static assets
- Monitor Core Web Vitals

---

## Troubleshooting

### Common Issues

**Problem**: `Error: Invalid src prop` on Image component  
**Solution**: Ensure image paths are correct. Use absolute paths for external images. Configure `next.config.ts` for external image domains.

**Problem**: `Module not found: Can't resolve '@/...'`  
**Solution**: Check `tsconfig.json` has correct path mapping:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Problem**: Hydration errors in development  
**Solution**: Ensure server and client render the same content. Check for browser-only APIs in server components.

**Problem**: `Cannot read properties of undefined` in API calls  
**Solution**: Check API is running. Verify `NEXT_PUBLIC_API_URL` is set. Check network tab for request failures.

**Problem**: Authentication redirects not working  
**Solution**: Ensure middleware.ts is configured correctly. Check cookies are being set with correct domain/path.

**Problem**: TailwindCSS styles not applying  
**Solution**: Verify class names are correct. Check `tailwind.config.ts` content paths include all component files.

### Debug Mode

Enable debug logging:
```typescript
// Add to components
console.log('Debug info:', data);

// Enable React DevTools
// Install browser extension
```

### Browser DevTools

- **Network Tab**: Monitor API requests/responses
- **React DevTools**: Inspect component tree and props
- **Console**: Check for errors and warnings
- **Application Tab**: Inspect cookies, localStorage, sessionStorage

---

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [API Documentation](../docs/api-documentation.md)
- [Backend README](../backend/README.md)
- [Feature Specification](../specs/001-volunteer-management/spec.md)

---

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes following the development guidelines
3. Write tests for new functionality
4. Ensure all tests pass: `npm test`
5. Ensure linting passes: `npm run lint`
6. Update documentation as needed
7. Submit a pull request

---

## License

See [LICENSE](../LICENSE) file in repository root.

---

**Last Updated**: May 3, 2026  
**Maintainers**: Development Team
