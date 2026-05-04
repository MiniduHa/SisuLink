import React, { useState, useEffect, useCallback } from "react";
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
  Linking,
  Image,
  Platform,
  ActionSheetIOS,
  KeyboardAvoidingView
} from "react-native";
import { FontAwesome6, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ManageJobs() {
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

  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [isApplicantsModalOpen, setIsApplicantsModalOpen] = useState(false);
  const [isFetchingApplicants, setIsFetchingApplicants] = useState(false);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    employment_type: 'Full-time',
    cover_photo: ''
  });

  const fetchJobs = async () => {
    if (!email) return;
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/${email}/jobs`);
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [email])
  );

  const fetchApplicants = async (jobId: number) => {
    setIsFetchingApplicants(true);
    setIsApplicantsModalOpen(true);
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/jobs/${jobId}/applicants`);
      if (response.ok) {
        const data = await response.json();
        setApplicants(data);
      }
    } catch (error) {
      console.error("Failed to fetch applicants:", error);
    } finally {
      setIsFetchingApplicants(false);
    }
  };

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
        headers: {
          'Accept': 'application/json',
        },
      });
      const result = await response.json();
      if (response.ok && result.photoUrl) {
        setFormData(prev => ({ ...prev, cover_photo: result.photoUrl }));
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
      allowsEditing: true, aspect: [16, 9], quality: 0.5
    });
    if (!result.canceled && result.assets[0]) uploadPhoto(result.assets[0].uri);
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert("Permission required", "Gallery access is needed.");
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [16, 9], quality: 0.5
    });
    if (!result.canceled && result.assets[0]) uploadPhoto(result.assets[0].uri);
  };

  const handleEditCover = () => {
    const options = ["Take Photo", "Choose from Gallery", "Remove Photo", "Cancel"];
    const destructiveButtonIndex = 2;
    const cancelButtonIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex, destructiveButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) handleCamera();
          else if (buttonIndex === 1) handleGallery();
          else if (buttonIndex === 2) setFormData(prev => ({...prev, cover_photo: ''}));
        }
      );
    } else {
      Alert.alert("Cover Photo", "Choose an option", [
        { text: "Take Photo", onPress: handleCamera },
        { text: "Choose from Gallery", onPress: handleGallery },
        { text: "Remove Photo", onPress: () => setFormData(prev => ({...prev, cover_photo: ''})), style: "destructive" },
        { text: "Cancel", style: "cancel" }
      ]);
    }
  };

  const handlePostJob = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert("Error", "Please fill in all required fields.");
      return;
    }

    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/${email}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        Alert.alert("Success", "Job posted successfully!");
        setIsModalOpen(false);
        setFormData({ title: '', description: '', requirements: '', location: '', employment_type: 'Full-time', cover_photo: '' });
        fetchJobs();
      } else {
        const errorData = await response.json();
        Alert.alert("Error", errorData.error || "Failed to post job.");
      }
    } catch (error) {
      console.error("Post job error:", error);
      Alert.alert("Error", "Network error.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setIsModalOpen(true)}>
          <Feather name="plus" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={fetchJobs} />}
      >
        {jobs.length === 0 && !isLoading ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <MaterialCommunityIcons name="briefcase-off-outline" size={80} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No job posts still</Text>
            <Text style={styles.emptySubtitle}>You haven't posted any internships yet. Your active opportunities will appear here once you create them.</Text>
            <TouchableOpacity style={styles.createFirstBtn} onPress={() => setIsModalOpen(true)}>
              <Text style={styles.createFirstBtnText}>Post Your First Job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          jobs.map(job => (
            <TouchableOpacity 
              key={job.id} 
              style={styles.jobCard}
              onPress={() => {
                setSelectedJob(job);
                fetchApplicants(job.id);
              }}
            >
              <View style={styles.jobHeader}>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: job.status === 'Active' ? '#DCFCE7' : '#F1F5F9' }]}>
                  <Text style={[styles.statusBadgeText, { color: job.status === 'Active' ? '#16A34A' : '#64748B' }]}>{job.status}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Feather name="map-pin" size={12} color="#64748B" />
                <Text style={styles.jobLocation}>{job.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Feather name="clock" size={12} color="#64748B" />
                <Text style={styles.jobType}>{job.employment_type}</Text>
              </View>
              <View style={styles.jobFooter}>
                <Text style={styles.jobDate}>Posted {new Date(job.created_at).toLocaleDateString()}</Text>
                <View style={styles.applicantLink}>
                  <Text style={styles.applicantLinkText}>View Applicants</Text>
                  <Feather name="chevron-right" size={14} color="#2563EB" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Applicants Modal */}
      <Modal visible={isApplicantsModalOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsApplicantsModalOpen(false)}>
              <Feather name="chevron-left" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Applicants</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.jobSummaryHeader}>
            <Text style={styles.summaryTitle}>{selectedJob?.title}</Text>
            <Text style={styles.summaryLocation}>{selectedJob?.location}</Text>
          </View>

          <ScrollView style={styles.applicantList}>
            {isFetchingApplicants ? (
              <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
            ) : applicants.length === 0 ? (
              <View style={styles.noApplicants}>
                <Feather name="users" size={48} color="#CBD5E1" />
                <Text style={styles.noApplicantsText}>No applications received for this post yet.</Text>
              </View>
            ) : (
              applicants.map(app => (
                <View key={app.id} style={styles.applicantCard}>
                  <View style={styles.applicantInfo}>
                    <View style={styles.avatarCircle}>
                      <Text style={styles.avatarText}>{app.student_name.charAt(0)}</Text>
                    </View>
                    <View>
                      <Text style={styles.applicantName}>{app.student_name}</Text>
                      <Text style={styles.applicantEmail}>{app.student_email}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.cvBtn} 
                    onPress={() => app.cv_url ? Linking.openURL(app.cv_url) : Alert.alert("Not Found", "CV not uploaded.")}
                  >
                    <Feather name="file-text" size={16} color="#2563EB" />
                    <Text style={styles.cvBtnText}>View CV</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
              <Text style={styles.modalTitle}>Post New Job</Text>
              <TouchableOpacity onPress={handlePostJob}>
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

              <Text style={styles.inputLabel}>Job Title *</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Software Engineering Intern"
                value={formData.title}
                onChangeText={(text) => setFormData({...formData, title: text})}
              />

              <Text style={styles.inputLabel}>Location</Text>
              <TextInput 
                style={styles.input} 
                placeholder="e.g. Colombo, Remote"
                value={formData.location}
                onChangeText={(text) => setFormData({...formData, location: text})}
              />

              <Text style={styles.inputLabel}>Employment Type</Text>
              <View style={styles.typeRow}>
                {['Full-time', 'Part-time', 'Internship', 'Contract'].map(type => (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.typeBtn, formData.employment_type === type && styles.typeBtnActive]}
                    onPress={() => setFormData({...formData, employment_type: type})}
                  >
                    <Text style={[styles.typeBtnText, formData.employment_type === type && styles.typeBtnTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Describe the role and responsibilities..."
                multiline
                numberOfLines={4}
                value={formData.description}
                onChangeText={(text) => setFormData({...formData, description: text})}
              />

              <Text style={styles.inputLabel}>Requirements</Text>
              <TextInput 
                style={[styles.input, styles.textArea]} 
                placeholder="Key skills and qualifications..."
                multiline
                numberOfLines={4}
                value={formData.requirements}
                onChangeText={(text) => setFormData({...formData, requirements: text})}
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
  jobCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#2563EB' },
  jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  jobTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', flex: 1, marginRight: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: 'bold' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  jobLocation: { fontSize: 13, color: '#64748B' },
  jobType: { fontSize: 13, color: '#64748B' },
  jobDate: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 20, color: '#64748B', textAlign: 'center', paddingHorizontal: 40 },
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
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  typeBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  typeBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  typeBtnTextActive: { color: '#FFF' },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginBottom: 10 },
  emptySubtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 40, lineHeight: 20, marginBottom: 30 },
  createFirstBtn: { backgroundColor: '#2563EB', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, elevation: 2 },
  createFirstBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
  applicantLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  applicantLinkText: { fontSize: 12, fontWeight: 'bold', color: '#2563EB' },
  jobSummaryHeader: { padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  summaryTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  summaryLocation: { fontSize: 13, color: '#64748B', marginTop: 2 },
  applicantList: { flex: 1, padding: 20 },
  noApplicants: { alignItems: 'center', marginTop: 100 },
  noApplicantsText: { marginTop: 20, color: '#64748B', fontSize: 14 },
  applicantCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
  applicantInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#2563EB', fontSize: 18, fontWeight: 'bold' },
  applicantName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  applicantEmail: { fontSize: 12, color: '#64748B' },
  cvBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  cvBtnText: { fontSize: 12, fontWeight: '600', color: '#2563EB' }
});
