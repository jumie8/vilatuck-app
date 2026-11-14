import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

type Message={id:string;sender_id:string;recipient_id:string;body:string;created_at:string;read_at:string|null};
export default function ChatScreen(){
 const {id:rawId}=useLocalSearchParams<{id:string}>();const partnerId=Array.isArray(rawId)?rawId[0]:rawId;const router=useRouter();
 const [userId,setUserId]=useState<string|null>(null);const [partnerName,setPartnerName]=useState("Chat");const [items,setItems]=useState<Message[]>([]);const [draft,setDraft]=useState("");const [loading,setLoading]=useState(true);const [sending,setSending]=useState(false);
 const load=useCallback(async()=>{
  if(!partnerId)return;const {data:{user}}=await supabase.auth.getUser();if(!user){setLoading(false);return;}setUserId(user.id);
  const [{data:profile},{data:messages,error}]=await Promise.all([
   supabase.from("profiles").select("username,display_name").eq("id",partnerId).maybeSingle(),
   supabase.from("messages").select("id,sender_id,recipient_id,body,created_at,read_at").or(`and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`).order("created_at",{ascending:true}).limit(300)
  ]);
  if(profile)setPartnerName(profile.display_name||profile.username||"VILATUCK user");
  if(error)console.warn("Chat:",error.message);const rows=(messages||[]) as Message[];setItems(rows);
  const unread=rows.filter(m=>m.recipient_id===user.id&&!m.read_at).map(m=>m.id);
  if(unread.length){await supabase.from("messages").update({read_at:new Date().toISOString()}).in("id",unread);setItems(current=>current.map(m=>unread.includes(m.id)?{...m,read_at:new Date().toISOString()}:m));}
  setLoading(false);
 },[partnerId]);
 useEffect(()=>{load();const channel=supabase.channel("chat-"+partnerId).on("postgres_changes",{event:"INSERT",schema:"public",table:"messages"},()=>load()).subscribe();return()=>{supabase.removeChannel(channel);};},[load,partnerId]);
 async function send(){
  const body=draft.trim();if(!body||!partnerId||!userId||sending)return;setSending(true);
  const {data,error}=await supabase.from("messages").insert({sender_id:userId,recipient_id:partnerId,body}).select("id,sender_id,recipient_id,body,created_at,read_at").single();
  setSending(false);if(error){Alert.alert("Message not sent",error.message);return;}setItems(current=>[...current,data as Message]);setDraft("");
 }
 return <KeyboardAvoidingView style={s.page} behavior={Platform.OS==="ios"?"padding":undefined} keyboardVerticalOffset={8}>
  <View style={s.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="white"/></Pressable><Text style={s.title}>{partnerName}</Text><View style={{width:24}}/></View>
  {loading?<View style={s.center}><ActivityIndicator color="#A88FFF"/></View>:!userId?<View style={s.center}><Text style={s.muted}>Sign in to send messages.</Text><Pressable onPress={()=>router.push("/auth")}><Text style={s.link}>Sign in</Text></Pressable></View>:
  <FlatList style={{flex:1}} contentContainerStyle={{padding:14,flexGrow:1,justifyContent:"flex-end"}} data={items} keyExtractor={m=>m.id} renderItem={({item})=><View style={[s.bubble,item.sender_id===userId?s.mine:s.theirs]}><Text style={s.body}>{item.body}</Text><Text style={s.time}>{new Date(item.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</Text></View>}/>}
  {userId?<View style={s.composer}><TextInput value={draft} onChangeText={setDraft} placeholder="Write a message…" placeholderTextColor="#858193" style={s.input} multiline/><Pressable onPress={send} disabled={!draft.trim()||sending} style={s.send}><Ionicons name="send" size={19} color="white"/></Pressable></View>:null}
 </KeyboardAvoidingView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F"},header:{height:58,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#24222D"},title:{color:"white",fontSize:18,fontWeight:"800"},center:{flex:1,alignItems:"center",justifyContent:"center"},muted:{color:"#A29EAD"},link:{color:"#A88FFF",fontWeight:"800",marginTop:12},bubble:{maxWidth:"82%",padding:11,borderRadius:15,marginVertical:5},mine:{alignSelf:"flex-end",backgroundColor:"#6040C9",borderBottomRightRadius:4},theirs:{alignSelf:"flex-start",backgroundColor:"#252330",borderBottomLeftRadius:4},body:{color:"white",fontSize:15,lineHeight:20},time:{color:"#D0C8E7",fontSize:10,alignSelf:"flex-end",marginTop:4},composer:{flexDirection:"row",alignItems:"flex-end",padding:10,borderTopWidth:1,borderTopColor:"#24222D",gap:8},input:{flex:1,maxHeight:110,minHeight:42,borderRadius:22,backgroundColor:"#211F2B",color:"white",paddingHorizontal:16,paddingVertical:10},send:{width:42,height:42,borderRadius:21,backgroundColor:"#7047FF",alignItems:"center",justifyContent:"center"}});
