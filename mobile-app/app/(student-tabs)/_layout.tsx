import { Tabs } from "expo-router";
import { FontAwesome6 } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Hides the default top header
        tabBarActiveTintColor: "#2563EB", // The blue color from your mockup
        tabBarInactiveTintColor: "#94A3B8", // The gray color for inactive tabs
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2E8F0",
          height: 65,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "bold",
          marginTop: 4,
        }
      }}
    >
      {/* 1. HOME TAB */}
      <Tabs.Screen
        name="student-screen"
        options={{
          title: "HOME",
          tabBarIcon: ({ color }) => <FontAwesome6 name="house" size={20} color={color} />,
        }}
      />

      {/* 2. MESSAGES TAB */}
      <Tabs.Screen
        name="student-messages"
        options={{
          title: "MESSAGES",
          tabBarIcon: ({ color }) => <FontAwesome6 name="message" size={20} color={color} />,
        }}
      />

      {/* 3. GRADES TAB */}
      <Tabs.Screen
        name="grades"
        options={{
          title: "GRADES",
          tabBarIcon: ({ color }) => <FontAwesome6 name="clipboard-list" size={20} color={color} />,
        }}
      />

      {/* 4. JOBS / INTERNSHIPS TAB (Using briefcase icon) */}
      <Tabs.Screen
        name="jobs"
        options={{
          title: "JOBS",
          tabBarIcon: ({ color }) => <FontAwesome6 name="briefcase" size={20} color={color} />,
        }}
      />

      {/* 5. CALENDAR TAB */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: "CALENDAR",
          tabBarIcon: ({ color }) => <FontAwesome6 name="calendar" size={20} color={color} />,
        }}
      />

      {/* 6. PROFILE TAB (Hidden from bottom bar) */}
      <Tabs.Screen
        name="student-profile"
        options={{
          href: null, // <-- This magic line hides it from the bottom bar!
          title: "PROFILE",
        }}
      />
    </Tabs>
  );
}
