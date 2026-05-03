import React, { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Alert,
  Platform,
  ActionSheetIOS,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import WatermarkOverlay from "../../components/WatermarkOverlay";

import * as ImagePicker from "expo-image-picker";

export default function TeacherProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Safely extract data passed from the dashboard
  const fullName = (params.full_name as string) || "Teacher Name";
  const email = (params.email as string) || "teacher@school.edu";
  const staffId = (params.staff_id as string) || "TCH-000";
  const initialPhotoUrl = (params.profile_photo_url as string) || "null";

  const [profilePhotoUrl, setProfilePhotoUrl] = useState(initialPhotoUrl);
  const [profileData, setProfileData] = useState<any>({
    department: "Loading...",
    medium: "Loading...",
    subject: "Loading...",
    school_name: "Loading..."
  });
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  // Package params for the bottom tab bar to pass around
  const getNavParams = () => ({
    full_name: fullName,
    email: email,
    staff_id: staffId,
    profile_photo_url: profilePhotoUrl
  });

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const fetchProfileData = async () => {
        try {
          const timestamp = new Date().getTime();
          const response = await fetch(`http://172.20.10.7:5000/api/teacher/profile/${email}?t=${timestamp}`);
          if (response.ok && isActive) {
            const data = await response.json();
            setProfileData({
              department: data.department || "Not Set",
              medium: data.medium || "Not Set",
              subject: data.subject || "Not Set",
              school_name: data.school_name || "Not Set"
            });
            if (data.profile_photo_url) {
              setProfilePhotoUrl(data.profile_photo_url);
            }
          }
        } catch (error) {
          console.error("Failed to fetch teacher profile:", error);
        }
      };
      if (email) fetchProfileData();
      return () => { isActive = false; };
    }, [email])
  );

  const handleEditAvatar = () => {
    const options = ["Take Photo", "Choose from Gallery", "Remove Photo", "Cancel"];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) handleCamera();
          else if (buttonIndex === 1) handleGallery();
          else if (buttonIndex === 2) handleRemovePhoto();
        }
      );
    } else {
      Alert.alert("Profile Picture", "Choose an option", [
        { text: "Take Photo", onPress: handleCamera },
        { text: "Choose from Gallery", onPress: handleGallery },
        { text: "Remove Photo", onPress: handleRemovePhoto, style: "destructive" },
        { text: "Cancel", style: "cancel" }
      ]);
    }
  };

  const uploadPhoto = async (uri: string) => {
    setIsPhotoUploading(true);
    const formData = new FormData();
    const fileType = uri.split('.').pop() || 'jpg';
    
    formData.append('photo', {
      uri,
      name: `photo.${fileType}`,
      type: `image/${fileType}`
    } as any);
    formData.append('email', email);

    try {
      const response = await fetch(`http://172.20.10.7:5000/api/teacher/upload-avatar`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      const result = await response.json();
      if (response.ok && result.photoUrl) {
        setProfilePhotoUrl(result.photoUrl);
      } else {
        Alert.alert("Upload Failed", result.error || "Something went wrong.");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Permission required", "Camera access is needed.");
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, aspect: [1, 1], quality: 0.5
    });
    if (!result.canceled && result.assets[0]) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Permission required", "Gallery access is needed.");
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5
    });
    if (!result.canceled && result.assets[0]) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const handleRemovePhoto = async () => {
    setProfilePhotoUrl("null");
    try {
      await fetch(`http://172.20.10.7:5000/api/teacher/remove-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
    } catch (error) {
      console.error("Error removing photo:", error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Log Out",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Log Out", 
          style: "destructive",
          // Route back to the main selection/login screen
          onPress: () => router.replace("/selection") 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <WatermarkOverlay />

      <View style={{ flex: 1 }}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* AVATAR & NAME SECTION */}
          <View style={styles.profileTopSection}>
            <View style={styles.avatarContainer}>
              {profilePhotoUrl && profilePhotoUrl !== "null" ? (
                <Image source={{ uri: profilePhotoUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <FontAwesome6 name="user-tie" size={40} color="#2563EB" />
                </View>
              )}
              {isPhotoUploading && (
                <View style={[StyleSheet.absoluteFill, styles.avatarOverlay]}>
                  <ActivityIndicator color={"#FFFFFF"} />
                </View>
              )}
              <TouchableOpacity style={styles.editAvatarBtn} activeOpacity={0.8} onPress={handleEditAvatar} disabled={isPhotoUploading}>
                <FontAwesome6 name="camera" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{fullName}</Text>
            <Text style={styles.userRole}>Staff ID: {staffId}</Text>
          </View>

          {/* PERSONAL DETAILS CARD */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Professional Details</Text>
            
            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#DBEAFE' }]}>
                <Feather name="mail" size={18} color="#2563EB" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{email}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#FCE7F3' }]}>
                <FontAwesome6 name="school" size={16} color="#DB2777" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Teaching School</Text>
                <Text style={styles.infoValue}>{profileData.school_name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="book-open" size={18} color="#D97706" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>{profileData.department}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#E0E7FF' }]}>
                <FontAwesome6 name="book-bookmark" size={16} color="#4F46E5" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Teaching Subject</Text>
                <Text style={styles.infoValue}>{profileData.subject}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#D1FAE5' }]}>
                <MaterialIcons name="language" size={18} color="#059669" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Teaching Medium</Text>
                <Text style={styles.infoValue}>{profileData.medium}</Text>
              </View>
            </View>
          </View>

          {/* SETTINGS CARD */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Account Settings</Text>
            
            <TouchableOpacity style={styles.settingRow} activeOpacity={0.7} onPress={() => router.push("/(auth)/forgot-password")}>
              <Feather name="lock" size={20} color="#64748B" />
              <Text style={styles.settingText}>Change Password</Text>
              <FontAwesome6 name="chevron-right" size={14} color="#CBD5E1" />
            </TouchableOpacity>
          </View>

          {/* LOGOUT BUTTON */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
            <Feather name="log-out" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

        </ScrollView>

        {/* BOTTOM TAB BAR */}
        <View style={styles.bottomTabBar}>
          {[ 
            { icon: "home", label: "Home", route: "/(teacher-tabs)/teacher-screen" }, 
            { icon: "message-square", label: "Messages", route: "/(teacher-tabs)/teacher-messages" }, 
            { icon: "folder", label: "Materials", route: "/(teacher-tabs)/teacher-materials" },
            { icon: "users", label: "Classes", route: null }, 
            { icon: "calendar", label: "Calendar", route: "/(auth)/calendar" }, 
            { icon: "info", label: "About Us", route: "/(auth)/about-us" } 
          ].map((tab, index) => {
            const isActive = false; // None are active on the profile screen
            return (
              <TouchableOpacity 
                key={index} 
                style={styles.tabItem}
                onPress={() => {
                  if (tab.route) {
                    router.navigate({ pathname: tab.route as any, params: getNavParams() });
                  }
                }}
                activeOpacity={0.7}
              >
                <Feather name={tab.icon as any} size={20} color={isActive ? "#2563EB" : "#64748B"} />
                <Text style={[styles.tabLabel, { color: isActive ? "#2563EB" : "#64748B" }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  
  // Header
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  backBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  headerSpacer: { width: 36 },
  
  scrollContent: { paddingBottom: 100, paddingHorizontal: 24, paddingTop: 30 },
  
  // Profile Top Section
  profileTopSection: { alignItems: "center", marginBottom: 30 },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#FFFFFF" },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", borderWidth: 4, borderColor: "#FFFFFF" },
  avatarOverlay: { borderRadius: 50, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  editAvatarBtn: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#2563EB", width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#FFFFFF" },
  userName: { fontSize: 24, fontWeight: "bold", color: "#1E293B" },
  userRole: { fontSize: 15, color: "#64748B", marginTop: 4, fontWeight: "500" },

  // Info Cards
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginBottom: 15, letterSpacing: 0.5 },
  
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 15 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#1E293B", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },

  // Settings
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  settingText: { flex: 1, fontSize: 15, fontWeight: "500", color: "#475569", marginLeft: 15 },

  // Logout
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FEF2F2", paddingVertical: 16, borderRadius: 16, marginTop: 10, marginBottom: 20, borderWidth: 1, borderColor: "#FECACA" },
  logoutText: { color: "#EF4444", fontSize: 16, fontWeight: "bold", marginLeft: 8 },

  // Bottom Tab Bar
  bottomTabBar: { flexDirection: "row", justifyContent: "space-around", backgroundColor: "#FFFFFF", paddingVertical: 12, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: "#E2E8F0", position: "absolute", bottom: 0, left: 0, right: 0 },
  tabItem: { alignItems: "center", flex: 1 }, 
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" }
});