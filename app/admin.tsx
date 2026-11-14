import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AdminScreen(){
 const router=useRouter();
 return <View style={s.page}>
  <Pressable onPress={()=>router.back()} style={s.back}><Ionicons name="arrow-back" size={24} color="white"/></Pressable>
  <View style={s.icon}><Ionicons name="shield-checkmark" size={38} color="#C8B7FF"/></View>
  <Text style={s.title}>VILATUCK Admin</Text>
  <Text style={s.subtitle}>Account verification and platform controls</Text>
  <View style={s.notice}><Ionicons name="lock-closed" size={21} color="#D5C8FF"/><Text style={s.noticeText}>Admin access is locked until secure backend authentication and server-side admin roles are connected. A button or PIN inside the app must never grant admin privileges by itself.</Text></View>
  <View style={s.card}><Text style={s.cardTitle}>Verification management</Text><Text style={s.body}>Once enabled, authorized admins can review verification applications, inspect submitted evidence, approve or reject requests, and record every decision in an audit log.</Text><Text style={s.status}>NOT CONNECTED</Text></View>
  <View style={s.card}><Text style={s.cardTitle}>Admin safeguards</Text>{["Only server-authorized admins can make decisions","Every approval and rejection is recorded","Users can appeal a rejected request","Admin actions require authenticated sessions"].map(x=><View style={s.line} key={x}><Ionicons name="checkmark-circle-outline" size={17} color="#A88FFF"/><Text style={s.body}>{x}</Text></View>)}</View>
 </View>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F",padding:22,paddingTop:55},back:{alignSelf:"flex-start"},icon:{width:78,height:78,borderRadius:39,backgroundColor:"#211A39",alignItems:"center",justifyContent:"center",alignSelf:"center",marginTop:35},title:{color:"white",fontSize:25,fontWeight:"900",textAlign:"center",marginTop:16},subtitle:{color:"#AAA5B7",fontSize:13,textAlign:"center",marginTop:6},notice:{flexDirection:"row",gap:12,backgroundColor:"#211D2D",borderWidth:1,borderColor:"#493A70",padding:15,borderRadius:15,marginTop:25},noticeText:{color:"#D7CFFF",fontSize:12,lineHeight:19,flex:1},card:{backgroundColor:"#171422",padding:17,borderRadius:16,marginTop:16,borderWidth:1,borderColor:"#292436"},cardTitle:{color:"white",fontSize:16,fontWeight:"800",marginBottom:9},body:{color:"#AAA5B7",fontSize:12,lineHeight:19,flex:1},status:{color:"#D8C9FF",fontSize:10,fontWeight:"900",letterSpacing:1,marginTop:12},line:{flexDirection:"row",gap:9,alignItems:"center",marginTop:9}});
