import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, Modal, Pressable } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate } from "@/utils/date";
import { Carousel } from "@/components/ui/carousel";
import { CAROUSEL_CARD_MARGIN } from "@/components/ui/carousel.shared";
import MockData from "@/constants/mock-data.json";
import { CategoryHeader } from "@/components/ui/category-header";
import { WebContainer } from "@/components/ui/web-container";

import LocationIcon from "@/assets/icons/svg/location.svg";
import CalendarIcon from "@/assets/icons/svg/calendar.svg";
import AlertOctagonIcon from "@/assets/icons/svg/alert-octagon.svg";
import XIcon from "@/assets/icons/svg/x.svg";
import BackIcon from "@/assets/icons/svg/chevron-left.svg";

interface TimelineStep {
  title: string;
  desc: string;
  completed: boolean;
  date?: string;
  active?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
}

export default function SesizareDetaliiScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();

  const id = params.id as string;

  const report = useMemo(() => {
    return MockData.reports.find((r) => r.id === id) || {
      id: id || "",
      title: (params.title as string) || "Titlu lipsă",
      description: (params.description as string) || "Nicio descriere adăugată.",
      category: (params.category as string) || "General",
      location: (params.location as string) || "Locație nespecificată",
      status: (params.status as "active" | "respinse" | "finalizate") || "active",
      date: (params.date as string) || "Dată nespecificată",
      image: (params.image as string) || "",
    };
  }, [id, params]);

  const { title, description, location, status, date } = report;

  const statusLabel = status === "active" ? "Activă" : status === "respinse" ? "Respinsă" : "Soluționată";

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const handleImagePress = (imgSource: any) => {
    setSelectedImage(imgSource);
    setModalVisible(true);
  };

  const images = useMemo(() => {
    const reportImages = (report as any).images || (report.image ? [report.image] : []);
    return reportImages.map((img: string) => (typeof img === "string" ? { uri: img } : img));
  }, [report]);

  const steps: TimelineStep[] = useMemo(() => {
    switch (status) {
      case "active":
        return [
          { title: "Sesizare înregistrată", desc: "Sesizarea a fost salvată în sistem.", completed: true, date },
          { title: "În curs de analiză", desc: "Un administrator evaluează detaliile problemei.", active: true, completed: true },
          { title: "Soluționare finalizată", desc: "Echipa va interveni pentru a remedia situația.", completed: false },
        ];
      case "respinse":
        return [
          { title: "Sesizare înregistrată", desc: "Sesizarea a fost salvată în sistem.", completed: true, date },
          { title: "Respinsă", desc: "Solicitarea a fost respinsă de către echipa administrativă.", completed: true, isError: true },
        ];
      case "finalizate":
        return [
          { title: "Sesizare înregistrată", desc: "Sesizarea a fost salvată în sistem.", completed: true, date },
          { title: "În analiză administrativă", desc: "Problema a fost procesată cu succes.", completed: true },
          { title: "Soluționată", desc: "Problema a fost rezolvată în teren de personalul tehnic.", completed: true, isSuccess: true },
        ];
      default:
        return [];
    }
  }, [status, date]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: insets.top + 100,
          paddingBottom: insets.bottom + Spacing.xxl,
          gap: Spacing.lg,
        }}
      >
        <WebContainer>
          {/* Header propriu (back) — pe web nu folosim header-ul nativ */}
          <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [{ padding: Spacing.xs, alignSelf: "flex-start", opacity: pressed ? 0.7 : 1 }]}
            >
              <BackIcon width={28} height={28} color={theme.text} />
            </Pressable>
          </View>

          <CategoryHeader title={title} />

          <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.xxl, marginTop: Spacing.md }}>
            <View style={{ gap: Spacing.md }}>
              <Text style={[Typography.Heading4, { color: theme.text }]}>Informații sesizare</Text>

              <View style={{ gap: Spacing.lg }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                  <LocationIcon width={24} height={24} color={theme.primary} />
                  <Text style={[Typography.Heading5, { color: theme.text }]}>{location}</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                  <CalendarIcon width={24} height={24} color={theme.primary} />
                  <Text style={[Typography.Heading5, { color: theme.text }]}>{getFormattedDate(date)}</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.md }}>
                  <AlertOctagonIcon width={24} height={24} color={theme.primary} />
                  <Text style={[Typography.Heading5, { color: theme.text }]}>{statusLabel}</Text>
                </View>
              </View>
            </View>

            <View style={{ gap: Spacing.md }}>
              <Text style={[Typography.Heading4, { color: theme.text }]}>Descriere problemă</Text>
              <Text style={[Typography.Paragraph2, { color: theme.text, lineHeight: 25 }]}>{description}</Text>
            </View>
          </View>

          <Carousel
            data={images}
            keyExtractor={(_img, idx) => String(idx)}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => handleImagePress(item)}
                style={{
                  width: 140,
                  marginRight: index === images.length - 1 ? 0 : CAROUSEL_CARD_MARGIN,
                }}
              >
                <Image
                  source={item as any}
                  style={{ width: 140, height: 140, borderRadius: 12 }}
                  contentFit="cover"
                />
              </Pressable>
            )}
          />

          <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md }}>
            <Text style={[Typography.Heading4, { color: theme.text }]}>Istoric progres</Text>

            <View style={{ marginTop: Spacing.xs }}>
              {steps.map((step, index) => {
                let dotColor: string = theme.border;

                if (step.completed) {
                  dotColor = theme.primary;
                }

                return (
                  <View key={index} style={{ flexDirection: "row", minHeight: 80 }}>
                    <View style={{ alignItems: "center", marginRight: Spacing.md, width: 24 }}>
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 7,
                          zIndex: 1,
                          backgroundColor: dotColor,
                          borderColor: step.active ? theme.primary : "transparent",
                          borderWidth: step.active ? 3 : 0,
                        }}
                      />
                      {index < steps.length - 1 && (
                        <View
                          style={{
                            width: 2,
                            flex: 1,
                            position: "absolute",
                            top: 14,
                            bottom: 0,
                            backgroundColor: step.completed && steps[index + 1].completed ? dotColor : theme.border,
                          }}
                        />
                      )}
                    </View>

                    <View style={{ flex: 1, paddingBottom: Spacing.lg }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Text style={[Typography.Heading5, { color: theme.text }]}>{step.title}</Text>
                        {step.date && (
                          <Text style={[Typography.Paragraph4, { color: theme.textSecondary, marginTop: 2 }]}>
                            {getFormattedDate(step.date)}
                          </Text>
                        )}
                      </View>
                      <Text style={[Typography.Paragraph3, { color: theme.textSecondary, marginTop: 4 }]}>
                        {step.desc}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </WebContainer>
      </ScrollView>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Pressable
            style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
            onPress={() => setModalVisible(false)}
          />
          <View style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center", padding: Spacing.lg }}>
            {selectedImage && (
              <Image source={selectedImage} style={{ width: "100%", height: "80%" }} contentFit="contain" />
            )}
            <Pressable
              onPress={() => setModalVisible(false)}
              style={{
                position: "absolute",
                top: 50,
                right: 20,
                backgroundColor: "rgba(255, 255, 255, 0.25)",
                padding: 10,
                borderRadius: 25,
                zIndex: 10,
              }}
            >
              <XIcon width={20} height={20} color={ColorScheme.white} />
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
