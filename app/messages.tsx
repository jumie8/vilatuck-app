import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type Thread = { partnerId: string; name: string; username: string | null; body: string; created_at: string; unread: boolean };

export default function MessagesScreen() {
  const router=useRouter();
  const [threads,setThreads]=useState<Thread[]>([]);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const load=useCallback(async()=>{
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){setThreads([]);setLoading(false);setRefreshing(false);return;}
    const {data,error}=await supabase.from("messages").select("id,sender_id,recipient_id,body,created_at,read_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at",{ascending:false}).limit(500);
    if(error) console.warn("Messages:",error.message);
    const rows=data||[];
    const partnerIds=[...new Set(rows.map((m:any)=>m.sender_id===user.id?m.recipient_id:m.sender_id))];
    const {data:profiles}=partnerIds.length?await supabase.from("profiles").select("id,username,display_name").in("id",partnerIds):{data:[] as any[]};
    const profileMap=new Map((profiles||[]).map((p:any)=>[p.id,p]));
    const latest=new Map<string,Thread>();
    for(const m of rows as any[]){
      const partner=m.sender_id===user.id?m.recipient_id:m.sender_id;
      if(!latest.has(partner)){
        const p=profileMap.get(partner);
        latest.set(partner,{partnerId:partner,name:p?.display_name||p?.username||"VILATUCK user",username:p?.username||null,body:m.body,created_at:m.created_at,unread:m.recipient_id===user.id&&!m.read_at});
      }
    }
    setThreads([...latest.values()]);
    setLoading(false);setRefreshing(false);
  },[]);
  useEffect(()=>{load();const channel=supabase.channel("inbox-updates").on("postgres_changes",{event:"*",schema:"public",table:"messages"},()=>load()).subscribe();return()=>{supabase.removeChannel(channel);};},[load]);
  return <View style={s.page}>
    <View style={s.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="white"/></Pressable><Text style={s.title}>Messages</Text><View style={{width:24}}/></View>
    {loading?<View style={s.center}><ActivityIndicator color="#A88FFF"/></View>:
    <FlatList data={threads} keyExtractor={t=>t.partnerId} refreshControl={<RefreshControl refreshing={refreshing} tintColor="#A88FFF" onRefresh={()=>{setRefreshing(true);load();}}/>}
      ListEmptyComponent={<View style={s.center}><Ionicons name="chatbubbles-outline" size={42} color="#777384"/><Text style={s.empty}>No messages yet</Text><Text style={s.sub}>Visit a creator’s profile to start a conversation.</Text></View>}
      renderItem={({item})=><Pressable style={s.row} onPress={()=>router.push(`/chat/${item.partnerId}`)}>
        <View style={s.avatar}><Ionicons name="person" size={21} color="white"/></View>
        <View style={s.copy}><Text style={s.name}>{item.name}</Text><Text style={s.preview} numberOfLines={1}>{item.body}</Text></View>
        {item.unread?<View style={s.dot}/>:null}
      </Pressable>}/>}
  </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F"},header:{height:58,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#24222D"},title:{color:"white",fontSize:19,fontWeight:"800"},center:{flex:1,alignItems:"center",justifyContent:"center",padding:28},empty:{color:"white",fontSize:17,fontWeight:"700",marginTop:14},sub:{color:"#9692A3",textAlign:"center",marginTop:8,lineHeight:20},row:{padding:16,flexDirection:"row",alignItems:"center",borderBottomWidth:1,borderBottomColor:"#201E28"},avatar:{width:46,height:46,borderRadius:23,backgroundColor:"#7047FF",alignItems:"center",justifyContent:"center",marginRight:12},copy:{flex:1},name:{color:"white",fontWeight:"800",fontSize:15},preview:{color:"#A29EAD",marginTop:5},dot:{width:9,height:9,borderRadius:5,backgroundColor:"#A78BFA"}});