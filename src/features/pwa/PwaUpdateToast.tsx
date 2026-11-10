import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { usePwa } from './PwaContext';

export default function PwaUpdateToast() {
    const { updateAvailable, applyUpdate } = usePwa();

    if (!updateAvailable) return null;

    return (
        <aside className="pwa-update-toast" role="status" aria-live="polite">
            <div className="pwa-update-content">
                <Sparkles size={16} className="pwa-update-icon" aria-hidden="true" />
                <div className="pwa-update-text">
                    <strong>New version available</strong>
                    <span>An updated release of AIKA is ready to install.</span>
                </div>
            </div>
            <button
                type="button"
                className="button small pwa-update-button"
                onClick={applyUpdate}
                aria-label="Update AIKA to newest release"
            >
                <RefreshCw size={13} aria-hidden="true" />
                <span>Update AIKA</span>
            </button>
        </aside>
    );
}

