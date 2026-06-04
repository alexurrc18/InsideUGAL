import React from "react";
import { View, Text, Dimensions, Pressable } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Typography } from "@/constants/typography";
import { Colors, Spacing } from "@/constants/theme";
import { useColorScheme } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const DEFAULT_IMAGE = require("@/assets/images/placeholders/1920x1080.png");

export interface NewsCardProps {
    title: string;
    date?: string;
    image?: string | number;
    author?: string;
    width?: number;
    height?: number;
    marginRight?: number;
    variant?: "card" | "list" | "square";
    onPress?: () => void;
}

export function NewsCard({ 
    title, 
    date, 
    image, 
    author, 
    width, 
    height, 
    marginRight = 0,
    variant = "card",
    onPress
}: NewsCardProps) {
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    const defaultWidth = variant === "list" ? SCREEN_WIDTH - Spacing.xl3 : (variant === "square" ? 140 : (width || SCREEN_WIDTH * 0.85));
    const defaultHeight = variant === "list" ? 100 : (variant === "square" ? 140 : (height || (defaultWidth as number) / (16 / 10)));
    
    const cardImage = image || DEFAULT_IMAGE;

    if (variant === "list") {
        return (
            <Pressable 
                onPress={onPress}
                style={({ pressed }) => ({ 
                    flexDirection: "row", 
                    width: width || defaultWidth, 
                    height: height || defaultHeight, 
                    marginRight, 
                    gap: Spacing.lg,
                    alignItems: "center",
                    opacity: pressed ? 0.7 : 1
                })}
            >
                <Image
                    source={cardImage}
                    style={{ width: height || defaultHeight, height: height || defaultHeight, borderRadius: Spacing.lg }}
                    contentFit="cover"
                />
                
                <View style={{ flex: 1, justifyContent: "center", gap: Spacing.xs }}>
                    <Text style={[Typography.Small1, { color: theme.text, opacity: 0.6 }]}>
                        {author}
                    </Text>
                    <Text style={[Typography.Heading4, { color: theme.text }]} numberOfLines={3}>
                        {title}
                    </Text>
                    <Text style={[Typography.Small2, { color: theme.text, opacity: 0.6 }]}>
                        {date}
                    </Text>
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
            >
                <Image
                    source={cardImage}
                    style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                    contentFit="cover"
                />

                <LinearGradient
                    colors={["rgba(0, 0, 0, 0.85)", "rgba(0, 0, 0, 0.2)", "transparent"]}
                    start={{ x: 0.5, y: 1.0 }}
                    end={{ x: 0.5, y: 0.3 }}
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: "100%"
                    }}
                />

                <View style={{ flex: 1, padding: Spacing.lg, justifyContent: "flex-end", alignItems: "center" }}>
                    <Text style={[Typography.Heading6, { color: "white", textAlign: "center" }]} numberOfLines={2}>
                        {title}
                    </Text>
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
        >
            <Image
                source={cardImage}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                contentFit="cover"
            />

            <LinearGradient
                colors={["rgba(0, 0, 0, 0.95)", "rgba(0, 0, 0, 0.5)", "transparent"]}
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

            <View style={{ flex: 1, padding: Spacing.lg, justifyContent: "flex-end" }}>
                <Text style={[Typography.Paragraph3, { color: "white", opacity: 0.8 }]}>
                    {date}
                </Text>
                <Text style={[Typography.Heading4, { color: "white", marginBottom: Spacing.xs }]}>
                    {title}
                </Text>
                <Text style={[Typography.Paragraph3, { color: "white", opacity: 0.8 }]}>
                    {author}
                </Text>
            </View>
        </Pressable>
    );
}
