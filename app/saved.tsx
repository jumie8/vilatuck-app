import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
type SavedVideo={id:string;caption:string|null;video_url:string;created_at:string};
export default function SavedScreen(){
 const router=useRouter();const [items,setItems]=useState<SavedVideo[]>([]);const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false);
 const load=useCallback(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setItems([]);setLoading(false);setRefreshing(false);return;}
  const {data:marks,error}=await supabase.from("bookmarks").select("video_id,created_at").eq("user_id",user.id).order("created_at",{ascending:false});
  if(error)console.warn("Saved videos:",error.message);
  const ids=(marks||[]).map((m:any)=>m.video_id);if(!ids.length){setItems([]);setLoading(false);setRefreshing(false);return;}
  const {data:videos}=await supabase.from("videos").select("id,caption,video_url,created_at").in("id",ids).eq("status","published");
  const map=new Map((videos||[]).map((v:any)=>[v.id,v]));setItems(ids.map((id:string)=>map.get(id)).filter(Boolean) as SavedVideo[]);
  setLoading(false);setRefreshing(false);
 },[]);
 useEffect(()=>{load();},[load]);
 async function remove(id:string){const {data:{user}}=await supabase.auth.getUser();if(!user)return;const {error}=await supabase.from("bookmarks").delete().eq("user_id",user.id).eq("video_id",id);if(error){return;}setItems(current=>current.filter(v=>v.id!==id));}
 return <View style={s.page}><View style={s.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="white"/></Pressable><Text style={s.title}>Saved videos</Text><View style={{width:24}}/></View>
 {loading?<View style={s.center}><ActivityIndicator color="#A88FFF"/></View>:<FlatList data={items} keyExtractor={v=>v.id} refreshControl={<RefreshControl refreshing={refreshing} tintColor="#A88FFF" onRefresh={()=>{setRefreshing(true);load();}}/>}
 ListEmptyComponent={<View style={s.center}><Ionicons name="bookmark-outline" size={42} color="#777384"/><Text style={s.empty}>No saved videos</Text><Text style={s.sub}>Tap Save on a video to keep it here.</Text></View>}
 renderItem={({item})=><View style={s.row}><Pressable style={s.play} onPress={()=>router.push(`/video/${item.id}`)}><Ionicons name="play" size={20} color="white"/></Pressable><Pressable style={s.copy} onPress={()=>router.push(`/video/${item.id}`)}><Text style={s.caption} numberOfLines={2}>{item.caption||"VILATUCK video"}</Text><Text style={s.date}>{new Date(item.created_at).toLocaleDateString()}</Text></Pressable><Pressable onPress={()=>remove(item.id)}><Ionicons name="bookmark" size={23} color="#A88FFF"/></Pressable></View>}/>}
 </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F"},header:{height:58,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#24222D"},title:{color:"white",fontSize:18,fontWeight:"800"},center:{flex:1,alignItems:"center",justifyContent:"center",padding:28},empty:{color:"white",fontSize:17,fontWeight:"700",marginTop:14},sub:{color:"#9692A3",textAlign:"center",marginTop:8},row:{flexDirection:"row",alignItems:"center",padding:15,borderBottomWidth:1,borderBottomColor:"#24222D"},play:{width:44,height:44,borderRadius:9,backgroundColor:"#7047FF",alignItems:"center",justifyContent:"center",marginRight:12},copy:{flex:1},caption:{color:"white",fontSize:14,fontWeight:"700"},date:{color:"#918D9D",fontSize:11,marginTop:5}});
