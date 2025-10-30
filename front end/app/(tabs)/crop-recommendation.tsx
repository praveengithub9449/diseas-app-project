import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_BASE_URL = "http://10.170.35.248:5000";

interface CropPrediction {
  crop: string;
  confidence: number;
  info: string;
}

export default function CropRecommendation() {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [predictions, setPredictions] = useState<CropPrediction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      let location = await Location.getCurrentPositionAsync({});
      setLat(location.coords.latitude.toString());
      setLon(location.coords.longitude.toString());
      handlePredict(location.coords.latitude, location.coords.longitude);
    })();
  }, []);

  const handlePredict = async (latitude?: number, longitude?: number) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/predict-crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: latitude || parseFloat(lat),
          longitude: longitude || parseFloat(lon),
        }),
      });
      const data = await response.json();
      const predictedCrops: CropPrediction[] = data.predictions || [];
      setPredictions(predictedCrops);

      // --- Update Profile Stats in AsyncStorage ---
      const prevTotalCrops = parseInt((await AsyncStorage.getItem("totalCrops")) || "0");
      const newTotalCrops = prevTotalCrops + predictedCrops.length;
      await AsyncStorage.setItem("totalCrops", newTotalCrops.toString());

      // Update favorite crop count
      let favName = (await AsyncStorage.getItem("favoriteCropName")) || "Rice";
      let favCount = parseInt((await AsyncStorage.getItem("favoriteCropCount")) || "0");

      predictedCrops.forEach(pred => {
        if (pred.crop === favName) favCount++;
        else if (favCount === 0) {
          favName = pred.crop;
          favCount = 1;
        }
      });

      await AsyncStorage.setItem("favoriteCropName", favName);
      await AsyncStorage.setItem("favoriteCropCount", favCount.toString());
    } catch (err) {
      console.error(err);
      setPredictions([]);
    }
    setLoading(false);
  };

  return (
    <LinearGradient colors={["#e8f5e9", "#ffffff"]} style={styles.container}>
      <LinearGradient colors={["#43a047", "#2e7d32"]} style={styles.header}>
        <Text style={styles.headerTitle}>🌱👨‍🌾 ಕೃಷಿಮಿತ್ರ</Text>
        <Text style={styles.headerTitle}>Smart Crop Recommender</Text>
        <Text style={styles.headerSubtitle}>
          Enter your farm’s location to get AI-powered crop suggestions
        </Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="📍 Enter Latitude"
          keyboardType="numeric"
          value={lat}
          onChangeText={setLat}
        />
        <TextInput
          style={styles.input}
          placeholder="📍 Enter Longitude"
          keyboardType="numeric"
          value={lon}
          onChangeText={setLon}
        />

        <TouchableOpacity style={styles.button} onPress={() => handlePredict()}>
          <LinearGradient colors={["#66bb6a", "#388e3c"]} style={styles.buttonBg}>
            <Text style={styles.buttonText}>🚀 Predict Crops</Text>
          </LinearGradient>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2e7d32" />
            <Text style={styles.loadingText}>Analyzing your location…</Text>
          </View>
        )}

        {predictions.length > 0 && (
          <View style={styles.cardsContainer}>
            {predictions.map((item, idx) => (
              <LinearGradient
                key={idx}
                colors={["#ffffff", "#f1f8e9"]}
                style={styles.card}
              >
                <MaterialCommunityIcons
                  name="sprout"
                  size={30}
                  color="#2e7d32"
                  style={styles.cardIcon}
                />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>
                    {item.crop.charAt(0).toUpperCase() + item.crop.slice(1)} ({item.confidence.toFixed(2)}%)
                  </Text>
                  <Text style={styles.cardDesc}>
                    🌾 Recommended crop #{idx + 1} with {item.confidence.toFixed(2)}% confidence
                  </Text>
                  <Text style={styles.cardInfo}>{item.info}</Text>
                </View>
              </LinearGradient>
            ))}
          </View>
        )}

        <Text style={styles.footerEmoji}>🌾</Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f8ff" },
  header: { paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, elevation: 8 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 14, color: "#e8f5e9", marginTop: 8 },
  content: { padding: 20, alignItems: "center" },
  input: { borderWidth: 0, backgroundColor: "#fff", padding: 12, marginBottom: 15, borderRadius: 12, width: "100%", fontSize: 16, elevation: 2 },
  button: { width: "100%", borderRadius: 12, overflow: "hidden", marginTop: 5 },
  buttonBg: { paddingVertical: 15, borderRadius: 12, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  loadingBox: { marginTop: 25, alignItems: "center" },
  loadingText: { marginTop: 10, fontStyle: "italic", color: "#555" },
  cardsContainer: { marginTop: 30, width: "100%" },
  card: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 18, elevation: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8 },
  cardIcon: { marginRight: 15, marginTop: 5 },
  cardContent: { flexShrink: 1 },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#1b5e20" },
  cardDesc: { fontSize: 14, color: "#555", marginTop: 4 },
  cardInfo: { fontSize: 13, color: "#333", marginTop: 10, lineHeight: 20 },
  footerEmoji: { fontSize: 40, marginTop: 20, textAlign: "center" },
});
