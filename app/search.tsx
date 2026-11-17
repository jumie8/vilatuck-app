import { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type Person={id:string;username:string|null;display_name:string|null;bio:string|null};
export default function SearchScreen(){
 const router=useRouter(); const [term,setTerm]=useState(""); const [people,setPeople]=useState<Person[]>([]); const [busy,setBusy]=useState(false); const [searched,setSearched]=useState(false);
 async function search(){const q=term.trim().replace(/^@/,""); if(!q){setPeople([]);setSearched(false);return;} setBusy(true);setSearched(true);
 const {data,error}=await supabase.from("profiles").select("id,username,display_name,bio").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(30);
 if(!error)setPeople((data||[]) as Person[]);setBusy(false);}
 return <View style={s.page}><View style={s.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="white"/></Pressable><Text style={s.title}>Discover</Text><View style={{width:24}}/></View>
 <View style={s.search}><Ionicons name="search" size={20} color="#A8A2B4"/><TextInput value={term} onChangeText={setTerm} onSubmitEditing={search} placeholder="Search people by name or username" placeholderTextColor="#898394" style={s.input} returnKeyType="search"/><Pressable onPress={search}><Text style={s.go}>Search</Text></Pressable></View>
 {busy?<ActivityIndicator color="#A88FFF" style={{marginTop:30}}/>:<FlatList data={people} keyExtractor={p=>p.id} ListEmptyComponent={<Text style={s.empty}>{searched?"No matching creators found.":"Find creators on VILATUCK."}</Text>} renderItem={({item})=><Pressable style={s.row} onPress={()=>router.push({pathname:"/creator/[id]",params:{id:item.id}})}><View style={s.avatar}><Ionicons name="person" size={20} color="white"/></View><View style={{flex:1}}><Text style={s.name}>{item.display_name||item.username||"VILATUCK creator"}</Text><Text style={s.handle}>@{item.username||"creator"}</Text>{item.bio?<Text style={s.bio} numberOfLines={1}>{item.bio}</Text>:null}</View><Ionicons name="chevron-forward" size={18} color="#8E879C"/></Pressable>}/> }
 </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F",paddingTop:48},header:{height:54,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},title:{color:"white",fontSize:19,fontWeight:"800"},search:{margin:16,backgroundColor:"#1B1825",borderRadius:13,paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:9},input:{flex:1,color:"white",height:48,fontSize:13},go:{color:"#B49CFF",fontWeight:"800"},row:{flexDirection:"row",alignItems:"center",padding:15,borderBottomWidth:1,borderBottomColor:"#24212D",gap:12},avatar:{width:44,height:44,borderRadius:22,backgroundColor:"#7047FF",alignItems:"center",justifyContent:"center"},name:{color:"white",fontWeight:"800"},handle:{color:"#AAA5B7",fontSize:12,marginTop:3},bio:{color:"#AAA5B7",fontSize:12,marginTop:4},empty:{color:"#AAA5B7",textAlign:"center",marginTop:40}});
