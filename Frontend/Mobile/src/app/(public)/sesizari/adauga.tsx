import React, { useState } from "react";
import { 
  View, 
  Text, 
  Pressable, 
  useColorScheme, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView 
} from "react-native";
import { useRouter } from "expo-router";
import { Colors, Fonts, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import MockData from "@/constants/mock-data.json";
import { getTodayRomanianDate } from "@/utils/date";
import { Image } from "expo-image";
import XIcon from "@/assets/icons/svg/x.svg";
import * as ImagePicker from "expo-image-picker";

const BUILDINGS = Array.from(new Set(MockData.buildings.map((b) => b.name)));

export default function AdaugaSesizareScreen() {
  const router = useRouter();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(BUILDINGS[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({});

  const validate = () => {
    const newErrors: { title?: string; description?: string } = {};
    if (!title.trim()) {
      newErrors.title = "Titlul este obligatoriu.";
    }
    if (!description.trim()) {
      newErrors.description = "Descrierea este obligatorie.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert("Permisiunea de acces la fotografii este necesară pentru a adăuga poze!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3 - photos.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map(asset => asset.uri);
      setPhotos([...photos, ...selectedUris].slice(0, 3));
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, idx) => idx !== index));
  };

  const handleSubmit = () => {
    if (validate()) {
      const newReport = {
        id: String(Date.now()),
        title: title.trim(),
        description: description.trim(),
        category: "General",
        location,
        status: "active" as const,
        date: getTodayRomanianDate(),
        isUserReport: true,
        image: photos[0] || "https://campus.ugal.ro/ccps/wp-content/uploads/photo-gallery/DJI_0238.jpg?bwg=1639133115",
        images: photos.length > 0 ? photos : ["https://campus.ugal.ro/ccps/wp-content/uploads/photo-gallery/DJI_0238.jpg?bwg=1639133115"]
      };

      MockData.reports.unshift(newReport as any);
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: Spacing.lg, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: Spacing.lg }}>
          
          <View style={{ gap: Spacing.xs }}>
            <Text style={[Typography.Heading5, { color: theme.text }]}>Clădire (Locație)</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: Spacing.sm, marginTop: Spacing.xs }}>
              {BUILDINGS.map((bldg) => {
                const isSelected = location === bldg;
                return (
                  <Pressable
                    key={bldg}
                    onPress={() => setLocation(bldg)}
                    style={{ 
                      paddingHorizontal: Spacing.lg,
                      paddingVertical: Spacing.sm,
                      borderRadius: Spacing.lg,
                      backgroundColor: isSelected ? theme.primary : (themeName === "light" ? "#F1F3F5" : "#2D2D2D"),
                    }}
                  >
                    <Text 
                      style={{ 
                        fontSize: 14,
                        fontFamily: Fonts?.sans || "normal",
                        color: isSelected ? "white" : theme.text,
                        fontWeight: isSelected ? "600" : "400"
                      }}
                    >
                      {bldg}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: Spacing.xs }}>
            <Text style={[Typography.Heading5, { color: theme.text }]}>Titlu</Text>
            <TextInput
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                if (errors.title) setErrors({ ...errors, title: undefined });
              }}
              placeholder="Ex: Încălzire defectă în amfiteatru"
              placeholderTextColor={theme.textSecondary}
              style={{ 
                height: 56,
                borderWidth: 1.5,
                borderRadius: Spacing.md,
                paddingHorizontal: Spacing.lg,
                fontSize: 14,
                fontFamily: Fonts?.sans || "normal",
                borderColor: errors.title ? theme.secondary : theme.border,
                color: theme.text,
                backgroundColor: themeName === "light" ? "#FFFFFF" : "#1E1E1E"
              }}
              returnKeyType="next"
            />
            {errors.title && (
              <Text style={[Typography.Paragraph3, { color: theme.secondary, marginLeft: Spacing.xs }]}>
                {errors.title}
              </Text>
            )}
          </View>

          <View style={{ gap: Spacing.xs }}>
            <Text style={[Typography.Heading5, { color: theme.text }]}>Descriere detaliată</Text>
            <TextInput
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (errors.description) setErrors({ ...errors, description: undefined });
              }}
              placeholder="Descrie în detaliu problema întâmpinată..."
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
              style={{ 
                height: 120,
                borderWidth: 1.5,
                borderRadius: Spacing.md,
                paddingHorizontal: Spacing.lg,
                fontSize: 14,
                fontFamily: Fonts?.sans || "normal",
                paddingTop: Spacing.md,
                paddingBottom: Spacing.md,
                textAlignVertical: "top",
                borderColor: errors.description ? theme.secondary : theme.border,
                color: theme.text,
                backgroundColor: themeName === "light" ? "#FFFFFF" : "#1E1E1E"
              }}
            />
            {errors.description && (
              <Text style={[Typography.Paragraph3, { color: theme.secondary, marginLeft: Spacing.xs }]}>
                {errors.description}
              </Text>
            )}
          </View>

          <View style={{ gap: Spacing.xs }}>
            <Text style={[Typography.Heading5, { color: theme.text }]}>Adaugă fotografii (maxim 3)</Text>
            {photos.length < 3 && (
              <Pressable
                onPress={handleAddPhoto}
                style={({ pressed }) => [
                  {
                    height: 150,
                    borderRadius: Spacing.md,
                    backgroundColor: themeName === "light" ? "#F1F3F5" : "#2D2D2D",
                    justifyContent: "center",
                    alignItems: "center",
                    marginTop: Spacing.xs,
                    opacity: pressed ? 0.9 : 1
                  }
                ]}
              >
                <Text style={{ fontSize: 14, fontFamily: Fonts?.sans || "normal", color: theme.textSecondary, fontWeight: "500" }}>
                  Adaugă poză (până la 3 poze)
                </Text>
              </Pressable>
            )}

            {photos.length > 0 && (
              <View style={{ flexDirection: "row", gap: Spacing.md, marginTop: Spacing.sm }}>
                {photos.map((photoUri, index) => (
                  <View
                    key={index}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: Spacing.md,
                      backgroundColor: themeName === "light" ? "#F1F3F5" : "#2D2D2D",
                      overflow: "hidden",
                      position: "relative"
                    }}
                  >
                    <Image
                      source={{ uri: photoUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                    <Pressable
                      onPress={() => handleRemovePhoto(index)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        borderRadius: 12,
                        width: 24,
                        height: 24,
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 10
                      }}
                    >
                      <XIcon width={12} height={12} color="white" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              {
                height: 56,
                borderRadius: Spacing.md,
                justifyContent: "center",
                alignItems: "center",
                marginTop: Spacing.lg,
                backgroundColor: theme.primary,
                opacity: pressed ? 0.9 : 1
              }
            ]}
            onPress={handleSubmit}
          >
            <Text style={[Typography.Heading5, { color: 'white' }]}>Trimite sesizarea</Text>
          </Pressable>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
