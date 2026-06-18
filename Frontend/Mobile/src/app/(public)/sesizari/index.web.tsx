import React, { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { WebContainer } from "@/components/ui/layout/web-container";
import { CategoryHeader, FilterItem } from "@/components/ui/display/category-header";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import { SesizareCard, Sesizare } from "@/components/ui/display/sesizare-card";
import PlusIcon from "@/assets/icons/svg/plus.svg";
import api, { storage } from "@/services/api";

type FilterType = "mele" | "active" | "respinse" | "finalizate";

const filters: FilterItem[] = [
  { id: "mele", title: "Sesizările mele" },
  { id: "active", title: "Active" },
  { id: "respinse", title: "Respinse" },
  { id: "finalizate", title: "Finalizate" },
];

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

  const [reports, setReports] = useState<Sesizare[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>("mele");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch/load locations to build a map of id -> name
      let locationsData: any[] = [];
      const cachedLocs = await storage.getItem('cached_facilities');
      if (cachedLocs) {
        locationsData = JSON.parse(cachedLocs);
      }
      try {
        const locsRes = await api.get('/locations/', { params: { page: 1, size: 50 } });
        if (locsRes.data?.items) {
          locationsData = locsRes.data.items;
          await storage.setItem('cached_facilities', JSON.stringify(locsRes.data.items));
        }
      } catch (locError) {
        console.warn('[API] Could not fetch fresh locations for complaints:', locError);
      }

      const locationMap = new Map<number, string>();
      locationsData.forEach((loc: any) => {
        locationMap.set(loc.id, loc.name);
      });

      // 2. Fetch logged-in user profile if token exists
      let myProfileId: string | null = null;
      try {
        const profileRes = await api.get('/profiles/me');
        if (profileRes.data?.id) {
          myProfileId = profileRes.data.id;
        }
      } catch (profileError) {
        console.warn('[API] Could not fetch user profile (maybe unauthenticated):', profileError);
      }

      // 3. Fetch complaints based on activeFilter
      let apiItems: any[] = [];
      if (activeFilter === "mele") {
        const complaintsRes = await api.get('/complaints/', { params: { page: 1, size: 50 } });
        apiItems = complaintsRes.data?.items || [];
      } else if (activeFilter === "active") {
        const [resPending, resWorking] = await Promise.all([
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'in_asteptare' } }),
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'in_lucru' } })
        ]);
        apiItems = [...(resPending.data?.items || []), ...(resWorking.data?.items || [])];
        apiItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (activeFilter === "respinse") {
        const res = await api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'respins' } });
        apiItems = res.data?.items || [];
      } else if (activeFilter === "finalizate") {
        const [resFinalized, resSolved] = await Promise.all([
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'finalizat' } }),
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'solutionat' } })
        ]);
        apiItems = [...(resFinalized.data?.items || []), ...(resSolved.data?.items || [])];
        apiItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      const mappedReports: Sesizare[] = apiItems.map((item: any) => ({
        id: item.id.toString(),
        title: item.title,
        description: item.description,
        category: "General",
        status: mapApiStatus(item.status),
        date: item.created_at,
        location: locationMap.get(item.location_id) || "Locație nespecificată",
        isUserReport: myProfileId ? item.user_id === myProfileId : false,
        image: item.image_url || undefined,
      }));
      setReports(mappedReports);
    } catch (err: any) {
      console.warn('[API] Error fetching complaints:', err);
      setError(err.message || "A apărut o eroare la încărcarea sesizărilor.");
    } finally {
      setLoading(false);
    }
  };

  // Reimprospatam lista la fiecare revenire pe ecran (ex: dupa ce s-a adaugat o
  // sesizare noua si s-a dat back), la fel ca pe mobil.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [activeFilter])
  );

  const filteredData = reports.filter((item) => {
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
        title: item.title,
        description: item.description,
        category: item.category,
        location: item.location,
        status: item.status,
        date: item.date,
        image: item.image,
      },
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
            title="Sesizări"
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
            {loading && reports.length === 0 ? (
              <View style={{ paddingVertical: 64, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : error && reports.length === 0 ? (
              <View style={{ paddingVertical: 64, justifyContent: "center", alignItems: "center", gap: Spacing.md }}>
                <Text style={[Typography.Heading4, { color: theme.text, textAlign: "center" }]}>
                  {error}
                </Text>
                <Pressable 
                  onPress={loadData} 
                  style={{ backgroundColor: theme.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Spacing.md }}
                >
                  <Text style={{ color: 'white', fontWeight: "bold" }}>Reîncearcă</Text>
                </Pressable>
              </View>
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
                      Nicio sesizare în această secțiune
                    </Text>
                    <Text style={[Typography.Paragraph3, { color: theme.textSecondary, textAlign: "center" }]}>
                      Momentan nu există înregistrări.
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
