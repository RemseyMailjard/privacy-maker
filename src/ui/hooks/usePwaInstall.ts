import { useCallback, useEffect, useState } from 'react';

/** Chrome/Edge/Android fire this instead of letting the browser show its own
 *  install UI, so the app can offer install through its own button. Not part
 *  of lib.dom.d.ts, so the shape is declared locally. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  // Exclude in-app browsers and Chrome-on-iOS (CriOS): they can't install
  // either, but "open Safari's share sheet" instructions would mislead there.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

/**
 * Drives the app's own "install app" affordance. Chromium browsers report
 * installability via `beforeinstallprompt`, which this hook captures so a
 * regular in-page button can trigger the native prompt on demand instead of
 * relying on users to notice the browser's own (often hidden) install icon.
 * iOS Safari never fires that event - there is no programmatic install there
 * - so it gets its own flag for a manual "Add to Home Screen" instructions
 * affordance instead.
 */
export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    if (installed) return;
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [installed]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // Chrome only lets a captured prompt be used once; a fresh
    // beforeinstallprompt will arrive later if the user declines and the
    // browser decides to offer again.
    setDeferredPrompt(null);
    return outcome;
  }, [deferredPrompt]);

  return {
    /** Chromium install is available right now via promptInstall(). */
    canInstall: !installed && deferredPrompt !== null,
    /** No programmatic prompt exists; show manual Add-to-Home-Screen steps instead. */
    needsIosInstructions: !installed && deferredPrompt === null && isIosSafari(),
    installed,
    promptInstall,
  };
}
