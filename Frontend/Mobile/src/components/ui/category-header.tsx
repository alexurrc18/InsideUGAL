import React from "react";
import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from "react-native";
import { Typography } from "@/constants/typography";
import { Colors, Spacing } from "@/constants/theme";

export interface FilterItem {
    id: string | null;
    title: string;
    abbreviation?: string;
}

interface CategoryHeaderProps {
    title: string;
    filters?: FilterItem[];
    selectedFilterId?: string | null;
    onSelectFilter?: (id: string | null) => void;
    autoAbbreviate?: boolean;
    initialsOnly?: boolean;
}

const getAbbreviation = (text: string) => {
    const ignoreWords = ["de", "și", "si", "la", "cu", "ale", "a"];
    const parts = text.split(/\s+/).filter(word => !ignoreWords.includes(word.toLowerCase()));
    
    if (parts.length === 1) return parts[0];
    return parts.map(word => word[0].toUpperCase()).join("");
};

export function CategoryHeader({ 
    title, 
    filters, 
    selectedFilterId, 
    onSelectFilter,
    autoAbbreviate = true,
    initialsOnly = false
}: CategoryHeaderProps) {
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    return (
        <View style={{ gap: Spacing.xs, marginBottom: Spacing.sm }}>
            <Text style={[Typography.Heading1, { color: theme.text, paddingHorizontal: Spacing.lg }]}>
                {title}
            </Text>

            {filters && filters.length > 0 && onSelectFilter && (
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.xl, alignItems: "center" }}
                >
                    {filters.map((item) => {
                        const isSelected = selectedFilterId === item.id;
                        
                        let displayTitle = item.title;
                        if (item.abbreviation && !initialsOnly) {
                            displayTitle = item.abbreviation;
                        } else if (initialsOnly && item.id !== null) {
                            displayTitle = getAbbreviation(item.title);
                        } else if (autoAbbreviate && item.title.length > 20 && item.id !== null) {
                            displayTitle = getAbbreviation(item.title);
                        }

                        return (
                            <TouchableOpacity
                                key={item.id ?? "all"}
                                onPress={() => onSelectFilter(item.id)}
                                style={{ paddingVertical: Spacing.xs }}
                            >
                                <Text style={[
                                    isSelected ? Typography.Heading4 : Typography.Paragraph1,
                                    { color: isSelected ? theme.primary : theme.text }
                                ]}>
                                    {displayTitle}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}
