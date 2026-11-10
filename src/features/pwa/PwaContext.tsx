import React, { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import type { BeforeInstallPromptEvent, PwaContextType } from './types';

const DISMISSAL_KEY = 'aika_pwa_dismissed';
const DISMISSAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const defaultPwaContext: PwaContextType = {
    isInstallable: false,
    isInstalled: false,
    isIOS: false,
    isOnline: true,
    updateAvailable: false,
    bannerDismissed: false,
    showIOSGuide: false,
    setShowIOSGuide: () => {},
    promptInstall: async () => {},
    dismissBanner: () => {},
    applyUpdate: () => {},
    retryConnection: async () => true,
};

const PwaContext = createContext<PwaContextType>(defaultPwaContext);

export function PwaProvider({ children }: { children: ReactNode }) {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(() => {
        if (typeof window === 'undefined') return false;
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            Boolean((navigator as unknown as { standalone?: boolean }).standalone);
        const userAgent = navigator.userAgent || '';
        const isAppleMobile = /iphone|ipad|ipod/i.test(userAgent) ||
            (/macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
        return isAppleMobile && !isStandalone;
    });
    const [isInstalled, setIsInstalled] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(display-mode: standalone)').matches ||
            Boolean((navigator as unknown as { standalone?: boolean }).standalone);
    });
    const [isIOS] = useState(() => {
        if (typeof navigator === 'undefined') return false;
        const userAgent = navigator.userAgent || '';
        return /iphone|ipad|ipod/i.test(userAgent) ||
            (/macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
    });
    const [isOnline, setIsOnline] = useState(() => {
        if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            return navigator.onLine;
        }
        return true;
    });
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [bannerDismissed, setBannerDismissed] = useState(() => {
        if (typeof window === 'undefined') return false;
        try {
            const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
            if (dismissedAt) {
                const elapsed = Date.now() - parseInt(dismissedAt, 10);
                return elapsed < DISMISSAL_DURATION_MS;
            }
        } catch {
            // Ignore access errors
        }
        return false;
    });
    const [showIOSGuide, setShowIOSGuide] = useState(false);

    const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // 4. Clean up expired dismissal memory if needed
        try {
            const dismissedAt = localStorage.getItem(DISMISSAL_KEY);
            if (dismissedAt) {
                const elapsed = Date.now() - parseInt(dismissedAt, 10);
                if (elapsed >= DISMISSAL_DURATION_MS) {
                    localStorage.removeItem(DISMISSAL_KEY);
                }
            }
        } catch {
            // Storage access might be restricted in some iframe or private modes
        }

        // 5. Chromium & Desktop install prompt listener
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            const promptEvent = e as BeforeInstallPromptEvent;
            setDeferredPrompt(promptEvent);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setIsInstallable(false);
            setDeferredPrompt(null);
            setBannerDismissed(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        // 6. Service worker registration & update listener
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('/sw.js', { scope: '/' })
                .then((registration) => {
                    if (registration.waiting && navigator.serviceWorker.controller) {
                        swRegistrationRef.current = registration;
                        setUpdateAvailable(true);
                    }
                    registration.addEventListener('updatefound', () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            installingWorker.addEventListener('statechange', () => {
                                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    swRegistrationRef.current = registration;
                                    setUpdateAvailable(true);
                                }
                            });
                        }
                    });
                })
                .catch(() => {});
        }

        const handleSwUpdate = (e: Event) => {
            const customEvent = e as CustomEvent<ServiceWorkerRegistration>;
            if (customEvent.detail) {
                swRegistrationRef.current = customEvent.detail;
            }
            setUpdateAvailable(true);
        };
        window.addEventListener('aika-pwa-update', handleSwUpdate);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
            window.removeEventListener('aika-pwa-update', handleSwUpdate);
        };
    }, []);

    const promptInstall = async () => {
        if (deferredPrompt) {
            try {
                await deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                if (choice.outcome === 'accepted') {
                    setIsInstalled(true);
                    setIsInstallable(false);
                    setBannerDismissed(true);
                }
                setDeferredPrompt(null);
            } catch {
                // User dismissed or prompt threw
            }
        } else if (isIOS) {
            setShowIOSGuide(true);
        }
    };

    const dismissBanner = () => {
        setBannerDismissed(true);
        try {
            localStorage.setItem(DISMISSAL_KEY, Date.now().toString());
        } catch {
            // Ignore storage write issues
        }
    };

    const applyUpdate = () => {
        const registration = swRegistrationRef.current;
        if (registration && registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
            });
            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            window.location.reload();
        }
    };

    const retryConnection = async (): Promise<boolean> => {
        try {
            const res = await fetch('/manifest.webmanifest?_t=' + Date.now(), {
                method: 'HEAD',
                cache: 'no-store',
            });
            if (res.ok) {
                setIsOnline(true);
                return true;
            }
        } catch {
            // Still offline
        }
        setIsOnline(false);
        return false;
    };

    return (
        <PwaContext.Provider
            value={{
                isInstallable,
                isInstalled,
                isIOS,
                isOnline,
                updateAvailable,
                bannerDismissed,
                showIOSGuide,
                setShowIOSGuide,
                promptInstall,
                dismissBanner,
                applyUpdate,
                retryConnection,
            }}
        >
            {children}
        </PwaContext.Provider>
    );
}

export function usePwa() {
    return useContext(PwaContext);
}

