import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#09090F" } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="live" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="admin" />
      </Stack>
    </>
  );
}
