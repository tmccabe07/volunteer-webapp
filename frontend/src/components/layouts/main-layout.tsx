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
}

export function MainLayout({ children, userTier }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Navigation userTier={userTier} />
      
      <main className="container flex-1 py-6">
        {children}
      </main>
      
      <Footer />
    </div>
  );
}
