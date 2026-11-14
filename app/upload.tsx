import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../lib/supabase";

export default function UploadScreen() {
  const router = useRouter();
  const [videoName, setVideoName] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("video/mp4");
  const [loading, setLoading] = useState(false);

  function useSelectedVideo(asset: ImagePicker.ImagePickerAsset) {
    if (asset.fileSize && asset.fileSize > 250 * 1024 * 1024) {
      Alert.alert("Video is too large", "Please choose a video smaller than 250 MB.");
      return;
    }
    setVideoUri(asset.uri);
    setVideoName(asset.fileName || "Selected video");
    setMimeType(asset.mimeType || "video/mp4");
  }

  async function chooseVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow VILATUCK to access your videos so you can choose one to post.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      useSelectedVideo(result.assets[0]);
    }
  }

  async function recordVideo() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Camera permission needed", "Allow VILATUCK to use your camera to record a video.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 180,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      useSelectedVideo(result.assets[0]);
    }
  }

  async function publishVideo() {
    if (!videoUri) {
      Alert.alert("Choose a video", "Select a video from your phone first.");
      return;
    }
    setLoading(true);
    let uploadedPath: string | null = null;
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Sign in required", "Please sign in to VILATUCK before publishing a video.");
        router.push("/auth");
        return;
      }

      const fileResponse = await fetch(videoUri);
      if (!fileResponse.ok) throw new Error("Could not read the selected video from your phone.");
      const fileBuffer = await fileResponse.arrayBuffer();
      const extension = mimeType.includes("quicktime") ? "mov" : mimeType.includes("webm") ? "webm" : "mp4";
      const safeName = videoName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-70) || `video.${extension}`;
      uploadedPath = `${user.id}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from("videos").upload(uploadedPath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from("videos").getPublicUrl(uploadedPath);
      const { error: insertError } = await supabase.from("videos").insert({
        user_id: user.id,
        caption: caption.trim() || null,
        video_url: publicUrl.publicUrl,
        status: "published",
        visibility: "public",
      });
      if (insertError) {
        await supabase.storage.from("videos").remove([uploadedPath]);
        throw insertError;
      }
      Alert.alert("Video published", "Your video has been uploaded to VILATUCK.");
      setVideoUri(null);
      setVideoName("");
      setCaption("");
      router.replace("/");
    } catch (error) {
      Alert.alert("Upload failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={25} color="white" /></Pressable>
      <Text style={s.title}>Create a video</Text>
      <Text style={s.subtitle}>Share a moment with the VILATUCK community.</Text>
      <View style={s.picker}>
        <Ionicons name={videoUri ? "checkmark-circle" : "videocam-outline"} size={42} color="#B9A5FF" />
        <Text style={s.pickerTitle}>{videoUri ? "Video selected" : "Create your video"}</Text>
        <Text style={s.pickerHint}>{videoUri ? videoName : "Record a new video or choose one from your gallery"}</Text>
        <View style={s.actionRow}>
          <Pressable onPress={recordVideo} style={s.chooseButton}>
            <Ionicons name="videocam" size={17} color="white" />
            <Text style={s.chooseText}>Record video</Text>
          </Pressable>
          <Pressable onPress={chooseVideo} style={s.secondaryButton}>
            <Ionicons name="images-outline" size={17} color="white" />
            <Text style={s.chooseText}>Gallery</Text>
          </Pressable>
        </View>
        {videoUri ? <Pressable onPress={() => { setVideoUri(null); setVideoName(""); }}><Text style={s.removeText}>Remove selected video</Text></Pressable> : null}
      </View>
      <Text style={s.hint}>Maximum video length: 3 minutes. Maximum file size: 250 MB.</Text>
      <Text style={s.label}>Caption</Text>
      <TextInput value={caption} onChangeText={setCaption} placeholder="Write a caption and add #hashtags..." placeholderTextColor="#777284" multiline style={s.input} />
      <View style={s.notice}>
        <Ionicons name="information-circle-outline" size={20} color="#D7C9FF" />
        <Text style={s.noticeText}>Videos are stored in VILATUCK's Supabase videos bucket. Please upload content you own or have permission to share.</Text>
      </View>
      <Pressable style={[s.publish, (!videoUri || loading) && s.disabled]} disabled={!videoUri || loading} onPress={publishVideo}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={s.publishText}>Publish video</Text>}
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page:{flex:1,backgroundColor:"#09090F"},
  content:{padding:22,paddingTop:55,paddingBottom:40},
  back:{alignSelf:"flex-start"},
  title:{color:"white",fontSize:28,fontWeight:"900",marginTop:25},
  subtitle:{color:"#AAA5B7",fontSize:14,marginTop:7,lineHeight:21},
  picker:{minHeight:230,marginTop:25,borderRadius:20,borderWidth:1,borderColor:"#514078",borderStyle:"dashed",backgroundColor:"#171422",alignItems:"center",justifyContent:"center",padding:20},
  pickerTitle:{color:"white",fontSize:17,fontWeight:"800",marginTop:14,textAlign:"center"},
  pickerHint:{color:"#AAA5B7",fontSize:12,marginTop:7,textAlign:"center"},
  actionRow:{flexDirection:"row",gap:10,marginTop:17,flexWrap:"wrap",justifyContent:"center"},
  chooseButton:{flexDirection:"row",alignItems:"center",gap:7,backgroundColor:"#7047FF",paddingHorizontal:16,paddingVertical:12,borderRadius:12},
  secondaryButton:{flexDirection:"row",alignItems:"center",gap:7,backgroundColor:"#383044",paddingHorizontal:16,paddingVertical:12,borderRadius:12},
  chooseText:{color:"white",fontWeight:"800"},
  removeText:{color:"#F0A5B5",fontSize:12,fontWeight:"700",marginTop:18},
  hint:{color:"#8E879B",fontSize:11,marginTop:12},
  label:{color:"white",fontSize:14,fontWeight:"700",marginTop:25,marginBottom:9},
  input:{minHeight:115,borderRadius:14,backgroundColor:"#171422",borderWidth:1,borderColor:"#302A3D",color:"white",padding:14,textAlignVertical:"top"},
  notice:{flexDirection:"row",gap:10,backgroundColor:"#211D2D",borderRadius:14,padding:14,marginTop:20},
  noticeText:{color:"#D7CFFF",fontSize:12,lineHeight:19,flex:1},
  publish:{marginTop:22,backgroundColor:"#7047FF",borderRadius:14,padding:16,alignItems:"center",minHeight:52,justifyContent:"center"},
  disabled:{opacity:0.55},
  publishText:{color:"white",fontWeight:"900",fontSize:15}
});
