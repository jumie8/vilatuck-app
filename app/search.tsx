import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Image, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type Person={id:string;username:string|null;display_name:string|null;bio:string|null;avatar_url?:string|null;is_verified?:boolean};
type Video={id:string;user_id:string;caption:string|null;video_url:string;thumbnail_url:string|null;views_count:number|null;creator?:Person};
type Tag={id:string;tag:string};
type Tab="Creators"|"Videos"|"Hashtags";

export default function SearchScreen(){
 const router=useRouter();
 const [term,setTerm]=useState("");
 const [tab,setTab]=useState<Tab>("Creators");
 const [people,setPeople]=useState<Person[]>([]);
 const [videos,setVideos]=useState<Video[]>([]);
 const [tags,setTags]=useState<Tag[]>([]);
 const [busy,setBusy]=useState(false);
 const [searched,setSearched]=useState(false);
 const [trending,setTrending]=useState<Video[]>([]);
 const [trendingBusy,setTrendingBusy]=useState(true);

 const loadTrending=useCallback(async()=>{
  setTrendingBusy(true);
  const {data,error}=await supabase.from("videos").select("id,user_id,caption,video_url,thumbnail_url,views_count").eq("status","published").eq("visibility","public").order("views_count",{ascending:false}).limit(12);
  if(!error&&data?.length){
   const ids=[...new Set(data.map(v=>v.user_id))];
   const {data:profiles}=await supabase.from("profiles").select("id,username,display_name").in("id",ids);
   const byId=new Map((profiles||[]).map(p=>[p.id,p]));
   setTrending(data.map(v=>({...v,creator:byId.get(v.user_id)})) as Video[]);
  }else setTrending([]);
  setTrendingBusy(false);
 },[]);
 useEffect(()=>{loadTrending();},[loadTrending]);

 async function search(){
  const q=term.trim().replace(/^[@#]/,"").replace(/[(),]/g," ").trim();
  if(!q){setPeople([]);setVideos([]);setTags([]);setSearched(false);return;}
  setBusy(true);setSearched(true);
  try{
   if(tab==="Creators"){
    const {data,error}=await supabase.from("profiles").select("id,username,display_name,bio,avatar_url,is_verified").or(`username.ilike.%${q}%,display_name.ilike.%${q}%`).limit(30);
    if(!error)setPeople((data||[]) as Person[]);
   }else if(tab==="Videos"){
    const {data,error}=await supabase.from("videos").select("id,user_id,caption,video_url,thumbnail_url,views_count").eq("status","published").eq("visibility","public").ilike("caption",`%${q}%`).order("created_at",{ascending:false}).limit(30);
    if(!error){
     const rows=data||[];const ids=[...new Set(rows.map(v=>v.user_id))];
     const {data:profiles}=ids.length?await supabase.from("profiles").select("id,username,display_name").in("id",ids):{data:[]};
     const byId=new Map((profiles||[]).map(p=>[p.id,p]));
     setVideos(rows.map(v=>({...v,creator:byId.get(v.user_id)})) as Video[]);
    }
   }else{
    const {data,error}=await supabase.from("hashtags").select("id,tag").ilike("tag",`%${q}%`).order("created_at",{ascending:false}).limit(30);
    if(!error)setTags((data||[]) as Tag[]);
   }
  }catch(e){console.warn("Search failed",e);}
  setBusy(false);
 }
 async function openTag(tag:Tag){
  setTerm("#"+tag.tag);setTab("Videos");setBusy(true);setSearched(true);
  const {data:links}=await supabase.from("video_hashtags").select("video_id").eq("hashtag_id",tag.id).limit(30);
  const ids=(links||[]).map(x=>x.video_id);
  if(!ids.length){setVideos([]);setBusy(false);return;}
  const {data}=await supabase.from("videos").select("id,user_id,caption,video_url,thumbnail_url,views_count").in("id",ids).eq("status","published").eq("visibility","public").order("created_at",{ascending:false});
  const rows=data||[];const userIds=[...new Set(rows.map(v=>v.user_id))];
  const {data:profiles}=userIds.length?await supabase.from("profiles").select("id,username,display_name").in("id",userIds):{data:[]};
  const byId=new Map((profiles||[]).map(p=>[p.id,p]));
  setVideos(rows.map(v=>({...v,creator:byId.get(v.user_id)})) as Video[]);setBusy(false);
 }
 const resultsEmpty=tab==="Creators"?people.length===0:tab==="Videos"?videos.length===0:tags.length===0;
 return <View style={s.page}>
  <View style={s.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="white"/></Pressable><Text style={s.title}>Discover</Text><View style={{width:24}}/></View>
  <View style={s.search}><Ionicons name="search" size={20} color="#A8A2B4"/><TextInput value={term} onChangeText={setTerm} onSubmitEditing={search} placeholder="Search creators, videos or hashtags" placeholderTextColor="#898394" style={s.input} returnKeyType="search"/><Pressable onPress={search}><Text style={s.go}>Search</Text></Pressable></View>
  <View style={s.tabs}>{(["Creators","Videos","Hashtags"] as Tab[]).map(t=><Pressable key={t} onPress={()=>{setTab(t);if(term.trim())setTimeout(search,0);}} style={[s.tab,tab===t&&s.activeTab]}><Text style={[s.tabText,tab===t&&s.activeTabText]}>{t}</Text></Pressable>)}</View>
  {busy?<ActivityIndicator color="#A88FFF" style={{marginTop:30}}/>:searched?(
   resultsEmpty?<Text style={s.empty}>No {tab.toLowerCase()} found. Try another search.</Text>:
   tab==="Creators"?<FlatList data={people} keyExtractor={p=>p.id} renderItem={({item})=><Pressable style={s.personRow} onPress={()=>router.push({pathname:"/creator/[id]",params:{id:item.id}})}><View style={s.avatar}>{item.avatar_url?<Image source={{uri:item.avatar_url}} style={s.avatarImage}/>:<Ionicons name="person" size={20} color="white"/>}</View><View style={{flex:1}}><Text style={s.name}>{item.display_name||item.username||"VILATUCK creator"} {item.is_verified?"✓":""}</Text><Text style={s.handle}>@{item.username||"creator"}</Text>{item.bio?<Text style={s.bio} numberOfLines={1}>{item.bio}</Text>:null}</View><Ionicons name="chevron-forward" size={18} color="#8E879C"/></Pressable>}/>:
   tab==="Videos"?<FlatList data={videos} keyExtractor={v=>v.id} renderItem={({item})=><Pressable style={s.videoRow} onPress={()=>router.push({pathname:"/video/[id]",params:{id:item.id}})}><View style={s.thumb}>{item.thumbnail_url?<Image source={{uri:item.thumbnail_url}} style={s.thumbImage}/>:<Ionicons name="play" size={25} color="white"/>}</View><View style={{flex:1}}><Text style={s.name} numberOfLines={2}>{item.caption||"VILATUCK video"}</Text><Text style={s.handle}>{item.creator?.username?"@"+item.creator.username:item.creator?.display_name||"Creator"} · {item.views_count||0} views</Text></View><Ionicons name="play-circle-outline" size={24} color="#B49CFF"/></Pressable>}/>:
   <FlatList data={tags} keyExtractor={t=>t.id} renderItem={({item})=><Pressable style={s.tagRow} onPress={()=>openTag(item)}><Ionicons name="pricetag-outline" size={20} color="#B49CFF"/><Text style={s.tagText}>#{item.tag}</Text><Ionicons name="chevron-forward" size={18} color="#8E879C"/></Pressable>}/>
  ):(
   <ScrollView contentContainerStyle={{paddingBottom:28}}>
    <View style={s.sectionHead}><Text style={s.sectionTitle}>Popular videos</Text><Text style={s.sectionHint}>Most viewed public videos</Text></View>
    {trendingBusy?<ActivityIndicator color="#A88FFF" style={{marginTop:25}}/>:trending.length===0?<Text style={s.empty}>Videos will appear here as creators upload them.</Text>:<View style={s.grid}>{trending.map(v=><Pressable key={v.id} style={s.tile} onPress={()=>router.push({pathname:"/video/[id]",params:{id:v.id}})}><View style={s.tileImage}>{v.thumbnail_url?<Image source={{uri:v.thumbnail_url}} style={s.tilePhoto}/>:<Ionicons name="play" size={26} color="white"/>}<View style={s.views}><Ionicons name="play" size={11} color="white"/><Text style={s.viewsText}>{v.views_count||0}</Text></View></View><Text style={s.tileCaption} numberOfLines={2}>{v.caption||"VILATUCK video"}</Text><Text style={s.tileCreator} numberOfLines={1}>@{v.creator?.username||v.creator?.display_name||"creator"}</Text></Pressable>)}</View>}
   </ScrollView>
  )}
 </View>;
}
const s=StyleSheet.create({
 page:{flex:1,backgroundColor:"#09090F",paddingTop:48},header:{height:54,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},title:{color:"white",fontSize:19,fontWeight:"800"},
 search:{margin:16,backgroundColor:"#1B1825",borderRadius:13,paddingHorizontal:13,flexDirection:"row",alignItems:"center",gap:9},input:{flex:1,color:"white",height:48,fontSize:13},go:{color:"#B49CFF",fontWeight:"800"},
 tabs:{flexDirection:"row",paddingHorizontal:16,gap:8,marginBottom:8},tab:{paddingVertical:9,paddingHorizontal:15,borderRadius:18,backgroundColor:"#1B1825"},activeTab:{backgroundColor:"#7047FF"},tabText:{color:"#AAA5B7",fontWeight:"700",fontSize:12},activeTabText:{color:"white"},
 empty:{color:"#AAA5B7",textAlign:"center",marginTop:40,paddingHorizontal:25},personRow:{flexDirection:"row",alignItems:"center",padding:15,borderBottomWidth:1,borderBottomColor:"#24212D",gap:12},avatar:{width:44,height:44,borderRadius:22,backgroundColor:"#7047FF",alignItems:"center",justifyContent:"center",overflow:"hidden"},avatarImage:{width:44,height:44,borderRadius:22},name:{color:"white",fontWeight:"800"},handle:{color:"#AAA5B7",fontSize:12,marginTop:3},bio:{color:"#AAA5B7",fontSize:12,marginTop:4},
 videoRow:{flexDirection:"row",alignItems:"center",padding:12,borderBottomWidth:1,borderBottomColor:"#24212D",gap:12},thumb:{width:64,height:82,borderRadius:8,backgroundColor:"#282336",alignItems:"center",justifyContent:"center",overflow:"hidden"},thumbImage:{width:64,height:82},tagRow:{flexDirection:"row",alignItems:"center",gap:12,padding:16,borderBottomWidth:1,borderBottomColor:"#24212D"},tagText:{color:"white",fontWeight:"800",flex:1},
 sectionHead:{paddingHorizontal:16,paddingTop:12,paddingBottom:15},sectionTitle:{color:"white",fontSize:18,fontWeight:"900"},sectionHint:{color:"#9690A3",fontSize:12,marginTop:4},grid:{flexDirection:"row",flexWrap:"wrap",paddingHorizontal:8},tile:{width:"33.33%",padding:5},tileImage:{height:150,borderRadius:8,backgroundColor:"#282336",alignItems:"center",justifyContent:"center",overflow:"hidden"},tilePhoto:{width:"100%",height:"100%"},views:{position:"absolute",bottom:5,left:6,flexDirection:"row",alignItems:"center",gap:3},viewsText:{color:"white",fontSize:10,fontWeight:"700"},tileCaption:{color:"white",fontSize:11,marginTop:5},tileCreator:{color:"#A7A1B3",fontSize:10,marginTop:3}
});
