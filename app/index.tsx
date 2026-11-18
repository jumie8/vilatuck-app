import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl, Alert, Share, Dimensions, Modal, Linking } from "react-native";
import * as Clipboard from "expo-clipboard";
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

function VideoCard({ item, liked, saved, likeCount, isFollowing, canFollow, active, onLike, onSave, onComment, onFollow, onShare, router }: {
  item: FeedVideo; liked: boolean; saved: boolean; likeCount: number; isFollowing: boolean; canFollow: boolean; active: boolean; onLike: () => void; onSave: () => void; onComment: () => void; onFollow: () => void; onShare: () => void; router: ReturnType<typeof useRouter>;
}) {
  const player = useVideoPlayer(item.video_url, (instance) => {
    instance.loop = true;
  });
  const [playing, setPlaying] = useState(false);
  const watchRecorded = useRef(false);
  useEffect(() => {
    if (!active) { watchRecorded.current = false; return; }
    let secondsPlayed = 0;
    const interval = setInterval(async () => {
      if (!player.playing || watchRecorded.current) return;
      secondsPlayed += 1;
      if (secondsPlayed >= 3) {
        watchRecorded.current = true;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.from("video_watch_events").insert({
            user_id: user.id, video_id: item.id, watched_ms: 3000, completed: false,
          });
          if (error) console.warn("Video watch tracking:", error.message);
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [active, item.id, player]);
  useEffect(() => {
    if (active) {
      player.play();
      setPlaying(true);
    } else {
      player.pause();
      setPlaying(false);
    }
  }, [active, player]);
  const creator = item.profile?.username ? `@${item.profile.username}` : item.profile?.display_name || "VILATUCK creator";

  function togglePlayback() {
    if (playing) player.pause();
    else player.play();
    setPlaying(!playing);
  }

  return (
    <View style={s.videoCard}>
      <VideoView player={player} style={s.video} contentFit="cover" />
      <Pressable style={s.videoTap} onPress={togglePlayback}>
        {!playing && <View style={s.playCircle}><Ionicons name="play" size={34} color="white" /></View>}
      </Pressable>
      <View style={s.videoInfo}>
        <View style={s.creatorInfo}>
          <Pressable onPress={() => router.push({ pathname: "/creator/[id]", params: { id: item.user_id } })}>
            <Text style={s.creator}>{creator} {item.profile?.is_verified ? <Text style={s.verified}>✓</Text> : null}</Text>
          </Pressable>
          {canFollow && <Pressable onPress={onFollow} style={s.followButton}>
            <Text style={s.followText}>{isFollowing ? "Following ✓" : "＋ Follow"}</Text>
          </Pressable>}
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
          <Pressable style={s.action} onPress={() => Share.share({ message: `${item.caption || "Watch this video on VILATUCK"}\n\nOpen in VILATUCK: vilatuck://video/${item.id}\nWatch video: ${item.video_url}` })}>
            <Ionicons name="share-social-outline" size={27} color="white" />
            <Text style={s.actionText}>Share</Text>
          </Pressable>
          <Pressable style={s.action} onPress={onSave}>
            <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={27} color={saved ? "#A88FFF" : "white"} />
            <Text style={s.actionText}>{saved ? "Saved" : "Save"}</Text>
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
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [shareVideo, setShareVideo] = useState<FeedVideo | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ item: FeedVideo; isViewable: boolean }> }) => {
    const visible = viewableItems.find(entry => entry.isViewable);
    setActiveVideoId(visible?.item.id || null);
  });

  const loadFeed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      if (!user) setFollowingIds([]);
      let query = supabase.from("videos")
        .select("id,user_id,caption,video_url,views_count,created_at,visibility,status")
        .eq("status", "published")
        .eq("visibility", "public")
        .order(tab === "Trending" ? "views_count" : "created_at", { ascending: false })
        .limit(30);

      if (tab === "Following") {
        if (!user) {
          setVideos([]);
          setActiveVideoId(null);
          setLoading(false);
          return;
        }
        const { data: followed, error: followError } = await supabase
          .from("follows").select("following_id").eq("follower_id", user.id);
        if (followError) throw followError;
        const ids = (followed || []).map((row: { following_id: string }) => row.following_id);
        if (ids.length === 0) {
          setVideos([]);
          setActiveVideoId(null);
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
        setActiveVideoId(null);
        setLikedIds([]);
        setLikeCounts({});
        return;
      }

      const userIds = [...new Set(rows.map(row => row.user_id))];
      const videoIds = rows.map(row => row.id);
      const [profilesResult, likesResult, followingResult, bookmarksResult] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_url,is_verified").in("id", userIds),
        supabase.from("video_likes").select("video_id,user_id").in("video_id", videoIds),
        user ? supabase.from("follows").select("following_id").eq("follower_id", user.id) : Promise.resolve({ data: [], error: null }),
        user ? supabase.from("bookmarks").select("video_id").eq("user_id", user.id).in("video_id", videoIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (profilesResult.error) throw profilesResult.error;
      if (likesResult.error) throw likesResult.error;
      if (followingResult.error) throw followingResult.error;
      if (bookmarksResult.error) throw bookmarksResult.error;
      setFollowingIds((followingResult.data || []).map((row: { following_id: string }) => row.following_id));
      setSavedIds((bookmarksResult.data || []).map((row: { video_id: string }) => row.video_id));

      const profiles = new Map((profilesResult.data || []).map((profile: ProfileRow) => [profile.id, profile]));
      const allLikes = likesResult.data || [];
      const counts: Record<string, number> = {};
      const mine: string[] = [];
      for (const like of allLikes) {
        counts[like.video_id] = (counts[like.video_id] || 0) + 1;
        if (user && like.user_id === user.id) mine.push(like.video_id);
      }
      setVideos(rows.map(row => ({ ...row, profile: profiles.get(row.user_id) })));
      setActiveVideoId(rows[0]?.id || null);
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

  async function toggleSave(videoId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Sign in to save videos", "Sign in to save videos to your collection.", [
        { text: "Not now", style: "cancel" }, { text: "Sign in", onPress: () => router.push("/auth") },
      ]);
      return;
    }
    const alreadySaved = savedIds.includes(videoId);
    setSavedIds(current => alreadySaved ? current.filter(id => id !== videoId) : [...current, videoId]);
    const result = alreadySaved
      ? await supabase.from("bookmarks").delete().eq("video_id", videoId).eq("user_id", user.id)
      : await supabase.from("bookmarks").insert({ video_id: videoId, user_id: user.id });
    if (result.error) {
      setSavedIds(current => alreadySaved ? [...current, videoId] : current.filter(id => id !== videoId));
      Alert.alert("Save not updated", result.error.message);
    }
  }

  async function toggleFollow(creatorId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert("Sign in to follow creators", "Create a VILATUCK account or sign in first.", [
        { text: "Not now", style: "cancel" },
        { text: "Sign in", onPress: () => router.push("/auth") },
      ]);
      return;
    }
    if (creatorId === user.id) return;
    const alreadyFollowing = followingIds.includes(creatorId);
    setFollowingIds(current => alreadyFollowing ? current.filter(id => id !== creatorId) : [...current, creatorId]);
    const result = alreadyFollowing
      ? await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", creatorId)
      : await supabase.from("follows").insert({ follower_id: user.id, following_id: creatorId });
    if (result.error) {
      setFollowingIds(current => alreadyFollowing ? [...current, creatorId] : current.filter(id => id !== creatorId));
      Alert.alert("Follow not saved", result.error.message);
    }
  }

  const shareMessage = shareVideo ? `${shareVideo.caption || "Watch this video on VILATUCK"}\\n\\nOpen in VILATUCK: vilatuck://video/${shareVideo.id}\\nWatch video: ${shareVideo.video_url}` : "";
  async function copyVideoLink() {
    if (!shareVideo) return;
    await Clipboard.setStringAsync(shareVideo.video_url);
    setShareVideo(null);
    Alert.alert("Link copied", "The VILATUCK video link is ready to paste.");
  }
  async function shareToApp(app: "whatsapp" | "telegram") {
    if (!shareVideo) return;
    const link = shareVideo.video_url;
    const text = encodeURIComponent(`${shareVideo.caption || "Watch this video on VILATUCK"}\\n${link}`);
    const url = app === "whatsapp" ? `whatsapp://send?text=${text}` : `tg://msg_url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareVideo.caption || "Watch this video on VILATUCK")}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else if (app === "telegram") await Linking.openURL(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareVideo.caption || "Watch this video on VILATUCK")}`);
      else await Linking.openURL(`https://wa.me/?text=${text}`);
      setShareVideo(null);
    } catch { Alert.alert("Unable to open app", "Please use Copy link or try again."); }
  }

  function refresh() {
    setRefreshing(true);
    loadFeed();
  }

  return (
    <View style={s.screen}>
      <View style={s.topNav}>
        <Pressable onPress={() => router.push("/live")}><Text style={s.topNavText}>LIVE</Text></Pressable>
        {["Following", "For You"].map(t => (
          <Pressable key={t} onPress={() => { setLoading(true); setTab(t); }}>
            <Text style={[s.tab, tab === t && s.activeTab]}>{t}</Text>
            {tab === t && <View style={s.underline} />}
          </Pressable>
        ))}
        <Pressable onPress={() => router.push("/search")} style={s.searchButton}><Ionicons name="search" size={23} color="white" /></Pressable>
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={PURPLE} /><Text style={s.emptyText}>Loading VILATUCK videos...</Text></View>
      ) : videos.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="videocam-outline" size={58} color="#82789A" />
          <Text style={s.emptyTitle}>{tab === "Following" ? "Follow creators to see their videos" : "No videos yet"}</Text>
          <Text style={s.emptyText}>Be one of the first to share a video with the VILATUCK community.</Text>
          <Pressable style={s.uploadButton} onPress={() => router.push("/camera")}><Text style={s.uploadText}>Record a video</Text></Pressable>
          {tab === "Following" && <Pressable onPress={() => setTab("For You")}><Text style={s.linkText}>Explore For You</Text></Pressable>}
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <VideoCard item={item} liked={likedIds.includes(item.id)} saved={savedIds.includes(item.id)} likeCount={likeCounts[item.id] || 0} active={activeVideoId === item.id}
              isFollowing={followingIds.includes(item.user_id)}
              canFollow={!!currentUserId && item.user_id !== currentUserId}
              onFollow={() => toggleFollow(item.user_id)}
              router={router}
              onLike={() => toggleLike(item.id)}
              onSave={() => toggleSave(item.id)}
              onComment={() => router.push({ pathname: "/comments", params: { videoId: item.id } })}
            />
          )}
          contentContainerStyle={s.feed}
          pagingEnabled
          decelerationRate="fast"
          snapToAlignment="start"
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={PURPLE} />}
        />
      )}
      <View style={s.bottom}>
        <Pressable style={s.navItem}><Ionicons name="home" size={23} color={PURPLE} /><Text style={[s.navText, { color: PURPLE }]}>Home</Text></Pressable>
        <Pressable style={s.navItem} onPress={() => router.push("/friends")}><Ionicons name="people-outline" size={23} color="#A6A3B2" /><Text style={s.navText}>Friends</Text></Pressable>
        <Pressable style={s.createBtn} onPress={() => router.push("/camera")}><Ionicons name="add" size={28} color="white" /></Pressable>
        <Pressable style={s.navItem} onPress={() => router.push("/messages")}><Ionicons name="mail-outline" size={23} color="#A6A3B2" /><Text style={s.navText}>Inbox</Text></Pressable>
        <Pressable style={s.navItem} onPress={() => router.push("/profile")}><Ionicons name="person-outline" size={23} color="#A6A3B2" /><Text style={s.navText}>Profile</Text></Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#09090F", paddingTop: 48 },
  topNav: { height: 54, paddingHorizontal: 20, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topNavText: { color: "#B8B2C5", fontSize: 13, fontWeight: "800" },
  searchButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  logo: { fontSize: 23, fontWeight: "900", color: "white", letterSpacing: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 13 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#1C1A28", alignItems: "center", justifyContent: "center" },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  tabs: { height: 48, flexDirection: "row", justifyContent: "center", gap: 30, alignItems: "center" },
  tab: { fontSize: 14, color: "#8F8B9B", fontWeight: "600" },
  activeTab: { color: "white" },
  underline: { height: 3, backgroundColor: PURPLE, borderRadius: 3, marginTop: 7 },
  feed: { paddingBottom: 0 },
  videoCard: { height: Dimensions.get("window").height - 222, width: "100%", borderRadius: 0, overflow: "hidden", backgroundColor: "#171422" },
  video: { ...StyleSheet.absoluteFillObject, backgroundColor: "#09090F" },
  videoTap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  playCircle: { width: 70, height: 70, borderRadius: 35, backgroundColor: "rgba(0,0,0,0.48)", alignItems: "center", justifyContent: "center" },
  videoInfo: { position: "absolute", left: 15, right: 12, bottom: 16, flexDirection: "row", alignItems: "flex-end" },
  creatorInfo: { flex: 1, paddingRight: 12 },
  creator: { color: "white", fontWeight: "800", fontSize: 15, textShadowColor: "black", textShadowRadius: 5 },
  followButton: { alignSelf: "flex-start", borderWidth: 1, borderColor: "#B49CFF", borderRadius: 7, paddingHorizontal: 9, paddingVertical: 4, marginTop: 6, backgroundColor: "rgba(30,20,50,0.7)" },
  followText: { color: "white", fontSize: 11, fontWeight: "800" },
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
  createBtn: { width: 44, height: 38, borderRadius: 12, backgroundColor: PURPLE, alignItems: "center", justifyContent: "center" },
  shareOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "flex-end" },
  shareSheet: { backgroundColor: "#171422", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 38 },
  shareHandle: { width: 42, height: 4, borderRadius: 3, backgroundColor: "#625D70", alignSelf: "center", marginBottom: 16 },
  shareHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  shareTitle: { color: "white", fontSize: 17, fontWeight: "800" },
  shareCaption: { color: "#AAA5B7", fontSize: 13, marginTop: 12 },
  shareOptions: { flexDirection: "row", justifyContent: "space-between", marginTop: 24 },
  shareOption: { alignItems: "center", gap: 8, minWidth: 65 },
  shareIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  shareLabel: { color: "white", fontSize: 11, fontWeight: "600" }
});
