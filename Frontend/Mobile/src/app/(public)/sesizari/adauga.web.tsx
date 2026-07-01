import React, { useState, useEffect, useMemo } from "react";
import { View, Text, Pressable, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { WebContainer } from "@/components/ui/layout/web-container";
import api from "@/services/api";
import XIcon from "@/assets/icons/svg/x.svg";
import ImagesIcon from "@/assets/icons/svg/images.svg";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const [locations, setLocations] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(t('reports.exterior'));
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; description?: string; photos?: string; general?: string }>({});

  useEffect(() => {
    async function loadLocations() {
      try {
        const res = await api.get('/locations/', { params: { page: 1, size: 50 } });
        if (res.data?.items) {
          setLocations(res.data.items);
          if (res.data.items.length > 0) {
            setLocation(res.data.items[0].name);
          }
        }
      } catch (err) {
        console.warn('[API] Error loading locations for adauga screen:', err);
      }
    }
    loadLocations();
  }, []);

  const buildingsList = useMemo(() => {
    const list = locations.map(loc => loc.name);
    const exterior = t('reports.exterior');
    return list.length > 0 ? [...Array.from(new Set(list)), exterior] : [exterior];
  }, [locations, t]);

  const validate = () => {
    const newErrors: { title?: string; description?: string; photos?: string } = {};
    if (!title.trim()) {
      newErrors.title = t('reports.titleRequired');
    }
    if (!description.trim()) {
      newErrors.description = t('reports.descRequired');
    }
    if (photos.length === 0) {
      newErrors.photos = t('reports.photoRequired');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert(t('reports.photoPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const selectedUri = result.assets[0].uri;
      setPhotos([selectedUri]);
      if (errors.photos) {
        setErrors({ ...errors, photos: undefined });
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos([]);
    setErrors({ ...errors, photos: t('reports.photoRequired') });
  };

  const handleSubmit = async () => {
    if (validate() && !submitting) {
      setSubmitting(true);
      setErrors(prev => ({ ...prev, general: undefined }));
      try {
        let uploadedImageUrl: string | null = null;
        
        // 1. Upload first photo if exists
        if (photos.length > 0) {
          const photoUri = photos[0];
          const formData = new FormData();
          
          const resBlob = await fetch(photoUri);
          const blob = await resBlob.blob();
          formData.append('file', blob, 'photo.jpg');

          const uploadRes = await api.post('/complaints/upload-image/', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          if (typeof uploadRes.data === 'string') {
            uploadedImageUrl = uploadRes.data;
          } else if (uploadRes.data?.image_url) {
            uploadedImageUrl = uploadRes.data.image_url;
          } else if (uploadRes.data?.url) {
            uploadedImageUrl = uploadRes.data.url;
          }
        }

        // 2. Find location id
        const selectedLocObj = locations.find(loc => loc.name === location);
        const locationId = selectedLocObj ? selectedLocObj.id : null;

        // 3. Create complaint
        await api.post('/complaints/', {
          title: title.trim(),
          description: description.trim(),
          location_id: locationId,
          image_url: uploadedImageUrl,
        });

        router.back();
      } catch (err: any) {
        console.warn('[API] Error creating complaint:', err);
        setErrors(prev => ({ 
          ...prev, 
          general: err.message || t('reports.submitError')
        }));
      } finally {
        setSubmitting(false);
      }
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
            <Text style={[Typography.Heading2, { color: theme.text }]}>{t('reports.newReport')}</Text>
          </View>

          <View style={{ gap: Spacing.lg, paddingHorizontal: Spacing.lg }}>
            {errors.general && (
              <View style={{ backgroundColor: theme.secondary + '10', padding: Spacing.md, borderRadius: Spacing.sm, borderWidth: 1, borderColor: theme.secondary }}>
                <Text style={[Typography.Paragraph3, { color: theme.secondary }]}>{errors.general}</Text>
              </View>
            )}

            <View style={{ gap: Spacing.xs }}>
              <Text style={[Typography.Heading5, { color: theme.text }]}>{t('reports.location')}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, marginTop: Spacing.xs }}>
                {buildingsList.map((bldg) => (
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
              <Text style={[Typography.Heading5, { color: theme.text }]}>{t('reports.titleField')}</Text>
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
                editable={!submitting}
              />
              {errors.title && (
                <Text style={[Typography.Paragraph3, { color: theme.secondary, marginLeft: Spacing.xs }]}>
                  {errors.title}
                </Text>
              )}
            </View>

            <View style={{ gap: Spacing.xs }}>
              <Text style={[Typography.Heading5, { color: theme.text }]}>{t('reports.descDetailed')}</Text>
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
                editable={!submitting}
              />
              {errors.description && (
                <Text style={[Typography.Paragraph3, { color: theme.secondary, marginLeft: Spacing.xs }]}>
                  {errors.description}
                </Text>
              )}
            </View>
            <View style={{ gap: Spacing.xs }}>
              <Text style={[Typography.Heading5, { color: theme.text }]}>{t('reports.addPhoto')}</Text>
              {photos.length < 1 && (
                <Pressable
                  onPress={handleAddPhoto}
                  disabled={submitting}
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
                      opacity: (pressed || submitting) ? 0.9 : 1,
                      gap: Spacing.md,
                    },
                  ]}
                >
                  <ImagesIcon width={24} height={24} color={theme.textSecondary} />
                  <Text style={{ ...Typography.Small1, color: theme.textSecondary }}>
                    {t('reports.addPhotoBtn')}
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
                        width: 120,
                        height: 120,
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
                        disabled={submitting}
                        style={{
                          position: "absolute",
                          top: 6,
                          right: 6,
                          backgroundColor: "rgba(0, 0, 0, 0.6)",
                          borderRadius: 14,
                          width: 28,
                          height: 28,
                          justifyContent: "center",
                          alignItems: "center",
                          zIndex: 10,
                        }}
                      >
                        <XIcon width={14} height={14} color="white" />
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
                  opacity: (pressed || submitting) ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={[Typography.Heading5, { color: "white" }]}>{t('reports.submit')}</Text>
              )}
            </Pressable>
          </View>
        </WebContainer>
      </ScrollView>
    </View>
  );
}

