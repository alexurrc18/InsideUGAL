import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useEffect } from "react";
import { View, Text, Pressable, FlatList, RefreshControl, ScrollView, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { SesizareCard, Sesizare } from "@/components/ui/display/sesizare-card";
import api, { storage, resolveImageUrl } from "@/services/api";
import { useAuth } from "@/contexts/auth-context";
import { SesizariListSkeleton } from "@/components/ui/display/skeletons";
import { ErrorState } from "@/components/ui/display/error-state";

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
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();

  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [reports, setReports] = useState<Sesizare[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeFilter = (params.filter as FilterType) || "toate";
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    const success = await loadData();
    if (!success && reports.length > 0) {
      Alert.alert("Eroare la actualizare", "Nu s-au putut reîmprospăta sesizările. Te rugăm să verifici conexiunea la internet.");
    }
    setRefreshing(false);
  };
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!isAuthenticated) {
        setReports([]);
        setLoading(false);
        return;
      }
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

      const myProfileId: string | null = user?.id || null;

      // 3. Fetch complaints based on activeFilter
      let apiItems: any[] = [];
      if (activeFilter === "toate") {
        const complaintsRes = await api.get('/complaints/', { params: { page: 1, size: 50 } });
        console.log('[API] Fetched all complaints:', complaintsRes.data);
        apiItems = complaintsRes.data?.items || [];
      } else if (activeFilter === "mele") {
        const complaintsRes = await api.get('/complaints/', { params: { page: 1, size: 50 } });
        console.log('[API] Fetched my complaints:', complaintsRes.data);
        const allItems = complaintsRes.data?.items || [];
        apiItems = myProfileId ? allItems.filter((item: any) => item.user_id === myProfileId) : [];
      } else if (activeFilter === "active") {
        const [resPending, resWorking] = await Promise.all([
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'in_asteptare' } }),
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'in_lucru' } })
        ]);
        console.log('[API] Fetched active complaints:', { pending: resPending.data, working: resWorking.data });
        apiItems = [...(resPending.data?.items || []), ...(resWorking.data?.items || [])];
        apiItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (activeFilter === "respinse") {
        const res = await api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'respins' } });
        console.log('[API] Fetched rejected complaints:', res.data);
        apiItems = res.data?.items || [];
      } else if (activeFilter === "finalizate") {
        const [resFinalized, resSolved] = await Promise.all([
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'finalizat' } }),
          api.get('/complaints/', { params: { page: 1, size: 50, complaint_status: 'solutionat' } })
        ]);
        console.log('[API] Fetched finalized complaints:', { finalized: resFinalized.data, solved: resSolved.data });
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
        image: resolveImageUrl(item.image_url) || undefined,
      }));
      setReports(mappedReports);
      setLoading(false);
      return true;
    } catch (err: any) {
      setLoading(false);
      console.warn('[API] Error fetching complaints:', err);
      setError(err.message || "A apărut o eroare la încărcarea sesizărilor.");
      return false;
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = navigation.addListener("focus", () => {
      loadData();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, activeFilter]);

  const filteredData = reports.filter(item => {
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

  const renderItem = ({ item }: { item: Sesizare }) => (
    <Pressable 
      onPress={() => handleCardPress(item)} 
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      <SesizareCard item={item} />
    </Pressable>
  );

  if ((loading && reports.length === 0) || refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
          }
        >
          <View style={{ paddingTop: Spacing.md }}>
            <SesizariListSkeleton />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error && reports.length === 0) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: "center", alignItems: "center", padding: Spacing.xl }}>
        <Text style={[Typography.Heading3, { color: theme.text, marginBottom: Spacing.xs, textAlign: "center", width: "100%" }]}>
          Trebuie să fii conectat
        </Text>
        <Text style={[Typography.Paragraph2, { color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.md, width: "100%" }]}>
          Conectează-te pentru a trimite sau vizualiza sesizările tale.
        </Text>
        <Pressable
          onPress={() => router.push("/(auth)")}
          style={{ backgroundColor: theme.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Spacing.md }}
        >
          <Text style={{ color: "white", fontWeight: "bold" }}>Conectare</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: Spacing.lg,
          paddingTop: Spacing.xs,
          paddingBottom: insets.bottom + Spacing.xl,
          gap: Spacing.md
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 64, paddingHorizontal: Spacing.xl }}>
            <Text style={[Typography.Heading5, { color: theme.text, marginBottom: Spacing.xs }]}>
              Nicio sesizare în această secțiune
            </Text>
            <Text style={[Typography.Paragraph3, { color: theme.textSecondary, textAlign: "center" }]}>
              Momentan nu există înregistrări.
            </Text>
          </View>
        }
      />
    </View>
  );
}