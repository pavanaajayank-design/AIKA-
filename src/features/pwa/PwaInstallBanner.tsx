/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Download, X } from 'lucide-react';
import { usePwa } from './PwaContext';

export default function PwaInstallBanner() {
    const { isInstalled, isInstallable, bannerDismissed, promptInstall, dismissBanner } = usePwa();

    if (isInstalled || bannerDismissed || !isInstallable) {
        return null;
    }

    return (
        <aside className="pwa-install-banner" aria-label="Install AIKA Application" role="complementary">
            <div className="pwa-install-content">
                <img
                    src="/icons/icon-192x192.png"
                    alt="AIKA Icon"
                    width={48}
                    height={48}
                    className="pwa-install-icon"
                />
                <div className="pwa-install-info">
                    <div className="pwa-install-title">Install AIKA</div>
                    <div className="pwa-install-subtitle">
                        Fast access from home screen · Offline trip viewing · Safe layovers
                    </div>
                </div>
            </div>
            <div className="pwa-install-actions">
                <button
                    type="button"
                    className="button small pwa-install-button"
                    onClick={promptInstall}
                    aria-label="Install AIKA Application to your device"
                >
                    <Download size={15} aria-hidden="true" />
                    <span>Install</span>
                </button>
                <button
                    type="button"
                    className="pwa-dismiss-button"
                    onClick={dismissBanner}
                    aria-label="Dismiss installation prompt"
                >
                    <X size={16} aria-hidden="true" />
                </button>
            </div>
        </aside>
    );
}

