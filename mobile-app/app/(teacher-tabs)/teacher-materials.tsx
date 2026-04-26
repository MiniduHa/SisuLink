import React, { useState, useCallback } from "react";
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, ActivityIndicator, Dimensions, Linking, Alert, Modal
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesome6, Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

const { width } = Dimensions.get("window");

export default function TeacherMaterialsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = (params.email as string) || "";

  const [isLoading, setIsLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  
  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form State
  const [newMaterial, setNewMaterial] = useState({
    title: "",
    materialType: "PDF Note",
    gradeLevel: "", // Will be auto-set based on department
    subject: "General",
    description: "",
    fileUri: "",
    fileName: "",
    fileMimeType: "",
    externalLink: "" // Drive, YouTube, Web links
  });

  const materialTypes = ["PDF Note", "Past Paper", "Worksheet", "External Link"];

  // Fetch Teacher Profile & Materials
  const fetchProfileAndMaterials = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Teacher Profile (To get Department and Subject)
      const profRes = await fetch(`http://172.20.10.7:5000/api/teacher/profile/${email}`);
      if (profRes.ok) {
        const profData = await profRes.json();
        setTeacherProfile(profData);
        
        // Auto-set the subject for the new material form
        setNewMaterial(prev => ({ ...prev, subject: profData.subject || "General" }));
      }

      // 2. Fetch the Teacher's Uploaded Materials
      const matRes = await fetch(`http://172.20.10.7:5000/api/teacher/${email}/materials`);
      if (matRes.ok) {
        const matData = await matRes.json();
        setMaterials(matData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (email) fetchProfileAndMaterials();
    }, [email])
  );

  // --- DYNAMIC GRADE FILTERING ---
  // Calculates which grades to show based on the teacher's department
  let availableGrades = ["Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Grade 13"];
  if (teacherProfile?.department === "O/L") {
    availableGrades = ["Grade 10", "Grade 11"];
  } else if (teacherProfile?.department && teacherProfile.department.includes("Section")) {
    availableGrades = ["Grade 12", "Grade 13"];
  }

  // Ensure the default selected grade is valid for this teacher
  if (availableGrades.length > 0 && !newMaterial.gradeLevel) {
    setNewMaterial(prev => ({ ...prev, gradeLevel: availableGrades[0] }));
  }

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*", 
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        setNewMaterial({
          ...newMaterial,
          fileUri: result.assets[0].uri,
          fileName: result.assets[0].name,
          fileMimeType: result.assets[0].mimeType || "application/octet-stream"
        });
      }
    } catch (error) {
      console.error("Error picking document:", error);
    }
  };

  const handleSaveMaterial = async () => {
    if (!newMaterial.title || !newMaterial.gradeLevel) {
      Alert.alert("Error", "Please provide a title and grade level.");
      return;
    }

    if (newMaterial.materialType === "External Link" && !newMaterial.externalLink) {
      Alert.alert("Error", "Please paste a valid web or drive link.");
      return;
    }

    if (newMaterial.materialType !== "External Link" && !newMaterial.fileUri) {
      Alert.alert("Error", "Please select a file from your device to upload.");
      return;
    }

    setIsUploading(true);

    try {
      let finalFileUrl = newMaterial.externalLink;

      // If it's an actual file, upload it to the Supabase backend first
      if (newMaterial.materialType !== "External Link" && newMaterial.fileUri) {
        const formData = new FormData();
        formData.append("file", {
          uri: newMaterial.fileUri,
          name: newMaterial.fileName,
          type: newMaterial.fileMimeType
        } as any);

        const uploadRes = await fetch("http://172.20.10.7:5000/api/teacher/upload-material", {
          method: "POST",
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalFileUrl = uploadData.fileUrl; // The generated Supabase URL
        } else {
          throw new Error("File upload failed");
        }
      }

      // Save the database record
      const dbRes = await fetch(`http://172.20.10.7:5000/api/teacher/${email}/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newMaterial.title,
          materialType: newMaterial.materialType,
          gradeLevel: newMaterial.gradeLevel,
          subject: newMaterial.subject,
          description: newMaterial.description,
          fileUrl: finalFileUrl
        }),
      });

      if (dbRes.ok) {
        Alert.alert("Success", "Material shared with students successfully!");
        setIsAddModalOpen(false);
        setNewMaterial({ ...newMaterial, title: "", description: "", fileUri: "", fileName: "", externalLink: "" });
        fetchProfileAndMaterials(); // Refresh the list dynamically
      } else {
        throw new Error("Database save failed");
      }

    } catch (error) {
      Alert.alert("Upload Failed", "Something went wrong while uploading. Please try again.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "External Link": return "link";
      case "Past Paper": return "file-lines";
      case "Worksheet": return "clipboard-list";
      default: return "file-pdf";
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "External Link": return "#8B5CF6"; // Indigo/Purple
      case "Past Paper": return "#F59E0B"; // Amber
      case "Worksheet": return "#10B981"; // Emerald
      default: return "#EF4444"; // Red for PDFs
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* HEADER WITH BACK ARROW */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Student Materials</Text>
            <Text style={styles.headerSubtext}>Share resources with your class</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalOpen(true)}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {materials.length > 0 ? (
            materials.map((mat) => (
              <TouchableOpacity 
                key={mat.id} 
                style={styles.materialCard}
                onPress={() => {
                  // Ensure URLs have https:// so the phone knows how to open them
                  const urlToOpen = mat.file_url.startsWith('http') ? mat.file_url : `https://${mat.file_url}`;
                  Linking.openURL(urlToOpen).catch(() => Alert.alert("Error", "Cannot open this link."));
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.iconContainer, { backgroundColor: getIconColor(mat.material_type) + '15' }]}>
                  <FontAwesome6 name={getIconForType(mat.material_type)} size={22} color={getIconColor(mat.material_type)} />
                </View>
                <View style={styles.materialDetails}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.gradeBadge}>{mat.grade_level}</Text>
                    <Text style={styles.typeBadge}>{mat.material_type}</Text>
                  </View>
                  <Text style={styles.materialTitle} numberOfLines={2}>{mat.title}</Text>
                  <Text style={styles.materialSubject}>{mat.subject} • Added {new Date(mat.created_at).toLocaleDateString()}</Text>
                </View>
                <Feather name="external-link" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="folder-open" size={50} color="#CBD5E1" />
              <Text style={styles.emptyText}>No materials shared yet.</Text>
              <Text style={styles.emptySubtext}>Tap the + button to upload notes, past papers, or drive links for your students.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* --- ADD MATERIAL FULL-SCREEN MODAL --- */}
      <Modal visible={isAddModalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
          
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Share Material</Text>
            <TouchableOpacity onPress={handleSaveMaterial} disabled={isUploading}>
              <Text style={[styles.saveText, isUploading && { opacity: 0.5 }]}>Share</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            
            <Text style={styles.inputLabel}>Material Title</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="e.g. Term 1 Algebra Notes"
              value={newMaterial.title}
              onChangeText={(t) => setNewMaterial({...newMaterial, title: t})}
            />

            {/* DYNAMIC GRADE SELECTOR */}
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.inputLabel}>Target Grade</Text>
                <View style={styles.selectBox}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {availableGrades.map(grade => (
                      <TouchableOpacity 
                        key={grade} 
                        style={[styles.pillBtn, newMaterial.gradeLevel === grade && styles.pillBtnActive]}
                        onPress={() => setNewMaterial({...newMaterial, gradeLevel: grade})}
                      >
                        <Text style={[styles.pillText, newMaterial.gradeLevel === grade && styles.pillTextActive]}>{grade}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <Text style={styles.helperText}>Filtered based on your assigned section ({teacherProfile?.department})</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Material Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {materialTypes.map(type => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.typeBtn, newMaterial.materialType === type && styles.typeBtnActive]}
                  onPress={() => setNewMaterial({...newMaterial, materialType: type, fileName: "", fileUri: "", externalLink: ""})}
                >
                  <FontAwesome6 name={getIconForType(type)} size={14} color={newMaterial.materialType === type ? "#FFFFFF" : "#64748B"} style={{ marginRight: 6 }} />
                  <Text style={[styles.typeText, newMaterial.materialType === type && styles.typeTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Attachment</Text>
            {newMaterial.materialType === "External Link" ? (
               <View>
                 <TextInput 
                   style={styles.textInput} 
                   placeholder="Paste Google Drive, YouTube, or Web URL"
                   value={newMaterial.externalLink}
                   onChangeText={(t) => setNewMaterial({...newMaterial, externalLink: t})}
                   autoCapitalize="none"
                   keyboardType="url"
                 />
                 <Text style={[styles.helperText, { marginTop: -15, marginBottom: 20 }]}>Students will be redirected to this link.</Text>
               </View>
            ) : (
               <TouchableOpacity style={styles.uploadBox} onPress={handlePickFile}>
                 <Feather name="upload-cloud" size={32} color="#9CA3AF" />
                 <Text style={styles.uploadText}>
                   {newMaterial.fileName ? newMaterial.fileName : "Tap to browse files"}
                 </Text>
                 <Text style={styles.uploadSubtext}>Supports PDF, DOCX, Images</Text>
               </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>Optional Instructions for Students</Text>
            <TextInput 
              style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]} 
              placeholder="e.g. Please complete this worksheet before Friday's class..."
              multiline
              value={newMaterial.description}
              onChangeText={(t) => setNewMaterial({...newMaterial, description: t})}
            />

            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.uploadingText}>Uploading secure file to cloud...</Text>
              </View>
            )}

          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  
  // Updated Header to include Back Button
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 8, backgroundColor: "#F1F5F9", borderRadius: 12 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1E293B" },
  headerSubtext: { fontSize: 12, color: "#64748B", marginTop: 2, fontWeight: "500" },
  
  addButton: { backgroundColor: "#2563EB", width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  materialCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  iconContainer: { width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 16 },
  materialDetails: { flex: 1 },
  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  gradeBadge: { fontSize: 10, fontWeight: "bold", color: "#475569", backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  typeBadge: { fontSize: 10, fontWeight: "bold", color: "#2563EB", backgroundColor: "#EFF6FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: "hidden" },
  materialTitle: { fontSize: 15, fontWeight: "bold", color: "#1E293B", marginBottom: 4 },
  materialSubject: { fontSize: 12, color: "#64748B", fontWeight: "500" },
  
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyText: { fontSize: 18, fontWeight: "bold", color: "#475569", marginTop: 16 },
  emptySubtext: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 8, paddingHorizontal: 40, lineHeight: 20 },

  // Modal Styles
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  cancelText: { color: "#64748B", fontSize: 16, fontWeight: "500" },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1E293B" },
  saveText: { color: "#2563EB", fontSize: 16, fontWeight: "bold" },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontWeight: "bold", color: "#475569", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  textInput: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 16, fontSize: 15, color: "#1E293B", marginBottom: 24 },
  helperText: { fontSize: 11, color: "#9CA3AF", marginTop: 4, marginLeft: 4, fontStyle: "italic" },
  
  row: { flexDirection: "row", marginBottom: 20 },
  selectBox: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 8 },
  pillBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 8 },
  pillBtnActive: { backgroundColor: "#2563EB" },
  pillText: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  pillTextActive: { color: "#FFFFFF" },
  
  typeBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginRight: 10 },
  typeBtnActive: { backgroundColor: "#1E293B", borderColor: "#1E293B" },
  typeText: { fontSize: 14, color: "#64748B", fontWeight: "600" },
  typeTextActive: { color: "#FFFFFF" },

  uploadBox: { backgroundColor: "#F8FAFC", borderWidth: 2, borderColor: "#E2E8F0", borderStyle: "dashed", borderRadius: 16, padding: 30, alignItems: "center", marginBottom: 24 },
  uploadText: { fontSize: 15, fontWeight: "bold", color: "#475569", marginTop: 12, textAlign: "center" },
  uploadSubtext: { fontSize: 12, color: "#9CA3AF", marginTop: 4 },

  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: 16 },
  uploadingText: { marginTop: 12, fontSize: 15, fontWeight: 'bold', color: '#2563EB' }
});