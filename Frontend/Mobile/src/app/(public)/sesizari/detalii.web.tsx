import React, { useState, useMemo, useEffect } from "react";
import { View, Text, ScrollView, Modal, Pressable, ActivityIndicator } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { getFormattedDate } from "@/utils/date";
import { Carousel } from "@/components/ui/display/carousel/carousel";
import { CAROUSEL_CARD_MARGIN } from "@/components/ui/display/carousel/carousel.shared";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { WebContainer } from "@/components/ui/layout/web-container";
import { Breadcrumbs } from "@/components/ui/navigation/breadcrumbs";
import api, { resolveImageUrl } from "@/services/api";
import { ErrorState } from "@/components/ui/display/error-state";
import { useTranslation } from 'react-i18next';

import LocationIcon from "@/assets/icons/svg/location.svg";
import CalendarIcon from "@/assets/icons/svg/calendar.svg";
import AlertOctagonIcon from "@/assets/icons/svg/alert-octagon.svg";
import XIcon from "@/assets/icons/svg/x.svg";

interface TimelineStep {
  title: string;
  desc: string;
  completed: boolean;
  date?: string;
  active?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
}

function mapApiStatus(apiStatus: string): "active" | "respinse" | "finalizate" {
  switch (apiStatus) {
    case 'respins':
      return 'respinse';
    case 'finalizat':
    case 'solutionat':
      return 'finalizate';
    default:
      return 'active'; // in_asteptare, in_lucru
  }
}

export default function SesizareDetaliiScreen() {
  const params = useLocalSearchParams();
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();

  const id = params.id as string;
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<any>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    async function loadComplaint() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        
        // 1. Fetch locations for mapping
        let locationsData: any[] = [];
        try {
          const locsRes = await api.get('/locations/', { params: { page: 1, size: 50, lang: i18n.language } });
          if (locsRes.data?.items) {
            locationsData = locsRes.data.items;
          }
        } catch (locError) {
          console.warn('[API] Could not fetch fresh locations for complaint detail web:', locError);
        }
        const locationMap = new Map<number, string>();
        locationsData.forEach((loc: any) => {
          locationMap.set(loc.id, loc.name);
        });

        // 2. Fetch the specific complaint
        const res = await api.get(`/complaints/${id}`, { params: { lang: i18n.language } });
        if (res.data) {
          const item = res.data;
          setReport({
            id: item.id.toString(),
            title: item.title || t('reports.missingTitle'),
            description: item.description || t('reports.noDescription'),
            category: t('reports.general'),
            location: locationMap.get(item.location_id) || t('reports.unknownLocation'),
            status: mapApiStatus(item.status),
            date: item.created_at || t('common.unknownDate'),
            image: resolveImageUrl(item.image_url) || "",
          });
        } else {
          setError(t('reports.notFound'));
        }
        setLoading(false);
      } catch (err: any) {
        setLoading(false);
        console.error("[API] Error fetching complaint detail web:", err);
        setError(err.message || t('reports.loadError'));
      }
    }
    loadComplaint();
  }, [id, retryKey, i18n.language]);

  const title = report?.title || "";
  const description = report?.description || "";
  const location = report?.location || t('reports.unknownLocation');
  const status = report?.status || "active";
  const date = report?.date || t('common.unknownDate');

  const statusLabel = status === "active" ? t('reports.statusActive') : status === "respinse" ? t('reports.statusRejected') : t('reports.statusCompleted');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const handleImagePress = (imgSource: any) => {
    setSelectedImage(imgSource);
    setModalVisible(true);
  };

  const images = useMemo(() => {
    if (!report) return [];
    const reportImages = report.images || (report.image ? [report.image] : []);
    return reportImages.map((img: string) => (typeof img === "string" ? { uri: img } : img));
  }, [report]);

  const steps: TimelineStep[] = useMemo(() => {
    switch (status) {
      case "active":
        return [
          { title: t('reports.step1Title'), desc: t('reports.step1Desc'), completed: true, date },
          { title: t('reports.step2ActiveTitle'), desc: t('reports.step2ActiveDesc'), active: true, completed: true },
          { title: t('reports.step3ActiveTitle'), desc: t('reports.step3ActiveDesc'), completed: false },
        ];
      case "respinse":
        return [
          { title: t('reports.step1Title'), desc: t('reports.step1Desc'), completed: true, date },
          { title: t('reports.step2RejectedTitle'), desc: t('reports.step2RejectedDesc'), completed: true, isError: true },
        ];
      case "finalizate":
        return [
          { title: t('reports.step1Title'), desc: t('reports.step1Desc'), completed: true, date },
          { title: t('reports.step2CompletedTitle'), desc: t('reports.step2CompletedDesc'), completed: true },
          { title: t('reports.step3CompletedTitle'), desc: t('reports.step3CompletedDesc'), completed: true, isSuccess: true },
        ];
      default:
        return [];
    }
  }, [status, date, t]);

  if (loading) {
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
            <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
              <Breadcrumbs 
                items={[
                  { label: t('common.home'), href: "/(public)/acasa" },
                  { label: t('reports.title'), href: "/(public)/sesizari" },
                  { label: t('common.loading') }
                ]} 
              />
            </View>
            <View style={{ minHeight: 400, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          </WebContainer>
        </ScrollView>
      </View>
    );
  }

  if (error || !report) {
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
            <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
              <Breadcrumbs 
                items={[
                  { label: t('common.home'), href: "/(public)/acasa" },
                  { label: t('reports.title'), href: "/(public)/sesizari" },
                  { label: t('common.error') }
                ]}
              />
            </View>
            <ErrorState
              message={error || t('reports.notFound')}
              onRetry={() => setRetryKey(prev => prev + 1)} 
              style={{ minHeight: 500, paddingVertical: Spacing.xl4 }}
            />
          </WebContainer>
        </ScrollView>
      </View>
    );
  }

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
          {/* Pe web nu mai folosim butonul nativ de back, ramane doar Breadcrumbs ca navigare principala */}
          <View style={{ paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm }}>
            <Breadcrumbs 
              items={[
                { label: t('common.home'), href: "/(public)/acasa" },
                { label: t('reports.title'), href: "/(public)/sesizari" },
                { label: title || t('reports.detailsFallbackTitle') }
              ]} 
            />
          </View>

          <CategoryHeader title={title} />

          <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.xxl, marginTop: Spacing.md }}>
            <View style={{ gap: Spacing.md }}>
              <Text style={[Typography.Heading4, { color: theme.text }]}>{t('reports.infoTitle')}</Text>

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
              <Text style={[Typography.Heading4, { color: theme.text }]}>{t('reports.descSection')}</Text>
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
            <Text style={[Typography.Heading4, { color: theme.text }]}>{t('reports.progressTitle')}</Text>

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
