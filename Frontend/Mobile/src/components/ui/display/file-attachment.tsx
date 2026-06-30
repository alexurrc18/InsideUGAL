import { Platform, Linking, TouchableOpacity, View, Text } from "react-native";
import { Colors, ColorScheme, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { useColorScheme } from "@/hooks/use-color-scheme";
import FileIcon from "@/assets/icons/svg/file.svg";
import DownloadIcon from "@/assets/icons/svg/arrow-to-bottom-stroke.svg";
import { useTranslation } from "react-i18next";

export type FileItem = { name: string; url: string };

function download(url: string) {
    if (Platform.OS === "web") {
        window.open(url, "_blank", "noopener,noreferrer");
    } else {
        Linking.openURL(url);
    }
}

function FileCard({ file }: { file: FileItem }) {
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    return (
        <TouchableOpacity
            onPress={() => download(file.url)}
            activeOpacity={0.7}
            style={{ alignItems: "center", width: 104 }}
        >
            <View
                style={{
                    width: 104,
                    height: 104,
                    borderRadius: 12,
                    backgroundColor: theme.background,
                    borderWidth: 1,
                    borderColor: theme.border,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: Spacing.xs,
                    padding: Spacing.xs,
                }}
            >
                <FileIcon width={28} height={28} color={theme.primary} />
                <Text
                    numberOfLines={1}
                    style={[Typography.Paragraph4, { color: theme.text, textAlign: "center", width: 88 }]}
                >
                    {file.name}
                </Text>
                <View style={{ position: "absolute", bottom: 5, right: 5 }}>
                    <DownloadIcon width={18} height={18} color={theme.primary} />
                </View>
            </View>
        </TouchableOpacity>
    );
}

export function FileAttachments({ files }: { files?: FileItem[] }) {
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const { t } = useTranslation();

    if (!files?.length) return null;

    return (
        <View style={{ gap: Spacing.md }}>
            <Text style={[Typography.Heading4, { color: theme.text }]}>{t('common.attachedFiles')}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: Spacing.md }}>
                {files.map((f, i) => (
                    <FileCard key={i} file={f} />
                ))}
            </View>
        </View>
    );
}