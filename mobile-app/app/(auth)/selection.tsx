import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image } from "react-native";
import { FontAwesome6, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

type Role = "Student" | "Parent" | "Teacher" | "Industry" | null;

const rolesData = [
  { key: "Student", color: "#BFDBFE", textColor: "#2563EB", logoColor: "#2563EB", icon: <FontAwesome6 name="graduation-cap" size={32} color="#2563EB" />, description: "Access grades, internships & more." },
  { key: "Parent", color: "#A7F3D0", textColor: "#059669", logoColor: "#059669", icon: <FontAwesome6 name="user-group" size={32} color="#059669" />, description: "Track your child's progress and special school events." },
  { key: "Teacher", color: "#E9D5FF", textColor: "#9333EA", logoColor: "#9333EA", icon: <FontAwesome6 name="chalkboard" size={32} color="#9333EA" />, description: "Manage students & communicate." },
  { key: "Industry", color: "#FED7AA", textColor: "#EA580C", logoColor: "#EA580C", icon: <FontAwesome5 name="briefcase" size={32} color="#EA580C" />, description: "Post internships & hire interns." },
];

export default function SelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const router = useRouter();

  const renderRoleBox = (role: typeof rolesData[0]) => {
    const isSelected = selectedRole === role.key;
    const logoBgColor = isSelected ? role.color : "#FFFFFF";
    const descColor = isSelected ? "#FFFFFF" : "#6B7280";

    return (
      <TouchableOpacity
        key={role.key}
        style={[styles.roleBox, { backgroundColor: isSelected ? role.textColor : role.color }]}
        // Solves the TypeScript error by explicitly casting the string as a Role
        onPress={() => setSelectedRole(role.key as Role)}
        activeOpacity={0.8}
      >
        <View style={[styles.logoContainer, { backgroundColor: logoBgColor }]}>
          {React.cloneElement(role.icon, { color: isSelected ? "#FFFFFF" : role.logoColor })}
        </View>
        <Text style={[styles.roleHeading, { color: isSelected ? "#FFFFFF" : role.textColor }]}>{role.key}</Text>
        <Text style={[styles.roleDescription, { color: descColor }]}>{role.description}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Image 
          source={require("../../assets/images/mainlogo.png")} 
          style={{ width: 60, height: 60, marginRight: 12 }} 
          resizeMode="contain" 
        />
        <Text style={styles.appName}>
          <Text style={{ color: "#1E40AF" }}>Sisu</Text>
          <Text style={{ color: "#3B82F6" }}>Link</Text>
        </Text>
      </View>

      <Text style={styles.subHeading}>Welcome!</Text>
      <Text style={styles.description}>Empowering education through collaboration. Please select your role to continue.</Text>

      <View style={styles.rolesContainer}>{rolesData.map(renderRoleBox)}</View>

      <TouchableOpacity 
        style={styles.continueButton} 
        activeOpacity={0.8}
        onPress={() => {
          if (selectedRole === "Student") {
            router.push("/student-login");
          } else if (selectedRole === "Parent") {
            router.push("/parent-login");
          } else if (selectedRole === "Teacher") {
            router.push("/teacher-login");
          } else if (selectedRole === "Industry") {
            router.push("/industry-login");
          } else {
            alert("Please select a role to continue!");
          }
        }}
      >
        <Text style={styles.continueButtonText}>Continue</Text>
      </TouchableOpacity>

      <View style={styles.createAccountRow}>
        <Text style={styles.newHere}>New here? </Text>
        <TouchableOpacity onPress={() => router.push("/signup")}>
          <Text style={styles.createAccount}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: "#FFFFFF", flexGrow: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 38 },
  appName: { fontSize: 42, fontWeight: "900" },
  subHeading: { fontSize: 32, fontWeight: "700", color: "#1E293B", marginBottom: 12, textAlign: "left" },
  description: { fontSize: 14, color: "#64748B", textAlign: "left", marginBottom: 24 },
  rolesContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },
  roleBox: { width: (width - 72) / 2, borderRadius: 16, padding: 16, marginBottom: 16 },
  logoContainer: { width: 60, height: 60, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 12, alignSelf: "flex-start" },
  roleHeading: { fontSize: 18, fontWeight: "700", marginBottom: 8, textAlign: "left" },
  roleDescription: { fontSize: 12, textAlign: "left" },
  continueButton: { backgroundColor: "#2563EB", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginBottom: 16 },
  continueButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  createAccountRow: { flexDirection: "row", justifyContent: "center" },
  newHere: { fontSize: 14, color: "#6B7280" },
  createAccount: { fontSize: 16, color: "#2563EB", fontWeight: "600", marginLeft: 4 },
});