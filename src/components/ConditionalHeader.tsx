'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';

/**
 * Conditionally renders the internal POS Header.
 * On the public landing page ( "/" ) we omit the internal header
 * since the landing page renders its own marketing navbar.
 */
export default function ConditionalHeader() {
  const pathname = usePathname();
  // Hide the POS Header on the public marketing landing page
  if (pathname === '/') return null;
  return <Header />;
}
