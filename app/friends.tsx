import { useCallback,useEffect,useState } from "react";
import { View,Text,FlatList,Pressable,StyleSheet,ActivityIndicator,RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
type Friend={id:string;username:string|null;display_name:string|null;bio:string|null};
export default function FriendsScreen(){
 const router=useRouter();const [people,setPeople]=useState<Friend[]>([]);const [loading,setLoading]=useState(true);const [refreshing,setRefreshing]=useState(false);
 const load=useCallback(async()=>{const {data:{user}}=await supabase.auth.getUser();if(!user){setPeople([]);setLoading(false);setRefreshing(false);return;}
 const {data:links,error}=await supabase.from("follows").select("following_id").eq("follower_id",user.id);
 if(error){setLoading(false);setRefreshing(false);return;}const ids=(links||[]).map(x=>x.following_id);
 if(!ids.length){setPeople([]);setLoading(false);setRefreshing(false);return;}
 const {data}=await supabase.from("profiles").select("id,username,display_name,bio").in("id",ids);setPeople((data||[]) as Friend[]);setLoading(false);setRefreshing(false);
 },[]);
 useEffect(()=>{load();},[load]);
 return <View style={s.page}><View style={s.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="white"/></Pressable><Text style={s.title}>Friends</Text><Pressable onPress={()=>router.push("/search")}><Ionicons name="search" size={23} color="white"/></Pressable></View>
 {loading?<View style={s.center}><ActivityIndicator color="#A88FFF"/></View>:<FlatList data={people} keyExtractor={p=>p.id} refreshControl={<RefreshControl refreshing={refreshing} tintColor="#A88FFF" onRefresh={()=>{setRefreshing(true);load();}}/>} ListEmptyComponent={<View style={s.center}><Ionicons name="people-outline" size={45} color="#898394"/><Text style={s.empty}>Your friends will appear here</Text><Text style={s.sub}>Follow creators to keep up with their videos.</Text><Pressable style={s.button} onPress={()=>router.push("/search")}><Text style={s.buttonText}>Discover creators</Text></Pressable></View>} renderItem={({item})=><Pressable style={s.row} onPress={()=>router.push({pathname:"/creator/[id]",params:{id:item.id}})}><View style={s.avatar}><Ionicons name="person" size={21} color="white"/></View><View style={{flex:1}}><Text style={s.name}>{item.display_name||item.username||"VILATUCK user"}</Text><Text style={s.sub}>@{item.username||"creator"}</Text></View><Ionicons name="chevron-forward" size={18} color="#898394"/></Pressable>}/>}
 </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F",paddingTop:48},header:{height:56,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},title:{color:"white",fontSize:19,fontWeight:"800"},center:{flex:1,alignItems:"center",justifyContent:"center",padding:28},empty:{color:"white",fontSize:17,fontWeight:"800",marginTop:14},sub:{color:"#9993A7",marginTop:6},button:{backgroundColor:"#7047FF",padding:13,paddingHorizontal:22,borderRadius:12,marginTop:18},buttonText:{color:"white",fontWeight:"800"},row:{flexDirection:"row",alignItems:"center",padding:15,borderBottomWidth:1,borderBottomColor:"#24212D",gap:12},avatar:{width:46,height:46,borderRadius:23,backgroundColor:"#7047FF",alignItems:"center",justifyContent:"center"},name:{color:"white",fontWeight:"800"},sub:{color:"#9993A7",fontSize:12,marginTop:4}});
