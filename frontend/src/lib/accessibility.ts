/**
 * Accessibility Utilities
 * 
 * Provides utilities, hooks, and helpers for implementing accessible
 * user interfaces following WCAG 2.1 guidelines.
 * 
 * Key Principles:
 * - Perceivable: Users can perceive the content
 * - Operable: Users can operate the interface
 * - Understandable: Users can understand the content and interface
 * - Robust: Content works across different assistive technologies
 */

import { useEffect, useRef, KeyboardEvent } from 'react';

/**
 * ARIA role constants
 */
export const AriaRole = {
  ALERT: 'alert',
  ALERTDIALOG: 'alertdialog',
  BUTTON: 'button',
  CHECKBOX: 'checkbox',
  DIALOG: 'dialog',
  GRID: 'grid',
  GRIDCELL: 'gridcell',
  LINK: 'link',
  LOG: 'log',
  MARQUEE: 'marquee',
  MENU: 'menu',
  MENUBAR: 'menubar',
  MENUITEM: 'menuitem',
  MENUITEMCHECKBOX: 'menuitemcheckbox',
  MENUITEMRADIO: 'menuitemradio',
  OPTION: 'option',
  PROGRESSBAR: 'progressbar',
  RADIO: 'radio',
  RADIOGROUP: 'radiogroup',
  SCROLLBAR: 'scrollbar',
  SEARCHBOX: 'searchbox',
  SLIDER: 'slider',
  SPINBUTTON: 'spinbutton',
  STATUS: 'status',
  SWITCH: 'switch',
  TAB: 'tab',
  TABLIST: 'tablist',
  TABPANEL: 'tabpanel',
  TEXTBOX: 'textbox',
  TIMER: 'timer',
  TOOLBAR: 'toolbar',
  TOOLTIP: 'tooltip',
  TREE: 'tree',
  TREEGRID: 'treegrid',
  TREEITEM: 'treeitem',
} as const;

/**
 * ARIA live region constants
 */
export const AriaLive = {
  OFF: 'off',
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
} as const;

/**
 * Keyboard key constants
 */
export const Keys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  TAB: 'Tab',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

/**
 * Generate a unique ID for ARIA relationships
 */
let idCounter = 0;
export function generateId(prefix: string = 'a11y'): string {
  return `${prefix}-${++idCounter}-${Date.now()}`;
}

/**
 * Hook to generate a stable ID
 */
export function useId(prefix?: string): string {
  const idRef = useRef<string>('');
  
  if (!idRef.current) {
    idRef.current = generateId(prefix);
  }
  
  return idRef.current;
}

/**
 * Hook to manage focus trap within a container
 * Useful for modals, dialogs, dropdowns
 */
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    
    const container = containerRef.current;
    const focusableSelector = 
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    
    const focusableElements = container.querySelectorAll<HTMLElement>(focusableSelector);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    // Focus first element when activated
    firstElement?.focus();
    
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== Keys.TAB) return;
      
      // Trap focus within container
      if (e.shiftKey) {
        // Shift + Tab: move focus backwards
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: move focus forwards
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleKeyDown);
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);
  
  return containerRef;
}

/**
 * Hook to restore focus to the previously focused element
 * Useful when closing modals/dialogs
 */
export function useRestoreFocus() {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    // Store current focused element
    previousFocusRef.current = document.activeElement as HTMLElement;
    
    // Restore focus on unmount
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);
}

/**
 * Hook to announce content to screen readers
 */
export function useAnnounce() {
  const announceRef = useRef<HTMLDivElement | null>(null);
  
  useEffect(() => {
    // Create live region if it doesn't exist
    if (!announceRef.current) {
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
      announceRef.current = liveRegion;
    }
    
    return () => {
      if (announceRef.current) {
        document.body.removeChild(announceRef.current);
        announceRef.current = null;
      }
    };
  }, []);
  
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority);
      announceRef.current.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = '';
        }
      }, 1000);
    }
  };
  
  return announce;
}

/**
 * Keyboard navigation handler for lists
 */
export function createListKeyboardHandler(
  items: HTMLElement[],
  options: {
    orientation?: 'vertical' | 'horizontal';
    loop?: boolean;
  } = {}
) {
  const { orientation = 'vertical', loop = true } = options;
  
  return (e: KeyboardEvent<HTMLElement>) => {
    const currentIndex = items.findIndex(item => item === document.activeElement);
    if (currentIndex === -1) return;
    
    let nextIndex: number | null = null;
    
    const isVertical = orientation === 'vertical';
    const prevKey = isVertical ? Keys.ARROW_UP : Keys.ARROW_LEFT;
    const nextKey = isVertical ? Keys.ARROW_DOWN : Keys.ARROW_RIGHT;
    
    switch (e.key) {
      case prevKey:
        e.preventDefault();
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          nextIndex = loop ? items.length - 1 : 0;
        }
        break;
        
      case nextKey:
        e.preventDefault();
        nextIndex = currentIndex + 1;
        if (nextIndex >= items.length) {
          nextIndex = loop ? 0 : items.length - 1;
        }
        break;
        
      case Keys.HOME:
        e.preventDefault();
        nextIndex = 0;
        break;
        
      case Keys.END:
        e.preventDefault();
        nextIndex = items.length - 1;
        break;
        
      default:
        return;
    }
    
    if (nextIndex !== null && items[nextIndex]) {
      items[nextIndex].focus();
    }
  };
}

/**
 * ARIA attributes for common patterns
 */
export const ariaAttributes = {
  /**
   * Button that controls an expandable region
   */
  expandButton: (isExpanded: boolean, controlsId: string) => ({
    'aria-expanded': isExpanded,
    'aria-controls': controlsId,
  }),
  
  /**
   * Required form field
   */
  requiredField: (fieldId: string, labelId: string) => ({
    'id': fieldId,
    'aria-labelledby': labelId,
    'aria-required': true,
  }),
  
  /**
   * Invalid form field with error message
   */
  invalidField: (fieldId: string, errorId: string) => ({
    'id': fieldId,
    'aria-invalid': true,
    'aria-describedby': errorId,
  }),
  
  /**
   * Loading state
   */
  loading: (label: string = 'Loading') => ({
    'role': 'status',
    'aria-live': 'polite' as const,
    'aria-label': label,
  }),
  
  /**
   * Modal dialog
   */
  dialog: (labelId: string, descriptionId?: string) => ({
    'role': 'dialog',
    'aria-modal': true,
    'aria-labelledby': labelId,
    'aria-describedby': descriptionId,
  }),
  
  /**
   * Tab navigation
   */
  tab: (isSelected: boolean, controlsId: string) => ({
    'role': 'tab',
    'aria-selected': isSelected,
    'aria-controls': controlsId,
    'tabIndex': isSelected ? 0 : -1,
  }),
  
  /**
   * Tab panel
   */
  tabPanel: (labelledById: string, isHidden: boolean) => ({
    'role': 'tabpanel',
    'aria-labelledby': labelledById,
    'tabIndex': 0,
    'hidden': isHidden,
  }),
};

/**
 * Screen reader only styles
 * 
 * Usage: <span className={srOnly}>Hidden from view but read by screen readers</span>
 */
export const srOnly = 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

/**
 * Skip to main content link
 */
export const skipLinkStyles = 
  'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-50 focus:p-4 focus:bg-white focus:text-black focus:border-2 focus:border-blue-600';

/**
 * Focus visible styles (for keyboard navigation)
 */
export const focusVisible = 
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2';

/**
 * Utility to check if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Utility to check if user prefers dark mode
 */
export function prefersDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Utility to check if user prefers high contrast
 */
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: high)').matches;
}

/**
 * Color contrast utilities
 */
export const colorContrast = {
  // WCAG AA standard (4.5:1 for normal text, 3:1 for large text)
  AA_NORMAL: 4.5,
  AA_LARGE: 3,
  
  // WCAG AAA standard (7:1 for normal text, 4.5:1 for large text)
  AAA_NORMAL: 7,
  AAA_LARGE: 4.5,
};

/**
 * Accessible color combinations (WCAG AA compliant)
 */
export const accessibleColors = {
  // Primary action colors (blue)
  primaryBg: 'bg-blue-600 hover:bg-blue-700 focus:bg-blue-700',
  primaryText: 'text-white',
  primaryBorder: 'border-blue-600',
  
  // Secondary action colors (gray)
  secondaryBg: 'bg-gray-600 hover:bg-gray-700 focus:bg-gray-700',
  secondaryText: 'text-white',
  secondaryBorder: 'border-gray-600',
  
  // Success state (green)
  successBg: 'bg-green-600 hover:bg-green-700 focus:bg-green-700',
  successText: 'text-white',
  successBorder: 'border-green-600',
  
  // Warning state (amber)
  warningBg: 'bg-amber-600 hover:bg-amber-700 focus:bg-amber-700',
  warningText: 'text-white',
  warningBorder: 'border-amber-600',
  
  // Error/danger state (red)
  errorBg: 'bg-red-600 hover:bg-red-700 focus:bg-red-700',
  errorText: 'text-white',
  errorBorder: 'border-red-600',
  
  // Info state (blue)
  infoBg: 'bg-blue-100 dark:bg-blue-900',
  infoText: 'text-blue-900 dark:text-blue-100',
  infoBorder: 'border-blue-300 dark:border-blue-700',
};

/**
 * Example usage:
 * 
 * // Focus trap in modal
 * function Modal({ isOpen }) {
 *   const containerRef = useFocusTrap(isOpen);
 *   useRestoreFocus();
 *   
 *   return (
 *     <div ref={containerRef} {...ariaAttributes.dialog('modal-title', 'modal-desc')}>
 *       <h2 id="modal-title">Modal Title</h2>
 *       <p id="modal-desc">Modal description</p>
 *     </div>
 *   );
 * }
 * 
 * // Screen reader announcements
 * function SuccessMessage() {
 *   const announce = useAnnounce();
 *   
 *   const handleSuccess = () => {
 *     announce('Form submitted successfully!', 'polite');
 *   };
 * }
 * 
 * // Keyboard navigation
 * function Menu({ items }) {
 *   const itemRefs = useRef<HTMLElement[]>([]);
 *   const handleKeyDown = createListKeyboardHandler(itemRefs.current, { orientation: 'vertical' });
 *   
 *   return (
 *     <ul role="menu" onKeyDown={handleKeyDown}>
 *       {items.map((item, index) => (
 *         <li key={item.id} ref={el => itemRefs.current[index] = el!} role="menuitem" tabIndex={0}>
 *           {item.label}
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 */
