import React from "react";
import { View, Text, FlatList, Dimensions, Pressable, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { Typography } from "@/constants/typography";
import { Colors, ColorScheme } from "@/constants/theme";

const { width } = Dimensions.get("window");
export const CAROUSEL_CARD_WIDTH = width * 0.85; 
export const CAROUSEL_CARD_MARGIN = 16;

interface CarouselProps<T> {
    data: T[];
    renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
    keyExtractor: (item: T, index: number) => string;
    title?: string;
    viewAllHref?: string;
}

export function Carousel<T>({ 
    data, 
    renderItem, 
    keyExtractor, 
    title, 
    viewAllHref 
}: CarouselProps<T>) {
    const router = useRouter();
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    return (
        <View style={{ flex: 1, marginVertical: 15 }}>
            {(title || viewAllHref) && (
                <View style={{ 
                    flexDirection: "row", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    paddingHorizontal: 16, 
                    marginBottom: 12 
                }}>
                    {title && <Text style={[Typography.Heading3, { color: theme.text }]}>{title}</Text>}
                    {viewAllHref && (
                        <Pressable onPress={() => router.push(viewAllHref as any)}>
                            <Text style={[Typography.Paragraph2, { color: ColorScheme.blue }]}>Vezi mai multe &gt;</Text>
                        </Pressable>
                    )}
                </View>
            )}

            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16 }}
                snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_MARGIN}
                decelerationRate="fast"
            />
        </View>
    );
}
