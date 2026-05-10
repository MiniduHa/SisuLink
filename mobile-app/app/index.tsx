import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

export default function LoadingScreen() {
  const [progress, setProgress] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            router.replace("/selection"); 
          }, 300);
          return 100;
        }
        return prev + 1;
      });
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Centered Logo & Text */}
      <View style={styles.centerContent}>
        <Image 
          source={require("../assets/images/mainlogo.png")} 
          style={{ width: 120, height: 120, marginBottom: 20 }} 
          resizeMode="contain" 
        />
        <Text style={styles.appName}>
          <Text style={{ color: "#1E40AF" }}>Sisu</Text>
          <Text style={{ color: "#3B82F6" }}>Link</Text>
        </Text>
        <Text style={styles.subHeading}>Empowering education through collaboration</Text>
      </View>

      {/* Loading Bar */}
      <View style={styles.loadingContainer}>
        <View style={styles.loadingHeader}>
          <Text style={styles.initializingText}>INITIALIZING</Text>
          <Text style={styles.percentageText}>{progress}%</Text>
        </View>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center", paddingHorizontal: 24 },
  centerContent: { alignItems: "center" },
  appName: { fontSize: 36, fontWeight: "900", textAlign: "center" },
  subHeading: { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 8, maxWidth: 260 },
  loadingContainer: { position: "absolute", bottom: 80, width: width - 48 },
  loadingHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  initializingText: { fontSize: 12, color: "#94A3B8", fontWeight: "600" },
  percentageText: { fontSize: 12, color: "#2B8CEE", fontWeight: "600" },
  progressBarBackground: { height: 8, width: "100%", backgroundColor: "#E2E8F0", borderRadius: 8, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#2B8CEE" },
});
