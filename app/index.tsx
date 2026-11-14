import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Alert, Share } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import { supabase } from "../lib/supabase";

const PURPLE = "#7047FF";

type VideoRow = {
  id: string;
  user_id: string;
  caption: string | null;
  video_url: string;
  views_count: number;
  created_at: string;
  visibility: string;
  status: string;
};
type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
};
type FeedVideo = VideoRow & { profile?: ProfileRow };

function VideoCard({ item, liked, likeCount, onLike, onComment }: {
  item: FeedVideo; liked: boolean; likeCount: number; onLike: () => void; onComment: () => void;
}) {
  const player = useVideoPlayer(item.video_url, (instance) => {
    instance.loop = true;
  });
  const [playing, setPlaying] = useState(false);
  const creator = item.profile?.username ? `@${item.profile.username}` : item.profile?.display_name || "VILATUCK creator";

  function togglePlayback() {
    if (playing) player.pause();
    else player.play();
    setPlaying(!playing);
  }

  return (
    <View style={s.videoCard}>
      <VideoView player={player} style={s.video} contentFit="contain" nativeControls allowsFullscreen />
      <Pressable style={s.videoTap} onPress={togglePlayback}>
        {!playing && <View style={s.playCircle}><Ionicons name="play" size={34} color="white" /></View>}
      </Pressable>
      <View style={s.videoInfo}>
        <View style={s.creatorInfo}>
          <Text style={s.creator}>{creator} {item.profile?.is_verified ? <Text style={s.verified}>✓</Text> : null}</Text>
          <Text style={s.caption}>{item.caption || " "}</Text>
          <Text style={s.sound}><Ionicons name="musical-notes" size={13} color="white" /> VILATUCK original</Text>
        </View>
        <View style={s.actions}>
          <Pressable style={s.action} onPress={onLike}>
            <Ionicons name={liked ? "heart" : "heart-outline"} size={31} color={liked ? "#FF477E" : "white"} />
            <Text style={s.actionText}>{likeCount}</Text>
          </Pressable>
          <Pressable style={s.action} onPress={onComment}>
            <Ionicons name="chatbubble-ellipses-outline" size={27} color="white" />
            <Text style={s.actionText}>Comment</Text>
          </Pressable>
          <Pressable style={s.action} onPress={() => Share.share({ message: item.caption ? `${item.caption} ${item.video_url}` : item.video_url })}>
            <Ionicons name="share-social-outline" size={27} color="white" />
            <Text style={s.actionText}>Share</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("For You");
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let query = supabase.from("videos")
        .select("id,user_id,caption,video_url,views_count,created_at,visibility,status")
        .eq("status", "published")
        .eq("visibility", "public")
        .order(tab === "Trending" ? "views_count" : "created_at", { ascending: false })
        .limit(30);

      if (tab === "Following") {
        if (!user) {
          setVideos([]);
          setLoading(false);
          return;
        }
        const { data: followed, error: followError } = await supabase
          .from("follows").select("following_id").eq("follower_id", user.id);
        if (followError) throw followError;
        const ids = (followed || []).map((row: { following_id: string }) => row.following_id);
        if (ids.length === 0) {
          setVideos([]);
          setLikedIds([]);
          setLikeCounts({});
          return;
        }
        query = query.in("user_id", ids);
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []) as VideoRow[];
      if (rows.length === 0) {
        setVideos([]);
        setLikedIds([]);
        setLikeCounts({});
        return;
      }

      const userIds = [...new Set(rows.map(row => row.user_id))];
      const videoIds = rows.map(row => row.id);
      const [profilesResult, likesResult] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_url,is_verified").in("id", userIds),
        supabase.from("video_likes").select("video_id,user_id").in("video_id", videoIds),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (likesResult.error) throw likesResult.error;

      const profiles = new Map((profilesResult.data || []).map((profile: ProfileRow) => [profile.id, profile]));
      const allLikes = likesResult.data || [];
      const counts: Record<string, number> = {};
      const mine: string[] = [];
      for (const like of allLikes) {
        counts[like.video_id] = (counts[like.video_id] || 0) + 1;
        if (user && like.user_id === user.id) mine.push(like.video_id);
      }
      setVideos(rows.map(row => ({ ...row, profile: profiles.get(row.user_id) })));
      setLikeCounts(counts);
      setLikedIds(mine);
    } catch (error) {
      Alert.alert("Could not load videos", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  async function toggleLike(videoId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Sign in to like videos", "Create a VILATUCK account or sign in first.", [
        { text: "Not now", style: "cancel" },
        { text: "Sign in", onPress: () => router.push("/auth") },
      ]);
      return;
    }
    const alreadyLiked = likedIds.includes(videoId);
    setLikedIds(current => alreadyLiked ? current.filter(id => id !== videoId) : [...current, videoId]);
    setLikeCounts(current => ({ ...current, [videoId]: Math.max(0, (current[videoId] || 0) + (alreadyLiked ? -1 : 1)) }));
    const result = alreadyLiked
      ? await supabase.from("video_likes").delete().eq("video_id", videoId).eq("user_id", user.id)
      : await supabase.from("video_likes").insert({ video_id: videoId, user_id: user.id });
    if (result.error) {
      setLikedIds(current => alreadyLiked ? [...current, videoId] : current.filter(id => id !== videoId));
      setLikeCounts(current => ({ ...current, [videoId]: Math.max(0, (current[videoId] || 0) + (alreadyLiked ? 1 : -1)) }));
      Alert.alert("Like not saved", result.error.message);
    }
  }

  function refresh() {
    setRefreshing(true);
    loadFeed();
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Text style={s.logo}>VILA<Text style={{ color: PURPLE }}>TUCK</Text></Text>
        <View style={s.headerActions}>
          <Pressable onPress={() => router.push("/live")} style={s.iconBtn}><Ionicons name="radio-outline" size={23} color="white" /></Pressable>
          <Pressable onPress={() => router.push("/wallet")} style={s.iconBtn}><Ionicons name="wallet-outline" size={23} color="white" /></Pressable>
          <Pressable onPress={() => router.push("/profile")} style={s.avatar}><Ionicons name="person" size={18} color="white" /></Pressable>
        </View>
      </View>
      <View style={s.tabs}>
        {["Following", "For You", "Trending"].map(t => (
          <Pressable key={t} onPress={() => { setLoading(true); setTab(t); }}>
            <Text style={[s.tab, tab === t && s.activeTab]}>{t}</Text>
            {tab === t && <View style={s.underline} />}
          </Pressable>
        ))}
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={PURPLE} /><Text style={s.emptyText}>Loading VILATUCK videos...</Text></View>
      ) : videos.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="videocam-outline" size={58} color="#82789A" />
          <Text style={s.emptyTitle}>{tab === "Following" ? "Follow creators to see their videos" : "No videos yet"}</Text>
          <Text style={s.emptyText}>Be one of the first to share a video with the VILATUCK community.</Text>
          <Pressable style={s.uploadButton} onPress={() => router.push("/upload")}><Text style={s.uploadText}>Upload a video</Text></Pressable>
          {tab === "Following" && <Pressable onPress={() => setTab("For You")}><Text style={s.linkText}>Explore For You</Text></Pressable>}
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <VideoCard item={item} liked={likedIds.includes(item.id)} likeCount={likeCounts[item.id] || 0}
              onLike={() => toggleLike(item.id)}
              onComment={() => Alert.alert("Comments", "Comment viewing and posting are the next feature to connect.")}
            />
          )}
          contentContainerStyle={s.feed}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={PURPLE} />}
        />
      )}
      <View style={s.bottom}>
        <Pressable style={s.navItem}><Ionicons name="home" size={23} color={PURPLE} /><Text style={[s.navText, { color: PURPLE }]}>Home</Text></Pressable>
        <Pressable style={s.navItem} onPress={() => router.push("/live")}><Ionicons name="radio-outline" size={23} color="#A6A3B2" /><Text style={s.navText}>Live</Text></Pressable>
        <Pressable style={s.createBtn} onPress={() => router.push("/upload")}><Ionicons name="add" size={28} color="white" /></Pressable>
        <Pressable style={s.navItem} onPress={() => router.push("/wallet")}><Ionicons name="wallet-outline" size={23} color="#A6A3B2" /><Text style={s.navText}>Wallet</Text></Pressable>
        <Pressable style={s.navItem} onPress={() => router.push("/profile")}><Ionicons name="person-outline" size={23} color="#A6A3B2" /><Text style={s.navText}>Profile</Text></Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#09090F", paddingTop: 48 },
  header: { height: 54, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { fontSize: 23, fontWeight: "900", color: "white", letterSpacing: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 13 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1C1A28", alignItems: "center", justifyContent: "center" },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  tabs: { height: 48, flexDirection: "row", justifyContent: "center", gap: 30, alignItems: "center" },
  tab: { fontSize: 14, color: "#8F8B9B", fontWeight: "600" },
  activeTab: { color: "white" },
  underline: { height: 3, backgroundColor: PURPLE, borderRadius: 3, marginTop: 7 },
  feed: { paddingHorizontal: 12, paddingBottom: 12, gap: 14 },
  videoCard: { height: 590, borderRadius: 20, overflow: "hidden", backgroundColor: "#171422" },
  video: { ...StyleSheet.absoluteFillObject, backgroundColor: "#09090F" },
  videoTap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  playCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(0,0,0,0.48)", alignItems: "center", justifyContent: "center" },
  videoInfo: { position: "absolute", left: 15, right: 12, bottom: 16, flexDirection: "row", alignItems: "flex-end" },
  creatorInfo: { flex: 1, paddingRight: 12 },
  creator: { color: "white", fontWeight: "800", fontSize: 15, textShadowColor: "black", textShadowRadius: 5 },
  verified: { color: "#8D73FF" },
  caption: { color: "white", fontSize: 12, marginTop: 7, lineHeight: 18, textShadowColor: "black", textShadowRadius: 5 },
  sound: { color: "white", fontSize: 11, marginTop: 8 },
  actions: { alignItems: "center", gap: 18, paddingBottom: 2 },
  action: { alignItems: "center", gap: 3 },
  actionText: { color: "white", fontSize: 10, fontWeight: "600", textShadowColor: "black", textShadowRadius: 5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyTitle: { color: "white", fontSize: 18, fontWeight: "800", marginTop: 18, textAlign: "center" },
  emptyText: { color: "#AAA5B7", fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 9 },
  uploadButton: { backgroundColor: PURPLE, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 13, marginTop: 22 },
  uploadText: { color: "white", fontWeight: "800" },
  linkText: { color: "#B9A5FF", fontWeight: "700", marginTop: 18 },
  bottom: { height: 72, borderTopWidth: 1, borderTopColor: "#252230", backgroundColor: "#0D0B14", flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingBottom: 8 },
  navItem: { alignItems: "center", gap: 3, minWidth: 48 },
  navText: { fontSize: 10, color: "#A6A3B2" },
  createBtn: { width: 44, height: 38, borderRadius: 12, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" }
});
