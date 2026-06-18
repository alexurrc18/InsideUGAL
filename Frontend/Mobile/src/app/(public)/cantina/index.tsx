import React, { useState, useMemo, useEffect } from "react";
import { View, ScrollView, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { Expandable } from "@/components/ui/layout/expandable";
import { MenuItem } from "@/components/ui/navigation/menu-item";
import MockData from "@/constants/mock-data.json";
import api, { storage } from "@/services/api";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

const PRODUCT_DATABASE = MockData.cafeteria.products as Record<string, Product>;
const DAILY_SCHEDULE = MockData.cafeteria.schedule as Record<string, Record<string, string[]>>;

const CATEGORY_ORDER = [
  "Meniul Zilei",
  "Ciorbe și Supe",
  "Preparate calde / Fel principal",
  "Salate / Sosuri",
  "Garnituri",
  "Desert"
];

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

function getProductCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("ciorb") || lower.includes("sup")) {
    return "Ciorbe și Supe";
  }
  if (lower.includes("meniul zilei")) {
    return "Meniul Zilei";
  }
  if (lower.includes("cartofi") || lower.includes("piure") || lower.includes("orez") || lower.includes("legume") || lower.includes("garnitur")) {
    return "Garnituri";
  }
  if (lower.includes("salat") || lower.includes("mujdei") || lower.includes("sos") || lower.includes("smantan")) {
    return "Salate / Sosuri";
  }
  if (lower.includes("clatit") || lower.includes("papanas") || lower.includes("desert") || lower.includes("inghetat")) {
    return "Desert";
  }
  return "Preparate calde / Fel principal";
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

  useEffect(() => {
    let active = true;
    async function loadMenu() {
      try {
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
        console.error('[API] Error loading cafeteria menus:', err);
      }
    }
    loadMenu();
    return () => { active = false; };
  }, []);

  const currentMenu = useMemo(() => {
    const dayNum = getDayNumber(selectedDay);
    const dayItem = menuData.find((item: any) => item.day_of_week === dayNum);

    if (!dayItem || !dayItem.products || dayItem.products.length === 0) {
      // Fallback to mock data if API is loading or empty
      const mockDaily = DAILY_SCHEDULE[selectedDay] || DAILY_SCHEDULE["luni"];
      const fallbackGrouped: Record<string, any[]> = {};
      
      Object.entries(mockDaily).forEach(([category, productIds]) => {
        fallbackGrouped[category] = productIds.map(id => PRODUCT_DATABASE[id]).filter(Boolean);
      });
      return fallbackGrouped;
    }

    // Group and sort products by category
    const grouped: Record<string, any[]> = {};
    dayItem.products.forEach((product: any) => {
      const cat = getProductCategory(product.name);
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push({
        id: product.id.toString(),
        name: product.name,
        price: parseFloat(product.price) || 0,
        description: product.description || "",
      });
    });

    const sortedGroups: Record<string, any[]> = {};
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      return (indexA !== -1 ? indexA : 99) - (indexB !== -1 ? indexB : 99);
    });

    sortedKeys.forEach(key => {
      sortedGroups[key] = grouped[key];
    });

    return sortedGroups;
  }, [menuData, selectedDay]);

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
      >
        <View style={{ gap: Spacing.sm }}>
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
      </ScrollView>
    </View>
  );
}