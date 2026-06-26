import React, { useState, useMemo, useEffect } from "react";
import { View, ScrollView } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { WebContainer } from "@/components/ui/layout/web-container";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { useWebContentTop } from "@/hooks/use-web-content-top";
import { CantinaMenuSkeleton } from "@/components/ui/display/skeletons";
import { Seo } from "@/components/seo";
import { Expandable } from "@/components/ui/layout/expandable";
import { MenuItem } from "@/components/ui/navigation/menu-item";
import api, { storage } from "@/services/api";
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
  const contentTop = useWebContentTop();
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
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    "Meniul Zilei": true
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
        const cached = await storage.getItem('cached_cafeteria_menus');
        if (cached && active) {
          setMenuData(JSON.parse(cached));
        }
        const res = await api.get('/cafeteria_menus/', { params: { page: 1, size: 50 } });
        if (res.data?.items && active) {
          setMenuData(res.data.items);
          await storage.setItem('cached_cafeteria_menus', JSON.stringify(res.data.items));
        }
      } catch (err) {
        console.warn('[API] Error loading cafeteria data:', err);
        if (active) setHasError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => { active = false; };
  }, [retryKey]);

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
            onSelectFilter={(id) => { if (id) { setSelectedDay(id); setOpenCategories({ "Meniul Zilei": true }); } }}
          />

          {hasError && menuData.length === 0 ? (
            <ErrorState onRetry={() => setRetryKey(prev => prev + 1)} style={{ minHeight: 500, paddingVertical: Spacing.xl4 }} />
          ) : loading ? (
            <CantinaMenuSkeleton />
          ) : (
            <View style={{ marginHorizontal: Spacing.lg, gap: Spacing.sm }}>
              {Object.entries(currentMenu).map(([category, productsList]) => (
                <View key={`${selectedDay}-${category}`}>
                  <Expandable
                    title={category}
                    expanded={!!openCategories[category]}
                    onToggle={() => handleToggle(category)}
                  >
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
                </View>
              ))}
            </View>
          )}
        </WebContainer>
      </ScrollView>
    </View>
  );
}