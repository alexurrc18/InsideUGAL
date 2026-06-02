import React from "react";
import { View, Text, FlatList, Dimensions, Pressable, Platform, useColorScheme, useWindowDimensions } from "react-native";
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
    centered?: boolean;
}

export function Carousel<T>({
    data,
    renderItem,
    keyExtractor,
    title,
    viewAllHref,
    centered
}: CarouselProps<T>) {
    const router = useRouter();
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    // Bara de scroll orizontală o arătăm doar pe desktop web (pe telefon merge swipe-ul)
    const { width: windowWidth } = useWindowDimensions();
    const isDesktopWeb = Platform.OS === "web" && windowWidth >= 768;

    return (
        <View style={{ marginVertical: 15 }}>
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
                            <Text style={[Typography.Paragraph2, { color: ColorScheme.white }]}>Vezi mai multe &gt;</Text>
                        </Pressable>
                    )}
                </View>
            )}

            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                horizontal
                showsHorizontalScrollIndicator={isDesktopWeb}
                contentContainerStyle={[
                    { paddingHorizontal: 16 },
                    centered && isDesktopWeb ? { flexGrow: 1, justifyContent: "center" } : null,
                ]}
                snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_MARGIN}
                decelerationRate="fast"
                {...(isDesktopWeb ? ({ dataSet: { carousel: "true" } } as any) : {})}
            />
        </View>
    );
}
