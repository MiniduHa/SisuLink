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
  Alert
} from "react-native";
import { FontAwesome6, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useFocusEffect } from "expo-router";

export default function ManageJobs() {
  const params = useLocalSearchParams();
  const email = (params.email as string) || "";

  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    location: '',
    employment_type: 'Full-time'
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
        setFormData({ title: '', description: '', requirements: '', location: '', employment_type: 'Full-time' });
        fetchJobs();
      } else {
        Alert.alert("Error", "Failed to post job.");
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
        {isLoading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="briefcase-search" size={64} color="#CBD5E1" />
            <Text style={styles.emptyText}>No job postings yet. Start by clicking the '+' button.</Text>
          </View>
        ) : (
          jobs.map(job => (
            <View key={job.id} style={styles.jobCard}>
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
              <Text style={styles.jobDate}>Posted on {new Date(job.created_at).toLocaleDateString()}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* Post Job Modal */}
      <Modal visible={isModalOpen} animationType="slide">
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

          <ScrollView style={styles.formContent}>
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
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1E293B' },
  textArea: { height: 100, textAlignVertical: 'top' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  typeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
  typeBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  typeBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  typeBtnTextActive: { color: '#FFF' }
});
