import React, { useState, useMemo } from "react";
import { View, ScrollView } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Spacing, WebSidePadding } from "@/constants/theme";
import { CategoryHeader } from "@/components/ui/category-header";
import { Expandable } from "@/components/ui/expandable";
import { MenuItem } from "@/components/ui/menu-item";
import { useT } from "@/i18n/use-t";
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
  const t = useT();

  // Ordinea zilelor (incepe cu ziua curenta) — logica stabila, fara titluri.
  const sortedDayIds = useMemo(() => {
    const allDays = ["luni", "marti", "miercuri", "joi", "vineri"];

    const now = new Date();
    let dayIndex = now.getDay();
    const isWeekend = dayIndex === 0 || dayIndex === 6;
    const effectiveDayIndex = isWeekend ? 1 : dayIndex;

    const startIndex = effectiveDayIndex - 1;
    return [...allDays.slice(startIndex), ...allDays.slice(0, startIndex)];
  }, []);

  // Titlurile se traduc la fiecare render -> reactioneaza la schimbarea limbii.
  const daysFilter = sortedDayIds.map((id, index) => ({
    id,
    title: index === 0 ? t("days.today") : t(`days.${id}`),
  }));

  const [selectedDay, setSelectedDay] = useState<string>(sortedDayIds[0]);
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing.xxl,
          paddingTop: insets.top + 100,
        }}
      >
        <View style={{ width: "100%", paddingHorizontal: WebSidePadding }}>
        <CategoryHeader
          title={t("canteen.title")}
          filters={daysFilter}
          selectedFilterId={selectedDay}
          onSelectFilter={(id) => { if (id) { setSelectedDay(id); setOpenCategory(null); } }}
        />

        <View style={{
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: Spacing.lg,
          overflow: "hidden",
          marginHorizontal: Spacing.lg,
        }}>
          {Object.entries(currentMenu).map(([category, productIds], catIndex) => (
            <View
              key={`${selectedDay}-${category}`}
              style={catIndex > 0 ? {
                borderTopWidth: 1,
                borderTopColor: theme.border,
              } : undefined}
            >
            <Expandable title={t(`canteen.cat.${category}`) || category} expanded={openCategory === category} onToggle={() => handleToggle(category)}>
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
