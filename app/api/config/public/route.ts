import {json} from '../../../../lib/aika/server';
export function GET() {
  const savedTrips = Boolean(
    process.env.SUPABASE_URL?.trim() ||
    (process.env.VITE_SUPABASE_URL?.trim() && process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim())
  );
  return json({
    gemini: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_MODEL),
    places: !!process.env.GOOGLE_MAPS_SERVER_API_KEY,
    weather: process.env.ENABLE_WEATHER === 'true',
    flightTracking: false,
    savedTrips,
  });
}
