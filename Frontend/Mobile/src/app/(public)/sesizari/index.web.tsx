import React, { useState, useCallback, useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { WebContainer } from "@/components/ui/layout/web-container";
import { CategoryHeader, FilterItem } from "@/components/ui/display/category-header";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import { SesizariListSkeleton } from "@/components/ui/display/skeletons";
import { Seo } from "@/components/seo";
import { SesizareCard, Sesizare } from "@/components/ui/display/sesizare-card";
import PlusIcon from "@/assets/icons/svg/plus.svg";
import api, { resolveImageUrl } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { ErrorState } from "@/components/ui/display/error-state";
import { useTranslation } from 'react-i18next';

type FilterType = "toate" | "mele" | "active" | "respinse" | "finalizate";

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

export default function SesizariScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const contentTop = useWebContentTop();
  const router = useRouter();

  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  const filters: FilterItem[] = [
    { id: "toate", title: t('reports.all') },
    { id: "mele", title: t('reports.mine') },
    { id: "active", title: t('reports.active') },
    { id: "respinse", title: t('reports.rejected') },
    { id: "finalizate", title: t('reports.completed') },
  ];

  const [reports, setReports] = useState<Sesizare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("toate");
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isAuthenticated) {
        setReports([]);
        setLoading(false);
        return;
      }
      // 1. Fetch/load locations to build a map of id -> name
      let locationsData: any[] = [];
      try {
        const locsRes = await api.get('/locations/', { params: { page: 1, size: 50 } });
        if (locsRes.data?.items) {
          locationsData = locsRes.data.items;
        }
      } catch (locError) {
        console.warn('[API] Could not fetch fresh locations for complaints:', locError);
      }

      const locationMap = new Map<number, string>();
      locationsData.forEach((loc: any) => {
        locationMap.set(loc.id, loc.name);
      });

      // 2. Id-ul utilizatorului vine din contextul de autentificare.
      const myProfileId: string | null = user?.id || null;

      // 3. Fetch complaints based on activeFilter
      let apiItems: any[] = [];
      if (activeFilter === "toate") {
        const complaintsRes = await api.get('/complaints/', { params: { page: 1, size: 50 } });
        console.log('[API] Fetched all complaints (web):', complaintsRes.data);
        apiItems = complaintsRes.data?.items || [];
      } else if (activeFilter === "mele") {
        const complaintsRes = await api.get('/complaints/', { params: { page: 1, size: 50 } });
        console.log('[API] Fetched my complaints (web):', complaintsRes.data);
        const allItems = complaintsRes.data?.items || [];
        apiItems = myProfileId ? allItems.filter((item: any) => item.user_id === myProfileId) : [];
      } else if (activeFilter === "active") {
        const [resPending, resWorking] = await Promise.all([
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'in_asteptare' } }),
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'in_lucru' } })
        ]);
        console.log('[API] Fetched active complaints (web):', { pending: resPending.data, working: resWorking.data });
        apiItems = [...(resPending.data?.items || []), ...(resWorking.data?.items || [])];
        apiItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (activeFilter === "respinse") {
        const res = await api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'respins' } });
        console.log('[API] Fetched rejected complaints (web):', res.data);
        apiItems = res.data?.items || [];
      } else if (activeFilter === "finalizate") {
        const [resFinalized, resSolved] = await Promise.all([
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'finalizat' } }),
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'solutionat' } })
        ]);
        console.log('[API] Fetched finalized complaints (web):', { finalized: resFinalized.data, solved: resSolved.data });
        apiItems = [...(resFinalized.data?.items || []), ...(resSolved.data?.items || [])];
        apiItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      const mappedReports: Sesizare[] = apiItems.map((item: any) => ({
        id: item.id.toString(),
        title: item.title,
        description: item.description,
        category: t('reports.general'),
        status: mapApiStatus(item.status),
        date: item.created_at,
        location: locationMap.get(item.location_id) || t('reports.unknownLocation'),
        isUserReport: myProfileId ? item.user_id === myProfileId : false,
        image: resolveImageUrl(item.image_url) || undefined,
      }));
      setReports(mappedReports);
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      console.warn('[API] Error fetching complaints:', err);
      setError(err.message || t('reports.loadErrorGeneral'));
    }
  };

  // Reimprospatam lista la fiecare revenire pe ecran (ex: dupa ce s-a adaugat o
  // sesizare noua si s-a dat back), la fel ca pe mobil.
  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilter])
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/(auth)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]);

  const filteredData = reports.filter((item) => {
    if (activeFilter === "toate") return true;
    if (activeFilter === "mele") return item.isUserReport;
    if (activeFilter === "active") return item.status === "active";
    if (activeFilter === "respinse") return item.status === "respinse";
    if (activeFilter === "finalizate") return item.status === "finalizate";
    return true;
  });

  const handleCardPress = (item: Sesizare) => {
    router.push({
      pathname: "/(public)/sesizari/detalii",
      params: {
        id: item.id,
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Seo
        title="Sesizări"
        description="Raportează probleme din campus și cămine și urmărește statusul sesizărilor — InsideUGAL."
      />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: contentTop,
          paddingBottom: insets.bottom + Spacing.xxl,
        }}
      >
        <WebContainer>
          <CategoryHeader
            title={t('reports.title')}
            filters={filters}
            selectedFilterId={activeFilter}
            onSelectFilter={(id) => setActiveFilter((id as FilterType) || "mele")}
            autoAbbreviate={false}
            rightElement={
              <Pressable
                onPress={() => router.push("/(public)/sesizari/adauga")}
                style={({ pressed }) => [
                  {
                    padding: Spacing.xs,
                    borderRadius: 20,
                    justifyContent: "center",
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <PlusIcon width={32} height={32} color={theme.text} />
              </Pressable>
            }
          />

          <View style={{ paddingHorizontal: Spacing.lg, gap: Spacing.md, marginTop: Spacing.xs }}>
            {!isAuthenticated ? (
              <View style={{ paddingVertical: 64, justifyContent: "center", alignItems: "center", gap: Spacing.md }}>
                <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs, textAlign: "center" }]}>
                  {t('reports.loginRequired')}
                </Text>
                <Text style={[Typography.Paragraph2, { color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.md }]}>
                  {t('reports.loginDesc')}
                </Text>
                <Pressable
                  onPress={() => router.push("/(auth)")}
                  style={{ backgroundColor: theme.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Spacing.md }}
                >
                  <Text style={{ color: "white", fontWeight: "bold" }}>{t('reports.login')}</Text>
                </Pressable>
              </View>
            ) : loading && reports.length === 0 ? (
              <SesizariListSkeleton />
            ) : error && reports.length === 0 ? (
              <ErrorState message={error} onRetry={loadData} style={{ minHeight: 500, paddingVertical: Spacing.xl4 }} />
            ) : (
              <>
                {filteredData.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => handleCardPress(item)}
                    style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                  >
                    <SesizareCard item={item} />
                  </Pressable>
                ))}

                 {filteredData.length === 0 && (
                  <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 64 }}>
                    <Text style={[Typography.Heading5, { color: theme.text, marginBottom: Spacing.xs }]}>
                      {t('reports.empty')}
                    </Text>
                    <Text style={[Typography.Paragraph3, { color: theme.textSecondary, textAlign: "center" }]}>
                      {t('reports.emptyDesc')}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </WebContainer>
      </ScrollView>
    </View>
  );
}
