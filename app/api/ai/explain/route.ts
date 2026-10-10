import {body,failure,json,explain} from '../../../../lib/aika/server';
import {calculate} from '../../../../lib/aika/engine';
export async function POST(req:Request){try{const plan=calculate(await body(req));return json({explanation:await explain(plan),status:plan.status});}catch(e){return failure(e);}}
