import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Share, Alert, Modal, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { supabase } from "../../lib/supabase";

type Video = {id:string;user_id:string;caption:string|null;video_url:string;views_count:number|null};
export default function VideoDetailScreen(){
 const {id:rawId}=useLocalSearchParams<{id:string}>();const id=Array.isArray(rawId)?rawId[0]:rawId;const router=useRouter();
 const [video,setVideo]=useState<Video|null>(null);const [creator,setCreator]=useState("VILATUCK creator");const [loading,setLoading]=useState(true);const [shareOpen,setShareOpen]=useState(false);
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
 async function share(){try{await Share.share({message:`${video!.caption||"Watch this video on VILATUCK"}\n\nOpen in VILATUCK: vilatuck://video/${video!.id}\nWatch video: ${video!.video_url}`});}catch(e){Alert.alert("Unable to share","Please try again.");}}
 async function copyLink(){if(!video)return;await Clipboard.setStringAsync(video.video_url);setShareOpen(false);Alert.alert("Link copied","The video link is ready to paste.");}
 async function shareTo(app:"whatsapp"|"telegram"){if(!video)return;const message=encodeURIComponent(`${video.caption||"Watch this video on VILATUCK"}\n${video.video_url}`);const url=app==="whatsapp"?`whatsapp://send?text=${message}`:`tg://msg_url?url=${encodeURIComponent(video.video_url)}&text=${encodeURIComponent(video.caption||"Watch this video on VILATUCK")}`;try{if(await Linking.canOpenURL(url))await Linking.openURL(url);else if(app==="telegram")await Linking.openURL(`https://t.me/share/url?url=${encodeURIComponent(video.video_url)}&text=${encodeURIComponent(video.caption||"Watch this video on VILATUCK")}`);else await Linking.openURL(`https://wa.me/?text=${message}`);setShareOpen(false);}catch{Alert.alert("Unable to open app","Please use Copy link or try again.");}}
 return <View style={s.page}>
  <View style={s.header}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={24} color="white"/></Pressable><Text style={s.title}>VILATUCK video</Text><Pressable onPress={()=>setShareOpen(true)}><Ionicons name="share-social-outline" size={23} color="white"/></Pressable></View>
  <VideoView player={player} style={s.video} contentFit="contain" nativeControls allowsFullscreen/>
  <Modal visible={shareOpen} transparent animationType="slide" onRequestClose={()=>setShareOpen(false)}>
   <Pressable style={s.overlay} onPress={()=>setShareOpen(false)}><Pressable style={s.sheet} onPress={()=>{}}>
    <View style={s.handle}/><View style={s.sheetHeader}><Text style={s.sheetTitle}>Share video</Text><Pressable onPress={()=>setShareOpen(false)}><Ionicons name="close" size={24} color="white"/></Pressable></View>
    <Text style={s.sheetCaption} numberOfLines={2}>{video.caption||"Share this video with your friends"}</Text>
    <View style={s.shareOptions}>
     <Pressable style={s.shareOption} onPress={()=>shareTo("whatsapp")}><View style={[s.shareIcon,{backgroundColor:"#1DAA60"}]}><Ionicons name="logo-whatsapp" size={25} color="white"/></View><Text style={s.shareLabel}>WhatsApp</Text></Pressable>
     <Pressable style={s.shareOption} onPress={()=>shareTo("telegram")}><View style={[s.shareIcon,{backgroundColor:"#229ED9"}]}><Ionicons name="paper-plane" size={24} color="white"/></View><Text style={s.shareLabel}>Telegram</Text></Pressable>
     <Pressable style={s.shareOption} onPress={copyLink}><View style={[s.shareIcon,{backgroundColor:"#393448"}]}><Ionicons name="copy-outline" size={24} color="white"/></View><Text style={s.shareLabel}>Copy link</Text></Pressable>
     <Pressable style={s.shareOption} onPress={()=>{setShareOpen(false);share();}}><View style={[s.shareIcon,{backgroundColor:"#393448"}]}><Ionicons name="share-social-outline" size={24} color="white"/></View><Text style={s.shareLabel}>More</Text></Pressable>
    </View>
   </Pressable></Pressable>
  </Modal>
  <View style={s.info}><Text style={s.creator}>{creator}</Text>{video.caption?<Text style={s.caption}>{video.caption}</Text>:null}<Text style={s.muted}>{video.views_count||0} views</Text>
   <View style={s.actions}><Pressable style={s.button} onPress={()=>router.push({pathname:"/comments",params:{videoId:video.id}})}><Ionicons name="chatbubble-ellipses-outline" size={20} color="white"/><Text style={s.buttonText}>Comments</Text></Pressable><Pressable style={s.button} onPress={share}><Ionicons name="share-social-outline" size={20} color="white"/><Text style={s.buttonText}>Share video</Text></Pressable></View>
  </View>
 </View>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F"},header:{height:58,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#24222D"},title:{color:"white",fontSize:18,fontWeight:"800"},video:{width:"100%",height:"65%",backgroundColor:"#000"},info:{padding:18},creator:{color:"white",fontWeight:"800",fontSize:17},caption:{color:"#E1DEEA",fontSize:15,marginTop:10,lineHeight:22},muted:{color:"#9B97A8",marginTop:9},actions:{flexDirection:"row",gap:12,marginTop:18},button:{flexDirection:"row",alignItems:"center",gap:8,paddingVertical:11,paddingHorizontal:14,backgroundColor:"#252230",borderRadius:22},buttonText:{color:"white",fontWeight:"700"},center:{flex:1,backgroundColor:"#09090F",alignItems:"center",justifyContent:"center",padding:24},link:{color:"#A88FFF",fontWeight:"800",marginTop:15},overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.62)",justifyContent:"flex-end"},sheet:{backgroundColor:"#171422",borderTopLeftRadius:24,borderTopRightRadius:24,padding:20,paddingBottom:38},handle:{width:42,height:4,borderRadius:3,backgroundColor:"#625D70",alignSelf:"center",marginBottom:16},sheetHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},sheetTitle:{color:"white",fontSize:17,fontWeight:"800"},sheetCaption:{color:"#AAA5B7",fontSize:13,marginTop:12},shareOptions:{flexDirection:"row",justifyContent:"space-between",marginTop:24},shareOption:{alignItems:"center",gap:8,minWidth:65},shareIcon:{width:54,height:54,borderRadius:27,alignItems:"center",justifyContent:"center"},shareLabel:{color:"white",fontSize:11,fontWeight:"600"}});
