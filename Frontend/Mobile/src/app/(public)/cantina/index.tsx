import { useColorScheme } from "@/hooks/use-color-scheme";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, ScrollView, RefreshControl, Alert, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { Expandable } from "@/components/ui/layout/expandable";
import { MenuItem } from "@/components/ui/navigation/menu-item";
import api, { storage } from "@/services/api";
import { CantinaMenuSkeleton } from "@/components/ui/display/skeletons";
import { ErrorState } from "@/components/ui/display/error-state";

function formatCategoryName(name: string): string {
  if (!name) return "";
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
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
  const [categoriesList, setCategoriesList] = useState<any[]>([]);

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
    setLoading(true);
    setHasError(false);
    try {
      const [menusRes, catsRes] = await Promise.all([
        api.get('/daily-menus/', { params: { page: 1, size: 50 } }),
        api.get('/product_categories/', { params: { page: 1, size: 50 } }),
      ]);

      if (menusRes.data?.items) {
        setMenuData(menusRes.data.items);
        await storage.setItem('cached_daily_menus_v3', JSON.stringify(menusRes.data.items));
      }
      if (catsRes.data?.items) {
        setCategoriesList(catsRes.data.items);
        await storage.setItem('cached_product_categories_v3', JSON.stringify(catsRes.data.items));
      }
      setLoading(false);
    } catch (err) {
      console.warn('[API] Error loading daily menus data:', err);
      try {
        const [cachedMenus, cachedCats] = await Promise.all([
          storage.getItem('cached_daily_menus_v3'),
          storage.getItem('cached_product_categories_v3'),
        ]);
        if (cachedMenus) setMenuData(JSON.parse(cachedMenus));
        if (cachedCats) setCategoriesList(JSON.parse(cachedCats));
        if (!cachedMenus && !cachedCats) setHasError(true);
      } catch {
        setHasError(true);
      }
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    setHasError(false);
    try {
      const [menusRes, catsRes] = await Promise.all([
        api.get('/daily-menus/', { params: { page: 1, size: 50 } }),
        api.get('/product_categories/', { params: { page: 1, size: 50 } }),
      ]);

      if (menusRes.data?.items) {
        setMenuData(menusRes.data.items);
        await storage.setItem('cached_daily_menus_v3', JSON.stringify(menusRes.data.items));
      }
      if (catsRes.data?.items) {
        setCategoriesList(catsRes.data.items);
        await storage.setItem('cached_product_categories_v3', JSON.stringify(catsRes.data.items));
      }
      setRefreshing(false);
    } catch (err) {
      setRefreshing(false);
      console.warn('[API] Error refreshing daily menus data:', err);
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
      return [];
    }

    // Map each category in categoriesList to its list of products for the day
    const categoriesWithProducts = categoriesList.map((catObj: any) => {
      const products = dayItem.products.filter(
        (product: any) =>
          product.category_id === catObj.id ||
          product.category?.id === catObj.id
      ).map((product: any) => ({
        id: product.id.toString(),
        name: product.name,
        price: product.price,
        quantity: product.quantity || "",
        description: product.description || "",
      }));

      return {
        id: catObj.id,
        name: formatCategoryName(catObj.name),
        products,
      };
    });

    // Filter out categories that have no products for this day
    const activeCategories = categoriesWithProducts.filter(cat => cat.products.length > 0);

    activeCategories.sort((a, b) => {
      const isMeniulZileiA = a.name.toLowerCase() === "meniul zilei";
      const isMeniulZileiB = b.name.toLowerCase() === "meniul zilei";
      if (isMeniulZileiA) return -1;
      if (isMeniulZileiB) return 1;
      return a.id - b.id;
    });

    return activeCategories;
  }, [menuData, selectedDay, categoriesList]);

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
            {currentMenu.length === 0 ? (
              <View style={{ paddingVertical: Spacing.xl4, alignItems: "center", justifyContent: "center" }}>
                <Text style={[Typography.Paragraph1, { color: theme.textSecondary, textAlign: "center" }]}>
                  Nu există meniu disponibil pentru această zi.
                </Text>
              </View>
            ) : (
              currentMenu.map((catObj) => (
                <Expandable key={catObj.id.toString()} title={catObj.name} initialExpanded={catObj.name.toLowerCase() === "meniul zilei"}>
                  <View style={{ gap: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.sm }}>
                    {catObj.products.map((product: any, index: number) => (
                      <MenuItem
                        key={product.id}
                        name={product.name}
                        price={product.price}
                        description={product.description}
                        quantity={product.quantity}
                        isLast={index === catObj.products.length - 1}
                      />
                    ))}
                  </View>
                </Expandable>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
