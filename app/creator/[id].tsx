import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";

type Creator = { id: string; username: string | null; display_name: string | null; bio: string | null; avatar_url: string | null; is_verified: boolean | null };
type CreatorVideo = { id: string; caption: string | null; thumbnail_url: string | null; views_count: number | null };

export default function CreatorProfileScreen() {
  const { id: rawId } = useLocalSearchParams<{ id: string }>();
  const creatorId = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<CreatorVideo[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [likes, setLikes] = useState(0);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!creatorId) { setLoading(false); setRefreshing(false); return; }
    const [{ data: auth }, profileResult, videoResult, followerResult, followingResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("id,username,display_name,bio,avatar_url,is_verified").eq("id", creatorId).maybeSingle(),
      supabase.from("videos").select("id,caption,thumbnail_url,views_count").eq("user_id", creatorId).eq("status", "published").eq("visibility", "public").order("created_at", { ascending: false }),
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", creatorId),
      supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", creatorId),
    ]);
    const viewer = auth.user?.id || null;
    setViewerId(viewer);
    if (profileResult.error) console.warn("Creator profile:", profileResult.error.message);
    if (videoResult.error) console.warn("Creator videos:", videoResult.error.message);
    setCreator(profileResult.data as Creator | null);
    const ownVideos = (videoResult.data || []) as CreatorVideo[];
    setVideos(ownVideos);
    setFollowers(followerResult.count || 0);
    setFollowing(followingResult.count || 0);
    if (viewer && viewer !== creatorId) {
      const { data } = await supabase.from("follows").select("following_id").eq("follower_id", viewer).eq("following_id", creatorId).maybeSingle();
      setIsFollowing(!!data);
    } else setIsFollowing(false);
    if (ownVideos.length) {
      const { count } = await supabase.from("video_likes").select("video_id", { count: "exact", head: true }).in("video_id", ownVideos.map(v => v.id));
      setLikes(count || 0);
    } else setLikes(0);
    setLoading(false);
    setRefreshing(false);
  }, [creatorId]);

  useEffect(() => { load(); }, [load]);

  async function toggleFollow() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Sign in to follow", "Create an account or sign in to follow this creator.", [
        { text: "Cancel", style: "cancel" }, { text: "Sign in", onPress: () => router.push("/auth") }
      ]);
      return;
    }
    if (!creatorId || user.id === creatorId || busy) return;
    setBusy(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowers(n => Math.max(0, n + (wasFollowing ? -1 : 1)));
    const result = wasFollowing
      ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", creatorId)
      : await supabase.from("follows").insert({ follower_id: user.id, following_id: creatorId });
    setBusy(false);
    if (result.error) {
      setIsFollowing(wasFollowing);
      setFollowers(n => Math.max(0, n + (wasFollowing ? 1 : -1)));
      Alert.alert("Could not update follow", result.error.message);
    }
  }

  if (loading) return <View style={s.center}><ActivityIndicator color="#A88FFF" size="large" /><Text style={s.muted}>Loading creator…</Text></View>;
  if (!creator) return <View style={s.center}><Text style={s.title}>Creator not found</Text><Text style={s.muted}>This profile may not be available.</Text><Pressable onPress={() => router.back()}><Text style={s.link}>Go back</Text></Pressable></View>;

  return <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 36 }} refreshControl={<RefreshControl refreshing={refreshing} tintColor="#A88FFF" onRefresh={() => { setRefreshing(true); load(); }} />}>
    <View style={s.header}><Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="white" /></Pressable><Text style={s.headerTitle}>Creator profile</Text><View style={{ width: 25 }} /></View>
    <View style={s.avatar}>{creator.avatar_url ? <Image source={{ uri: creator.avatar_url }} style={s.avatarImage} /> : <Ionicons name="person" size={40} color="white" />}</View>
    <View style={s.nameRow}><Text style={s.title}>{creator.display_name || creator.username || "VILATUCK creator"}</Text>{creator.is_verified ? <Ionicons name="checkmark-circle" size={20} color="#A88FFF" /> : null}</View>
    <Text style={s.handle}>@{creator.username || "creator"}</Text>
    {creator.bio ? <Text style={s.bio}>{creator.bio}</Text> : null}
    {viewerId !== creator.id ? <View style={{ flexDirection: "row", justifyContent: "center", gap: 10 }}><Pressable disabled={busy} style={[s.followButton, isFollowing && s.followingButton]} onPress={toggleFollow}><Text style={s.followText}>{busy ? "Please wait…" : isFollowing ? "Following ✓" : "＋ Follow"}</Text></Pressable><Pressable style={[s.followButton, s.followingButton]} onPress={() => { if (!viewerId) { Alert.alert("Sign in required", "Sign in to message this creator.", [{ text: "Cancel", style: "cancel" }, { text: "Sign in", onPress: () => router.push("/auth") }]); } else router.push(`/chat/${creator.id}`); }}><Text style={s.followText}>Message</Text></Pressable></View> : <Pressable style={s.followButton} onPress={() => router.push("/profile")}><Text style={s.followText}>Edit your profile</Text></Pressable>}
    <View style={s.stats}><View><Text style={s.number}>{videos.length}</Text><Text style={s.muted}>Videos</Text></View><View><Text style={s.number}>{followers}</Text><Text style={s.muted}>Followers</Text></View><View><Text style={s.number}>{following}</Text><Text style={s.muted}>Following</Text></View><View><Text style={s.number}>{likes}</Text><Text style={s.muted}>Likes</Text></View></View>
    <Text style={s.sectionTitle}>Public videos</Text>
    {videos.length ? <View style={s.grid}>{videos.map(video => <View key={video.id} style={s.tile}>
      {video.thumbnail_url ? <Image source={{ uri: video.thumbnail_url }} style={s.thumbnail} /> : <View style={s.placeholder}><Ionicons name="play" size={27} color="white" /></View>}
      <View style={s.views}><Ionicons name="play" size={11} color="white" /><Text style={s.viewText}>{video.views_count || 0}</Text></View>
      {video.caption ? <Text style={s.caption} numberOfLines={2}>{video.caption}</Text> : null}
    </View>)}</View> : <View style={s.empty}><Ionicons name="videocam-outline" size={32} color="#A88FFF" /><Text style={s.muted}>This creator hasn’t posted any public videos yet.</Text></View>}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#09090F", padding: 20, paddingTop: 52 },
  center: { flex: 1, backgroundColor: "#09090F", alignItems: "center", justifyContent: "center", padding: 28, gap: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 17, fontWeight: "800" },
  avatar: { width: 96, height: 96, borderRadius: 48, alignSelf: "center", marginTop: 28, backgroundColor: "#49318D", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 },
  title: { color: "white", fontSize: 21, fontWeight: "900", textAlign: "center" },
  handle: { color: "#AAA5B7", textAlign: "center", marginTop: 5 },
  bio: { color: "#E7E2F0", textAlign: "center", marginTop: 12, lineHeight: 20 },
  followButton: { alignSelf: "center", backgroundColor: "#7047FF", paddingHorizontal: 35, paddingVertical: 12, borderRadius: 11, marginTop: 17, minWidth: 150, alignItems: "center" },
  followingButton: { backgroundColor: "#292238", borderWidth: 1, borderColor: "#75639D" },
  followText: { color: "white", fontWeight: "800" },
  stats: { flexDirection: "row", justifyContent: "space-around", marginVertical: 26 },
  number: { color: "white", fontSize: 19, fontWeight: "900", textAlign: "center" },
  muted: { color: "#AAA5B7", fontSize: 12, textAlign: "center", lineHeight: 18 },
  link: { color: "#B49CFF", fontWeight: "800", marginTop: 8 },
  sectionTitle: { color: "white", fontSize: 18, fontWeight: "900", marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "31.5%", marginBottom: 9 },
  thumbnail: { width: "100%", aspectRatio: 0.72, borderRadius: 9, backgroundColor: "#24202F" },
  placeholder: { width: "100%", aspectRatio: 0.72, borderRadius: 9, backgroundColor: "#282039", alignItems: "center", justifyContent: "center" },
  views: { position: "absolute", bottom: 7, left: 6, flexDirection: "row", gap: 3, alignItems: "center" },
  viewText: { color: "white", fontSize: 11, fontWeight: "700" },
  caption: { color: "#DDD7E8", fontSize: 11, marginTop: 5 },
  empty: { backgroundColor: "#171422", padding: 25, borderRadius: 14, alignItems: "center", gap: 10 },
});
