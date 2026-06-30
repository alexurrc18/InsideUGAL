import React, { useState, useMemo, useEffect } from "react";
import { View, ScrollView, Text } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { WebContainer } from "@/components/ui/layout/web-container";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import { CantinaMenuSkeleton } from "@/components/ui/display/skeletons";
import { Seo } from "@/components/seo";
import { Expandable } from "@/components/ui/layout/expandable";
import { MenuItem } from "@/components/ui/navigation/menu-item";
import api from "@/services/api";
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
  const contentTop = useWebContentTop();
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
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Meniul zilei": true
  });
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        if (active) setHasError(false);

        const [menusRes, catsRes] = await Promise.all([
          api.get('/daily-menus/', { params: { page: 1, size: 50 } }),
          api.get('/product_categories/', { params: { page: 1, size: 50 } }),
        ]);

        if (active) {
          if (menusRes.data?.items) {
            setMenuData(menusRes.data.items);
          }
          if (catsRes.data?.items) {
            setCategoriesList(catsRes.data.items);
          }
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setLoading(false);
          console.warn('[API] Error loading daily menus data:', err);
          setHasError(true);
        }
      }
    }
    loadData();
    return () => { active = false; };
  }, [retryKey]);

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

  const handleToggle = (category: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Seo
        title="Cantină"
        description="Meniul zilei la cantina studențească UGAL — preparate, prețuri și program, actualizate zilnic."
      />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xxl,
          paddingTop: contentTop,
        }}
      >
        <WebContainer>
          <CategoryHeader
            title="Cantina"
            filters={daysFilter}
            selectedFilterId={selectedDay}
            onSelectFilter={(id) => { if (id) { setSelectedDay(id); setOpenCategories({ "Meniul zilei": true }); } }}
          />

          {hasError && menuData.length === 0 ? (
            <ErrorState onRetry={() => setRetryKey(prev => prev + 1)} style={{ minHeight: 500, paddingVertical: Spacing.xl4 }} />
          ) : loading ? (
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
                  <View key={`${selectedDay}-${catObj.id}`}>
                    <Expandable
                      title={catObj.name}
                      expanded={!!openCategories[catObj.name.toLowerCase()]}
                      onToggle={() => handleToggle(catObj.name.toLowerCase())}
                    >
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
                  </View>
                ))
              )}
            </View>
          )}
        </WebContainer>
      </ScrollView>
    </View>
  );
}