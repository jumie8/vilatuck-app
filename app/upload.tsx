import { useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function UploadScreen() {
  const router = useRouter();
  const [videoName, setVideoName] = useState("");
  const [caption, setCaption] = useState("");
  const [videoUri, setVideoUri] = useState<string | null>(null);

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
      const asset = result.assets[0];
      setVideoUri(asset.uri);
      setVideoName(asset.fileName || "Selected video");
    }
  }

  return (
    <ScrollView style={s.page} contentContainerStyle={s.content}>
      <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={25} color="white" /></Pressable>
      <Text style={s.title}>Create a video</Text>
      <Text style={s.subtitle}>Share a moment with the VILATUCK community.</Text>

      <Pressable onPress={chooseVideo} style={s.picker}>
        <Ionicons name={videoUri ? "checkmark-circle" : "cloud-upload-outline"} size={42} color="#B9A5FF" />
        <Text style={s.pickerTitle}>{videoUri ? "Video selected" : "Choose video from phone"}</Text>
        <Text style={s.pickerHint}>{videoUri ? videoName : "Select a video from your gallery"}</Text>
        <View style={s.chooseButton}><Text style={s.chooseText}>{videoUri ? "Choose another video" : "Select video"}</Text></View>
      </Pressable>

      <Text style={s.label}>Caption</Text>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Write a caption and add #hashtags..."
        placeholderTextColor="#777284"
        multiline
        style={s.input}
      />
      <View style={s.notice}>
        <Ionicons name="information-circle-outline" size={20} color="#D7C9FF" />
        <Text style={s.noticeText}>Video selection works on your phone. Publishing is not enabled yet because VILATUCK still needs its secure sign-in, video storage and database connection.</Text>
      </View>
      <Pressable style={[s.publish, !videoUri && s.disabled]} onPress={() => Alert.alert("Not ready yet", "Your video is selected on this device, but publishing will be enabled after the VILATUCK backend is connected.")}>
        <Text style={s.publishText}>Publish video</Text>
      </Pressable>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#09090F" },
  content: { padding: 22, paddingTop: 55, paddingBottom: 40 },
  back: { alignSelf: "flex-start" },
  title: { color: "white", fontSize: 28, fontWeight: "900", marginTop: 25 },
  subtitle: { color: "#AAA5B7", fontSize: 14, marginTop: 7, lineHeight: 21 },
  picker: { minHeight: 230, marginTop: 25, borderRadius: 20, borderWidth: 1, borderColor: "#514078", borderStyle: "dashed", backgroundColor: "#171422", alignItems: "center", justifyContent: "center", padding: 20 },
  pickerTitle: { color: "white", fontSize: 17, fontWeight: "800", marginTop: 14, textAlign: "center" },
  pickerHint: { color: "#AAA5B7", fontSize: 12, marginTop: 7, textAlign: "center" },
  chooseButton: { marginTop: 17, backgroundColor: "#7047FF", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  chooseText: { color: "white", fontWeight: "800" },
  label: { color: "white", fontSize: 14, fontWeight: "700", marginTop: 25, marginBottom: 9 },
  input: { minHeight: 115, borderRadius: 14, backgroundColor: "#171422", borderWidth: 1, borderColor: "#302A3D", color: "white", padding: 14, textAlignVertical: "top" },
  notice: { flexDirection: "row", gap: 10, backgroundColor: "#211D2D", borderRadius: 14, padding: 14, marginTop: 20 },
  noticeText: { color: "#D7CFFF", fontSize: 12, lineHeight: 19, flex: 1 },
  publish: { marginTop: 22, backgroundColor: "#7047FF", borderRadius: 14, padding: 16, alignItems: "center" },
  disabled: { opacity: 0.55 },
  publishText: { color: "white", fontWeight: "900", fontSize: 15 }
});
