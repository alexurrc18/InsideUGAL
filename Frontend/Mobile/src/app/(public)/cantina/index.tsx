import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, ScrollView, RefreshControl, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { Expandable } from "@/components/ui/layout/expandable";
import { MenuItem } from "@/components/ui/navigation/menu-item";
import api, { storage } from "@/services/api";
import { CantinaMenuSkeleton } from "@/components/ui/display/skeletons";
import { ErrorState } from "@/components/ui/display/error-state";

const CATEGORY_ORDER = [
  "Meniul Zilei",
  "Ciorbe și Supe",
  "Preparate calde / Fel principal",
  "Garnituri",
  "Salate și Sosuri",
  "Pâine",
  "Desert"
];

function formatCategoryName(name: string): string {
  const mapping: Record<string, string> = {
    "ciorbe si supe": "Ciorbe și Supe",
    "ciorbe și supe": "Ciorbe și Supe",
    "garnituri": "Garnituri",
    "preparate carne": "Preparate calde / Fel principal",
    "salate si sosuri": "Salate și Sosuri",
    "salate și sosuri": "Salate și Sosuri",
    "paine": "Pâine",
    "desert": "Desert",
    "meniul zilei": "Meniul Zilei"
  };
  const key = name.toLowerCase().trim();
  return mapping[key] || (name.charAt(0).toUpperCase() + name.slice(1));
}

function getDayNumber(dayId: string): number {
  switch (dayId) {
    case 'luni': return 1;
    case 'marti': return 2;
    case 'miercuri': return 3;
    case 'joi': return 4;
    case 'vineri': return 5;
    default: return 1;
  }
}

export default function CantinaScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();
  const [menuData, setMenuData] = useState<any[]>([]);

  const daysFilter = useMemo(() => {
    const allDays = [
      { id: "luni", title: "Luni" },
      { id: "marti", title: "Marți" },
      { id: "miercuri", title: "Miercuri" },
      { id: "joi", title: "Joi" },
      { id: "vineri", title: "Vineri" },
    ];

    const now = new Date();
    let dayIndex = now.getDay();
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const effectiveDayIndex = isWeekend ? 1 : dayIndex;

    const startIndex = effectiveDayIndex - 1;
    const sortedDays = [
      ...allDays.slice(startIndex),
      ...allDays.slice(0, startIndex),
    ];

    return sortedDays.map((day, index) => ({
      ...day,
      title: index === 0 ? "Azi" : day.title,
    }));
  }, []);

  const [selectedDay, setSelectedDay] = useState<string>(daysFilter[0].id);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setHasError(false);
      const cached = await storage.getItem('cached_cafeteria_menus');
      if (cached) {
        setMenuData(JSON.parse(cached));
      }
      const res = await api.get('/cafeteria_menus/', { params: { page: 1, size: 50 } });
      if (res.data?.items) {
        setMenuData(res.data.items);
        await storage.setItem('cached_cafeteria_menus', JSON.stringify(res.data.items));
      }
      setLoading(false);
    } catch (err) {
      setLoading(false);
      console.warn('[API] Error loading cafeteria data:', err);
      setHasError(true);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setHasError(false);
    try {
      const res = await api.get('/cafeteria_menus/', { params: { page: 1, size: 50 } });
      if (res.data?.items) {
        setMenuData(res.data.items);
        await storage.setItem('cached_cafeteria_menus', JSON.stringify(res.data.items));
      }
      setRefreshing(false);
    } catch (err) {
      setRefreshing(false);
      console.warn('[API] Error refreshing cafeteria data:', err);
      setHasError(true);
      if (menuData.length > 0) {
        Alert.alert("Eroare la actualizare", "Nu s-a putut reîmprospăta meniul cantinei. Te rugăm să verifici conexiunea la internet.");
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { loadData(); }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const currentMenu = useMemo(() => {
    const dayNum = getDayNumber(selectedDay);
    const dayItem = menuData.find((item: any) => item.day_of_week === dayNum);

    if (!dayItem || !dayItem.products || dayItem.products.length === 0) {
      return {};
    }

    const grouped: Record<string, any[]> = {};
    dayItem.products.forEach((product: any) => {
      const cat = formatCategoryName(product.category?.name || product.name);
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        id: product.id.toString(),
        name: product.name,
        price: parseFloat(product.price) || 0,
        description: product.description || "",
      });
    });

    const sortedGroups: Record<string, any[]> = {};
    Object.keys(grouped)
      .sort((a, b) => {
        const ia = CATEGORY_ORDER.indexOf(a);
        const ib = CATEGORY_ORDER.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return a.localeCompare(b);
      })
      .forEach(key => { sortedGroups[key] = grouped[key]; });

    return sortedGroups;
  }, [menuData, selectedDay]);

  if (hasError && menuData.length === 0) {
    return <ErrorState onRetry={loadData} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top + Spacing.md }}>
      <CategoryHeader
        title="Cantina"
        filters={daysFilter}
        selectedFilterId={selectedDay}
        onSelectFilter={(id) => id && setSelectedDay(id)}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xxl,
          paddingTop: Spacing.xs
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />
        }
      >
        {loading || refreshing ? (
          <CantinaMenuSkeleton />
        ) : (
          <View style={{ marginHorizontal: Spacing.lg }}>
            {Object.entries(currentMenu).map(([category, productsList]) => (
              <Expandable key={category} title={category} initialExpanded={false}>
                <View style={{ gap: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.sm }}>
                  {productsList.map((product, index) => (
                    <MenuItem
                      key={product.id}
                      name={product.name}
                      price={product.price}
                      description={product.description}
                      isLast={index === productsList.length - 1}
                    />
                  ))}
                </View>
              </Expandable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
