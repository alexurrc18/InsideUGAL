import React, { useState, useMemo } from "react";
import { View, ScrollView, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing } from "@/constants/theme";
import { CategoryHeader } from "@/components/ui/display/category-header";
import { Expandable } from "@/components/ui/layout/expandable";
import { MenuItem } from "@/components/ui/navigation/menu-item";
import MockData from "@/constants/mock-data.json";

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

  const currentMenu = DAILY_SCHEDULE[selectedDay] || DAILY_SCHEDULE["luni"];

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + Spacing.xxl,
          paddingTop: insets.top + Spacing.md 
        }}
      >
        <CategoryHeader 
          title="Cantina" 
          filters={daysFilter}
          selectedFilterId={selectedDay}
          onSelectFilter={(id) => id && setSelectedDay(id)}
        />

        <View style={{ gap: Spacing.sm }}>
          {Object.entries(currentMenu).map(([category, productIds]) => (
            <Expandable key={category} title={category} initialExpanded={category === "Meniul Zilei"}>
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
          ))}
        </View>
      </ScrollView>
    </View>
  );
}