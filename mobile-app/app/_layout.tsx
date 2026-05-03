import { Stack } from "expo-router";


export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Tell the router about your loading screen */}
      <Stack.Screen name="index" />
      
      {/* Tell the router about your authentication group */}
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}