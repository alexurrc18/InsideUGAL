import React from "react";
import { View, Text, useWindowDimensions, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Typography } from "@/constants/typography";
import { Colors, Spacing, ColorScheme } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const FALLBACK_IMAGE = require("@/assets/images/logo-color.png");

export interface NewsCardProps {
    title: string;
    date?: string;
    image?: string | number;
    author?: string;
    category?: string;
    width?: number | string;
    height?: number | string;
    marginRight?: number;
    variant?: "card" | "list" | "square";
    onPress?: () => void;
}

export function CategoryTag({ category }: { category: string }) {
    const isEvent = category === "Evenimente";
    return (
        <View style={{
            alignSelf: "flex-start",
            backgroundColor: isEvent ? ColorScheme.red : ColorScheme.blue,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
        }}>
            <Text style={[Typography.Small1, { color: ColorScheme.white }]} numberOfLines={1}>
                {category}
            </Text>
        </View>
    );
}

export function NewsCard({
    title,
    date,
    image,
    author,
    category,
    width,
    height,
    marginRight = 0,
    variant = "card",
    onPress
}: NewsCardProps) {
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    const { width: windowWidth } = useWindowDimensions();
    const SCREEN_WIDTH = Math.min(windowWidth, 480);

    const defaultWidth = variant === "list" ? SCREEN_WIDTH - Spacing.xl3 : (variant === "square" ? 180 : (width || SCREEN_WIDTH * 0.85));
    const defaultHeight = variant === "list" ? 100 : (variant === "square" ? 180 : (height || (defaultWidth as number) / (16 / 10)));

    const cardImage = typeof image === "string"
        ? (image.trim() ? { uri: image.trim() } : FALLBACK_IMAGE)
        : (image || FALLBACK_IMAGE);

    if (variant === "list") {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => ({
                    flexDirection: "row",
                    width: (width || defaultWidth) as any,
                    minHeight: (height || defaultHeight) as any,
                    marginRight,
                    gap: Spacing.lg,
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1,
                    paddingVertical: Spacing.xs,
                })}
                {...(Platform.OS === "web" ? ({ dataSet: { card: "true" } } as any) : {})}
            >
                <Image
                    source={cardImage}
                    accessibilityLabel={title}
                    style={{ width: (height || defaultHeight) as any, height: (height || defaultHeight) as any, borderRadius: Spacing.lg, overflow: "hidden" }}
                    contentFit="cover"
                />

                <View style={{ flex: 1, justifyContent: "center", gap: Spacing.xs }}>
                    {!!category && <CategoryTag category={category} />}
                    <Text style={[Typography.Heading4, { color: theme.text }]} numberOfLines={3}>
                        {title}
                    </Text>
                    {(!!date || !!author) && (
                        <Text style={[Typography.Paragraph3, { color: theme.textSecondary }]} numberOfLines={1}>
                            {[date, author].filter(Boolean).join("  ·  ")}
                        </Text>
                    )}
                </View>
            </Pressable>
        );
    }

    if (variant === "square") {
        return (
            <Pressable
                onPress={onPress}
                style={({ pressed }) => ({
                    width: width || defaultWidth,
                    height: height || defaultHeight,
                    marginRight,
                    borderRadius: Spacing.lg,
                    overflow: "hidden",
                    opacity: pressed ? 0.9 : 1
                })}
                {...(Platform.OS === "web" ? ({ dataSet: { card: "true" } } as any) : {})}
            >
                <Image
                    source={cardImage}
                    accessibilityLabel={title}
                    style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 1 }}
                    contentFit="cover"
                />

                <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 2 }}>
                    <LinearGradient
                        colors={["rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.2)", "transparent"]}
                        start={{ x: 0.5, y: 1.0 }}
                        end={{ x: 0.5, y: 0.0 }}
                        style={{
                            position: "absolute",
                            left: 0,
                            right: 0,
                            bottom: 0,
                            height: "80%"
                        }}
                    />

                    <View style={{ flex: 1, padding: Spacing.lg, justifyContent: "flex-end", alignItems: "center" }}>
                        <Text style={[Typography.Heading6, { color: "white", textAlign: "center" }]} numberOfLines={2}>
                            {title}
                        </Text>
                    </View>
                </View>
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => ({
                width: width || defaultWidth,
                height: height || defaultHeight,
                marginRight,
                borderRadius: Spacing.lg,
                overflow: "hidden",
                opacity: pressed ? 0.9 : 1
            })}
            {...(Platform.OS === "web" ? ({ dataSet: { card: "true" } } as any) : {})}
        >
            <Image
                source={cardImage}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 1 }}
                contentFit="cover"
            />

            <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, zIndex: 2 }}>
                <LinearGradient
                    colors={["rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.5)", "transparent"]}
                    start={{ x: 0.5, y: 1.0 }}
                    end={{ x: 0.5, y: 0.0 }}
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: "80%"
                    }}
                />

                <View style={{ flex: 1, padding: Spacing.lg, justifyContent: "flex-end", gap: Spacing.xxs }}>
                    {!!category && <CategoryTag category={category} />}
                    <Text style={[Typography.Heading4, { color: "white" }]} numberOfLines={2}>
                        {title}
                    </Text>
                    {(!!date || !!author) && (
                        <Text style={[Typography.Paragraph3, { color: "white", opacity: 0.8 }]} numberOfLines={1}>
                            {[date, author].filter(Boolean).join("  ·  ")}
                        </Text>
                    )}
                </View>
            </View>
        </Pressable>
    );
}
