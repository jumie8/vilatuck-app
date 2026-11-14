import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
export default function LiveScreen(){
 const router=useRouter();
 return <View style={s.page}>
  <View style={s.top}><Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={26} color="white"/></Pressable><Text style={s.title}>VILATUCK LIVE</Text><View style={{width:26}}/></View>
  <View style={s.center}><View style={s.liveIcon}><Ionicons name="radio" size={44} color="#A88FFF"/></View><Text style={s.heading}>Go live and meet your audience</Text><Text style={s.body}>Live video, viewer chat and virtual gifts are planned for VILATUCK.</Text><View style={s.notice}><Text style={s.noticeText}>Live streaming is not active yet. It needs a streaming service, user accounts, moderation and a secure backend.</Text></View><Pressable style={s.button}><Text style={s.buttonText}>Live streaming coming soon</Text></Pressable></View>
 </View>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F",paddingTop:55,paddingHorizontal:20},top:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},title:{color:"white",fontWeight:"900",letterSpacing:1},center:{flex:1,alignItems:"center",justifyContent:"center"},liveIcon:{width:94,height:94,borderRadius:47,backgroundColor:"#211A39",alignItems:"center",justifyContent:"center",marginBottom:25},heading:{color:"white",fontSize:23,fontWeight:"800",textAlign:"center"},body:{color:"#AAA5B7",fontSize:15,textAlign:"center",lineHeight:23,marginTop:12,maxWidth:300},notice:{backgroundColor:"#211D2D",borderColor:"#44366C",borderWidth:1,borderRadius:14,padding:15,marginTop:25},noticeText:{color:"#D7CFFF",fontSize:13,lineHeight:20,textAlign:"center"},button:{backgroundColor:"#33245E",padding:16,borderRadius:14,marginTop:25,width:"100%",alignItems:"center"},buttonText:{color:"#CFC3FF",fontWeight:"700"}});
