import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function submit() {
    if (mode === "signup" && !name.trim()) {
      Alert.alert("Name required", "Enter the name you want to use on VILATUCK.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Check your email", "Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }
    Alert.alert("Account setup not connected yet", "Your details have not been sent or saved. VILATUCK needs its secure Supabase authentication connection before sign-in and account creation can work.");
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={25} color="white" /></Pressable>
      <Text style={s.logo}>VILA<Text style={{color:"#A88FFF"}}>TUCK</Text></Text>
      <Text style={s.title}>{mode === "signup" ? "Join the community" : "Welcome back"}</Text>
      <Text style={s.subtitle}>{mode === "signup" ? "Create an account and share your world." : "Sign in to continue to your VILATUCK account."}</Text>
      <View style={s.switch}>
        <Pressable onPress={() => setMode("signup")} style={[s.switchTab, mode === "signup" && s.selected]}><Text style={[s.switchText, mode === "signup" && s.selectedText]}>Create account</Text></Pressable>
        <Pressable onPress={() => setMode("login")} style={[s.switchTab, mode === "login" && s.selected]}><Text style={[s.switchText, mode === "login" && s.selectedText]}>Sign in</Text></Pressable>
      </View>
      {mode === "signup" && <>
        <Text style={s.label}>Display name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor="#777284" style={s.input} autoCapitalize="words" />
      </>}
      <Text style={s.label}>Email address</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#777284" style={s.input} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
      <Text style={s.label}>Password</Text>
      <TextInput value={password} onChangeText={setPassword} placeholder="At least 8 characters" placeholderTextColor="#777284" style={s.input} secureTextEntry />
      <Pressable onPress={submit} style={s.button}><Text style={s.buttonText}>{mode === "signup" ? "Create account" : "Sign in"}</Text></Pressable>
      <View style={s.notice}><Ionicons name="shield-checkmark-outline" size={20} color="#D7C9FF"/><Text style={s.noticeText}>Secure account creation is not active yet. This preview does not transmit or store your password. Supabase authentication must be connected before real accounts can be created.</Text></View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#09090F"},
  content:{padding:24,paddingTop:55,paddingBottom:45},
  back:{alignSelf:"flex-start"},
  logo:{color:"white",fontSize:23,fontWeight:"900",letterSpacing:1,marginTop:40},
  title:{color:"white",fontSize:28,fontWeight:"900",marginTop:30},
  subtitle:{color:"#AAA5B7",fontSize:14,lineHeight:21,marginTop:8},
  switch:{flexDirection:"row",backgroundColor:"#171422",borderRadius:13,padding:4,marginTop:28},
  switchTab:{flex:1,padding:12,alignItems:"center",borderRadius:10},
  selected:{backgroundColor:"#7047FF"},
  switchText:{color:"#AAA5B7",fontWeight:"700",fontSize:13},
  selectedText:{color:"white"},
  label:{color:"white",fontSize:13,fontWeight:"700",marginTop:20,marginBottom:8},
  input:{backgroundColor:"#171422",borderColor:"#302A3D",borderWidth:1,borderRadius:12,padding:15,color:"white",fontSize:14},
  button:{backgroundColor:"#7047FF",padding:16,borderRadius:13,alignItems:"center",marginTop:28},
  buttonText:{color:"white",fontSize:15,fontWeight:"900"},
  notice:{flexDirection:"row",gap:10,backgroundColor:"#211D2D",borderRadius:13,padding:14,marginTop:22},
  noticeText:{color:"#D7CFFF",fontSize:12,lineHeight:19,flex:1}
});
