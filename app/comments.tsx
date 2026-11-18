import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type CommentItem = { id:string; user_id:string; body:string; created_at:string; display_name?:string|null; username?:string|null };

export default function CommentsScreen() {
  const router=useRouter();
  const { videoId }=useLocalSearchParams<{videoId:string}>();
  const [items,setItems]=useState<CommentItem[]>([]);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);

  const load=useCallback(async()=>{
    if(!videoId){setLoading(false);return;}
    try{
      const {data,error}=await supabase.from("comments").select("id,user_id,body,created_at").eq("video_id",videoId).order("created_at",{ascending:true}).limit(100);
      if(error)throw error;
      const rows=(data||[]) as CommentItem[];
      const ids=[...new Set(rows.map(row=>row.user_id))];
      const {data:profiles,error:profileError}=ids.length?await supabase.from("profiles").select("id,display_name,username").in("id",ids):{data:[],error:null};
      if(profileError)throw profileError;
      const byId=new Map((profiles||[]).map((p:any)=>[p.id,p]));
      setItems(rows.map(row=>({...row,...byId.get(row.user_id)})));
    }catch(error){Alert.alert("Could not load comments",error instanceof Error?error.message:"Please try again.");}
    finally{setLoading(false);}
  },[videoId]);

  useEffect(()=>{load();},[load]);

  async function send(){
    const body=message.trim();
    if(!body)return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user){
      Alert.alert("Sign in required","Sign in to comment on VILATUCK videos.",[
        {text:"Cancel",style:"cancel"},
        {text:"Sign in",onPress:()=>router.push("/auth")}
      ]);
      return;
    }
    setSending(true);
    const {error}=await supabase.from("comments").insert({video_id:videoId,user_id:user.id,body});
    setSending(false);
    if(error){Alert.alert("Comment not sent",error.message);return;}
    setMessage("");
    load();
  }

  return(
    <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={()=>router.back()} accessibilityLabel="Close comments"/>
      <KeyboardAvoidingView style={s.sheet} behavior={Platform.OS==="ios"?"padding":undefined}>
        <View style={s.handle}/>
        <View style={s.header}>
          <Text style={s.title}>Comments <Text style={s.count}>({items.length})</Text></Text>
          <Pressable onPress={()=>router.back()} hitSlop={12}><Ionicons name="close" size={25} color="white"/></Pressable>
        </View>
        {loading?<View style={s.center}><ActivityIndicator color="#A88FFF"/></View>:items.length===0?
          <View style={s.center}><Ionicons name="chatbubble-ellipses-outline" size={45} color="#82789A"/><Text style={s.empty}>No comments yet. Start the conversation.</Text></View>:
          <FlatList data={items} keyExtractor={item=>item.id} contentContainerStyle={s.list} keyboardShouldPersistTaps="handled" renderItem={({item})=>
            <View style={s.comment}>
              <View style={s.avatar}><Text style={s.avatarText}>{(item.display_name||item.username||"V").slice(0,1).toUpperCase()}</Text></View>
              <View style={{flex:1}}>
                <Text style={s.name}>{item.username?"@"+item.username:item.display_name||"VILATUCK user"}</Text>
                <Text style={s.body}>{item.body}</Text>
              </View>
            </View>
          }/>
        }
        <View style={s.composer}>
          <TextInput value={message} onChangeText={setMessage} placeholder="Add a comment..." placeholderTextColor="#8F8B9B" style={s.input} multiline maxLength={1000}/>
          <Pressable onPress={send} disabled={sending||!message.trim()} style={[s.send,(sending||!message.trim())&&{opacity:0.45}]}>
            {sending?<ActivityIndicator color="white"/>:<Ionicons name="send" size={19} color="white"/>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const s=StyleSheet.create({
 overlay:{flex:1,backgroundColor:"rgba(0,0,0,0.58)",justifyContent:"flex-end"},
 sheet:{height:"76%",backgroundColor:"#11101A",borderTopLeftRadius:23,borderTopRightRadius:23,overflow:"hidden",paddingTop:9},
 handle:{width:42,height:4,borderRadius:3,backgroundColor:"#625D70",alignSelf:"center",marginBottom:9},
 header:{height:48,paddingHorizontal:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomWidth:1,borderBottomColor:"#252230"},
 title:{color:"white",fontSize:16,fontWeight:"800"},
 count:{color:"#AAA5B7",fontWeight:"500"},
 list:{padding:18,gap:18},
 comment:{flexDirection:"row",gap:12,alignItems:"flex-start"},
 avatar:{width:38,height:38,borderRadius:19,backgroundColor:"#7047FF",alignItems:"center",justifyContent:"center"},
 avatarText:{color:"white",fontWeight:"900"},
 name:{color:"#C8B9FF",fontWeight:"800",fontSize:12,marginBottom:4},
 body:{color:"white",fontSize:14,lineHeight:20},
 center:{flex:1,alignItems:"center",justifyContent:"center",padding:30},
 empty:{color:"#AAA5B7",fontSize:14,textAlign:"center",marginTop:12},
 composer:{flexDirection:"row",alignItems:"flex-end",gap:10,padding:14,paddingBottom:24,borderTopWidth:1,borderTopColor:"#252230"},
 input:{flex:1,maxHeight:110,minHeight:45,borderRadius:13,backgroundColor:"#201D2B",color:"white",paddingHorizontal:14,paddingVertical:11},
 send:{width:45,height:45,borderRadius:13,backgroundColor:"#7047FF",alignItems:"center",justifyContent:"center"}
});
