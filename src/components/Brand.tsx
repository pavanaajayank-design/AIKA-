/* eslint-disable @next/next/no-img-element */
export default function Brand({
    large = false,
    showText = false,
}: {
    large?: boolean;
    showText?: boolean;
}) {
    const size = large ? 140 : 64;
    return (
        <a href="#home" className={'brand ' + (large ? 'brand-large' : '')} aria-label="AIKA home">
            <img
                src="/images/aika-logo.png"
                alt="AIKA — Explore on time"
                width={size}
                height={size}
            />
            {showText && !large && <span>AIKA<span className="brand-dot">.</span></span>}
        </a>
    );
}
