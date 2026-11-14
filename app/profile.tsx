import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
export default function ProfileScreen(){
 const router=useRouter();
 return <View style={s.page}>
  <Pressable onPress={()=>router.back()}><Ionicons name="arrow-back" size={26} color="white"/></Pressable>
  <View style={s.avatar}><Ionicons name="person" size={38} color="white"/></View>
  <Text style={s.name}>Your VILATUCK profile</Text><Text style={s.handle}>@yourusername</Text>
  <View style={s.stats}><View><Text style={s.num}>0</Text><Text style={s.muted}>Following</Text></View><View><Text style={s.num}>0</Text><Text style={s.muted}>Followers</Text></View><View><Text style={s.num}>0</Text><Text style={s.muted}>Likes</Text></View></View>
  <View style={s.card}><Ionicons name="shield-checkmark-outline" size={24} color="#A88FFF"/><View style={{flex:1}}><Text style={s.item}>Account verification</Text><Text style={s.muted}>Verified badges should be approved by authorized admins after identity and authenticity checks.</Text></View></View>
  <View style={s.card}><Ionicons name="videocam-outline" size={24} color="#A88FFF"/><View style={{flex:1}}><Text style={s.item}>Your videos</Text><Text style={s.muted}>Your uploaded videos will appear here once video storage is connected.</Text></View></View>
  <View style={s.card}><Ionicons name="lock-closed-outline" size={24} color="#A88FFF"/><View style={{flex:1}}><Text style={s.item}>Platform admin</Text><Text style={s.muted}>Admin access requires secure authorization.</Text></View><Pressable onPress={()=>router.push("/admin")}><Ionicons name="chevron-forward" size={19} color="#AAA5B7"/></Pressable></View>
 </View>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:"#09090F",padding:22,paddingTop:55},avatar:{width:88,height:88,borderRadius:44,backgroundColor:"#49318D",alignItems:"center",justifyContent:"center",alignSelf:"center",marginTop:45},name:{color:"white",fontWeight:"900",fontSize:22,textAlign:"center",marginTop:15},handle:{color:"#AAA5B7",textAlign:"center",marginTop:5},stats:{flexDirection:"row",justifyContent:"space-around",marginVertical:28},num:{color:"white",fontWeight:"900",fontSize:20,textAlign:"center"},muted:{color:"#AAA5B7",fontSize:12,lineHeight:18,marginTop:5},card:{flexDirection:"row",gap:14,backgroundColor:"#171422",padding:17,borderRadius:16,marginBottom:13,alignItems:"center"},item:{color:"white",fontWeight:"700",fontSize:15}});
