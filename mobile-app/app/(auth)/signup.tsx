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


const API_URL = "http://172.20.10.7:5000/api/auth/register";

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

const CustomCheckbox = ({ label, isChecked, onChange }: any) => (
  <TouchableOpacity style={styles.checkboxContainer} onPress={() => onChange(!isChecked)} activeOpacity={0.8}>
    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
      {isChecked && <FontAwesome6 name="check" size={12} color="#FFFFFF" />}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);



export default function SignupScreen() {
  const router = useRouter();
  
  const [role, setRole] = useState("Student");
  const roles = ["Student", "Parent", "Teacher", "Industry"];

  // Name States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [studentId, setStudentId] = useState("");
  const [grade, setGrade] = useState("");
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("");
  const [medium, setMedium] = useState("");
  
  const [companyName, setCompanyName] = useState("");
  const [brn, setBrn] = useState("");
  const [industryType, setIndustryType] = useState("");
  
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);


  const [childIds, setChildIds] = useState<string[]>([""]);

  const updateChildId = (text: string, index: number) => {
    const newIds = [...childIds];
    newIds[index] = text;
    setChildIds(newIds);
  };

  const addChildId = () => {
    setChildIds([...childIds, ""]);
  };

  const removeChildId = (index: number) => {
    const newIds = childIds.filter((_, i) => i !== index);
    setChildIds(newIds);
  };

  const handleCreateAccount = async () => {
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match!");
      return;
    }

    // Allow both Student and Parent to proceed
    if (role !== "Student" && role !== "Parent") {
      Alert.alert("Coming Soon", `Registration for ${role} is currently being developed.`);
      return;
    }

    setIsLoading(true);

    try {
      // 1. Build the base data that everyone has
      let payload: any = {
        role: role,
        email: email.toLowerCase().trim(),
        password: password,
      };

      
      if (role === "Student") {
        payload.first_name = firstName;
        payload.last_name = lastName;
        payload.grade_level = grade;
        payload.index_number = studentId;
      } else if (role === "Parent") {
        payload.full_name = fullName;
        payload.phone_number = phone;
       
        payload.child_student_ids = childIds.filter(id => id.trim() !== "");
      }

      
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success!", data.message, [
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

        
        {role === "Student" && (
          <>
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

        {role === "Parent" && (
          <>
            <CustomInput label="Full Name" placeholder="Enter your full name" value={fullName} onChangeText={setFullName} />
            <CustomInput label="Email Address" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <CustomInput label="Phone Number" placeholder="e.g. +94 77 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            
            
            <View style={styles.dynamicListContainer}>
              {childIds.map((id, index) => (
                <View key={index} style={styles.dynamicRow}>
                  <View style={{ flex: 1 }}>
                    <CustomInput 
                      label={childIds.length > 1 ? `Child ${index + 1} Student ID` : "Child's Student ID"} 
                      placeholder="Enter Student ID" 
                      value={id} 
                      onChangeText={(text: string) => updateChildId(text, index)} 
                    />
                  </View>
                  
                  {index > 0 && (
                    <TouchableOpacity style={styles.removeButton} onPress={() => removeChildId(index)}>
                      <FontAwesome6 name="trash-can" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              
              <TouchableOpacity style={styles.addButton} onPress={addChildId}>
                <FontAwesome6 name="plus" size={14} color="#2563EB" />
                <Text style={styles.addButtonText}>Add another child</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {role === "Teacher" && (
          <>
            <CustomInput label="Full Name" placeholder="Enter your full name" value={fullName} onChangeText={setFullName} />
            <CustomInput label="Email Address" placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <CustomInput label="Phone Number" placeholder="e.g. +94 77 123 4567" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <CustomInput label="Staff ID" placeholder="Enter your Staff ID" value={staffId} onChangeText={setStaffId} />
            <CustomDropdown label="Department" value={department} options={["O/L", "Science Stream", "Commerce Stream", "Technology Stream"]} onSelect={setDepartment} />
            <CustomDropdown label="Medium" value={medium} options={["English", "Sinhala", "Tamil"]} onSelect={setMedium} />
            <CustomInput label="School Name" placeholder="Enter your School" value={school} onChangeText={setSchool} />
          </>
        )}

        {role === "Industry" && (
          <>
            <CustomInput label="Company Name" placeholder="Enter company name" value={companyName} onChangeText={setCompanyName} />
            <CustomInput label="Business Registration Number" placeholder="Enter BRN" value={brn} onChangeText={setBrn} />
            <CustomDropdown label="Industry Type" value={industryType} options={["Technology", "Healthcare", "Finance", "Education", "Manufacturing", "Other"]} onSelect={setIndustryType} />
            <CustomInput label="HR Contact Number" placeholder="Enter HR phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <CustomInput label="Company Email" placeholder="company@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </>
        )}

        {/* Shared Passwords Fields */}
        <CustomInput label="Create Password" placeholder="••••••••" value={password} onChangeText={setPassword} secureTextEntry />
        <CustomInput label="Confirm Password" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />

        {/* Conditional Checkboxes */}
        {role === "Teacher" && (
          <CustomCheckbox label="I agree to the School IT Policy and Terms of Service" isChecked={agreeTerms} onChange={setAgreeTerms} />
        )}

        {role === "Industry" && (
          <CustomCheckbox label="I agree to the IT Policy and Terms of Service" isChecked={agreeTerms} onChange={setAgreeTerms} />
        )}

        {/* Shared Buttons */}
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
  
  // Dynamic List Styles
  dynamicListContainer: { marginBottom: 8 },
  dynamicRow: { flexDirection: "row", alignItems: "flex-start" },
  removeButton: { padding: 16, backgroundColor: "#FEF2F2", borderRadius: 12, justifyContent: "center", alignItems: "center", marginLeft: 12, marginTop: 22, borderWidth: 1, borderColor: "#FECACA" },
  addButton: { flexDirection: "row", alignItems: "center", paddingVertical: 8, marginBottom: 16 },
  addButtonText: { color: "#2563EB", fontSize: 14, fontWeight: "600", marginLeft: 8 },

  checkboxContainer: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginTop: 4 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: "#CBD5E1", justifyContent: "center", alignItems: "center", marginRight: 10 },
  checkboxChecked: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  checkboxLabel: { fontSize: 13, color: "#475569", flex: 1 },
  createButton: { backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 10 },
  createButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  loginRow: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  loginText: { fontSize: 14, color: "#64748B" },
  loginLink: { fontSize: 14, color: "#2563EB", fontWeight: "bold" },
});