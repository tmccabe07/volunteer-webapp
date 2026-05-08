# Quickstart: UI Design Enhancements

**Feature**: 007-ui-design-enhancements  
**Date**: May 7, 2026  
**Audience**: Frontend developers working on the volunteer-webapp

## Overview

This guide explains how to use the enhanced UI design system introduced in feature 007. It covers design tokens, component variants, animation utilities, and accessibility best practices.

## Design Tokens

### Using Color Tokens in Tailwind

```tsx
// Cub Scout brand colors
<div className="bg-cub-blue text-white">Primary Action</div>
<div className="border-cub-gold">Gold Accent</div>

// Semantic status colors
<div className="text-success">Completed</div>
<div className="bg-warning/10 text-warning">Pending</div>
<div className="border-danger">Overdue</div>
```

### Using Animation Durations

```tsx
// Standard transition timing
<button className="transition-all duration-normal hover:scale-105">
  Hover me
</button>

// Fast transitions for quick feedback
<input className="transition-colors duration-fast focus:border-cub-blue" />

// Slow transitions for emphasis
<div className="transition-opacity duration-slow">
  Page content
</div>
```

### Accessing Tokens in JavaScript

```typescript
import { colors, durations, animations } from '@/lib/design-tokens';

// Use in component logic
const badgeColor = colors.cubGold;
const transitionTime = durations.normal;
```

## Enhanced Components

### Button with Loading State

```tsx
import { Button } from '@/components/ui/button';

// Standard button
<Button variant="default">Click Me</Button>

// Loading state (shows spinner, disables interaction)
<Button variant="default" isLoading={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>

// All variants support loading
<Button variant="outline" isLoading={loading}>Process</Button>
```

### Card with Hover Effects

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// Interactive card with hover elevation
<Card variant="event" interactive className="cursor-pointer" onClick={handleClick}>
  <CardHeader>
    <CardTitle>Pack Meeting</CardTitle>
  </CardHeader>
  <CardContent>
    Details about the event...
  </CardContent>
</Card>

// Variant options: 'default' | 'event' | 'task' | 'achievement'
// 'event' = blue top border
// 'task' = gold top border  
// 'achievement' = green top border
```

### Progress Indicators

```tsx
import { Progress } from '@/components/ui/progress';

// Simple progress bar
<Progress value={75} />

// With label and variant
<Progress 
  value={8} 
  max={10} 
  variant="success" 
  showLabel 
  size="lg"
/>
// Displays: "8/10" with green progress bar

// Event capacity example
<div>
  <p className="text-sm text-gray-600">
    {event.currentSignups} / {event.maxSignups} signed up
  </p>
  <Progress 
    value={event.currentSignups} 
    max={event.maxSignups}
    variant={event.currentSignups >= event.maxSignups ? 'danger' : 'default'}
  />
</div>
```

## Animation Utilities

### Hover Effects

```tsx
// Scale on hover (subtle)
<div className="transition-transform duration-normal hover:scale-105">
  Hover to scale
</div>

// Shadow elevation on hover
<Card className="transition-shadow duration-normal hover:shadow-lg">
  Hover for shadow
</Card>

// Combined effects
<Card className="transition-all duration-normal hover:scale-105 hover:shadow-xl">
  Rich hover effect
</Card>
```

### Page Transitions

```tsx
// Fade in content on page load
<main className="animate-fade-in">
  {/* Page content */}
</main>

// Staggered animation for list items
{items.map((item, index) => (
  <div 
    key={item.id}
    className="animate-fade-in"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    {item.name}
  </div>
))}
```

### Loading States

```tsx
// Skeleton screen
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>

// Spinner
<div className="animate-spin h-5 w-5 border-2 border-cub-blue border-t-transparent rounded-full" />

// Using in Button (built-in)
<Button isLoading>Loading...</Button>
```

## Accessibility

### Motion Sensitivity

Always respect user preferences for reduced motion:

```tsx
// Decorative animation - disable for sensitive users
<div className="motion-safe:animate-bounce motion-reduce:animate-none">
  🎉
</div>

// Scale hover - use opacity instead for reduced motion
<button className="motion-safe:hover:scale-105 motion-reduce:hover:opacity-80">
  Click me
</button>
```

### Color Contrast

Follow these guidelines for text:

```tsx
// ✅ GOOD: Dark blue for text
<p className="text-blue-600">Readable text</p>

// ❌ BAD: Gold for text (low contrast)
<p className="text-cub-gold">Hard to read</p>

// ✅ GOOD: Gold as background with dark text
<div className="bg-cub-gold text-gray-900">
  High contrast
</div>

// Use semantic colors with sufficient contrast
<span className="text-success">Completed</span>  // ✅ Green on white: 3.8:1
<span className="text-danger">Overdue</span>     // ✅ Red on white: 3.9:1
```

### Keyboard Navigation

Ensure hover effects have focus equivalents:

```tsx
<button className="transition-all hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-cub-blue">
  Accessible button
</button>
```

## Common Patterns

### Stat Card

```tsx
<Card>
  <CardContent className="p-6 text-center">
    <div className="text-5xl font-bold text-cub-blue">
      {totalPoints}
    </div>
    <div className="text-sm text-gray-600 mt-2">
      Total Points
    </div>
  </CardContent>
</Card>
```

### Status Badge

```tsx
function StatusBadge({ status }: { status: 'complete' | 'pending' | 'overdue' }) {
  const variants = {
    complete: 'bg-success/10 text-success border-success',
    pending: 'bg-warning/10 text-warning border-warning',
    overdue: 'bg-danger/10 text-danger border-danger',
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}
```

### Event Card with Visual Indicators

```tsx
<Card variant="event" interactive>
  <CardHeader>
    {/* Date badge */}
    <div className="absolute top-4 right-4 bg-cub-blue text-white px-3 py-1 rounded-lg text-sm font-bold">
      MAY 15
    </div>
    <CardTitle>{event.title}</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Location with icon */}
    <div className="flex items-center gap-2 text-gray-600">
      <MapPinIcon className="h-4 w-4" />
      <span>{event.location}</span>
    </div>
    
    {/* Capacity progress */}
    <div className="mt-4">
      <div className="flex justify-between text-sm mb-1">
        <span>Signups</span>
        <span className="font-medium">{event.currentSignups}/{event.maxSignups}</span>
      </div>
      <Progress 
        value={event.currentSignups} 
        max={event.maxSignups}
        variant={event.currentSignups >= event.maxSignups ? 'success' : 'default'}
      />
    </div>
  </CardContent>
</Card>
```

### Celebration Animation

```tsx
import confetti from 'canvas-confetti';

function celebrateAchievement() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3b82f6', '#fbbf24'], // Cub Scout colors
  });
}

// Trigger on badge tier upgrade
useEffect(() => {
  if (previousTier && currentTier && currentTier !== previousTier) {
    celebrateAchievement();
  }
}, [currentTier]);
```

## Testing

### Component Testing with Vitest

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';

test('button shows loading state', () => {
  render(<Button isLoading>Save</Button>);
  expect(screen.getByRole('button')).toBeDisabled();
  expect(screen.getByText('Save')).toBeInTheDocument();
  // Spinner should be present (implementation detail)
});

test('card applies variant class', () => {
  const { container } = render(<Card variant="event">Content</Card>);
  expect(container.firstChild).toHaveClass('border-t-4', 'border-cub-blue');
});
```

### Accessibility Testing

```typescript
import { axe } from 'jest-axe';

test('button has no accessibility violations', async () => {
  const { container } = render(<Button>Click me</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Visual Regression (Manual)

1. Navigate to each major page (dashboard, events, leaderboard)
2. Verify color consistency (blue and gold present)
3. Test hover states on cards and buttons
4. Test loading states
5. Toggle `prefers-reduced-motion` in DevTools → verify animations disable
6. Check mobile responsive behavior

## Troubleshooting

### Animations Not Working

**Problem**: Transitions or animations don't appear  
**Solutions**:
- Verify Tailwind is processing the animation classes (check compiled CSS)
- Ensure `@keyframes` are defined in globals.css
- Check for conflicting CSS that sets `transition: none`
- Verify browser supports CSS transforms (all modern browsers do)

### Colors Look Wrong

**Problem**: Cub Scout blue/gold not displaying  
**Solutions**:
- Check globals.css has `--cub-blue` and `--cub-gold` defined
- Verify Tailwind config extends colors with `cub-blue` and `cub-gold`
- Clear Next.js cache: `rm -rf .next && npm run dev`
- Check for conflicting inline styles

### Motion Not Reducing

**Problem**: Animations play even with `prefers-reduced-motion`  
**Solutions**:
- Use `motion-safe:` prefix for decorative animations
- Add global CSS rule in globals.css (see research.md)
- Test in browser: DevTools → Rendering → Emulate CSS media feature

### Performance Issues

**Problem**: Animations are janky or drop frames  
**Solutions**:
- Use `transform` and `opacity` only (never `width`, `height`, `top`, `left`)
- Reduce number of simultaneously animated elements
- Check for excessive DOM size (>1500 nodes)
- Profile with Chrome DevTools Performance tab
- Test on target devices (3-year-old mid-range phones)

## Reference

- **Design Tokens**: `frontend/src/lib/design-tokens.ts`
- **Global Styles**: `frontend/src/app/globals.css`
- **Component Library**: `frontend/src/components/ui/`
- **Research Notes**: `specs/007-ui-design-enhancements/research.md`
- **Tailwind Config**: `frontend/tailwind.config.ts` (if it exists, otherwise postcss.config.mjs)

## Support

For questions or issues with the design system:
1. Check this quickstart guide
2. Review `research.md` for technical decisions
3. Inspect existing component implementations in `src/components/ui/`
4. Refer to Tailwind CSS and shadcn/ui documentation
