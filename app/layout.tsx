import type { Metadata } from 'next';
import './globals.css';
import 'leaflet/dist/leaflet.css';
export const metadata:Metadata={title:'AIKA — Make every minute count.',description:'Turn your layover into a little adventure. A transparent, safety-first layover planner.',icons:{icon:'/images/aika-logo.jpeg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
