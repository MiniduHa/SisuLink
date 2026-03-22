import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Dimensions, 
  Alert, 
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView // Added ScrollView
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { height } = Dimensions.get("window");
const API_URL = "http://172.20.10.7:5000/api/auth/login";

export default function StudentLoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter both email and password.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password: password }),
      });
      const data = await response.json();
      if (response.ok) {
        
        router.replace({
          pathname: "/(student-tabs)/student-screen",
          params: { 
            first_name: data.student.first_name, 
            last_name: data.student.last_name,
            grade: data.student.grade_level,
            email: data.student.email,      
            studentId: data.student.studentId 
          }
        });
      } else {
        Alert.alert("Login Failed", data.error || "Invalid credentials");
      }
    } catch (error) {
      Alert.alert("Network Error", "Check your backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: "#2B8CEE" }}>
        {/* We use KeyboardAvoidingView to push the content up */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={{ flex: 1 }}
          // keyboardVerticalOffset is the "secret sauce" - adjust this number 
          // if the password field is still slightly covered.
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : -100} 
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }} 
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top Blue Section */}
            <View style={styles.topSection}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <FontAwesome6 name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <FontAwesome6 name="graduation-cap" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.appName}>School Connect</Text>
              <Text style={styles.tagline}>Connecting Education, Empowering Futures</Text>
            </View>

            {/* Bottom White Card Section */}
            <View style={styles.bottomCard}>
              <Text style={styles.welcomeText}>Welcome back</Text>
              <Text style={styles.subtitleText}>Sign in to your account</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon} 
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-outline" : "eye-off-outline"} 
                      size={22} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.signInButton, isLoading && { opacity: 0.7 }]} 
                onPress={handleLogin} 
                activeOpacity={0.8}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.signInButtonText}>Log In</Text>}
              </TouchableOpacity>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>New here? </Text>
                <TouchableOpacity onPress={() => router.push("/signup")}>
                  <Text style={styles.createAccountText}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2B8CEE" },
  topSection: { 
    height: height * 0.35, 
    minHeight: 250, 
    justifyContent: "center", 
    alignItems: "center", 
    paddingHorizontal: 24 
  },
  backButton: { position: "absolute", top: 50, left: 24, padding: 8 },
  logoContainer: { width: 70, height: 70, backgroundColor: "rgba(255, 255, 255, 0.2)", borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 16, marginTop: 20 },
  appName: { fontSize: 28, fontWeight: "bold", color: "#FFFFFF", marginBottom: 8 },
  tagline: { fontSize: 12, color: "#E0F2FE", fontWeight: "500" },
  bottomCard: { 
    flex: 1, 
    backgroundColor: "#FFFFFF", 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    paddingHorizontal: 28, 
    paddingTop: 40,
    paddingBottom: 40 
  },
  welcomeText: { fontSize: 24, fontWeight: "bold", color: "#1E293B", marginBottom: 8 },
  subtitleText: { fontSize: 14, color: "#64748B", marginBottom: 30 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 8 },
  input: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 16, fontSize: 15, color: "#1E293B" },
  passwordContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12 },
  passwordInput: { flex: 1, padding: 16, fontSize: 15, color: "#1E293B" },
  eyeIcon: { padding: 16 },
  forgotPassword: { alignSelf: "flex-end", marginBottom: 24 },
  forgotPasswordText: { color: "#2563EB", fontSize: 13, fontWeight: "600" },
  signInButton: { backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginBottom: 30, shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  signInButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  footerRow: { flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 14, color: "#64748B" },
  createAccountText: { fontSize: 14, color: "#2563EB", fontWeight: "bold" },
});