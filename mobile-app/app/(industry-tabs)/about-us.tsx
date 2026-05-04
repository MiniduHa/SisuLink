import React, { useState, useEffect, useCallback } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput
} from "react-native";
import { FontAwesome6, Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

export default function AboutUs() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const email = (params.email as string) || "";

  const [partnerData, setPartnerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [editFormData, setEditFormData] = useState({
    company_name: '',
    industry_type: '',
    phone: '',
    brn: '',
    logo_url: ''
  });

  const fetchProfile = async () => {
    if (!email) return;
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/${email}/dashboard`);
      if (response.ok) {
        const data = await response.json();
        setPartnerData(data.partner);
        setEditFormData({
          company_name: data.partner.company_name,
          industry_type: data.partner.industry_type,
          phone: data.partner.phone || '',
          brn: data.partner.brn,
          logo_url: data.partner.logo_url || ''
        });
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [email])
  );

  const handleUpdateProfile = async () => {
    if (!editFormData.company_name) {
      Alert.alert("Error", "Company Name is required.");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`http://172.20.10.7:5000/api/industry/${email}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        const data = await response.json();
        setPartnerData(data.partner);
        Alert.alert("Success", "Profile updated successfully!");
        setIsEditModalOpen(false);
      } else {
        Alert.alert("Error", "Failed to update profile.");
      }
    } catch (error) {
      console.error("Update profile error:", error);
      Alert.alert("Error", "Network error.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => router.replace("/(auth)/selection") }
    ]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!partnerData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Industry Profile</Text>
        <TouchableOpacity style={styles.editBtnHeader} onPress={() => setIsEditModalOpen(true)}>
          <Feather name="edit-2" size={20} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileCard}>
          <View style={styles.logoContainer}>
            {partnerData.logo_url ? (
              <Image source={{ uri: partnerData.logo_url }} style={styles.logo} />
            ) : (
              <Text style={styles.logoText}>{partnerData.company_name.charAt(0)}</Text>
            )}
          </View>
          <Text style={styles.companyName}>{partnerData.company_name}</Text>
          <Text style={styles.industryType}>{partnerData.industry_type}</Text>
          <View style={[styles.statusBadge, { backgroundColor: partnerData.status === 'Active' ? '#DCFCE7' : '#FEF2F2' }]}>
            <Text style={[styles.statusBadgeText, { color: partnerData.status === 'Active' ? '#16A34A' : '#EF4444' }]}>{partnerData.status}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="mail" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{partnerData.email}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="phone" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Contact Number</Text>
              <Text style={styles.infoValue}>{partnerData.phone || 'Not Provided'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Registration Info</Text>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="hash" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Business Registration Number (BRN)</Text>
              <Text style={styles.infoValue}>{partnerData.brn}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="factory" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Industry Sector</Text>
              <Text style={styles.infoValue}>{partnerData.industry_type}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Feather name="calendar" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Partnership Date</Text>
              <Text style={styles.infoValue}>{new Date(partnerData.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out from Portal</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={isEditModalOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsEditModalOpen(false)}>
              <Feather name="x" size={24} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleUpdateProfile} disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Text style={styles.saveBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContent}>
            <Text style={styles.inputLabel}>Company Name *</Text>
            <TextInput 
              style={styles.input} 
              value={editFormData.company_name}
              onChangeText={(text) => setEditFormData({...editFormData, company_name: text})}
            />

            <Text style={styles.inputLabel}>Industry Type</Text>
            <TextInput 
              style={styles.input} 
              value={editFormData.industry_type}
              onChangeText={(text) => setEditFormData({...editFormData, industry_type: text})}
            />

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="phone-pad"
              value={editFormData.phone}
              onChangeText={(text) => setEditFormData({...editFormData, phone: text})}
            />

            <Text style={styles.inputLabel}>BRN</Text>
            <TextInput 
              style={styles.input} 
              value={editFormData.brn}
              onChangeText={(text) => setEditFormData({...editFormData, brn: text})}
            />

            <Text style={styles.inputLabel}>Logo URL</Text>
            <TextInput 
              style={styles.input} 
              placeholder="https://..."
              value={editFormData.logo_url}
              onChangeText={(text) => setEditFormData({...editFormData, logo_url: text})}
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
  editBtnHeader: { padding: 8 },
  scrollContent: { padding: 20 },
  profileCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 20, elevation: 2 },
  logoContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginBottom: 16, overflow: 'hidden' },
  logo: { width: '100%', height: '100%', resizeMode: 'cover' },
  logoText: { color: '#FFF', fontSize: 40, fontWeight: 'bold' },
  companyName: { fontSize: 22, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  industryType: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold' },
  infoSection: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16, marginTop: 20 },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 },
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  saveBtnText: { color: '#2563EB', fontWeight: 'bold', fontSize: 16 },
  formContent: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 12, fontSize: 15, color: '#1E293B' }
});
