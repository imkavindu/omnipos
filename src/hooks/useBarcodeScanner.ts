'use client';

import { useEffect, useRef, useCallback } from 'react';
import { soundManager } from '@/lib/audio';

interface UseBarcodeScannerOptions {
  onScan: (barcode: string) => void;
  minChars?: number;
  maxIntervalMs?: number; // Keystroke interval threshold for hardware scanner (usually < 40ms)
  enabled?: boolean;
}

export function useBarcodeScanner({
  onScan,
  minChars = 3,
  maxIntervalMs = 60,
  enabled = true,
}: UseBarcodeScannerOptions) {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept if typing inside an interactive input/textarea unless it's the barcode scanner input
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // If user is typing in a generic search input, don't hijack normal typing unless rapid scanner wedge
      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          e.preventDefault();
          const scannedCode = bufferRef.current.trim();
          bufferRef.current = '';
          soundManager.playScanBeep();
          onScan(scannedCode);
        } else {
          bufferRef.current = '';
        }
        return;
      }

      // Scanner emits single characters rapidly
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (diff > maxIntervalMs && bufferRef.current.length > 0 && !isInput) {
          // Cleared buffer if delay was too long between keystrokes (manual human typing)
          bufferRef.current = '';
        }
        bufferRef.current += e.key;
      }
    },
    [enabled, minChars, maxIntervalMs, onScan]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const simulateScan = useCallback(
    (code: string) => {
      soundManager.playScanBeep();
      onScan(code);
    },
    [onScan]
  );

  return { simulateScan };
}
