import { Tabs } from "expo-router";
import { FontAwesome6 } from "@expo/vector-icons";

export default function IndustryTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
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
      <Tabs.Screen
        name="industry-screen"
        options={{
          title: "DASHBOARD",
          tabBarIcon: ({ color }) => <FontAwesome6 name="chart-line" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="manage-jobs"
        options={{
          title: "MANAGE JOBS",
          tabBarIcon: ({ color }) => <FontAwesome6 name="briefcase" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="manage-announcements"
        options={{
          title: "ANNOUNCEMENTS",
          tabBarIcon: ({ color }) => <FontAwesome6 name="bullhorn" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="industry-profile"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
