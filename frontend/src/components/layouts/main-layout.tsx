/**
 * Main Layout Component
 * 
 * Wrapper component that includes header, navigation, and footer
 */

import { Header } from './header';
import { Navigation } from './navigation';
import { Footer } from './footer';

interface MainLayoutProps {
  children: React.ReactNode;
  userTier?: number;
  userAuthTier?: 'PARENT' | 'LEADER' | 'ADMIN';
}

export function MainLayout({ children, userTier, userAuthTier }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Navigation userTier={userTier} userAuthTier={userAuthTier} />
      
      <main className="container flex-1 py-6">
        {children}
      </main>
      
      <Footer />
    </div>
  );
}
