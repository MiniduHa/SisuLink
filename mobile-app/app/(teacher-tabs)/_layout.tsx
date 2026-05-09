import { Stack } from "expo-router";

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="teacher-screen" />
      <Stack.Screen name="teacher-attendance" />
      <Stack.Screen name="teacher-timetable" />
      <Stack.Screen name="teacher-materials" />
      <Stack.Screen name="teacher-messages" />
      <Stack.Screen name="teacher-profile" />
    </Stack>
  );
}
