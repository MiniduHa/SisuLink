import React, { useState, useCallback, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  Platform,
  ActionSheetIOS,
  KeyboardAvoidingView
} from "react-native";
import { FontAwesome6, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ManageAnnouncements() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState((params.email as string) || "");

  // Load email from storage if not passed via params
  useEffect(() => {
    if (!email) {
      AsyncStorage.getItem('industryEmail').then(stored => {
        if (stored) setEmail(stored);
      });
    }
  }, []);

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [schools, setSchools] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Seminar',
    target_school_id: 'All',
    cover_photo: ''
  });

  const fetchData = async () => {
    if (!email) return;
    try {
      const [annRes, schoolsRes] = await Promise.all([
        fetch(`http://172.20.10.7:5000/api/industry/${email}/announcements`),
        fetch(`http://172.20.10.7:5000/api/industry/schools`)
      ]);
      
      if (annRes.ok && schoolsRes.ok) {
        setAnnouncements(await annRes.json());
        setSchools(await schoolsRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [email])
  );

  const uploadPhoto = async (uri: string) => {
    setIsPhotoUploading(true);
    const formDataUpload = new FormData();
    const fileType = uri.split('.').pop() || 'jpg';
    
    formDataUpload.append('photo', {
      uri,
      name: `cover.${fileType}`,
      type: `image/${fileType}`
    } as any);

    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/upload-cover`, {
        method: 'POST',
        body: formDataUpload,
        headers: { 'Accept': 'application/json' },
      });
      const result = await response.json();
      if (response.ok && result.photoUrl) {
        setFormData(prev => ({ ...prev, cover_photo: result.photoUrl }));
      } else {
        Alert.alert("Upload Failed", result.error || "Something went wrong.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not connect to the server.");
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleEditCover = () => {
    const options = ["Take Photo", "Choose from Gallery", "Remove Photo", "Cancel"];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status === 'granted') {
              const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.5 });
              if (!res.canceled && res.assets[0]) uploadPhoto(res.assets[0].uri);
            }
          }
          else if (buttonIndex === 1) {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status === 'granted') {
              const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.5 });
              if (!res.canceled && res.assets[0]) uploadPhoto(res.assets[0].uri);
            }
          }
          else if (buttonIndex === 2) setFormData(prev => ({...prev, cover_photo: ''}));
        }
      );
    } else {
      Alert.alert("Cover Photo", "Choose an option", [
        { text: "Take Photo", onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status === 'granted') {
              const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.5 });
              if (!res.canceled && res.assets[0]) uploadPhoto(res.assets[0].uri);
            }
        }},
        { text: "Choose from Gallery", onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status === 'granted') {
              const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.5 });
              if (!res.canceled && res.assets[0]) uploadPhoto(res.assets[0].uri);
            }
        }},
        { text: "Remove Photo", onPress: () => setFormData(prev => ({...prev, cover_photo: ''})), style: "destructive" },
        { text: "Cancel", style: "cancel" }
      ]);
    }
  };

  const handlePostAnnouncement = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/${email}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        Alert.alert("Success", "Announcement posted successfully!");
        setIsModalOpen(false);
        setFormData({ title: '', description: '', type: 'Seminar', target_school_id: 'All', cover_photo: '' });
        fetchData();
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.error || "Failed to post announcement.");
      }
    } catch (error) {
      console.error("Post error:", error);
      Alert.alert("Error", "Network error.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Announcements</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalOpen(true)}>
          <Feather name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={fetchData} />}
      >
        {announcements.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="bullhorn-outline" size={80} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No Announcements</Text>
            <Text style={styles.emptySubtitle}>You haven't posted any announcements yet. Create one to share events with students.</Text>
            <TouchableOpacity style={styles.createFirstBtn} onPress={() => setIsModalOpen(true)}>
              <Text style={styles.createFirstBtnText}>Post Announcement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          announcements.map(ann => (
            <View key={ann.id} style={styles.announcementCard}>
              <View style={styles.annHeader}>
                <Text style={styles.annTitle}>{ann.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: ann.status === 'Active' ? '#DCFCE7' : ann.status === 'Pending' ? '#FEF9C3' : '#FEE2E2' }]}>
                  <Text style={[styles.statusBadgeText, { color: ann.status === 'Active' ? '#16A34A' : ann.status === 'Pending' ? '#CA8A04' : '#EF4444' }]}>{ann.status}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Feather name="tag" size={12} color="#64748B" />
                <Text style={styles.annType}>{ann.type}</Text>
              </View>
              <View style={styles.detailRow}>
                <Feather name="map-pin" size={12} color="#64748B" />
                <Text style={styles.annSchool}>{ann.target_school_id === null ? "All Schools" : schools.find(s => s.id === ann.target_school_id)?.name || ann.target_school_id}</Text>
              </View>
              <View style={styles.annFooter}>
                <Text style={styles.annDate}>Posted {new Date(ann.created_at).toLocaleDateString()}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Post Modal */}
      <Modal visible={isModalOpen} animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsModalOpen(false)}>
                <Feather name="x" size={24} color="#1E293B" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Announcement</Text>
              <TouchableOpacity onPress={handlePostAnnouncement}>
                <Text style={styles.postBtnText}>Post</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Cover Photo (Optional)</Text>
              <TouchableOpacity style={styles.coverUploadBtn} onPress={handleEditCover} disabled={isPhotoUploading}>
                {isPhotoUploading ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : formData.cover_photo ? (
                  <Image source={{ uri: formData.cover_photo }} style={styles.coverPreview} />
                ) : (
                  <>
                    <Feather name="image" size={32} color="#94A3B8" />
                    <Text style={styles.coverUploadText}>Upload Cover Image</Text>
                    <Text style={styles.coverUploadSubtext}>16:9 ratio recommended</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Future Tech Webinar"
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
              />

              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeRow}>
                {['Seminar', 'Webinar', 'Workshop', 'Other'].map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.typeBtn, formData.type === type && styles.typeBtnActive]}
                    onPress={() => setFormData({...formData, type: type})}
                  >
                    <Text style={[styles.typeBtnText, formData.type === type && styles.typeBtnTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Target School</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRowScroll}>
                <TouchableOpacity 
                  style={[styles.typeBtn, formData.target_school_id === 'All' && styles.typeBtnActive]}
                  onPress={() => setFormData({...formData, target_school_id: 'All'})}
                >
                  <Text style={[styles.typeBtnText, formData.target_school_id === 'All' && styles.typeBtnTextActive]}>All Schools</Text>
                </TouchableOpacity>
                {schools.map(school => (
                  <TouchableOpacity 
                    key={school.id} 
                    style={[styles.typeBtn, formData.target_school_id === school.id && styles.typeBtnActive]}
                    onPress={() => setFormData({...formData, target_school_id: school.id})}
                  >
                    <Text style={[styles.typeBtnText, formData.target_school_id === school.id && styles.typeBtnTextActive]}>{school.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Provide details about the announcement..."
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
              />
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  announcementCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#F59E0B' },
  annHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  annTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  annType: { fontSize: 13, color: '#64748B' },
  annSchool: { fontSize: 13, color: '#64748B' },
  annFooter: { marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  annDate: { fontSize: 11, color: '#94A3B8' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20, marginBottom: 30 },
  createFirstBtn: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, elevation: 2 },
  createFirstBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  postBtnText: { color: '#2563EB', fontWeight: 'bold', fontSize: 16 },
  formContent: { padding: 20 },
  coverUploadBtn: { height: 160, backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  coverPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverUploadText: { marginTop: 12, fontSize: 14, fontWeight: '600', color: '#475569' },
  coverUploadSubtext: { marginTop: 4, fontSize: 12, color: '#94A3B8' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1E293B' },
  textArea: { height: 100, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  typeRowScroll: { flexDirection: 'row', marginTop: 4, paddingBottom: 10 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10 },
  typeBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  typeBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  typeBtnTextActive: { color: '#FFF' },
});
