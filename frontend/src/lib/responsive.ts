/**
 * Responsive Design Utilities
 * 
 * Provides utilities and constants for implementing responsive design
 * across the application. Uses Tailwind CSS breakpoints as a foundation.
 * 
 * Tailwind Breakpoints:
 * - sm: 640px
 * - md: 768px
 * - lg: 1024px
 * - xl: 1280px
 * - 2xl: 1536px
 */

/**
 * Breakpoint constants for programmatic responsive logic
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Device types based on viewport width
 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'wide';

/**
 * Get current device type based on window width
 */
export function getDeviceType(): DeviceType {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  
  if (width < BREAKPOINTS.md) return 'mobile';
  if (width < BREAKPOINTS.lg) return 'tablet';
  if (width < BREAKPOINTS.xl) return 'desktop';
  return 'wide';
}

/**
 * Check if current viewport matches a media query
 */
export function useMediaQuery(query: string): boolean {
  if (typeof window === 'undefined') return false;
  
  return window.matchMedia(query).matches;
}

/**
 * Check if viewport is mobile size
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < BREAKPOINTS.md;
}

/**
 * Check if viewport is tablet size
 */
export function isTablet(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.md && window.innerWidth < BREAKPOINTS.lg;
}

/**
 * Check if viewport is desktop size or larger
 */
export function isDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= BREAKPOINTS.lg;
}

/**
 * Responsive text size classes
 * 
 * Usage:
 * <h1 className={responsiveText.h1}>Heading</h1>
 */
export const responsiveText = {
  h1: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold',
  h2: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold',
  h3: 'text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold',
  h4: 'text-base sm:text-lg md:text-xl lg:text-2xl font-semibold',
  h5: 'text-sm sm:text-base md:text-lg lg:text-xl font-medium',
  h6: 'text-xs sm:text-sm md:text-base lg:text-lg font-medium',
  body: 'text-sm sm:text-base',
  small: 'text-xs sm:text-sm',
  tiny: 'text-[10px] sm:text-xs',
} as const;

/**
 * Responsive spacing classes
 * 
 * Usage:
 * <div className={responsiveSpacing.section}>Content</div>
 */
export const responsiveSpacing = {
  section: 'py-8 sm:py-12 md:py-16 lg:py-20',
  container: 'px-4 sm:px-6 md:px-8 lg:px-12',
  card: 'p-4 sm:p-6 md:p-8',
  gap: 'gap-4 sm:gap-6 md:gap-8',
  gapSmall: 'gap-2 sm:gap-3 md:gap-4',
} as const;

/**
 * Responsive grid classes
 * 
 * Usage:
 * <div className={responsiveGrid.cards}>...</div>
 */
export const responsiveGrid = {
  // 1 column on mobile, 2 on tablet, 3 on desktop
  cards: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6',
  
  // 1 column on mobile, 2 on tablet, 4 on desktop
  cardsFour: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6',
  
  // 1 column on mobile, 2 on desktop
  cardsTwoColumn: 'grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6',
  
  // Sidebar layout: stack on mobile, side-by-side on desktop
  sidebar: 'grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-4 sm:gap-6 lg:gap-8',
  
  // Main content with sidebar: stack on mobile, side-by-side on desktop
  mainContent: 'grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 sm:gap-6 lg:gap-8',
} as const;

/**
 * Responsive flex layouts
 */
export const responsiveFlex = {
  // Stack on mobile, row on desktop
  row: 'flex flex-col sm:flex-row items-start sm:items-center gap-4',
  
  // Stack on mobile, row with space between on desktop
  rowSpaceBetween: 'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
  
  // Wrap flex items
  wrap: 'flex flex-wrap gap-2 sm:gap-4',
  
  // Center content
  center: 'flex flex-col items-center justify-center text-center',
} as const;

/**
 * Responsive button sizes
 */
export const responsiveButton = {
  sm: 'text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5',
  md: 'text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5',
  lg: 'text-base sm:text-lg px-4 sm:px-6 py-2.5 sm:py-3',
  xl: 'text-lg sm:text-xl px-6 sm:px-8 py-3 sm:py-4',
} as const;

/**
 * Responsive table utilities
 */
export const responsiveTable = {
  // Hide table on mobile, show cards instead
  hideOnMobile: 'hidden md:table',
  
  // Show mobile card layout
  mobileCard: 'md:hidden',
  
  // Horizontal scroll wrapper for tables
  scrollWrapper: 'overflow-x-auto -mx-4 sm:mx-0',
  
  // Table with responsive padding
  table: 'w-full text-sm',
  
  // Responsive table cell padding
  cell: 'px-2 sm:px-4 py-2 sm:py-3',
} as const;

/**
 * Responsive navigation
 */
export const responsiveNav = {
  // Mobile menu (hamburger)
  mobileMenu: 'lg:hidden',
  
  // Desktop menu
  desktopMenu: 'hidden lg:flex',
  
  // Nav items
  navItem: 'px-3 py-2 text-sm sm:text-base',
} as const;

/**
 * Responsive form utilities
 */
export const responsiveForm = {
  // Form container
  container: 'space-y-4 sm:space-y-6',
  
  // Form row (side-by-side on desktop, stacked on mobile)
  row: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
  
  // Input field
  input: 'w-full text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5',
  
  // Label
  label: 'text-sm sm:text-base font-medium',
  
  // Button group
  buttonGroup: 'flex flex-col sm:flex-row gap-2 sm:gap-4',
} as const;

/**
 * Responsive modal/dialog
 */
export const responsiveModal = {
  // Modal overlay
  overlay: 'fixed inset-0 z-50',
  
  // Modal content
  content: 'w-full max-w-lg mx-4 sm:mx-auto p-4 sm:p-6 md:p-8',
  
  // Modal header
  header: 'text-lg sm:text-xl md:text-2xl font-bold',
  
  // Modal body
  body: 'space-y-4 sm:space-y-6 text-sm sm:text-base',
} as const;

/**
 * Responsive container widths
 */
export const responsiveContainer = {
  // Standard container
  default: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  
  // Narrow container (for forms, content)
  narrow: 'max-w-3xl mx-auto px-4 sm:px-6',
  
  // Wide container
  wide: 'max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8',
  
  // Full width
  full: 'w-full px-4 sm:px-6 lg:px-8',
} as const;

/**
 * Responsive image utilities
 */
export const responsiveImage = {
  // Aspect ratios
  square: 'aspect-square',
  video: 'aspect-video',
  
  // Object fit
  cover: 'object-cover',
  contain: 'object-contain',
  
  // Responsive image container
  container: 'relative w-full h-auto',
} as const;

/**
 * Utility to conditionally hide elements based on device type
 */
export const hideOn = {
  mobile: 'hidden md:block',
  tablet: 'block md:hidden lg:block',
  desktop: 'block lg:hidden',
} as const;

/**
 * Utility to show elements only on specific devices
 */
export const showOn = {
  mobile: 'block md:hidden',
  tablet: 'hidden md:block lg:hidden',
  desktop: 'hidden lg:block',
} as const;

/**
 * Touch-friendly target sizes
 * 
 * Minimum touch target size is 44x44px for accessibility
 */
export const touchTarget = {
  // Minimum touch target
  min: 'min-h-[44px] min-w-[44px]',
  
  // Button touch target
  button: 'min-h-[44px] px-4 py-2',
  
  // Icon button touch target
  iconButton: 'min-h-[44px] min-w-[44px] p-2',
  
  // Link touch target
  link: 'inline-block min-h-[44px] py-2',
} as const;

/**
 * Responsive visibility helpers
 */
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Example usage in components:
 * 
 * import { responsiveText, responsiveContainer, responsiveGrid } from '@/lib/responsive';
 * 
 * function MyPage() {
 *   return (
 *     <div className={responsiveContainer.default}>
 *       <h1 className={responsiveText.h1}>Welcome</h1>
 *       <div className={responsiveGrid.cards}>
 *         {cards.map(card => <Card key={card.id} {...card} />)}
 *       </div>
 *     </div>
 *   );
 * }
 */
