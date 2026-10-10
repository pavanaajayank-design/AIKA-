/* eslint-disable @next/next/no-img-element */
export default function Brand({ large = false }: {
    large?: boolean;
}) { return <a href="#home" className={'brand ' + (large ? 'brand-large' : '')} aria-label="AIKA home"><img src="/images/aika-logo.jpeg" alt="AIKA — Explore on time" width={large ? 150 : 46} height={large ? 190 : 60}/>{!large && <span>AIKA<span className="brand-dot">.</span></span>}</a>; }
