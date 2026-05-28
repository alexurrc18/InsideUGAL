import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Typography } from "@/constants/typography";
import { ColorScheme } from "@/constants/theme";

export interface NewsCardProps {
    title: string;
    date: string;
    image: string | number;
    author?: string;
    width: number;
    height: number;
    marginRight?: number;
}

export function NewsCard({ title = "Necunoscut", date = "Necunoscută", image, author = "Necunoscut", width, height, marginRight = 0 }: NewsCardProps) {
    return (
        <View style={{ width, height, marginRight, borderRadius: 8, overflow: "hidden" }}>
            <Image
                source={image}
                style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
                contentFit="cover"
            />

            <LinearGradient
                colors={["rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.4)", "transparent"]}
                start={{ x: 0.5, y: 1.0 }}
                end={{ x: 0.5, y: 0.0 }}
                style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: "60%"
                }}
            />

            <View style={{ flex: 1, padding: 16, justifyContent: "flex-end" }}>
                <Text style={[Typography.Paragraph3, { color: ColorScheme.white, opacity: 0.8 }]}>
                    {date}
                </Text>
                <Text style={[Typography.Heading4, { color: ColorScheme.white, marginBottom: 0 }]}>
                    {title}
                </Text>
                <Text style={[Typography.Small1, { color: ColorScheme.white, opacity: 0.8 }]}>
                    {author}
                </Text>
            </View>
        </View>
    );
}
