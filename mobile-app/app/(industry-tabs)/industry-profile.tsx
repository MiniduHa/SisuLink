import React, { useState, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
  ActionSheetIOS
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import WatermarkOverlay from "../../components/WatermarkOverlay";
import * as ImagePicker from "expo-image-picker";

export default function IndustryProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialEmail = (params.email as string) || "";
  const initialCompanyName = (params.company_name as string) || "Industry Partner";
  const initialLogoUrl = (params.logo_url as string) || "null";
  const initialStatus = (params.status as string) || "Pending";

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  // Profile data state
  const [profileData, setProfileData] = useState({
    company_name: initialCompanyName,
    email: initialEmail,
    logo_url: initialLogoUrl,
    status: initialStatus,
    phone: "",
    bio: "",
    website: "",
    linkedin: "",
    address: "",
    industry_type: "",
    brn: ""
  });

  const [editData, setEditData] = useState({...profileData});

  const fetchProfileData = async () => {
    if (!initialEmail) return;
    setIsLoading(true);
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(`http://172.20.10.7:5000/api/industry/${initialEmail}/dashboard?t=${timestamp}`);
      if (response.ok) {
        const data = await response.json();
        const partner = data.partner;
        const formattedData = {
          company_name: partner.company_name || initialCompanyName,
          email: partner.email || initialEmail,
          logo_url: partner.logo_url || initialLogoUrl,
          status: partner.status || initialStatus,
          phone: partner.phone || "",
          bio: partner.bio || "",
          website: partner.website || "",
          linkedin: partner.linkedin || "",
          address: partner.address || "",
          industry_type: partner.industry_type || "",
          brn: partner.brn || ""
        };
        setProfileData(formattedData);
        setEditData(formattedData);
      }
    } catch (error) {
      console.error("Failed to fetch industry profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfileData();
    }, [initialEmail])
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
      name: `logo.${fileType}`,
      type: `image/${fileType}`
    } as any);
    formData.append('email', initialEmail);

    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/upload-avatar`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      const result = await response.json();
      if (response.ok && result.photoUrl) {
        setProfileData(prev => ({ ...prev, logo_url: result.photoUrl }));
        setEditData(prev => ({ ...prev, logo_url: result.photoUrl }));
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
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [1, 1], quality: 0.5
    });
    if (!result.canceled && result.assets[0]) {
      uploadPhoto(result.assets[0].uri);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/remove-avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: initialEmail })
      });
      if (response.ok) {
        setProfileData(prev => ({ ...prev, logo_url: "null" }));
        setEditData(prev => ({ ...prev, logo_url: "null" }));
      }
    } catch (error) {
      console.error("Error removing photo:", error);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/${initialEmail}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setProfileData(editData);
        setIsEditing(false);
        Alert.alert("Success", "Profile updated successfully!");
      } else {
        const error = await response.json();
        Alert.alert("Error", error.error || "Failed to update profile.");
      }
    } catch (error) {
      console.error("Save Error:", error);
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setIsLoading(false);
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
          onPress: () => router.replace("/selection") 
        }
      ]
    );
  };

  if (isLoading && !isEditing) {
    return (
      <View style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <WatermarkOverlay />

      <View style={{ flex: 1 }}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? "Edit Profile" : "Company Profile"}</Text>
          <TouchableOpacity 
            onPress={() => isEditing ? handleSave() : setIsEditing(true)} 
            style={[styles.editActionBtn, isEditing && styles.saveBtn]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={isEditing ? "#FFF" : "#2563EB"} />
            ) : (
              <Text style={[styles.editActionText, isEditing && styles.saveActionText]}>{isEditing ? "Save" : "Edit"}</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* AVATAR & NAME SECTION */}
          <View style={styles.profileTopSection}>
            <View style={styles.avatarContainer}>
              {profileData.logo_url && profileData.logo_url !== "null" ? (
                <Image source={{ uri: profileData.logo_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <FontAwesome6 name="building" size={40} color="#2563EB" />
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
            
            {isEditing ? (
              <TextInput
                style={styles.nameInput}
                value={editData.company_name}
                onChangeText={(text) => setEditData({ ...editData, company_name: text })}
                placeholder="Company Name"
              />
            ) : (
              <Text style={styles.userName}>{profileData.company_name}</Text>
            )}
            
            <Text style={styles.userRole}>
              Status: <Text style={{ color: profileData.status === 'Active' ? '#16A34A' : '#EF4444', fontWeight: 'bold' }}>{profileData.status}</Text>
            </Text>
          </View>

          {/* BIO SECTION */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>About Company</Text>
            {isEditing ? (
              <TextInput
                style={styles.bioInput}
                value={editData.bio}
                onChangeText={(text) => setEditData({ ...editData, bio: text })}
                placeholder="Tell us about your company..."
                multiline
                numberOfLines={4}
              />
            ) : (
              <Text style={styles.bioText}>
                {profileData.bio || "No bio available. Tap edit to add information about your company."}
              </Text>
            )}
          </View>

          {/* COMPANY DETAILS CARD */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Company Details</Text>
            
            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#DBEAFE' }]}>
                <Feather name="mail" size={18} color="#2563EB" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{profileData.email}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#FCE7F3' }]}>
                <FontAwesome6 name="building-user" size={16} color="#DB2777" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Company Name</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editData.company_name}
                    onChangeText={(text) => setEditData({ ...editData, company_name: text })}
                    placeholder="Company Name"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profileData.company_name}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#F1F5F9' }]}>
                <FontAwesome6 name="id-card" size={16} color="#475569" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Business Registration Number (BRN)</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editData.brn}
                    onChangeText={(text) => setEditData({ ...editData, brn: text })}
                    placeholder="BRN Number"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profileData.brn || "Not set"}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#E0E7FF' }]}>
                <FontAwesome6 name="briefcase" size={16} color="#4F46E5" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Industry Type</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editData.industry_type}
                    onChangeText={(text) => setEditData({ ...editData, industry_type: text })}
                    placeholder="e.g. IT, Manufacturing, Finance"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profileData.industry_type || "Not set"}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#F0FDF4' }]}>
                <Feather name="phone" size={18} color="#16A34A" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Phone Number</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editData.phone}
                    onChangeText={(text) => setEditData({ ...editData, phone: text })}
                    placeholder="Phone Number"
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profileData.phone || "Not set"}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#FFF7ED' }]}>
                <Feather name="map-pin" size={18} color="#EA580C" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Address</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editData.address}
                    onChangeText={(text) => setEditData({ ...editData, address: text })}
                    placeholder="Company Address"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profileData.address || "Not set"}</Text>
                )}
              </View>
            </View>
          </View>

          {/* SOCIAL LINKS CARD */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Online Presence</Text>
            
            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#F1F5F9' }]}>
                <Feather name="globe" size={18} color="#475569" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>Website</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editData.website}
                    onChangeText={(text) => setEditData({ ...editData, website: text })}
                    placeholder="https://company.com"
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profileData.website || "Not set"}</Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={[styles.iconBg, { backgroundColor: '#E0E7FF' }]}>
                <Feather name="linkedin" size={18} color="#4F46E5" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoLabel}>LinkedIn</Text>
                {isEditing ? (
                  <TextInput
                    style={styles.valueInput}
                    value={editData.linkedin}
                    onChangeText={(text) => setEditData({ ...editData, linkedin: text })}
                    placeholder="LinkedIn Profile URL"
                    autoCapitalize="none"
                  />
                ) : (
                  <Text style={styles.infoValue}>{profileData.linkedin || "Not set"}</Text>
                )}
              </View>
            </View>
          </View>

          {isEditing && (
            <TouchableOpacity 
              style={styles.cancelEditBtn} 
              onPress={() => {
                setIsEditing(false);
                setEditData(profileData);
              }}
            >
              <Text style={styles.cancelEditBtnText}>Cancel Editing</Text>
            </TouchableOpacity>
          )}

          {/* LOGOUT BUTTON */}
          {!isEditing && (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
              <Feather name="log-out" size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
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
  editActionBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  saveBtn: { backgroundColor: "#2563EB" },
  editActionText: { fontSize: 14, fontWeight: "bold", color: "#1E293B" },
  saveActionText: { color: "#FFFFFF" },
  headerSpacer: { width: 36 },
  
  scrollContent: { paddingBottom: 40, paddingHorizontal: 24, paddingTop: 30 },
  
  // Profile Top Section
  profileTopSection: { alignItems: "center", marginBottom: 30 },
  avatarContainer: { position: "relative", marginBottom: 15 },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: "#FFFFFF" },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#DBEAFE", justifyContent: "center", alignItems: "center", borderWidth: 4, borderColor: "#FFFFFF" },
  avatarOverlay: { borderRadius: 50, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  editAvatarBtn: { position: "absolute", bottom: 0, right: 0, backgroundColor: "#2563EB", width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#FFFFFF" },
  userName: { fontSize: 24, fontWeight: "bold", color: "#1E293B", textAlign: 'center' },
  userRole: { fontSize: 15, color: "#64748B", marginTop: 4, fontWeight: "500" },
  nameInput: { fontSize: 22, fontWeight: "bold", color: "#1E293B", borderBottomWidth: 1, borderBottomColor: "#CBD5E1", paddingBottom: 4, marginBottom: 10, width: '100%', textAlign: 'center' },

  // Info Cards
  infoCard: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginBottom: 15, letterSpacing: 0.5 },
  
  bioText: { fontSize: 14, color: "#475569", lineHeight: 22 },
  bioInput: { fontSize: 14, color: "#1E293B", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 12, textAlignVertical: 'top', borderWidth: 1, borderColor: "#E2E8F0" },

  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 15 },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#1E293B", marginTop: 2 },
  valueInput: { fontSize: 15, fontWeight: "600", color: "#2563EB", marginTop: 2, borderBottomWidth: 1, borderBottomColor: "#DBEAFE", paddingBottom: 2 },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },

  // Settings
  settingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  settingText: { flex: 1, fontSize: 15, fontWeight: "500", color: "#475569", marginLeft: 15 },

  // Buttons
  cancelEditBtn: { paddingVertical: 12, alignItems: 'center', marginBottom: 20 },
  cancelEditBtnText: { color: "#64748B", fontWeight: "600", fontSize: 14 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#FEF2F2", paddingVertical: 16, borderRadius: 16, marginTop: 10, marginBottom: 20, borderWidth: 1, borderColor: "#FECACA" },
  logoutText: { color: "#EF4444", fontSize: 16, fontWeight: "bold", marginLeft: 8 },
});
