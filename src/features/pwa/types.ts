export interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export interface PwaContextType {
    isInstallable: boolean;
    isInstalled: boolean;
    isIOS: boolean;
    isOnline: boolean;
    updateAvailable: boolean;
    bannerDismissed: boolean;
    showIOSGuide: boolean;
    setShowIOSGuide: (show: boolean) => void;
    promptInstall: () => Promise<void>;
    dismissBanner: () => void;
    applyUpdate: () => void;
    retryConnection: () => Promise<boolean>;
}

