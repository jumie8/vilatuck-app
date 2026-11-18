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
        <Stack.Screen name="upload" />
        <Stack.Screen name="camera" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="auth" />
        <Stack.Screen name="comments" options={{ presentation: "transparentModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "transparent" } }} />
      </Stack>
    </>
  );
}
