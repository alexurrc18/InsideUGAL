import { View, Text, FlatList, Pressable, useWindowDimensions } from "react-native";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Typography } from "@/constants/typography";
import { Colors, Spacing } from "@/constants/theme";
import { CAROUSEL_CARD_WIDTH, CAROUSEL_CARD_MARGIN, CarouselProps } from "./carousel.shared";

export function Carousel<T>({ data, renderItem, keyExtractor, title, viewAllHref }: CarouselProps<T>) {
    const router = useRouter();
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    // Fisier doar pentru web: pe ecran lat aratam bara de scroll (stilizata in global.css)
    const { width: windowWidth } = useWindowDimensions();
    const isDesktop = windowWidth >= 768;

    return (
        <View style={{ marginVertical: Spacing.lg }}>
            {(title || viewAllHref) && (
                <View style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: Spacing.lg,
                    marginBottom: Spacing.lg
                }}>
                    {title && <Text style={[Typography.Heading4, { color: theme.text }]}>{title}</Text>}
                    {viewAllHref && (
                        <Pressable onPress={() => router.push(viewAllHref as any)}>
                            <Text style={[Typography.Paragraph2, { color: theme.primary }]}>Vezi mai multe &gt;</Text>
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
