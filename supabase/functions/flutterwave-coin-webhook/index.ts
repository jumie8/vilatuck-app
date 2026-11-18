import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 try{
  if(req.method!=="POST") return reply({error:"Method not allowed"},405);
  const secret=Deno.env.get("FLW_SECRET_KEY"), webhookHash=Deno.env.get("FLW_WEBHOOK_SECRET_HASH");
  if(!secret||!webhookHash) return reply({error:"Payment webhook is not configured"},503);
  const signature=req.headers.get("verif-hash");
  if(!signature||signature!==webhookHash) return reply({error:"Invalid webhook signature"},401);
  const payload=await req.json(); const transactionId=String(payload?.data?.id??"");
  if(!transactionId) return reply({received:true,ignored:true});
  const verify=await fetch("https://api.flutterwave.com/v3/transactions/"+encodeURIComponent(transactionId)+"/verify",{headers:{"Authorization":"Bearer "+secret}});
  const verified=await verify.json(); const data=verified?.data;
  if(!verify.ok||verified?.status!=="success"||data?.status!=="successful") return reply({received:true,verified:false});
  const txRef=String(data.tx_ref??""); const currency=String(data.currency??"");
  const amount=Number(data.amount);
  if(!txRef||currency!=="NGN"||!Number.isFinite(amount)) return reply({received:true,verified:false});
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
  const {data:purchase,error}=await admin.from("coin_purchases").select("id,amount_ngn,status").eq("tx_ref",txRef).maybeSingle();
  if(error||!purchase) return reply({received:true,matched:false});
  if(Number(purchase.amount_ngn)!==amount) return reply({error:"Payment amount does not match"},400);
  if(purchase.status==="paid") return reply({received:true,already_credited:true});
  const {error:creditError}=await admin.rpc("credit_coin_purchase",{p_purchase_id:purchase.id,p_flw_transaction_id:transactionId});
  if(creditError) return reply({error:"Could not credit wallet"},500);
  return reply({received:true,credited:true});
 }catch(_){return reply({error:"Webhook processing failed"},500);}
});