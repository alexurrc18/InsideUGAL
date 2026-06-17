import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { WebContainer } from "@/components/ui/layout/web-container";
import MockData from "@/constants/mock-data.json";
import { getTodayRomanianDate } from "@/utils/date";
import XIcon from "@/assets/icons/svg/x.svg";
import ImagesIcon from "@/assets/icons/svg/images.svg";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";

const BUILDINGS = [...Array.from(new Set(MockData.buildings.map((b) => b.name))), "Exterior"];

interface LocationPillProps {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  theme: any;
}

// Varianta web a pill-ului: fara animatii (LayoutAnimation/Animated cu
// useNativeDriver nu sunt suportate pe web), doar un simplu buton selectabil.
const LocationPill = ({ label, isSelected, onPress, theme }: LocationPillProps) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: Spacing.lg,
        backgroundColor: isSelected ? theme.primary : theme.surface,
        opacity: pressed ? 0.85 : 1,
      },
    ]}
  >
    <Text
      style={{
        fontSize: 14,
        fontFamily: isSelected ? "InstrumentSans-SemiBold" : "InstrumentSans-Regular",
        color: isSelected ? "white" : theme.text,
        fontWeight: isSelected ? "600" : "400",
      }}
    >
      {label}
    </Text>
  </Pressable>
);

export default function AdaugaSesizareScreen() {
  const router = useRouter();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(BUILDINGS[0]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ title?: string; description?: string; photos?: string }>({});

  const validate = () => {
    const newErrors: { title?: string; description?: string; photos?: string } = {};
    if (!title.trim()) {
      newErrors.title = "Titlul este obligatoriu.";
    }
    if (!description.trim()) {
      newErrors.description = "Descrierea este obligatorie.";
    }
    if (photos.length === 0) {
      newErrors.photos = "Este obligatoriu să adăugați cel puțin o fotografie.";
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
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 3 - photos.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map((asset) => asset.uri);
      const updatedPhotos = [...photos, ...selectedUris].slice(0, 3);
      setPhotos(updatedPhotos);
      if (updatedPhotos.length > 0 && errors.photos) {
        setErrors({ ...errors, photos: undefined });
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = photos.filter((_, idx) => idx !== index);
    setPhotos(updatedPhotos);
    if (updatedPhotos.length === 0) {
      setErrors({ ...errors, photos: "Este obligatoriu să adăugați cel puțin o fotografie." });
    } else if (errors.photos) {
      setErrors({ ...errors, photos: undefined });
    }
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
        images: photos.length > 0 ? photos : ["https://campus.ugal.ro/ccps/wp-content/uploads/photo-gallery/DJI_0238.jpg?bwg=1639133115"],
      };

      MockData.reports.unshift(newReport as any);
      router.back();
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 100,
          paddingBottom: insets.bottom + Spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <WebContainer>
          {/* Header propriu (back + titlu) — pe web nu folosim header-ul nativ */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: Spacing.sm,
              paddingHorizontal: Spacing.lg,
              marginBottom: Spacing.lg,
            }}
          >
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ padding: Spacing.xs, opacity: pressed ? 0.7 : 1 }]}
            >
              <BackIcon width={28} height={28} color={theme.text} />
            </Pressable>
            <Text style={[Typography.Heading2, { color: theme.text }]}>Sesizare nouă</Text>
          </View>

          <View style={{ gap: Spacing.lg, paddingHorizontal: Spacing.lg }}>
            <View style={{ gap: Spacing.xs }}>
              <Text style={[Typography.Heading5, { color: theme.text }]}>Locație</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.xs }}>
                {BUILDINGS.map((bldg) => (
                  <LocationPill
                    key={bldg}
                    label={bldg}
                    isSelected={location === bldg}
                    onPress={() => setLocation(bldg)}
                    theme={theme}
                  />
                ))}
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
                  borderWidth: errors.title ? 1.5 : 0,
                  borderColor: theme.secondary,
                  borderRadius: Spacing.md,
                  paddingHorizontal: Spacing.lg,
                  ...Typography.Paragraph2,
                  color: theme.text,
                  backgroundColor: theme.surface,
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
                  borderWidth: errors.description ? 1.5 : 0,
                  borderColor: theme.secondary,
                  borderRadius: Spacing.md,
                  paddingHorizontal: Spacing.lg,
                  ...Typography.Paragraph2,
                  paddingTop: Spacing.md,
                  paddingBottom: Spacing.md,
                  textAlignVertical: "top",
                  color: theme.text,
                  backgroundColor: theme.surface,
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
                      backgroundColor: theme.surface,
                      borderWidth: errors.photos ? 1.5 : 0,
                      borderColor: theme.secondary,
                      justifyContent: "center",
                      alignItems: "center",
                      marginTop: Spacing.xs,
                      opacity: pressed ? 0.9 : 1,
                      gap: Spacing.md,
                    },
                  ]}
                >
                  <ImagesIcon width={24} height={24} color={theme.textSecondary} />
                  <Text style={{ ...Typography.Small1, color: theme.textSecondary }}>
                    Adaugă poză (până la 3 poze)
                  </Text>
                </Pressable>
              )}

              {errors.photos && (
                <Text style={[Typography.Paragraph3, { color: theme.secondary, marginLeft: Spacing.xs }]}>
                  {errors.photos}
                </Text>
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
                        backgroundColor: theme.surface,
                        overflow: "hidden",
                        position: "relative",
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
                          zIndex: 10,
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
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={handleSubmit}
            >
              <Text style={[Typography.Heading5, { color: "white" }]}>Trimite sesizarea</Text>
            </Pressable>
          </View>
        </WebContainer>
      </ScrollView>
    </View>
  );
}
