/**
 * Header Component
 * 
 * Main site header with pack branding and navigation
 */

'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface PackConfig {
  packNumber: string;
  packName: string;
}

export function Header() {
  const [packConfig, setPackConfig] = useState<PackConfig>({
    packNumber: '123',
    packName: 'Pack 123',
  });

  // TODO: Fetch pack config from API when user is authenticated
  // For now, using default values

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold text-primary">
            🦁 {packConfig.packName}
          </span>
        </Link>
        
        <div className="ml-4 text-sm text-muted-foreground">
          Volunteer Management
        </div>
      </div>
    </header>
  );
}
