import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Alert, 
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

const { height } = Dimensions.get("window");

// Make sure this matches your actual backend IP
const API_BASE = "http://172.20.10.7:5000/api/auth"; 

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams(); // Captures "Student", "Parent", etc.
  
  const [step, setStep] = useState<1 | 2 | 3>(1); 
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 1: Request the Code
  const handleSendCode = async () => {
    if (!email) return Alert.alert("Error", "Please enter your email address.");
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), role }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep(2); // Move to OTP step
      } else {
        Alert.alert("Error", data.error || "Failed to send code.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Check your backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify the Code
  const handleVerifyCode = async () => {
    if (otpCode.length !== 6) return Alert.alert("Error", "Please enter the 6-digit code.");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim(), otp: otpCode }),
      });
      const data = await response.json();

      if (response.ok) {
        setStep(3); // Move to New Password step
      } else {
        Alert.alert("Invalid Code", data.error || "The code you entered is incorrect.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Check your backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      return Alert.alert("Error", "Passwords do not match.");
    }
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.toLowerCase().trim(), 
          role, 
          newPassword 
        }),
      });
      const data = await response.json();

      if (response.ok) {
        Alert.alert("Success!", "Your password has been reset successfully.", [
          { text: "Log In", onPress: () => router.back() }
        ]);
      } else {
        Alert.alert("Error", data.error || "Failed to reset password.");
      }
    } catch (error) {
      Alert.alert("Network Error", "Check your backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={{ flex: 1 }}
        >
          {/* Top Section */}
          <View style={styles.topSection}>
            <TouchableOpacity style={styles.backButton} onPress={() => step > 1 ? setStep((prev) => (prev - 1) as 1 | 2 | 3) : router.back()}>
              <FontAwesome6 name="arrow-left" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <FontAwesome6 name={step === 1 ? "envelope" : step === 2 ? "shield-halved" : "lock"} size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>
              {step === 1 ? "Forgot Password" : step === 2 ? "Verify Code" : "New Password"}
            </Text>
            <Text style={styles.tagline}>
              {step === 1 ? "Enter your email to receive a reset code." : 
               step === 2 ? `We sent a 6-digit code to ${email}` : 
               "Create a strong, new password."}
            </Text>
          </View>

          {/* Bottom Card */}
          <View style={styles.bottomCard}>
            
            {/* --- STEP 1: EMAIL --- */}
            {step === 1 && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your registered email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <TouchableOpacity style={[styles.mainButton, isLoading && { opacity: 0.7 }]} onPress={handleSendCode} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.mainButtonText}>Send Reset Code</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* --- STEP 2: OTP CODE --- */}
            {step === 2 && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>6-Digit Code</Text>
                  <TextInput
                    // MOVED fontSize and letterSpacing INTO THE STYLE PROP HERE 👇
                    style={[styles.input, { fontSize: 24, letterSpacing: 8 }]} 
                    placeholder="• • • • • •"
                    placeholderTextColor="#9CA3AF"
                    value={otpCode}
                    onChangeText={setOtpCode}
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                  />
                </View>
                <TouchableOpacity style={[styles.mainButton, isLoading && { opacity: 0.7 }]} onPress={handleVerifyCode} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.mainButtonText}>Verify Code</Text>}
                </TouchableOpacity>
              </View>
            )}

            {/* --- STEP 3: NEW PASSWORD --- */}
            {step === 3 && (
              <View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter new password"
                      placeholderTextColor="#9CA3AF"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>

                <TouchableOpacity style={[styles.mainButton, isLoading && { opacity: 0.7 }]} onPress={handleResetPassword} disabled={isLoading}>
                  {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.mainButtonText}>Update Password</Text>}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#2B8CEE" },
  topSection: { height: height * 0.35, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  backButton: { position: "absolute", top: 50, left: 24, padding: 8 },
  logoContainer: { width: 70, height: 70, backgroundColor: "rgba(255, 255, 255, 0.2)", borderRadius: 20, justifyContent: "center", alignItems: "center", marginBottom: 16, marginTop: 20 },
  appName: { fontSize: 24, fontWeight: "bold", color: "#FFFFFF", marginBottom: 8 },
  tagline: { fontSize: 13, color: "#E0F2FE", fontWeight: "500", textAlign: "center", paddingHorizontal: 20 },
  bottomCard: { flex: 1, backgroundColor: "#FFFFFF", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 28, paddingTop: 40 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 8 },
  input: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 16, fontSize: 15, color: "#1E293B" },
  passwordContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 12 },
  passwordInput: { flex: 1, padding: 16, fontSize: 15, color: "#1E293B" },
  eyeIcon: { padding: 16 },
  mainButton: { backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 10, shadowColor: "#2563EB", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  mainButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});