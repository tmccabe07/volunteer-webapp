/**
 * Design Tokens for UI Design Enhancements (Feature 007)
 * 
 * Centralized design system constants for colors, animation durations,
 * and animation names. These correspond to CSS custom properties defined
 * in globals.css and exposed through Tailwind configuration.
 * 
 * @see frontend/src/app/globals.css - CSS custom properties
 * @see frontend/tailwind.config.ts - Tailwind theme extensions
 * @see specs/007-ui-design-enhancements/quickstart.md - Usage guide
 */

/**
 * Brand and semantic color tokens
 * Values are hex codes matching CSS custom properties in globals.css
 */
export const colors = {
  // Cub Scout brand colors
  cubBlue: '#3b82f6',      // Primary brand color (HSL: 221 83% 53%)
  cubGold: '#fbbf24',       // Secondary brand color (HSL: 43 96% 56%)
  
  // Semantic status colors
  success: '#22c55e',       // Completed, positive states (HSL: 142 71% 45%)
  warning: '#f97316',       // Pending, caution states (HSL: 25 95% 53%)
  danger: '#ef4444',        // Error, overdue states (HSL: 0 84% 60%)
  info: '#3b82f6',          // Informational states (same as cubBlue)
} as const;

/**
 * Animation duration tokens in milliseconds
 * Use for programmatic animations (JavaScript-based)
 * CSS should use Tailwind utilities: duration-fast, duration-normal, duration-slow
 */
export const durations = {
  fast: 150,     // Quick transitions (hover, focus) - 150ms
  normal: 250,   // Standard transitions (modal, slide) - 250ms
  slow: 400,     // Emphasized animations (page transition) - 400ms
} as const;

/**
 * Animation name tokens
 * Reference custom @keyframes animations defined in globals.css
 * Apply via Tailwind: animate-fade-in, animate-scale-in, animate-slide-up
 */
export const animations = {
  fadeIn: 'fade-in',
  scaleIn: 'scale-in',
  slideUp: 'slide-up',
  spin: 'spin',
} as const;

/**
 * Rank color mappings for Cub Scout ranks
 * Used for visual indicators and themed elements
 */
export const rankColors = {
  Lion: '#fbbf24',        // Gold
  Tiger: '#f97316',       // Orange
  Wolf: '#3b82f6',        // Blue
  Bear: '#06b6d4',        // Cyan
  Webelos: '#10b981',     // Green
  'Arrow of Light': '#8b5cf6', // Purple
} as const;

/**
 * Badge tier color mappings
 * Used for gamification elements and tier displays
 */
export const tierColors = {
  Bronze: '#cd7f32',      // Bronze
  Silver: '#c0c0c0',      // Silver
  Gold: '#fbbf24',        // Gold (matches cubGold)
  Platinum: '#e5e7eb',    // Platinum/Light Gray
  Diamond: '#3b82f6',     // Diamond/Blue (matches cubBlue)
} as const;

/**
 * Shadow elevation tokens for hover effects
 * Use with Tailwind: hover:shadow-sm, hover:shadow-md, hover:shadow-lg
 */
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  hover: '0 10px 15px -3px rgb(0 0 0 / 0.1)', // Standard hover elevation
} as const;

/**
 * Type exports for TypeScript safety
 */
export type ColorToken = keyof typeof colors;
export type DurationToken = keyof typeof durations;
export type AnimationToken = keyof typeof animations;
export type RankName = keyof typeof rankColors;
export type TierName = keyof typeof tierColors;
