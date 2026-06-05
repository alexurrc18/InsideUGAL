import React, { useState, useMemo } from "react";
import { View, ScrollView, useColorScheme, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, WebSidePadding } from "@/constants/theme";
import { CategoryHeader } from "@/components/ui/category-header";
import { Expandable } from "@/components/ui/expandable";
import { MenuItem } from "@/components/ui/menu-item";
import MockData from "@/constants/mock-data.json";

// 1. Definiție Produs
interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
}

const PRODUCT_DATABASE = MockData.cafeteria.products as Record<string, Product>;
const DAILY_SCHEDULE = MockData.cafeteria.schedule as Record<string, Record<string, string[]>>;

export default function CantinaScreen() {
  const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
  const theme = Colors[themeName];
  const insets = useSafeAreaInsets();

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
  const [openCategory, setOpenCategory] = useState<string | null>("Meniul Zilei");

  const currentMenu = DAILY_SCHEDULE[selectedDay] || DAILY_SCHEDULE["luni"];

  // La click pe o categorie noua: inchide-o intai pe cea deschisa, apoi deschide-o pe cea noua (secvential).
  const handleToggle = (category: string) => {
    if (openCategory === category) {
      setOpenCategory(null);
    } else if (openCategory === null) {
      setOpenCategory(category);
    } else {
      setOpenCategory(null);
      setTimeout(() => setOpenCategory(category), 520);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={Platform.OS !== "web"}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xxl,
          paddingTop: insets.top + (Platform.OS === "web" ? 100 : Spacing.xxl),
        }}
      >
        <View style={{ width: "100%", paddingHorizontal: Platform.OS === "web" ? WebSidePadding : 0 }}>
        <CategoryHeader
          title="Cantina" 
          filters={daysFilter}
          selectedFilterId={selectedDay}
          onSelectFilter={(id) => { if (id) { setSelectedDay(id); setOpenCategory(null); } }}
        />

        <View style={Platform.OS === "web" ? {
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: Spacing.lg,
          overflow: "hidden",
          marginHorizontal: Spacing.lg,
        } : { gap: Spacing.sm }}>
          {Object.entries(currentMenu).map(([category, productIds], catIndex) => (
            <View
              key={`${selectedDay}-${category}`}
              style={Platform.OS === "web" && catIndex > 0 ? {
                borderTopWidth: 1,
                borderTopColor: theme.border,
              } : undefined}
            >
            <Expandable title={category} expanded={openCategory === category} onToggle={() => handleToggle(category)}>
              <View style={{ gap: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.sm }}>
                {productIds.map((id, index) => {
                  const product = PRODUCT_DATABASE[id];
                  return product ? (
                    <MenuItem 
                      key={id}
                      name={product.name}
                      price={product.price}
                      description={product.description}
                      isLast={index === productIds.length - 1}
                    />
                  ) : null;
                })}
              </View>
            </Expandable>
            </View>
          ))}
        </View>
        </View>
      </ScrollView>
    </View>
  );
}