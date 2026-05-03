import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert
} from "react-native";
import { FontAwesome6, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function IndustryProfile() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const email = (params.email as string) || "";

  const [partnerData, setPartnerData] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!email) return;
      try {
        const response = await fetch(`http://172.20.10.7:5000/api/industry/${email}/dashboard`);
        if (response.ok) {
          const data = await response.json();
          setPartnerData(data.partner);
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
      }
    };
    fetchProfile();
  }, [email]);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => router.replace("/(auth)/selection") }
    ]);
  };

  if (!partnerData) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Company Profile</Text>
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
            <Feather name="mail" size={18} color="#2563EB" />
            <View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{partnerData.email}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Feather name="phone" size={18} color="#2563EB" />
            <View>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{partnerData.phone || 'Not Provided'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Business Info</Text>
          <View style={styles.infoRow}>
            <Feather name="hash" size={18} color="#2563EB" />
            <View>
              <Text style={styles.infoLabel}>BRN (Business Registration Number)</Text>
              <Text style={styles.infoValue}>{partnerData.brn}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
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
  infoLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#1E293B' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, backgroundColor: '#FEF2F2', borderRadius: 16, marginTop: 20 },
  logoutText: { color: '#EF4444', fontWeight: 'bold', fontSize: 16 }
});
