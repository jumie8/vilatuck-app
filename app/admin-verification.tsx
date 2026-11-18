import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Image, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

type RequestRow = { request_id: string; user_id: string; username: string | null; display_name: string | null; avatar_url: string | null; message: string | null; created_at: string; status: string };

export default function AdminVerificationScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user?.email?.toLowerCase() !== "chidestking@gmail.com") {
      Alert.alert("Access denied", "This page is only available to the VILATUCK administrator.");
      router.back();
      return;
    }
    const { data, error } = await supabase.rpc("admin_list_verification_requests");
    if (error) Alert.alert("Could not load requests", error.message);
    else setRows((data || []) as RequestRow[]);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const review = async (row: RequestRow, approve: boolean) => {
    setBusy(row.request_id);
    const { error } = await supabase.rpc("admin_review_verification_request", { p_request_id: row.request_id, p_approve: approve });
    setBusy(null);
    if (error) Alert.alert("Could not update request", error.message);
    else {
      Alert.alert(approve ? "Account verified" : "Request rejected", approve ? "The blue badge has been awarded." : "The request has been rejected.");
      await load();
    }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color="#A88FFF" size="large" /></View>;
  return <ScrollView style={s.page} contentContainerStyle={{ paddingBottom: 40 }}>
    <View style={s.header}><Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={25} color="white" /></Pressable><Text style={s.title}>Verification requests</Text><Pressable onPress={load}><Ionicons name="refresh" size={23} color="white" /></Pressable></View>
    <Text style={s.sub}>Admin only · Review and award official VILATUCK blue badges.</Text>
    {!rows.length ? <View style={s.empty}><Ionicons name="shield-checkmark-outline" size={36} color="#A88FFF" /><Text style={s.text}>No verification requests yet.</Text></View> : rows.map(row => <View key={row.request_id} style={s.card}>
      <View style={s.person}>
        {row.avatar_url ? <Image source={{ uri: row.avatar_url }} style={s.avatar} /> : <View style={s.avatarFallback}><Ionicons name="person" size={23} color="white" /></View>}
        <View style={{ flex: 1 }}><Text style={s.name}>{row.display_name || row.username || "VILATUCK user"}</Text><Text style={s.handle}>@{row.username || "username"}</Text></View>
        <Text style={[s.status, row.status === "pending" ? s.pending : s.done]}>{row.status}</Text>
      </View>
      {row.message ? <Text style={s.message}>{row.message}</Text> : null}
      <Text style={s.date}>Submitted {new Date(row.created_at).toLocaleDateString()}</Text>
      {row.status === "pending" ? <View style={s.actions}>
        <Pressable disabled={busy === row.request_id} style={s.reject} onPress={() => review(row, false)}><Text style={s.actionText}>Reject</Text></Pressable>
        <Pressable disabled={busy === row.request_id} style={s.approve} onPress={() => review(row, true)}>{busy === row.request_id ? <ActivityIndicator color="white" /> : <Text style={s.actionText}>Approve & verify</Text>}</Pressable>
      </View> : null}
    </View>)}
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#09090F", padding: 20, paddingTop: 52 },
  center: { flex: 1, backgroundColor: "#09090F", alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: "white", fontSize: 19, fontWeight: "900" },
  sub: { color: "#AAA5B7", marginTop: 12, marginBottom: 20, lineHeight: 19 },
  card: { backgroundColor: "#171422", borderRadius: 15, padding: 15, marginBottom: 12 },
  person: { flexDirection: "row", alignItems: "center", gap: 11 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { width: 46, height: 46, borderRadius: 23, backgroundColor: "#49318D", alignItems: "center", justifyContent: "center" },
  name: { color: "white", fontWeight: "800", fontSize: 15 },
  handle: { color: "#AAA5B7", marginTop: 3, fontSize: 12 },
  status: { fontSize: 11, fontWeight: "800", textTransform: "capitalize", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, overflow: "hidden" },
  pending: { color: "#FFD78A", backgroundColor: "#49391E" },
  done: { color: "#BDB0FF", backgroundColor: "#30264C" },
  message: { color: "#E2DDEC", marginTop: 13, lineHeight: 20 },
  date: { color: "#817A90", fontSize: 11, marginTop: 10 },
  actions: { flexDirection: "row", gap: 9, marginTop: 15 },
  reject: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#44252F", alignItems: "center" },
  approve: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#7047FF", alignItems: "center" },
  actionText: { color: "white", fontWeight: "800" },
  empty: { alignItems: "center", padding: 35, gap: 12, backgroundColor: "#171422", borderRadius: 15 },
  text: { color: "#D5CFE0" },
});
