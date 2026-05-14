import { Stack } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- GLOBAL FETCH INTERCEPTOR ---
const originalFetch = global.fetch;
global.fetch = async (...args) => {
  const [resource, config] = args;
  
  if (typeof resource === 'string' && resource.includes('/api/')) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        const currentHeaders = config?.headers || {};
        const newConfig = {
          ...config,
          headers: {
            ...currentHeaders,
            'Authorization': `Bearer ${token}`
          }
        };
        return originalFetch(resource, newConfig as RequestInit);
      }
    } catch (e) {
      console.error("Fetch Interceptor Error:", e);
    }
  }
  return originalFetch(...args);
};

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