/**
 * Layout Wrapper Component
 * 
 * Wraps pages with Header and Navigation for authenticated users
 * Shows pages directly for unauthenticated users (like login/register)
 */

'use client';

import { useAuth } from '@/lib/auth-context';
import { Header } from './header';
import { Navigation } from './navigation';
import { usePathname } from 'next/navigation';

const AUTH_PATHS = ['/auth'];
const tierLevels = { PARENT: 1, LEADER: 2, ADMIN: 3 };

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  
  // Check if current path is an auth page
  const isAuthPage = AUTH_PATHS.some(path => pathname.startsWith(path));
  
  // For auth pages, don't show header/navigation
  if (isAuthPage) {
    return <>{children}</>;
  }
  
  // Show header for all pages
  // Navigation only shows for authenticated users
  const userTier = user ? tierLevels[user.authTier] : 0;
  
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {user && <Navigation userTier={userTier} />}
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
