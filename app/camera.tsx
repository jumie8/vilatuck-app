import { useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";

const PURPLE = "#7047FF";

export default function CameraScreen() {
  const router = useRouter();
  const camera = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const recordingTask = useRef<Promise<{ uri: string } | undefined> | null>(null);

  async function requestPermissions() {
    const cam = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    const mic = microphonePermission?.granted ? microphonePermission : await requestMicrophonePermission();
    if (!cam.granted || !mic.granted) {
      Alert.alert("Camera access needed", "Allow camera and microphone access in your phone settings to record VILATUCK videos.");
    }
  }

  async function startRecording() {
    if (!camera.current || recording || busy) return;
    if (!cameraPermission?.granted || !microphonePermission?.granted) {
      await requestPermissions();
      return;
    }
    setRecordingSeconds(0);
    setRecording(true);
    try {
      recordingTask.current = camera.current.recordAsync({ maxDuration: 180, maxFileSize: 200 * 1024 * 1024 });
      const result = await recordingTask.current;
      if (result?.uri) {
        setBusy(true);
        router.push({ pathname: "/upload", params: { videoUri: result.uri, videoName: "VILATUCK camera recording" } });
      }
    } catch (error) {
      Alert.alert("Recording failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      recordingTask.current = null;
      setRecording(false);
      setBusy(false);
    }
  }

  function stopRecording() {
    if (!recording) return;
    camera.current?.stopRecording();
  }

  async function chooseFromGallery() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Gallery access needed", "Allow photo and video access to choose a clip.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.duration && asset.duration > 180000) {
        Alert.alert("Video too long", "Choose a video that is 3 minutes or shorter.");
        return;
      }
      if (asset.fileSize && asset.fileSize > 200 * 1024 * 1024) {
        Alert.alert("Video too large", "Choose a video smaller than 200 MB.");
        return;
      }
      router.push({ pathname: "/upload", params: { videoUri: asset.uri, videoName: asset.fileName || "Gallery video" } });
    }
  }

  if (!cameraPermission || !microphonePermission) {
    return <View style={styles.permission}><ActivityIndicator color="white" /></View>;
  }
  if (!cameraPermission.granted || !microphonePermission.granted) {
    return <View style={styles.permission}>
      <Ionicons name="camera-outline" size={58} color="white" />
      <Text style={styles.permissionTitle}>Camera access</Text>
      <Text style={styles.permissionText}>VILATUCK needs camera and microphone access to record videos.</Text>
      <Pressable style={styles.permissionButton} onPress={requestPermissions}><Text style={styles.permissionButtonText}>Allow camera</Text></Pressable>
      <Pressable onPress={() => router.back()}><Text style={styles.cancelText}>Not now</Text></Pressable>
    </View>;
  }

  return <View style={styles.screen}>
    <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} mode="video" onRecordingProgress={({ duration }) => setRecordingSeconds(Math.floor(duration))} />
    <View style={styles.top}>
      <Pressable style={styles.round} onPress={() => router.back()}><Ionicons name="close" size={30} color="white" /></Pressable>
      <Pressable style={styles.sound} onPress={() => Alert.alert("Sounds", "You can add audio after recording. Licensed music selection is coming in a later update.")}>
        <Ionicons name="musical-note" size={18} color="white" /><Text style={styles.soundText}>Add sound</Text>
      </Pressable>
      <Pressable style={styles.round} onPress={() => setFacing(value => value === "back" ? "front" : "back")} disabled={recording}>
        <Ionicons name="camera-reverse-outline" size={27} color="white" />
      </Pressable>
    </View>
    <View style={styles.tools}>
      <Pressable style={styles.tool} onPress={() => Alert.alert("Flash", "Flash settings depend on the camera selected on your device.")}><Ionicons name="flash-outline" size={25} color="white" /></Pressable>
      <Pressable style={styles.tool} onPress={() => Alert.alert("Timer", "A recording timer will be added in a later camera update.")}><Ionicons name="timer-outline" size={25} color="white" /></Pressable>
      <Pressable style={styles.tool} onPress={() => Alert.alert("Layout", "Video layout tools are coming in a later update.")}><Ionicons name="grid-outline" size={25} color="white" /></Pressable>
      <Pressable style={styles.tool} onPress={() => Alert.alert("Effects", "Camera effects are not enabled yet.")}><Ionicons name="sparkles-outline" size={25} color="white" /></Pressable>
    </View>
    <View style={styles.bottom}>
      <Pressable style={styles.gallery} onPress={chooseFromGallery} disabled={recording}>
        <Ionicons name="images-outline" size={28} color="white" /><Text style={styles.smallLabel}>Upload</Text>
      </Pressable>
      <View style={styles.captureArea}>
        <Text style={styles.duration}>{recording ? `REC · ${recordingSeconds}s` : "3 min max"}</Text>
        <Pressable onPress={recording ? stopRecording : startRecording} style={[styles.recordOuter, recording && styles.recordingOuter]}>
          <View style={[styles.recordInner, recording && styles.recordingInner]} />
        </Pressable>
        <Text style={styles.smallLabel}>{recording ? "Tap to stop" : "Tap to record"}</Text>
      </View>
      <Pressable style={styles.gallery} onPress={() => router.push("/upload")}>
        <Ionicons name="create-outline" size={28} color="white" /><Text style={styles.smallLabel}>Create</Text>
      </Pressable>
    </View>
    {busy ? <View style={styles.busy}><ActivityIndicator color="white" /><Text style={styles.smallLabel}>Opening editor…</Text></View> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen:{flex:1,backgroundColor:"#000"},
  permission:{flex:1,backgroundColor:"#09090F",alignItems:"center",justifyContent:"center",padding:30,gap:14},
  permissionTitle:{color:"white",fontSize:22,fontWeight:"900"},
  permissionText:{color:"#C8C3D2",textAlign:"center",lineHeight:21},
  permissionButton:{backgroundColor:PURPLE,paddingHorizontal:28,paddingVertical:14,borderRadius:30,marginTop:10},
  permissionButtonText:{color:"white",fontWeight:"800"},
  cancelText:{color:"#BDB5CE",marginTop:8},
  top:{position:"absolute",top:55,left:18,right:18,flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  round:{width:46,height:46,borderRadius:23,backgroundColor:"rgba(0,0,0,0.35)",alignItems:"center",justifyContent:"center"},
  sound:{flexDirection:"row",alignItems:"center",gap:8,backgroundColor:"rgba(0,0,0,0.42)",paddingHorizontal:22,paddingVertical:13,borderRadius:30},
  soundText:{color:"white",fontWeight:"800",fontSize:16},
  tools:{position:"absolute",right:18,top:155,gap:25},
  tool:{width:40,height:40,alignItems:"center",justifyContent:"center"},
  bottom:{position:"absolute",bottom:42,left:22,right:22,flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between"},
  gallery:{width:72,alignItems:"center",gap:6},
  captureArea:{alignItems:"center",gap:9},
  duration:{color:"white",fontSize:12,fontWeight:"800"},
  recordOuter:{width:84,height:84,borderRadius:42,borderWidth:5,borderColor:"white",alignItems:"center",justifyContent:"center"},
  recordingOuter:{borderColor:"#FF477E"},
  recordInner:{width:64,height:64,borderRadius:32,backgroundColor:"white"},
  recordingInner:{width:30,height:30,borderRadius:7,backgroundColor:"#FF477E"},
  smallLabel:{color:"white",fontSize:11,fontWeight:"700"},
  busy:{position:"absolute",left:0,right:0,top:0,bottom:0,backgroundColor:"rgba(0,0,0,0.65)",alignItems:"center",justifyContent:"center",gap:12}
});
