import { View, Text, FlatList, Pressable, useWindowDimensions } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Typography } from "@/constants/typography";
import { Colors, Spacing } from "@/constants/theme";
import { CAROUSEL_CARD_WIDTH, CAROUSEL_CARD_MARGIN, CarouselProps } from "./carousel.shared";
import ChevronIcon from "@/assets/icons/svg/chevron-left.svg";

export function Carousel<T>({ data, renderItem, keyExtractor, title, viewAllHref }: CarouselProps<T>) {
    const router = useRouter();
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    // Fisier doar pentru web: pe ecran lat aratam bara de scroll (stilizata in global.css)
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 768;

    return (
        <View style={{ marginVertical: Spacing.xl3 }}>
            {(title || viewAllHref) && (
                <View style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: Spacing.lg,
                    marginBottom: Spacing.sm
                }}>
                    {title && <Text accessibilityRole="header" {...({ "aria-level": 2 } as any)} style={[Typography.Heading1, { color: theme.text }]}>{title}</Text>}
                    {viewAllHref && (
                        <Pressable 
                            onPress={() => router.push(viewAllHref as any)}
                            style={({ pressed }) => ({
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                                opacity: pressed ? 0.7 : 1,
                            })}
                        >
                            <Text style={[Typography.Paragraph2, { color: theme.primary }]}>Vezi mai multe</Text>
                            <View style={{ transform: [{ rotate: "180deg" }] }}>
                                <ChevronIcon width={16} height={16} fill={theme.primary} color={theme.primary} />
                            </View>
                        </Pressable>
                    )}
                </View>
            )}

            <FlatList
                data={data}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                horizontal
                showsHorizontalScrollIndicator={isDesktop}
                contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingVertical: isDesktop ? 8 : 0 }}
                snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_MARGIN}
                decelerationRate="fast"
                {...(isDesktop ? ({ dataSet: { carousel: "true" } } as any) : {})}
            />
        </View>
    );
}
