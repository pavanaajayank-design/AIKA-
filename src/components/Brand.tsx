/* eslint-disable @next/next/no-img-element */
export default function Brand({ large = false }: {
    large?: boolean;
}) { return <a href="#home" className={'brand ' + (large ? 'brand-large' : '')} aria-label="AIKA home"><img src="/images/aika-logo.png" alt="AIKA — Explore on time" width={large ? 140 : 54} height={large ? 140 : 54}/>{!large && <span>AIKA<span className="brand-dot">.</span></span>}</a>; }
