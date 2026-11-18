import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 try{
  if(req.method!=="POST") return reply({error:"Method not allowed"},405);
  const auth=req.headers.get("Authorization"); if(!auth?.startsWith("Bearer ")) return reply({error:"Sign in required"},401);
  const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!, service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, secret=Deno.env.get("FLW_SECRET_KEY");
  if(!secret) return reply({error:"Flutterwave live key is not configured yet"},503);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:userErr}=await userClient.auth.getUser(); if(userErr||!user?.email) return reply({error:"A signed-in account with an email is required"},401);
  const body=await req.json(); const packageId=String(body.package_id??"");
  const admin=createClient(url,service,{auth:{persistSession:false}});
  const {data:pkg,error:pkgErr}=await admin.from("coin_packages").select("id,title,amount_ngn,coins").eq("id",packageId).eq("is_active",true).single();
  if(pkgErr||!pkg) return reply({error:"That coin package is unavailable"},400);
  const txRef="VILA-"+crypto.randomUUID();
  const {data:purchase,error:insertErr}=await admin.from("coin_purchases").insert({user_id:user.id,package_id:pkg.id,tx_ref:txRef,amount_ngn:pkg.amount_ngn,coins:pkg.coins,status:"pending"}).select("id").single();
  if(insertErr||!purchase) return reply({error:"Could not start your purchase"},500);
  const response=await fetch("https://api.flutterwave.com/v3/payments",{method:"POST",headers:{"Authorization":"Bearer "+secret,"Content-Type":"application/json"},body:JSON.stringify({tx_ref:txRef,amount:pkg.amount_ngn,currency:"NGN",redirect_url:"vilatuck://wallet",customer:{email:user.email,name:user.user_metadata?.full_name??user.email},customizations:{title:"VILATUCK Coins",description:pkg.coins+" coins"},meta:{purchase_id:purchase.id,user_id:user.id,package_id:pkg.id}})});
  const result=await response.json();
  if(!response.ok||result.status!=="success"||!result.data?.link){await admin.from("coin_purchases").update({status:"failed"}).eq("id",purchase.id);return reply({error:result.message??"Flutterwave could not create checkout"},502);}
  await admin.from("coin_purchases").update({checkout_url:result.data.link}).eq("id",purchase.id);
  return reply({checkout_url:result.data.link,tx_ref:txRef,purchase_id:purchase.id,amount_ngn:pkg.amount_ngn,coins:pkg.coins});
 }catch(e){return reply({error:e instanceof Error?e.message:"Unexpected server error"},500);}
});