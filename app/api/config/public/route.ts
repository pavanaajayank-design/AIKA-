import {json} from '../../../../lib/aika/server';
export function GET(){return json({gemini:!!(process.env.GEMINI_API_KEY&&process.env.GEMINI_MODEL),places:!!process.env.GOOGLE_MAPS_SERVER_API_KEY,weather:process.env.ENABLE_WEATHER==='true',flightTracking:false,savedTrips:false});}
