import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type CoinPackage = { id: string; title: string; amount_ngn: number; coins: number; sort_order: number };
type Purchase = { id: string; tx_ref: string; amount_ngn: number; coins: number; status: string; created_at: string };

export default function WalletScreen() {
 const router=useRouter();
 const [balance,setBalance]=useState(0);
 const [packages,setPackages]=useState<CoinPackage[]>([]);
 const [history,setHistory]=useState<Purchase[]>([]);
 const [loading,setLoading]=useState(true);
 const [refreshing,setRefreshing]=useState(false);
 const [buying,setBuying]=useState<string|null>(null);
 const [error,setError]=useState("");

 const load=useCallback(async()=>{
  setError("");
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user){setLoading(false);setError("Please sign in to view your wallet.");return;}
  const [walletRes,packageRes,purchaseRes]=await Promise.all([
   supabase.from("coin_wallets").select("coins_balance,diamonds_balance").eq("user_id",user.id).maybeSingle(),
   supabase.from("coin_packages").select("id,title,amount_ngn,coins,sort_order").eq("is_active",true).order("sort_order"),
   supabase.from("coin_purchases").select("id,tx_ref,amount_ngn,coins,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(8)
  ]);
  if(walletRes.error) setError(walletRes.error.message);
  setBalance(Number(walletRes.data?.coins_balance??0));
  if(packageRes.error) setError(packageRes.error.message); else setPackages(packageRes.data??[]);
  if(purchaseRes.error) setError(purchaseRes.error.message); else setHistory(purchaseRes.data??[]);
  setLoading(false);
 },[]);

 useEffect(()=>{load();},[load]);
 const refresh=async()=>{setRefreshing(true);await load();setRefreshing(false);};

 const buy=async(pkg:CoinPackage)=>{
  setBuying(pkg.id);setError("");
  try{
   const {data,error:invokeError}=await supabase.functions.invoke("create-coin-checkout",{body:{package_id:pkg.id}});
   if(invokeError) throw invokeError;
   if(!data?.checkout_url) throw new Error(data?.error??"Could not open Flutterwave checkout.");
   await Linking.openURL(data.checkout_url);
   Alert.alert("Complete your payment","After paying, return to VILATUCK and pull down to refresh your coin balance. Coins are added only after Flutterwave confirms payment.");
  }catch(e){
   const message=e instanceof Error?e.message:"Unable to start payment.";
   setError(message);Alert.alert("Payment could not start",message);
  }finally{setBuying(null);}
 };

 if(loading) return <View style={s.loading}><ActivityIndicator color="#A88FFF" size="large"/><Text style={s.muted}>Loading your wallet…</Text></View>;
 return <View style={s.page}>
  <View style={s.top}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={26} color="white"/></Pressable><Text style={s.topTitle}>VILATUCK WALLET</Text><Pressable onPress={refresh}><Ionicons name="refresh" size={22} color="#CFC3FF"/></Pressable></View>
  <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#A88FFF"/>}>
   <Text style={s.title}>Your coins</Text>
   <Text style={s.sub}>Buy coins to send gifts to creators during live streams.</Text>
   <View style={s.card}>
    <View style={s.balanceRow}><View><Text style={s.label}>AVAILABLE COINS</Text><Text style={s.amount}>{balance.toLocaleString()}</Text></View><View style={s.coin}><Text style={{fontSize:27}}>🪙</Text></View></View>
    <Text style={s.cardFoot}>Your coin balance updates after a confirmed payment.</Text>
   </View>
   <View style={s.sectionHead}><Text style={s.sectionTitle}>Buy coins</Text><Text style={s.sectionHint}>Secure checkout by Flutterwave</Text></View>
   {packages.map((pkg)=>(
    <View key={pkg.id} style={s.package}>
     <View style={{flex:1}}><Text style={s.packageName}>{pkg.title}</Text><Text style={s.packageCoins}>🪙 {pkg.coins.toLocaleString()} coins</Text></View>
     <Pressable disabled={!!buying} onPress={()=>buy(pkg)} style={[s.buyButton, buying===pkg.id&&{opacity:0.6}]}>
      {buying===pkg.id?<ActivityIndicator color="white"/>:<Text style={s.buyText}>₦{pkg.amount_ngn.toLocaleString()}</Text>}
     </Pressable>
    </View>
   ))}
   {error? <View style={s.error}><Text style={s.errorText}>{error}</Text></View>:null}
   <View style={s.sectionHead}><Text style={s.sectionTitle}>Recent purchases</Text></View>
   {history.length===0?<Text style={s.empty}>Your coin purchases will appear here.</Text>:history.map((p)=>(
    <View key={p.id} style={s.historyRow}><View style={{flex:1}}><Text style={s.historyCoins}>{p.coins.toLocaleString()} coins</Text><Text style={s.historyDate}>{new Date(p.created_at).toLocaleString()}</Text></View><View style={{alignItems:"flex-end"}}><Text style={s.historyAmount}>₦{p.amount_ngn.toLocaleString()}</Text><Text style={[s.status,p.status==="paid"?s.paid:p.status==="failed"?s.failed:s.pending]}>{p.status.toUpperCase()}</Text></View></View>
   ))}
   <View style={s.notice}><Ionicons name="shield-checkmark-outline" size={19} color="#B9A8F4"/><Text style={s.noticeText}>Payments are verified securely. Never share your bank details, card PIN or OTP with anyone.</Text></View>
  </ScrollView>
 </View>;
}

const s=StyleSheet.create({
 page:{flex:1,backgroundColor:"#09090F",paddingTop:55,paddingHorizontal:20},
 loading:{flex:1,backgroundColor:"#09090F",alignItems:"center",justifyContent:"center",gap:14},
 top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 topTitle:{color:"white",fontWeight:"900",letterSpacing:1,fontSize:13},
 title:{fontSize:29,fontWeight:"900",color:"white",marginTop:28},
 sub:{color:"#AAA5B7",marginTop:7,lineHeight:20},
 card:{backgroundColor:"#211A39",borderRadius:20,padding:22,marginTop:24,borderWidth:1,borderColor:"#4D3A82"},
 balanceRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 label:{color:"#D0C5F4",fontSize:12,fontWeight:"800",letterSpacing:1},
 amount:{fontSize:39,fontWeight:"900",color:"white",marginTop:7},
 coin:{width:58,height:58,borderRadius:29,backgroundColor:"#392B5E",alignItems:"center",justifyContent:"center"},
 cardFoot:{color:"#AAA5B7",fontSize:12,marginTop:15},
 sectionHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:28,marginBottom:12},
 sectionTitle:{color:"white",fontSize:18,fontWeight:"800"},
 sectionHint:{color:"#AAA5B7",fontSize:11},
 package:{backgroundColor:"#17151F",borderRadius:15,padding:16,marginBottom:10,flexDirection:"row",alignItems:"center",borderWidth:1,borderColor:"#302A3D"},
 packageName:{color:"white",fontWeight:"800",fontSize:15},
 packageCoins:{color:"#C4B5FD",marginTop:5,fontSize:13},
 buyButton:{backgroundColor:"#7048D8",borderRadius:11,minWidth:112,paddingHorizontal:16,paddingVertical:12,alignItems:"center"},
 buyText:{color:"white",fontWeight:"900",fontSize:14},
 error:{backgroundColor:"#3A2027",padding:13,borderRadius:12,marginTop:10},
 errorText:{color:"#FFB8C1",fontSize:13},
 empty:{color:"#AAA5B7",paddingVertical:16},
 historyRow:{flexDirection:"row",alignItems:"center",paddingVertical:13,borderBottomWidth:1,borderBottomColor:"#252230"},
 historyCoins:{color:"white",fontWeight:"700"},
 historyDate:{color:"#898494",fontSize:11,marginTop:4},
 historyAmount:{color:"white",fontWeight:"700"},
 status:{fontSize:10,fontWeight:"900",marginTop:4},
 paid:{color:"#70D6A0"},failed:{color:"#FF8D9A"},pending:{color:"#E9C46A"},
 notice:{marginTop:24,marginBottom:30,padding:14,borderRadius:13,backgroundColor:"#211D2D",flexDirection:"row",gap:10,alignItems:"center"},
 noticeText:{color:"#D7CFFF",fontSize:12,lineHeight:18,flex:1},
 muted:{color:"#AAA5B7",fontSize:13}
});