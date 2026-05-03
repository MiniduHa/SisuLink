import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Image,
  ActivityIndicator
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import WatermarkOverlay from "../../components/WatermarkOverlay";

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';

const { width } = Dimensions.get("window"); 

export default function StudentProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // --- DYNAMIC DATA FROM LOGIN/DASHBOARD ---
  const firstName = (params.first_name as string) || "Student";
  const lastName = (params.last_name as string) || "";
  const email = (params.email as string) || "student@school.lk";
  const gradeLevel = (params.grade as string) || "11";
  const attendance = (params.attendance as string) || "85%";
  const studentId = (params.studentId as string) || "STU-90214";

  const avatarInitials = (firstName[0] + (lastName[0] || "")).toUpperCase();

  const [profilePhoto, setProfilePhoto] = useState<string | null>((params.profile_photo as string) || null);

  const [activeTab, setActiveTab] = useState("About");
  const tabs = ["About", "Resume"];
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // --- PROFILE DATA STATES ---
  const [mobile, setMobile] = useState("");
  const [homePhone, setHomePhone] = useState("");
  const [address, setAddress] = useState("");
  const [nic, setNic] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("");
  const [religion, setReligion] = useState("");
  const [district, setDistrict] = useState("");
  const [province, setProvince] = useState("");
  const [stream, setStream] = useState("");

  // Guardian States
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");

  // O/L Results States
  const [isOLCompleted, setIsOLCompleted] = useState(false);
  const [olSchool, setOlSchool] = useState("");
  const [olYear, setOlYear] = useState("");
  const [olStatus, setOlStatus] = useState("");
  const [olScheme, setOlScheme] = useState("");
  const [olResults, setOlResults] = useState<any[]>([]);

  // Resume State
  const [resumeUrl, setResumeUrl] = useState("");

  // --- FETCH DATA ON MOUNT ---
  const fetchProfile = useCallback(async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/profile/${studentId}`);
      if (response.ok) {
        const data = await response.json();
        setMobile(data.mobile_number || "");
        setHomePhone(data.home_phone || "");
        setAddress(data.address || "");
        setNic(data.nic || "");
        setDob(data.date_of_birth || "");
        setNationality(data.nationality || "");
        setReligion(data.religion || "");
        setDistrict(data.district || "");
        setProvince(data.province || "");
        setStream(data.stream || "General");

        if (data.guardian) {
          setGuardianName(data.guardian.full_name || "");
          setGuardianPhone(data.guardian.phone_number || "");
          setGuardianEmail(data.guardian.email || "");
        }

        setOlSchool(data.ol_school || "");
        setOlYear(data.ol_year || "");
        setOlStatus(data.ol_status || "");
        setOlScheme(data.ol_scheme || "");
        setOlResults(data.ol_results || []);
        setIsOLCompleted(!!data.ol_school);
        setResumeUrl(data.resume_url || "");
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: () => router.replace("/selection") }
    ]);
  };

  // --- SAVE & UPLOAD LOGIC ---
  const handleSave = async () => {
    setIsLoading(true);
    try {
      // 1. Update Text Data
      const updateRes = await fetch(`http://172.20.10.7:5000/api/profile/${studentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_number: mobile,
          home_phone: homePhone,
          address: address,
          nic: nic,
          date_of_birth: dob,
          nationality: nationality,
          religion: religion,
          district: district,
          province: province,
          stream: stream,
          guardian_name: guardianName,
          guardian_phone: guardianPhone,
          guardian_email: guardianEmail,
          ol_school: olSchool,
          ol_year: olYear,
          ol_status: olStatus,
          ol_scheme: olScheme,
          ol_results: olResults
        })
      });

      if (!updateRes.ok) throw new Error("Failed to update profile text data.");

      // 2. Handle Photo Upload if changed
      if (profilePhoto && !profilePhoto.startsWith('http')) {
        const formData = new FormData();
        formData.append('photo', {
          uri: Platform.OS === 'android' ? profilePhoto : profilePhoto.replace('file://', ''),
          name: `${studentId}_avatar.jpg`,
          type: 'image/jpeg',
        } as any);
        formData.append('studentId', studentId);

        const photoRes = await fetch("http://172.20.10.7:5000/api/profile/upload-avatar", {
          method: "POST",
          body: formData, 
        });
        const photoData = await photoRes.json();
        if (photoRes.ok) setProfilePhoto(photoData.photoUrl);
      }

      setIsEditing(false);
      Alert.alert("Success", "Profile updated successfully!");
      fetchProfile(); // Refresh
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Update Failed", "Could not save your changes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickResume = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      });

      if (!result.canceled) {
        const file = result.assets[0];
        setIsLoading(true);

        const formData = new FormData();
        formData.append('resume', {
          uri: Platform.OS === 'android' ? file.uri : file.uri.replace('file://', ''),
          name: file.name,
          type: file.mimeType || 'application/pdf',
        } as any);
        formData.append('studentId', studentId);

        const res = await fetch("http://172.20.10.7:5000/api/profile/upload-resume", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setResumeUrl(data.resumeUrl);
          Alert.alert("Success", "Resume uploaded successfully!");
        } else {
          Alert.alert("Error", "Failed to upload resume.");
        }
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveResume = async () => {
    Alert.alert("Remove Resume", "Are you sure you want to delete your resume?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive",
        onPress: async () => {
          setIsLoading(true);
          try {
            const res = await fetch("http://172.20.10.7:5000/api/profile/remove-resume", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ studentId })
            });
            if (res.ok) {
              setResumeUrl("");
              Alert.alert("Success", "Resume removed.");
            }
          } catch (err) {
            console.error(err);
          } finally {
            setIsLoading(false);
          }
        }
      }
    ]);
  };

  const handleViewResume = async () => {
    if (resumeUrl) {
      await WebBrowser.openBrowserAsync(resumeUrl);
    }
  };

  // --- IMAGE PICKER LOGIC ---
  const handlePickImage = () => {
    Alert.alert("Profile Photo", "Choose an option", [
        { text: "Camera", onPress: openCamera },
        { text: "Gallery", onPress: openGallery },
        { text: "Cancel", style: "cancel" }
    ]);
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) return Alert.alert("Permission to access camera is required!");
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) setProfilePhoto(result.assets[0].uri);
  };

  const openGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) return Alert.alert("Permission to access gallery is required!");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled) setProfilePhoto(result.assets[0].uri);
  };

  const InfoRow = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <WatermarkOverlay />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <View style={styles.header}>
          {isEditing ? (
            <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.iconButton}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}><FontAwesome6 name="arrow-left" size={20} color="#1E293B" /></TouchableOpacity>
          )}
          <Text style={styles.headerTitle}>{isEditing ? "Edit Profile" : "Profile"}</Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleSave} style={styles.iconButton}><Text style={styles.saveText}>Save</Text></TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.iconButton}><Feather name="edit" size={20} color="#1E293B" /></TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {isLoading && !isEditing && (
            <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
          )}
          
          {/* MAIN PROFILE HEADER */}
          {activeTab === "About" && !isEditing && (
            <View style={styles.profileHeader}>
              <View style={styles.avatar}>
                {profilePhoto && profilePhoto.length > 5 ? (
                  <Image key={profilePhoto} source={{ uri: profilePhoto }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{avatarInitials}</Text>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.name}>{firstName} {lastName}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.idBadge}><Text style={styles.idBadgeText}>{studentId}</Text></View>
                  <View style={styles.gradeBadge}><Text style={styles.gradeBadgeText}>Grade {gradeLevel}</Text></View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.tabsContainer}>
            {tabs.map((tab) => (
              <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => { setActiveTab(tab); setIsEditing(false); }}>
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TAB CONTENT: ABOUT (VIEW MODE) */}
          {activeTab === "About" && !isEditing && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Academic Information</Text>
                <InfoRow label="Student ID" value={studentId} />
                <InfoRow label="First Name" value={firstName} />
                <InfoRow label="Last Name" value={lastName} />
                <InfoRow label="Email Address" value={email} />
                <InfoRow label="Grade" value={gradeLevel} />
                {(gradeLevel === "12" || gradeLevel === "13") && ( <InfoRow label="Stream/Section" value={stream || "Not Assigned"} /> )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Personal Information</Text>
                <InfoRow label="NIC" value={nic || "Not Provided"} />
                <InfoRow label="Mobile Number" value={mobile || "Not Provided"} />
                <InfoRow label="Home Phone" value={homePhone || "Not Provided"} />
                <InfoRow label="Date of Birth" value={dob || "Not Provided"} />
                <InfoRow label="Nationality" value={nationality || "Not Provided"} />
                <InfoRow label="Religion" value={religion || "Not Provided"} />
                <View style={styles.infoRowColumn}><Text style={styles.infoLabel}>Address</Text><Text style={styles.infoValueMultline}>{address || "Not Provided"}</Text></View>
                <InfoRow label="District" value={district || "Not Provided"} />
                <InfoRow label="Province" value={province || "Not Provided"} />
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Guardian Information</Text>
                <View style={styles.guardianRow}><Text style={styles.guardianLabel}>Name</Text><Text style={styles.guardianValue}>{guardianName || "Not Provided"}</Text></View>
                <View style={styles.guardianRow}><Text style={styles.guardianLabel}>Phone</Text><Text style={styles.guardianValue}>{guardianPhone || "Not Provided"}</Text></View>
                <View style={styles.guardianRow}><Text style={styles.guardianLabel}>Email</Text><Text style={styles.guardianValue}>{guardianEmail || "Not Provided"}</Text></View>
              </View>

              {isOLCompleted && (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>G.C.E O/L Examination</Text>
                  <InfoRow label="School" value={olSchool || "Not Provided"} />
                  <InfoRow label="Year" value={olYear || "Not Provided"} />
                  <InfoRow label="Status" value={olStatus || "Not Provided"} />
                  <InfoRow label="Scheme" value={olScheme || "Not Provided"} />
                  <View style={styles.cardDivider} />
                  <Text style={[styles.infoLabel, { marginBottom: 12 }]}>Subjects & Results</Text>
                  <View style={styles.resultsGrid}>
                    {olResults && olResults.length > 0 ? olResults.map((item, index) => (
                      <View key={index} style={styles.resultItem}>
                        <Text style={styles.resultSubject} numberOfLines={1}>{item.subject}</Text>
                        <Text style={[styles.resultGrade, { color: item.grade === "A" ? "#16A34A" : item.grade === "B" ? "#2563EB" : "#D97706" }]}>{item.grade}</Text>
                      </View>
                    )) : (
                      <Text style={{ fontSize: 12, color: "#94A3B8" }}>No results added.</Text>
                    )}
                  </View>
                </View>
              )}
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}><FontAwesome6 name="right-from-bracket" size={16} color="#EF4444" style={{ marginRight: 8 }} /><Text style={styles.logoutButtonText}>Log Out</Text></TouchableOpacity>
            </View>
          )}

          {/* TAB CONTENT: ABOUT (EDIT MODE) */}
          {activeTab === "About" && isEditing && (
            <View style={styles.tabContent}>
              <View style={styles.photoEditContainer}>
                <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
                  <View style={styles.largeAvatar}>
                    {profilePhoto && profilePhoto.length > 5 ? (
                      <Image key={profilePhoto} source={{ uri: profilePhoto }} style={styles.largeAvatarImage} />
                    ) : (
                      <Text style={styles.largeAvatarText}>{avatarInitials}</Text>
                    )}
                  </View>
                  <View style={styles.cameraBadge}><Feather name="camera" size={16} color="#FFFFFF" /></View>
                </TouchableOpacity>
                <Text style={styles.changePhotoText} onPress={handlePickImage}>Change Profile Photo</Text>
              </View>

              <Text style={styles.sectionDividerTitle}>Contact Details</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput style={styles.input} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="e.g. +94 77 123 4567" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Home Phone</Text>
                <TextInput style={styles.input} value={homePhone} onChangeText={setHomePhone} keyboardType="phone-pad" placeholder="e.g. +94 11 234 5678" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Home Address</Text>
                <TextInput style={styles.textArea} multiline numberOfLines={3} value={address} onChangeText={setAddress} placeholder="Enter your full address" placeholderTextColor="#9CA3AF" textAlignVertical="top" />
              </View>

              <Text style={styles.sectionDividerTitle}>Personal Details</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>NIC Number</Text>
                <TextInput style={styles.input} value={nic} onChangeText={setNic} placeholder="e.g. 200512345678" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date of Birth</Text>
                <TextInput style={styles.input} value={dob} onChangeText={setDob} placeholder="e.g. 15 May 2005" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nationality</Text>
                <TextInput style={styles.input} value={nationality} onChangeText={setNationality} placeholder="e.g. Sri Lankan" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Religion</Text>
                <TextInput style={styles.input} value={religion} onChangeText={setReligion} placeholder="e.g. Buddhism" placeholderTextColor="#9CA3AF" />
              </View>
              {(gradeLevel === "12" || gradeLevel === "13") && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Stream/Section</Text>
                  <TextInput style={styles.input} value={stream} onChangeText={setStream} placeholder="e.g. Physical Science" placeholderTextColor="#9CA3AF" />
                </View>
              )}

              <Text style={styles.sectionDividerTitle}>Guardian Details</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Guardian's Name</Text>
                <TextInput style={styles.input} value={guardianName} onChangeText={setGuardianName} placeholder="Full Name" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Guardian's Phone</Text>
                <TextInput style={styles.input} value={guardianPhone} onChangeText={setGuardianPhone} keyboardType="phone-pad" placeholder="Phone Number" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Guardian's Email</Text>
                <TextInput style={styles.input} value={guardianEmail} onChangeText={setGuardianEmail} keyboardType="email-address" placeholder="Email Address" placeholderTextColor="#9CA3AF" autoCapitalize="none" />
              </View>

              <Text style={styles.sectionDividerTitle}>G.C.E O/L Results</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>School</Text>
                <TextInput style={styles.input} value={olSchool} onChangeText={setOlSchool} placeholder="School Name" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Year</Text>
                <TextInput style={styles.input} value={olYear} onChangeText={setOlYear} placeholder="e.g. 2021" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Status</Text>
                <TextInput style={styles.input} value={olStatus} onChangeText={setOlStatus} placeholder="e.g. Passed" placeholderTextColor="#9CA3AF" />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Scheme</Text>
                <TextInput style={styles.input} value={olScheme} onChangeText={setOlScheme} placeholder="e.g. Local Syllabus" placeholderTextColor="#9CA3AF" />
              </View>

              <View style={styles.infoBox}>
                <Feather name="info" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={styles.infoBoxText}>Basic academic info like Student ID and Email are managed by the school office.</Text>
              </View>
            </View>
          )}

          {/* TAB CONTENT: RESUME VIEW & EDIT */}
          {activeTab === "Resume" && (
            <View style={styles.tabContent}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Professional Resume</Text>
                <Text style={styles.cardSubtitle}>Upload your resume to showcase your skills and achievements to the school and potential future opportunities.</Text>
                
                {resumeUrl ? (
                  <View style={styles.resumeContainer}>
                    <View style={styles.resumeFileIcon}>
                      <MaterialCommunityIcons name="file-pdf-box" size={40} color="#EF4444" />
                    </View>
                    <View style={styles.resumeFileInfo}>
                      <Text style={styles.resumeFileName} numberOfLines={1}>Student_Resume.pdf</Text>
                      <Text style={styles.resumeFileStatus}>Uploaded and active</Text>
                    </View>
                    <TouchableOpacity style={styles.viewResumeBtn} onPress={handleViewResume}>
                      <Feather name="eye" size={20} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.emptyResumeContainer}>
                    <MaterialCommunityIcons name="file-upload-outline" size={48} color="#94A3B8" />
                    <Text style={styles.emptyResumeText}>No resume uploaded yet</Text>
                  </View>
                )}

                {!isEditing && !resumeUrl && (
                  <View style={styles.resumeInfoBox}>
                    <Feather name="info" size={14} color="#64748B" style={{ marginRight: 6 }} />
                    <Text style={styles.resumeInfoText}>Switch to edit mode to upload your resume.</Text>
                  </View>
                )}

                {isEditing && (
                  <View style={styles.resumeActionContainer}>
                    {resumeUrl ? (
                      <TouchableOpacity style={styles.deleteResumeBtn} onPress={handleRemoveResume}>
                        <Feather name="trash-2" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                        <Text style={styles.deleteResumeBtnText}>Delete and Re-upload</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.uploadResumeBtn} onPress={handlePickResume}>
                        <Feather name="upload" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.uploadResumeBtnText}>Upload Resume (PDF/DOC)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.infoBox}>
                <Feather name="shield" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={styles.infoBoxText}>Your resume is only visible to school administrators and relevant faculty members.</Text>
              </View>
            </View>
          )}
          
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, backgroundColor: "#FFFFFF" },
  iconButton: { padding: 8, minWidth: 60, alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  cancelText: { fontSize: 16, color: "#64748B" },
  saveText: { fontSize: 16, fontWeight: "bold", color: "#2563EB" },
  scrollContent: { paddingBottom: 40 },
  profileHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 16, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center", marginRight: 16, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarText: { fontSize: 28, fontWeight: "bold", color: "#FFFFFF" },
  profileInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: "bold", color: "#1E293B", marginBottom: 8 },
  badgeRow: { flexDirection: "row", gap: 8 },
  idBadge: { backgroundColor: "#DBEAFE", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  idBadgeText: { fontSize: 12, fontWeight: "bold", color: "#2563EB" },
  gradeBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  gradeBadgeText: { fontSize: 12, fontWeight: "bold", color: "#64748B" },
  statBox: { alignItems: "flex-start" },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  statLabel: { fontSize: 11, color: "#64748B", marginTop: 2 },
  statDivider: { width: 1, height: 24, backgroundColor: "#E2E8F0", marginHorizontal: 20 },
  tabsContainer: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingHorizontal: 10, backgroundColor: "#FFFFFF" },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  activeTab: { borderBottomColor: "#2563EB" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  activeTabText: { color: "#2563EB" },
  tabContent: { padding: 20 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: "#F1F5F9", elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B", marginBottom: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  infoLabel: { fontSize: 13, color: "#64748B", flex: 1 },
  infoValue: { fontSize: 13, color: "#1E293B", fontWeight: "500", flex: 1.5, textAlign: "right" },
  infoRowColumn: { marginBottom: 12 },
  infoValueMultline: { fontSize: 13, color: "#1E293B", fontWeight: "500", marginTop: 4, lineHeight: 20 },
  cardDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 12 },
  resultsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  resultItem: { width: "48%", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 8, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#F1F5F9" },
  resultSubject: { fontSize: 12, color: "#475569", flex: 1, marginRight: 8 },
  resultGrade: { fontSize: 14, fontWeight: "bold" },
  guardianRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  guardianLabel: { fontSize: 13, color: "#64748B", flex: 1 },
  guardianValue: { fontSize: 13, color: "#1E293B", fontWeight: "500", flex: 2, textAlign: "right" },
  photoEditContainer: { alignItems: "center", marginBottom: 30, marginTop: 10 },
  largeAvatar: { width: 100, height: 100, borderRadius: 20, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center", overflow: "hidden" },
  largeAvatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  largeAvatarText: { fontSize: 36, fontWeight: "bold", color: "#FFFFFF" },
  cameraBadge: { position: "absolute", bottom: 0, right: -10, backgroundColor: "#1E293B", width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#F8FAFC" },
  changePhotoText: { marginTop: 12, fontSize: 14, fontWeight: "600", color: "#2563EB" },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "bold", color: "#1E293B", marginBottom: 8 },
  input: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 16, fontSize: 14, color: "#1E293B" },
  textArea: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 16, fontSize: 14, color: "#1E293B", minHeight: 80 },
  infoBox: { flexDirection: "row", backgroundColor: "#EFF6FF", padding: 16, borderRadius: 12, marginTop: 10 },
  infoBoxText: { flex: 1, fontSize: 13, color: "#1E40AF", lineHeight: 20 },
  logoutButton: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 10, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  logoutButtonText: { color: "#EF4444", fontSize: 15, fontWeight: "bold" },
  sectionDividerTitle: { fontSize: 12, fontWeight: "bold", color: "#64748B", marginTop: 24, marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 },
  
  // Resume Styles
  cardSubtitle: { fontSize: 13, color: "#64748B", lineHeight: 20, marginBottom: 20 },
  resumeContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  resumeFileIcon: { width: 48, height: 48, borderRadius: 10, backgroundColor: "#FEE2E2", justifyContent: "center", alignItems: "center", marginRight: 12 },
  resumeFileInfo: { flex: 1 },
  resumeFileName: { fontSize: 14, fontWeight: "600", color: "#1E293B" },
  resumeFileStatus: { fontSize: 12, color: "#16A34A", marginTop: 2 },
  viewResumeBtn: { padding: 8, borderRadius: 8, backgroundColor: "#EFF6FF" },
  emptyResumeContainer: { alignItems: "center", paddingVertical: 40, backgroundColor: "#F8FAFC", borderRadius: 12, borderStyle: "dashed", borderWidth: 1, borderColor: "#CBD5E1" },
  emptyResumeText: { marginTop: 12, fontSize: 14, color: "#64748B" },
  resumeInfoBox: { flexDirection: "row", alignItems: "center", marginTop: 16, justifyContent: "center" },
  resumeInfoText: { fontSize: 12, color: "#64748B" },
  resumeActionContainer: { marginTop: 20 },
  uploadResumeBtn: { backgroundColor: "#2563EB", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, borderRadius: 12 },
  uploadResumeBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "bold" },
  deleteResumeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  deleteResumeBtnText: { color: "#EF4444", fontSize: 14, fontWeight: "600" }
});