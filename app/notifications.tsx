import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type Notice = {
  id: string; recipient_id: string; actor_id: string | null; type: string;
  entity_id: string | null; message: string | null; is_read: boolean; created_at: string;
  actorName?: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setItems([]); setLoading(false); setRefreshing(false); return; }
    const { data, error } = await supabase.from("notifications")
      .select("id,recipient_id,actor_id,type,entity_id,message,is_read,created_at")
      .eq("recipient_id", auth.user.id).order("created_at", { ascending: false }).limit(100);
    if (error) console.warn("Notifications:", error.message);
    const rows = (data || []) as Notice[];
    const actorIds = [...new Set(rows.map(row => row.actor_id).filter(Boolean))] as string[];
    let names = new Map<string, string>();
    if (actorIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("id,username,display_name").in("id", actorIds);
      names = new Map((profiles || []).map((p: any) => [p.id, p.username ? "@" + p.username : p.display_name || "A VILATUCK user"]));
    }
    setItems(rows.map(row => ({ ...row, actorName: row.actor_id ? names.get(row.actor_id) || "A VILATUCK user" : "VILATUCK" })));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openNotice(item: Notice) {
    if (!item.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", item.id);
      setItems(current => current.map(row => row.id === item.id ? { ...row, is_read: true } : row));
    }
    if (item.actor_id) router.push(item.type === "follow" ? `/creator/${item.actor_id}` : item.entity_id ? `/comments?videoId=${item.entity_id}` : `/creator/${item.actor_id}`);
  }

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={23} color="white" /></Pressable>
        <Text style={s.title}>Notifications</Text>
        <View style={{ width: 34 }} />
      </View>
      {loading ? <View style={s.center}><ActivityIndicator color="#7047FF" /></View> :
        <FlatList data={items} keyExtractor={item => item.id} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#7047FF" />}
          ListEmptyComponent={<View style={s.center}><Ionicons name="notifications-outline" size={42} color="#777384" /><Text style={s.empty}>No notifications yet</Text><Text style={s.sub}>When people follow you or interact with your videos, you’ll see it here.</Text></View>}
          renderItem={({ item }) => (
            <Pressable onPress={() => openNotice(item)} style={[s.row, !item.is_read && s.unread]}>
              <View style={s.avatar}><Ionicons name={item.type === "follow" ? "person-add" : item.type === "like" ? "heart" : "chatbubble"} size={19} color="white" /></View>
              <View style={s.copy}><Text style={s.message}><Text style={s.actor}>{item.actorName}</Text> {item.message || "interacted with you"}</Text><Text style={s.date}>{new Date(item.created_at).toLocaleString()}</Text></View>
              {!item.is_read && <View style={s.dot} />}
            </Pressable>
          )} />
      }
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#09090F" },
  header: { height: 58, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#24222D" },
  back: { width: 34 }, title: { color: "white", fontSize: 19, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  empty: { color: "white", fontSize: 17, fontWeight: "700", marginTop: 14 },
  sub: { color: "#9692A3", textAlign: "center", marginTop: 8, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#1E1C26" },
  unread: { backgroundColor: "#171322" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#7047FF", alignItems: "center", justifyContent: "center", marginRight: 12 },
  copy: { flex: 1 }, message: { color: "#DAD7E2", fontSize: 14, lineHeight: 20 }, actor: { color: "white", fontWeight: "800" },
  date: { color: "#898596", fontSize: 11, marginTop: 5 }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#A78BFA", marginLeft: 10 }
});
