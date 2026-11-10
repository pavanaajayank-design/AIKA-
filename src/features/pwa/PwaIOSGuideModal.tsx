/* eslint-disable @next/next/no-img-element */
import React, { useEffect, useRef } from 'react';
import { Share, PlusSquare, CheckCircle2, X } from 'lucide-react';
import { usePwa } from './PwaContext';

export default function PwaIOSGuideModal() {
    const { showIOSGuide, setShowIOSGuide } = usePwa();
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!showIOSGuide) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowIOSGuide(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showIOSGuide, setShowIOSGuide]);

    if (!showIOSGuide) return null;

    return (
        <div
            className="pwa-modal-backdrop"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    setShowIOSGuide(false);
                }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-modal-title"
        >
            <div className="pwa-modal-sheet" ref={modalRef}>
                <div className="pwa-modal-header">
                    <div className="pwa-modal-brand">
                        <img
                            src="/icons/apple-touch-icon.png"
                            alt="AIKA"
                            width={44}
                            height={44}
                            className="pwa-modal-icon"
                        />
                        <div>
                            <h3 id="ios-modal-title" className="pwa-modal-title">Install AIKA on iOS</h3>
                            <p className="pwa-modal-subtitle">Add AIKA to your Home Screen from Safari</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className="pwa-modal-close"
                        onClick={() => setShowIOSGuide(false)}
                        aria-label="Close instructions"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="pwa-ios-steps">
                    <div className="pwa-ios-step">
                        <div className="step-num">1</div>
                        <div className="step-icon-wrap">
                            <Share size={20} className="step-icon" />
                        </div>
                        <div className="step-body">
                            <strong>Tap the Share button</strong>
                            <p>In the bottom toolbar of Safari (or top right on iPad), tap the Share icon.</p>
                        </div>
                    </div>

                    <div className="pwa-ios-step">
                        <div className="step-num">2</div>
                        <div className="step-icon-wrap">
                            <PlusSquare size={20} className="step-icon" />
                        </div>
                        <div className="step-body">
                            <strong>Select &quot;Add to Home Screen&quot;</strong>
                            <p>Scroll down through the share options and tap &quot;Add to Home Screen&quot;.</p>
                        </div>
                    </div>

                    <div className="pwa-ios-step">
                        <div className="step-num">3</div>
                        <div className="step-icon-wrap">
                            <CheckCircle2 size={20} className="step-icon" />
                        </div>
                        <div className="step-body">
                            <strong>Tap &quot;Add&quot; to Confirm</strong>
                            <p>Tap Add in the top-right corner to launch AIKA directly from your Home Screen.</p>
                        </div>
                    </div>
                </div>

                <div className="pwa-modal-footer">
                    <button
                        type="button"
                        className="button primary full-width"
                        onClick={() => setShowIOSGuide(false)}
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}

