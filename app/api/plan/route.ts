import {body,failure,json,makePlan} from '../../../lib/aika/server';
export async function POST(req:Request){try{return json(await makePlan(await body(req)));}catch(e){return failure(e);}}
