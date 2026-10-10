import { Info } from 'lucide-react';
export default function Notice({ children }: {
    children: React.ReactNode;
}) { return <div className="phase-notice"><Info size={17}/><div>{children}</div></div>; }
