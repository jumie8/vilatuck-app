import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const PURPLE = "#7047FF";
const { height } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [tab, setTab] = useState("For You");

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.logo}>VILA<Text style={{color:PURPLE}}>TUCK</Text></Text>
        <View style={s.headerActions}>
          <Pressable onPress={() => router.push("/live")} style={s.iconBtn}><Ionicons name="radio-outline" size={23} color="white" /></Pressable>
          <Pressable onPress={() => router.push("/wallet")} style={s.iconBtn}><Ionicons name="wallet-outline" size={23} color="white" /></Pressable>
          <Pressable onPress={() => router.push("/profile")} style={s.avatar}><Text style={s.avatarText}>A</Text></Pressable>
        </View>
      </View>
      <View style={s.tabs}>
        {["Following","For You","Trending"].map(t=><Pressable key={t} onPress={()=>setTab(t)}><Text style={[s.tab,tab===t&&s.activeTab]}>{t}</Text>{tab===t&&<View style={s.underline}/>}</Pressable>)}
      </View>
      <ScrollView contentContainerStyle={s.feed}>
        <View style={s.videoCard}>
          <View style={s.videoPlaceholder}>
            <Ionicons name="play-circle" size={76} color="rgba(255,255,255,0.9)" />
            <Text style={s.placeholderTitle}>Your next favourite video</Text>
            <Text style={s.placeholderSub}>VILATUCK video feed</Text>
            <View style={s.demoPill}><Text style={s.demoText}>DEMO FEED · ADD VIDEOS WHEN BACKEND IS CONNECTED</Text></View>
          </View>
          <View style={s.videoInfo}>
            <View style={{flex:1}}>
              <Text style={s.creator}>@ama_lagos <Text style={s.verified}>✓</Text></Text>
              <Text style={s.caption}>Welcome to VILATUCK! Share your moment with the world. #VILATUCK</Text>
              <Text style={s.sound}><Ionicons name="musical-notes" size={13} color="white"/> Original sound</Text>
            </View>
            <View style={s.actions}>
              <Pressable style={s.action} onPress={()=>setLiked(!liked)}><Ionicons name={liked?"heart":"heart-outline"} size={30} color={liked?"#FF477E":"white"}/><Text style={s.actionText}>{liked?"1":"0"}</Text></Pressable>
              <Pressable style={s.action}><Ionicons name="chatbubble-ellipses-outline" size={27} color="white"/><Text style={s.actionText}>Comment</Text></Pressable>
              <Pressable style={s.action} onPress={()=>router.push("/live")}><Ionicons name="gift-outline" size={28} color="white"/><Text style={s.actionText}>Gifts</Text></Pressable>
              <Pressable style={s.action}><Ionicons name="share-social-outline" size={27} color="white"/><Text style={s.actionText}>Share</Text></Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      <View style={s.bottom}>
        <Pressable style={s.navItem}><Ionicons name="home" size={23} color={PURPLE}/><Text style={[s.navText,{color:PURPLE}]}>Home</Text></Pressable>
        <Pressable style={s.navItem} onPress={()=>router.push("/live")}><Ionicons name="radio-outline" size={23} color="#A6A3B2"/><Text style={s.navText}>Live</Text></Pressable>
        <Pressable style={s.createBtn} onPress={()=>router.push("/profile")}><Ionicons name="add" size={28} color="white"/></Pressable>
        <Pressable style={s.navItem} onPress={()=>router.push("/wallet")}><Ionicons name="wallet-outline" size={23} color="#A6A3B2"/><Text style={s.navText}>Wallet</Text></Pressable>
        <Pressable style={s.navItem} onPress={()=>router.push("/profile")}><Ionicons name="person-outline" size={23} color="#A6A3B2"/><Text style={s.navText}>Profile</Text></Pressable>
      </View>
    </View>
  );
}

const s=StyleSheet.create({
 screen:{flex:1,backgroundColor:"#09090F",paddingTop:48},
 header:{height:54,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
 logo:{fontSize:23,fontWeight:"900",color:"white",letterSpacing:1},
 headerActions:{flexDirection:"row",alignItems:"center",gap:13},
 iconBtn:{width:38,height:38,borderRadius:19,backgroundColor:"#1C1A28",alignItems:"center",justifyContent:"center"},
 avatar:{width:34,height:34,borderRadius:17,backgroundColor:PURPLE,alignItems:"center",justifyContent:"center"},
 avatarText:{color:"white",fontWeight:"800"},
 tabs:{height:48,flexDirection:"row",justifyContent:"center",gap:30,alignItems:"center"},
 tab:{fontSize:14,color:"#8F8B9B",fontWeight:"600"},activeTab:{color:"white"},underline:{height:3,backgroundColor:PURPLE,borderRadius:3,marginTop:7},
 feed:{flexGrow:1,paddingHorizontal:12,paddingBottom:12},
 videoCard:{flex:1,minHeight:height*0.66,borderRadius:22,overflow:"hidden",backgroundColor:"#171422",justifyContent:"space-between"},
 videoPlaceholder:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:"#292044",gap:10},
 placeholderTitle:{fontSize:20,fontWeight:"800",color:"white"},placeholderSub:{fontSize:13,color:"#D2CBEA"},
 demoPill:{marginTop:16,paddingHorizontal:12,paddingVertical:8,borderRadius:20,backgroundColor:"rgba(0,0,0,0.35)"},demoText:{fontSize:9,color:"#E6DEFF",fontWeight:"700"},
 videoInfo:{position:"absolute",left:15,right:12,bottom:16,flexDirection:"row",alignItems:"flex-end"},
 creator:{color:"white",fontWeight:"800",fontSize:15},verified:{color:"#8D73FF"},caption:{color:"white",fontSize:12,marginTop:7,lineHeight:18,maxWidth:230},sound:{color:"white",fontSize:11,marginTop:8},
 actions:{alignItems:"center",gap:17,paddingBottom:2},action:{alignItems:"center",gap:3},actionText:{color:"white",fontSize:10,fontWeight:"600"},
 bottom:{height:72,borderTopWidth:1,borderTopColor:"#252230",backgroundColor:"#0D0B14",flexDirection:"row",alignItems:"center",justifyContent:"space-around",paddingBottom:8},
 navItem:{alignItems:"center",gap:3,minWidth:48},navText:{fontSize:10,color:"#A6A3B2"},createBtn:{width:44,height:38,borderRadius:12,backgroundColor:PURPLE,alignItems:"center",justifyContent:"center"}
});
