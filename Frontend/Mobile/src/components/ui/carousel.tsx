import { View, Text, FlatList, Pressable, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { Typography } from "@/constants/typography";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { CAROUSEL_CARD_WIDTH, CAROUSEL_CARD_MARGIN, CarouselProps } from "./carousel.shared";
import ChevronIcon from "@/assets/icons/svg/chevron-left.svg";

export function Carousel<T>({ data, renderItem, keyExtractor, title, viewAllHref }: CarouselProps<T>) {
    const router = useRouter();
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    return (
        <View style={{ flex: 1, marginVertical: Spacing.lg }}>
            {(title || viewAllHref) && (
                <View style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingHorizontal: Spacing.lg,
                    marginBottom: Spacing.lg
                }}>
                    {title && <Text style={[Typography.Heading3, { color: theme.text }]}>{title}</Text>}
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
                            <Text style={[Typography.Paragraph2, { color: ColorScheme.white }]}>Vezi mai multe</Text>
                            <View style={{ transform: [{ rotate: "180deg" }] }}>
                                <ChevronIcon width={16} height={16} fill={ColorScheme.white} color={ColorScheme.white} />
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
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.lg }}
                snapToInterval={CAROUSEL_CARD_WIDTH + CAROUSEL_CARD_MARGIN}
                decelerationRate="fast"
            />
        </View>
    );
}
