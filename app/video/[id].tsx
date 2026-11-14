import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Share, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { supabase } from "../../lib/supabase";

type Video = {id:string;user_id:string;caption:string|null;video_url:string;views_count:number|null};
export default function VideoDetailScreen(){
 const {id:rawId}=useLocalSearchParams<{id:string}>();const id=Array.isArray(rawId)?rawId[0]:rawId;const router=useRouter();
 const [video,setVideo]=useState<Video|null>(null);const [creator,setCreator]=useState("VILATUCK creator");const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;(async()=>{
  if(!id){setLoading(false);return;}
  const {data,error}=await supabase.from("videos").select("id,user_id,caption,video_url,views_count").eq("id",id).eq("status","published").eq("visibility","public").maybeSingle();
  if(error)console.warn("Video:",error.message);
  if(!active)return;
  setVideo(data as Video|null);
  if(data?.user_id){const {data:p}=await supabase.from("profiles").select("username,display_name").eq("id",data.user_id).maybeSingle();if(active&&p)setCreator(p.username?"@"+p.username:p.display_name||"VILATUCK creator");}
  setLoading(false);
 })();return()=>{active=false;};},[id]);
 const player=useVideoPlayer(video?.video_url||null,p=>{p.loop=true;});
 if(loading)return <View style={s.center}><ActivityIndicator color="#A88FFF"/></View>;
 if(!video)return <View style={s.center}><Text style={s.title}>Video unavailable</Text><Text style={s.muted}>This video may have been removed or is not public.</Text><Pressable onPress={()=>router.replace("/")}><Text style={s.link}>Go to VILATUCK</Text></Pressable></View>;
 async function share(){const link=`vilatuck://video/${video!.id}`;try{await Share.share({message:`${video!.caption||"Watch this video on VILATUCK"}\n\nOpen in VILATUCK: ${link}\nWatch video: ${video!.video_url}`});}catch(e){Alert.alert("Unable to share","Please try again.");}}
 return <View style={s.page}>
  <View style={s.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="white"/></Pressable><Text style={s.title}>VILATUCK video</Text><Pressable onPress={share}><Ionicons name="share-social-outline" size={23} color="white"/></Pressable></View>
  <VideoView player={player} style={s.video} contentFit="contain" nativeControls allowsFullscreen/>
  <View style={s.info}><Text style={s.creator}>{creator}</Text>{video.caption?<Text style={s.caption}>{video.caption}</Text>:null}<Text style={s.muted}>{video.views_count||0} views</Text>
   <View style={s.actions}><Pressable style={s.button} onPress={()=>router.push({pathname:"/comments",params:{videoId:video.id}})}><Ionicons name="chatbubble-ellipses-outline" size={20} color="white"/><Text style={s.buttonText}>Comments</Text></Pressable><Pressable style={s.button} onPress={share}><Ionicons name="share-social-outline" size={20} color="white"/><Text style={s.buttonText}>Share video</Text></Pressable></View>
  </View>
 </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F"},header:{height:58,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#24222D"},title:{color:"white",fontSize:18,fontWeight:"800"},video:{width:"100%",height:"65%",backgroundColor:"#000"},info:{padding:18},creator:{color:"white",fontWeight:"800",fontSize:17},caption:{color:"#E1DEEA",fontSize:15,marginTop:10,lineHeight:22},muted:{color:"#9B97A8",marginTop:9},actions:{flexDirection:"row",gap:12,marginTop:18},button:{flexDirection:"row",alignItems:"center",gap:8,paddingVertical:11,paddingHorizontal:14,backgroundColor:"#252230",borderRadius:22},buttonText:{color:"white",fontWeight:"700"},center:{flex:1,backgroundColor:"#09090F",alignItems:"center",justifyContent:"center",padding:24},link:{color:"#A88FFF",fontWeight:"800",marginTop:15}});
