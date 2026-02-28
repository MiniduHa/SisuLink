import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  Alert 
} from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// --- 1. CONSTANTS ---
const API_URL = "http://172.20.10.7:5000/api/auth/register";

// --- 2. REUSABLE UI COMPONENTS ---

const CustomInput = ({ label, ...props }: any) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={styles.input}
      placeholderTextColor="#9CA3AF"
      {...props}
    />
  </View>
);

const CustomDropdown = ({ label, value, options, onSelect }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity 
        style={styles.dropdownHeader} 
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.8}
      >
        <Text style={[styles.dropdownHeaderText, !value && { color: "#9CA3AF" }]}>
          {value || `Select ${label}`}
        </Text>
        <FontAwesome6 name={isOpen ? "chevron-up" : "chevron-down"} size={14} color="#64748B" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownList}>
          {options.map((opt: string) => (
            <TouchableOpacity 
              key={opt} 
              style={styles.dropdownItem} 
              onPress={() => {
                onSelect(opt);
                setIsOpen(false);
              }}
            >
              <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// --- 3. MAIN SIGNUP SCREEN ---

export default function SignupScreen() {
  const router = useRouter();
  
  const [role, setRole] = useState("Student");
  const roles = ["Student", "Parent", "Teacher", "Industry"];

  // New Split Name State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [studentId, setStudentId] = useState("");
  const [childStudentId, setChildStudentId] = useState("");
  const [grade, setGrade] = useState("");
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("");
  const [medium, setMedium] = useState("");
  
  const [companyName, setCompanyName] = useState("");
  const [brn, setBrn] = useState("");
  const [industryType, setIndustryType] = useState("");
  
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateAccount = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    if (role !== "Student") {
      Alert.alert("Coming Soon", `Registration for ${role} is currently being developed.`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email: email.toLowerCase(),
          password: password,
          grade_level: grade,
          index_number: studentId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success! 🎉", data.message, [
          { text: "OK", onPress: () => router.push("/selection") }
        ]);
      } else {
        Alert.alert("Failed", data.error || "Something went wrong.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Is your backend server running on port 5000?");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={20} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Account</Text>
        </View>

        <Text style={styles.title}>{role} Sign Up</Text>
        <Text style={styles.subtitle}>Fill in your information to get started</Text>

        <CustomDropdown 
          label="Select your role" 
          value={role} 
          options={roles} 
          onSelect={(selectedRole: string) => {
            setRole(selectedRole);
            setAgreeTerms(false);
          }} 
        />

        {/* --- DYNAMIC FIELDS --- */}
        {role === "Student" && (
          <>
            {/* Split Name Fields */}
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <CustomInput label="First Name" placeholder="John" value={firstName} onChangeText={setFirstName} />
              </View>
              <View style={styles.halfInput}>
                <CustomInput label="Last Name" placeholder="Doe" value={lastName} onChangeText={setLastName} />
              </View>
            </View>
            
            <CustomInput label="Email Address" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <CustomInput label="Student ID / Index" placeholder="Enter your ID" value={studentId} onChangeText={setStudentId} />
            <CustomInput label="Grade" placeholder="e.g. Grade 10" value={grade} onChangeText={setGrade} />
            <CustomInput label="School Name" placeholder="Enter your School" value={school} onChangeText={setSchool} />
          </>
        )}

        {/* ... Other roles follow the same pattern if needed ... */}

        <CustomInput label="Create Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
        <CustomInput label="Confirm Password" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        <TouchableOpacity 
          style={[styles.createButton, isLoading && { opacity: 0.7 }]} 
          onPress={handleCreateAccount} 
          disabled={isLoading}
        >
          <Text style={styles.createButtonText}>{isLoading ? "Processing..." : "Create Account"}</Text>
        </TouchableOpacity>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/selection")}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  scrollContent: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 30 },
  backButton: { paddingRight: 16, paddingVertical: 8 },
  headerTitle: { fontSize: 16, fontWeight: "bold", color: "#1E293B" },
  title: { fontSize: 24, fontWeight: "bold", color: "#1E293B", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B", marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 0.48 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 8 },
  input: { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 16, fontSize: 14, color: "#1E293B" },
  dropdownHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, padding: 16 },
  dropdownHeaderText: { fontSize: 14, color: "#1E293B", fontWeight: "500" },
  dropdownList: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, marginTop: 4, paddingVertical: 8, elevation: 2 },
  dropdownItem: { paddingVertical: 12, paddingHorizontal: 16 },
  dropdownItemText: { fontSize: 14, color: "#64748B" },
  dropdownItemActive: { color: "#2563EB", fontWeight: "bold" },
  createButton: { backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 10 },
  createButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  loginText: { fontSize: 14, color: "#64748B" },
  loginLink: { fontSize: 14, color: "#2563EB", fontWeight: "bold" },
});