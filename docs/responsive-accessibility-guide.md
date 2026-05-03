# Responsive Design & Accessibility Guide

This guide provides best practices, utilities, and patterns for implementing responsive design and accessibility features in the Cub Scout Volunteer Management application.

## Table of Contents

1. [Responsive Design](#responsive-design)
2. [Accessibility](#accessibility)
3. [Testing](#testing)
4. [Checklists](#checklists)

---

## Responsive Design

### Breakpoints

The application uses Tailwind CSS breakpoints:

| Breakpoint | Min Width | Target Device |
|------------|-----------|---------------|
| `sm` | 640px | Large phones (landscape) |
| `md` | 768px | Tablets (portrait) |
| `lg` | 1024px | Tablets (landscape) / Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

### Using Responsive Utilities

Import responsive utilities from `@/lib/responsive`:

```tsx
import { 
  responsiveText, 
  responsiveContainer, 
  responsiveGrid,
  responsiveFlex 
} from '@/lib/responsive';

function MyPage() {
  return (
    <div className={responsiveContainer.default}>
      {/* Responsive heading */}
      <h1 className={responsiveText.h1}>Welcome</h1>
      
      {/* Responsive grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      <div className={responsiveGrid.cards}>
        <Card />
        <Card />
        <Card />
      </div>
      
      {/* Stack on mobile, row on desktop */}
      <div className={responsiveFlex.row}>
        <Button>Primary</Button>
        <Button>Secondary</Button>
      </div>
    </div>
  );
}
```

### Responsive Patterns

#### 1. Navigation

**Mobile-First Navigation** (hamburger on mobile, full menu on desktop):

```tsx
import { responsiveNav } from '@/lib/responsive';

function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  return (
    <nav>
      {/* Mobile menu button */}
      <button 
        className={responsiveNav.mobileMenu}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>
      
      {/* Desktop menu */}
      <ul className={responsiveNav.desktopMenu}>
        <li><a href="/dashboard">Dashboard</a></li>
        <li><a href="/events">Events</a></li>
        <li><a href="/profile">Profile</a></li>
      </ul>
      
      {/* Mobile menu (shown when open) */}
      {isMobileMenuOpen && (
        <ul className="lg:hidden">
          <li><a href="/dashboard">Dashboard</a></li>
          <li><a href="/events">Events</a></li>
          <li><a href="/profile">Profile</a></li>
        </ul>
      )}
    </nav>
  );
}
```

#### 2. Tables

**Responsive Tables** (horizontal scroll on small screens, cards on mobile):

```tsx
import { responsiveTable } from '@/lib/responsive';

function EventsTable({ events }) {
  return (
    <>
      {/* Desktop table view */}
      <div className={responsiveTable.scrollWrapper}>
        <table className={cn(responsiveTable.table, responsiveTable.hideOnMobile)}>
          <thead>
            <tr>
              <th className={responsiveTable.cell}>Event</th>
              <th className={responsiveTable.cell}>Date</th>
              <th className={responsiveTable.cell}>Location</th>
            </tr>
          </thead>
          <tbody>
            {events.map(event => (
              <tr key={event.id}>
                <td className={responsiveTable.cell}>{event.title}</td>
                <td className={responsiveTable.cell}>{event.date}</td>
                <td className={responsiveTable.cell}>{event.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile card view */}
      <div className={responsiveTable.mobileCard}>
        {events.map(event => (
          <Card key={event.id} className="mb-4">
            <CardHeader>{event.title}</CardHeader>
            <CardContent>
              <p><strong>Date:</strong> {event.date}</p>
              <p><strong>Location:</strong> {event.location}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
```

#### 3. Forms

**Responsive Forms** (stacked on mobile, side-by-side on desktop):

```tsx
import { responsiveForm } from '@/lib/responsive';

function ProfileForm() {
  return (
    <form className={responsiveForm.container}>
      {/* Single column field */}
      <div>
        <label className={responsiveForm.label}>Email</label>
        <input className={responsiveForm.input} type="email" />
      </div>
      
      {/* Two column row on desktop */}
      <div className={responsiveForm.row}>
        <div>
          <label className={responsiveForm.label}>First Name</label>
          <input className={responsiveForm.input} type="text" />
        </div>
        <div>
          <label className={responsiveForm.label}>Last Name</label>
          <input className={responsiveForm.input} type="text" />
        </div>
      </div>
      
      {/* Button group */}
      <div className={responsiveForm.buttonGroup}>
        <Button type="submit">Save</Button>
        <Button variant="outline">Cancel</Button>
      </div>
    </form>
  );
}
```

#### 4. Images

**Responsive Images**:

```tsx
import { responsiveImage } from '@/lib/responsive';

function EventImage({ src, alt }) {
  return (
    <div className={responsiveImage.container}>
      <img 
        src={src} 
        alt={alt}
        className={cn(responsiveImage.cover, responsiveImage.video)}
        loading="lazy"
      />
    </div>
  );
}
```

### Touch-Friendly Targets

All interactive elements should meet the minimum touch target size of 44x44px:

```tsx
import { touchTarget } from '@/lib/responsive';

// Button with proper touch target
<button className={touchTarget.button}>
  Click me
</button>

// Icon button with proper touch target
<button className={touchTarget.iconButton} aria-label="Delete">
  🗑️
</button>
```

---

## Accessibility

### WCAG 2.1 Guidelines

The application aims for **WCAG 2.1 Level AA** compliance:

- **Perceivable**: Content is presented in ways users can perceive
- **Operable**: UI components are operable by all users
- **Understandable**: Information and operation are understandable
- **Robust**: Content works across assistive technologies

### Using Accessibility Utilities

Import accessibility utilities from `@/lib/accessibility`:

```tsx
import { 
  ariaAttributes,
  useFocusTrap,
  useAnnounce,
  srOnly,
  focusVisible 
} from '@/lib/accessibility';
```

### Accessibility Patterns

#### 1. Focus Management

**Focus Trap** (for modals and dialogs):

```tsx
import { useFocusTrap, useRestoreFocus, ariaAttributes } from '@/lib/accessibility';

function Modal({ isOpen, onClose, title, children }) {
  const containerRef = useFocusTrap(isOpen);
  useRestoreFocus();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div 
        ref={containerRef}
        {...ariaAttributes.dialog('modal-title', 'modal-description')}
        className="max-w-lg mx-auto mt-20 bg-white rounded-lg p-6"
      >
        <h2 id="modal-title" className="text-xl font-bold mb-4">
          {title}
        </h2>
        <div id="modal-description">
          {children}
        </div>
        <button onClick={onClose} className={focusVisible}>
          Close
        </button>
      </div>
    </div>
  );
}
```

#### 2. Screen Reader Announcements

```tsx
import { useAnnounce } from '@/lib/accessibility';

function FormSubmit() {
  const announce = useAnnounce();
  
  const handleSubmit = async () => {
    try {
      await submitForm();
      announce('Form submitted successfully!', 'polite');
    } catch (error) {
      announce('Error submitting form. Please try again.', 'assertive');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
}
```

#### 3. Keyboard Navigation

**List Navigation** (arrow keys):

```tsx
import { createListKeyboardHandler } from '@/lib/accessibility';

function NavigationMenu({ items }) {
  const itemRefs = useRef<HTMLElement[]>([]);
  
  const handleKeyDown = createListKeyboardHandler(itemRefs.current, {
    orientation: 'vertical',
    loop: true
  });
  
  return (
    <ul role="menu" onKeyDown={handleKeyDown}>
      {items.map((item, index) => (
        <li
          key={item.id}
          ref={el => itemRefs.current[index] = el!}
          role="menuitem"
          tabIndex={0}
          className={focusVisible}
        >
          {item.label}
        </li>
      ))}
    </ul>
  );
}
```

#### 4. Form Validation

**Accessible Error Messages**:

```tsx
import { ariaAttributes, useId } from '@/lib/accessibility';

function EmailField({ error }) {
  const fieldId = useId('email-field');
  const errorId = useId('email-error');
  
  return (
    <div>
      <label htmlFor={fieldId}>Email Address *</label>
      <input
        type="email"
        {...(error 
          ? ariaAttributes.invalidField(fieldId, errorId)
          : ariaAttributes.requiredField(fieldId, `${fieldId}-label`)
        )}
        className={error ? 'border-red-600' : ''}
      />
      {error && (
        <p id={errorId} className="text-red-600 text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
```

#### 5. Loading States

```tsx
import { ariaAttributes } from '@/lib/accessibility';

function LoadingContent() {
  return (
    <div {...ariaAttributes.loading('Loading events')}>
      <LoadingSpinner />
      <span className={srOnly}>Loading events, please wait...</span>
    </div>
  );
}
```

#### 6. Expandable Sections

```tsx
import { ariaAttributes, useId, Keys } from '@/lib/accessibility';

function Accordion({ title, children }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId('accordion-panel');
  
  return (
    <div>
      <button
        {...ariaAttributes.expandButton(isExpanded, panelId)}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === Keys.ENTER || e.key === Keys.SPACE) {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className={focusVisible}
      >
        {title}
        <span aria-hidden="true">{isExpanded ? '▼' : '▶'}</span>
      </button>
      
      <div id={panelId} hidden={!isExpanded}>
        {children}
      </div>
    </div>
  );
}
```

### Color Contrast

Ensure all text meets WCAG AA standards:

- **Normal text**: 4.5:1 contrast ratio
- **Large text** (18pt+): 3:1 contrast ratio

Use accessible color utilities:

```tsx
import { accessibleColors, focusVisible } from '@/lib/accessibility';

// Primary button
<button className={cn(
  accessibleColors.primaryBg,
  accessibleColors.primaryText,
  focusVisible
)}>
  Submit
</button>

// Error message
<p className={cn(
  accessibleColors.errorText,
  'font-medium'
)}>
  {errorMessage}
</p>
```

### Skip Links

Add skip links for keyboard navigation:

```tsx
import { skipLinkStyles } from '@/lib/accessibility';

function Layout({ children }) {
  return (
    <>
      <a href="#main-content" className={skipLinkStyles}>
        Skip to main content
      </a>
      <nav>{/* navigation */}</nav>
      <main id="main-content">{children}</main>
    </>
  );
}
```

---

## Testing

### Responsive Design Testing

1. **Manual Testing**:
   - Test on physical devices (phone, tablet, laptop)
   - Use browser DevTools device emulation
   - Test in both portrait and landscape orientations

2. **Breakpoint Testing**:
   ```bash
   # Test all breakpoints
   - 320px (iPhone SE)
   - 375px (iPhone 12/13)
   - 768px (iPad portrait)
   - 1024px (iPad landscape)
   - 1280px (Desktop)
   - 1920px (Large desktop)
   ```

3. **Touch Testing**:
   - Verify all interactive elements are 44x44px minimum
   - Test gestures (tap, swipe, pinch-zoom)
   - Check for accidental taps on nearby elements

### Accessibility Testing

1. **Automated Testing**:
   ```bash
   # Install axe-core for testing
   npm install --save-dev @axe-core/react
   
   # Run in development mode to get accessibility warnings
   npm run dev
   ```

2. **Keyboard Navigation**:
   - Tab through all interactive elements
   - Verify focus indicators are visible
   - Test arrow key navigation in lists/menus
   - Verify Escape key closes modals/dropdowns

3. **Screen Reader Testing**:
   - **Windows**: NVDA (free) or JAWS
   - **macOS**: VoiceOver (built-in, Cmd+F5)
   - **Linux**: Orca
   
   Test:
   - Form labels and error messages are announced
   - Button purposes are clear
   - Dynamic content changes are announced
   - Images have meaningful alt text

4. **Visual Testing**:
   - Test with high contrast mode
   - Test with Windows High Contrast
   - Verify colors don't convey meaning alone
   - Check text scaling up to 200%

5. **Color Contrast Testing**:
   - Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
   - Use browser DevTools accessibility panel
   - Verify WCAG AA compliance (4.5:1 for normal text)

---

## Checklists

### Responsive Design Checklist

- [ ] All pages tested on mobile (320px-767px)
- [ ] All pages tested on tablet (768px-1023px)
- [ ] All pages tested on desktop (1024px+)
- [ ] Navigation works on all screen sizes
- [ ] Tables are responsive (scroll or cards on mobile)
- [ ] Forms stack appropriately on mobile
- [ ] Images scale appropriately
- [ ] Touch targets are 44x44px minimum
- [ ] Text is readable without zooming
- [ ] Horizontal scrolling is not required
- [ ] Content reflows properly at different widths

### Accessibility Checklist

#### Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Escape key closes modals/dropdowns
- [ ] Arrow keys work in lists/menus
- [ ] Enter/Space activate buttons and links

#### Screen Readers
- [ ] All images have alt text
- [ ] Form labels are associated with inputs
- [ ] Error messages are announced
- [ ] Loading states are announced
- [ ] Dynamic content changes are announced
- [ ] Headings are properly nested (h1, h2, h3)
- [ ] Landmark regions are defined (main, nav, aside)

#### Visual
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Text scales to 200% without breaking layout
- [ ] Content is visible in high contrast mode
- [ ] Color is not the only means of conveying information
- [ ] Focus states are visible

#### ARIA
- [ ] ARIA labels where needed
- [ ] ARIA roles are appropriate
- [ ] ARIA states are updated (expanded, selected, etc.)
- [ ] ARIA live regions for dynamic content
- [ ] No ARIA misuse (prefer native HTML)

#### Forms
- [ ] All fields have labels
- [ ] Required fields are marked
- [ ] Error messages are clear and helpful
- [ ] Error messages are associated with fields
- [ ] Success messages are announced

#### Interactive Components
- [ ] Buttons have clear purposes
- [ ] Links have descriptive text (no "click here")
- [ ] Modals trap focus and restore focus on close
- [ ] Tooltips are keyboard accessible
- [ ] Dropdowns are keyboard accessible

---

## Resources

### Official Documentation
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Web Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Resources](https://webaim.org/resources/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/) - Browser extension for accessibility testing
- [WAVE](https://wave.webaim.org/) - Web accessibility evaluation tool
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Built into Chrome DevTools
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/) - Desktop app for contrast testing

### Testing
- [NVDA Screen Reader](https://www.nvaccess.org/) - Free Windows screen reader
- [VoiceOver](https://www.apple.com/accessibility/voiceover/) - Built into macOS and iOS
- [Mobile Device Emulation](https://developer.chrome.com/docs/devtools/device-mode/) - Chrome DevTools

---

**Remember**: Accessibility and responsive design are not one-time tasks. They should be considered throughout the development process and tested regularly.
