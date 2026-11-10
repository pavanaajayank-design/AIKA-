import React, { useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { usePwa } from './PwaContext';

export default function PwaOfflineBanner() {
    const { isOnline, retryConnection } = usePwa();
    const [retrying, setRetrying] = useState(false);

    if (isOnline) return null;

    const handleRetry = async () => {
        setRetrying(true);
        try {
            await retryConnection();
        } finally {
            setRetrying(false);
        }
    };

    return (
        <aside className="pwa-offline-notice" role="status" aria-live="polite">
            <div className="pwa-offline-content">
                <WifiOff size={16} className="pwa-offline-icon" aria-hidden="true" />
                <div className="pwa-offline-text">
                    <strong>You are offline.</strong>
                    <span> Viewing saved cached data. Live planning, Google routes, and flight updates require internet access.</span>
                </div>
            </div>
            <button
                type="button"
                className="pwa-retry-button"
                onClick={handleRetry}
                disabled={retrying}
                aria-label="Retry network connection"
            >
                <RefreshCw size={13} className={retrying ? 'spin' : ''} aria-hidden="true" />
                <span>{retrying ? 'Checking…' : 'Retry'}</span>
            </button>
        </aside>
    );
}

