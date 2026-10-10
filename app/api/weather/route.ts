import {body,failure,json,weather} from '../../../lib/aika/server';
import {schema} from '../../../lib/aika/engine';
export async function POST(req:Request){try{return json({forecast:await weather(schema.parse(await body(req)))});}catch(e){return failure(e);}}
