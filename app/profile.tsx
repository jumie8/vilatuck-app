import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
};

type Video = { id: string; caption: string | null; thumbnail_url: string | null; video_url: string; views_count: number | null };

export default function ProfileScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);\n  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [profileTab, setProfileTab] = useState<"posts" | "private" | "reposts" | "saved" | "liked">("posts");
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [likes, setLikes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);\n  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);\n  const [requestingVerification, setRequestingVerification] = useState(false);

  const loadProfile = useCallback(async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setUserId(null);
      setProfile(null);
      setVideos([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    const id = authData.user.id;
    setUserId(id);
    const [profileResult, videoResult, followerResult, followingResult] = await Promise.all([
      supabase.from("profiles").select("id,username,display_name,bio,avatar_url,is_verified").eq("id", id).maybeSingle(),
      supabase.from("videos").select("id,caption,thumbnail_url,video_url,views_count").eq("user_id", id).order("created_at", { ascending: false }),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", id),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", id),
    ]);
    if (profileResult.error) console.warn("Profile load:", profileResult.error.message);
    if (videoResult.error) console.warn("Videos load:", videoResult.error.message);
    const p = profileResult.data as Profile | null;\n    const { data: verificationRequest } = await supabase.from("verification_requests").select("status").eq("user_id", id).maybeSingle();\n    setVerificationStatus(verificationRequest?.status || null);
    setProfile(p);
    setDisplayName(p?.display_name || "");
    setUsername(p?.username || "");
    setBio(p?.bio || "");
    const ownVideos = (videoResult.data || []) as Video[];
    setVideos(ownVideos);
    setFollowers(followerResult.count || 0);
    setFollowing(followingResult.count || 0);
    if (ownVideos.length) {
      const { count } = await supabase.from("video_likes").select("video_id", { count: "exact", head: true }).in("video_id", ownVideos.map(v => v.id));
      setLikes(count || 0);
    } else {
      setLikes(0);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (!userId || profileTab === "posts" || profileTab === "private" || profileTab === "reposts") return;
    let active = true;
    async function loadCollection() {
      const relation = profileTab === "saved" ? "bookmarks" : "video_likes";
      const { data: links, error } = await supabase.from(relation).select("video_id").eq("user_id", userId);
      if (error) { Alert.alert("Could not load videos", error.message); return; }
      const ids = (links || []).map((row: { video_id: string }) => row.video_id);
      if (!ids.length) { if (active) setVideos([]); return; }
      const { data, error: videosError } = await supabase.from("videos")
        .select("id,caption,thumbnail_url,video_url,views_count").in("id", ids).order("created_at", { ascending: false });
      if (videosError) { Alert.alert("Could not load videos", videosError.message); return; }
      if (active) setVideos((data || []) as Video[]);
    }
    loadCollection();
    return () => { active = false; };
  }, [userId, profileTab]);

  const saveProfile = async () => {
    if (!userId) return;
    const cleanUsername = username.trim().replace(/^@/, "").toLowerCase();
    if (!cleanUsername || !/^[a-z0-9_.]{3,24}$/.test(cleanUsername)) {
      Alert.alert("Check username", "Use 3–24 characters: letters, numbers, dots or underscores.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: displayName.trim(),
      username: cleanUsername,
      bio: bio.trim(),
      updated_at: new Date().toISOString(),
    }).eq("id", userId);
    setSaving(false);
    if (error) {
      Alert.alert("Could not save profile", error.message);
      return;
    }
    setEditing(false);
    await loadProfile();
    Alert.alert("Profile updated", "Your changes have been saved.");
  };

  const requestVerification = async () => {\n    if (!userId) return;\n    setRequestingVerification(true);\n    const { error } = await supabase.from("verification_requests").upsert({ user_id: userId, status: "pending", message: "Please review my account for VILATUCK verification." }, { onConflict: "user_id" });\n    setRequestingVerification(false);\n    if (error) Alert.alert("Request failed", error.message);\n    else { setVerificationStatus("pending"); Alert.alert("Request submitted", "Your verification request has been sent to the VILATUCK administrator."); }\n  };\n\n  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) Alert.alert("Sign out failed", error.message);
    else {
      setUserId(null);
      setProfile(null);
      router.replace("/");
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#A88FFF" size="large" /><Text style={s.muted}>Loading your profile…</Text></View>;

  if (!userId) return <View style={s.page}>
    <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={26} color="white" /></Pressable>
    <View style={s.avatar}><Ionicons name="person" size={38} color="white" /></View>
    <Text style={s.name}>Your VILATUCK profile</Text>
    <Text style={s.mutedCenter}>Sign in to view your videos, followers and profile settings.</Text>
    <Pressable style={s.primary} onPress={() => router.push("/auth")}><Ionicons name="log-in-outline" size={19} color="white" /><Text style={s.primaryText}>Sign in or create account</Text></Pressable>
  </View>;

  return <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} tintColor="#A88FFF" onRefresh={() => { setRefreshing(true); loadProfile(); }} />}>
    <View style={s.topRow}>
      <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="white" /></Pressable>
      <Text style={s.topTitle}>Profile</Text>
      <Pressable onPress={signOut}><Ionicons name="log-out-outline" size={24} color="#FF8B9A" /></Pressable>
    </View>
    <View style={s.coverBanner}>
      <View style={s.coverPattern}><Text style={s.coverBrand}>VILATUCK</Text></View>
      <Pressable style={s.coverEdit} onPress={() => setEditing(true)}><Ionicons name="create-outline" size={20} color="white" /></Pressable>
    </View>
    <View style={s.avatar}>
      {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={s.avatarImage} /> : <Ionicons name="person" size={38} color="white" />}
    </View>
    <View style={s.nameRow}>
      <Text style={s.name}>{profile?.display_name || profile?.username || "VILATUCK user"}</Text>
      {profile?.is_verified ? <Ionicons name="checkmark-circle" size={19} color="#8F75FF" /> : null}
    </View>
    <Text style={s.handle}>@{profile?.username || "username"}</Text>
    {profile?.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}
    <View style={s.stats}>
      <View><Text style={s.num}>{following}</Text><Text style={s.muted}>Following</Text></View>
      <View><Text style={s.num}>{followers}</Text><Text style={s.muted}>Followers</Text></View>
      <View><Text style={s.num}>{likes}</Text><Text style={s.muted}>Likes</Text></View>
    </View>
    <Pressable style={s.outlineButton} onPress={() => setEditing(!editing)}><Ionicons name="create-outline" size={18} color="white" /><Text style={s.outlineText}>{editing ? "Cancel editing" : "Edit profile"}</Text></Pressable>
    {editing ? <View style={s.editCard}>
      <Text style={s.fieldLabel}>Display name</Text>
      <TextInput value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor="#777" style={s.input} maxLength={50} />
      <Text style={s.fieldLabel}>Username</Text>
      <TextInput value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="username" placeholderTextColor="#777" style={s.input} maxLength={24} />
      <Text style={s.fieldLabel}>Bio</Text>
      <TextInput value={bio} onChangeText={setBio} placeholder="Tell people about yourself" placeholderTextColor="#777" style={[s.input, { minHeight: 78, textAlignVertical: "top" }]} multiline maxLength={160} />
      <Pressable style={s.primary} disabled={saving} onPress={saveProfile}>{saving ? <ActivityIndicator color="white" /> : <Text style={s.primaryText}>Save changes</Text>}</Pressable>
    </View> : null}
    <View style={s.sectionRow}><Text style={s.sectionTitle}>Your videos</Text><Pressable onPress={() => router.push("/camera")}><Text style={s.uploadLink}>＋ Create</Text></Pressable></View>
    <View style={s.profileTabs}>
      {([
        ["posts", "grid-outline"], ["private", "lock-closed-outline"], ["reposts", "repeat-outline"],
        ["saved", "bookmark-outline"], ["liked", "heart-outline"],
      ] as const).map(([key, icon]) => (
        <Pressable key={key} style={s.profileTab} onPress={() => setProfileTab(key)}>
          <Ionicons name={icon} size={23} color={profileTab === key ? "white" : "#85808F"} />
          {profileTab === key ? <View style={s.profileTabLine} /> : null}
        </Pressable>
      ))}
    </View>
    {videos.length && (profileTab === "posts" || profileTab === "saved" || profileTab === "liked") ? <View style={s.videoGrid}>{videos.map(video => <Pressable key={video.id} style={s.videoTile} onPress={() => router.push("/")}>
      {video.thumbnail_url ? <Image source={{ uri: video.thumbnail_url }} style={s.thumbnail} /> : <View style={s.noThumbnail}><Ionicons name="play" size={27} color="white" /></View>}
      <View style={s.views}><Ionicons name="play" size={11} color="white" /><Text style={s.viewText}>{video.views_count || 0}</Text></View>
      {video.caption ? <Text numberOfLines={2} style={s.caption}>{video.caption}</Text> : null}
    </Pressable>)}</View> : <View style={s.empty}><Ionicons name="videocam-outline" size={30} color="#A88FFF" /><Text style={s.emptyText}>{profileTab === "posts" ? "You haven’t uploaded any videos yet." : "Nothing to show here yet."}</Text><Pressable onPress={() => router.push("/upload")}><Text style={s.uploadLink}>Upload your first video</Text></Pressable></View>}
    {userEmail?.toLowerCase() === "chidestking@gmail.com" ? <Pressable style={[s.outlineButton, { marginTop: 18 }]} onPress={() => router.push("/admin-verification")}><Ionicons name="shield-checkmark" size={18} color="#B49CFF" /><Text style={s.outlineText}>Admin: review verification requests</Text></Pressable> : null}\n    <View style={s.infoCard}><Ionicons name="shield-checkmark-outline" size={22} color="#A88FFF" /><View style={{ flex: 1 }}><Text style={s.item}>Account verification</Text><Text style={s.muted}>{profile?.is_verified ? "Your account is officially verified." : verificationStatus === "pending" ? "Your request is waiting for administrator review." : verificationStatus === "rejected" ? "Your previous request was not approved. You can submit another request." : "Request an official blue badge. Only the VILATUCK administrator can approve it."}</Text>{!profile?.is_verified && verificationStatus === null ? <Pressable style={[s.primary, { marginTop: 12 }]} disabled={requestingVerification} onPress={requestVerification}>{requestingVerification ? <ActivityIndicator color="white" /> : <Text style={s.primaryText}>Request verification</Text>}</Pressable> : null}</View></View>\n    {userId && (await false) ? null : null}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#09090F", padding: 20, paddingTop: 52 },
  center: { flex: 1, backgroundColor: "#09090F", alignItems: "center", justifyContent: "center", gap: 12 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topTitle: { color: "white", fontWeight: "800", fontSize: 18 },
  coverBanner: { height: 150, backgroundColor: "#24183E", borderRadius: 15, marginTop: 18, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  coverPattern: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#281B48" },
  coverBrand: { color: "rgba(255,255,255,0.12)", fontSize: 36, fontWeight: "900", letterSpacing: 5 },
  coverEdit: { position: "absolute", right: 12, top: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  avatar: { width: 92, height: 92, borderRadius: 46, backgroundColor: "#49318D", alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: -42, borderWidth: 4, borderColor: "#09090F", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 },
  name: { color: "white", fontWeight: "900", fontSize: 21, textAlign: "center" },
  handle: { color: "#AAA5B7", textAlign: "center", marginTop: 5 },
  bio: { color: "#E7E2F0", textAlign: "center", marginTop: 12, lineHeight: 20 },
  muted: { color: "#AAA5B7", fontSize: 12, lineHeight: 18, marginTop: 5 },
  mutedCenter: { color: "#AAA5B7", textAlign: "center", marginTop: 12, lineHeight: 20 },
  stats: { flexDirection: "row", justifyContent: "space-around", marginVertical: 25 },
  profileTabs: { flexDirection: "row", justifyContent: "space-around", borderBottomWidth: 1, borderBottomColor: "#292533", marginTop: 22, marginBottom: 16 },
  profileTab: { flex: 1, alignItems: "center", paddingVertical: 12, gap: 8 },
  profileTabLine: { height: 3, width: "60%", borderRadius: 3, backgroundColor: "#7047FF" },
  num: { color: "white", fontWeight: "900", fontSize: 19, textAlign: "center" },
  primary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: "#7047FF", padding: 14, borderRadius: 13, marginTop: 14 },
  primaryText: { color: "white", fontWeight: "800", fontSize: 14 },
  outlineButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: "#51466B", padding: 12, borderRadius: 12 },
  outlineText: { color: "white", fontWeight: "700" },
  editCard: { backgroundColor: "#171422", padding: 16, borderRadius: 15, marginTop: 14 },
  fieldLabel: { color: "#D9D2E8", fontWeight: "700", marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: "#0D0B14", color: "white", borderWidth: 1, borderColor: "#3A314B", borderRadius: 10, padding: 12 },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 28, marginBottom: 14 },
  sectionTitle: { color: "white", fontWeight: "900", fontSize: 18 },
  uploadLink: { color: "#B49CFF", fontWeight: "800" },
  videoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  videoTile: { width: "31.5%", marginBottom: 10 },
  thumbnail: { width: "100%", aspectRatio: 0.72, borderRadius: 9, backgroundColor: "#24202F" },
  noThumbnail: { width: "100%", aspectRatio: 0.72, borderRadius: 9, backgroundColor: "#282039", alignItems: "center", justifyContent: "center" },
  views: { position: "absolute", bottom: 7, left: 6, flexDirection: "row", alignItems: "center", gap: 3 },
  viewText: { color: "white", fontSize: 11, fontWeight: "700" },
  caption: { color: "#DDD7E8", fontSize: 11, marginTop: 5 },
  empty: { alignItems: "center", backgroundColor: "#171422", padding: 25, borderRadius: 14, gap: 9 },
  emptyText: { color: "#C7C0D3", textAlign: "center" },
  infoCard: { flexDirection: "row", gap: 13, backgroundColor: "#171422", padding: 16, borderRadius: 14, marginTop: 22, alignItems: "center" },
  item: { color: "white", fontWeight: "700", fontSize: 14 },
});
