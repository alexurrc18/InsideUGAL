import { useState } from "react";
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, ScrollView, useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Fonts, Spacing, WebSidePadding } from "@/constants/theme";
import CloseIcon from "@/assets/icons/svg/x.svg";
import { Typography } from "@/constants/typography";
import { KeyboardProvider } from 'react-native-keyboard-controller';

export default function LoginScreen() {
    const router = useRouter();
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

    const validate = () => {
        const newErrors: { email?: string; password?: string } = {};

        if (!email) {
            newErrors.email = "Email-ul este obligatoriu.";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Formatul email-ului este invalid.";
        }

        if (!password) {
            newErrors.password = "Parola este obligatorie.";
        } else if (password.length < 6) {
            newErrors.password = "Parola trebuie să aibă cel puțin 6 caractere.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = () => {
        if (validate()) {
            console.log("Login attempt with:", email, password);
        }
    };

    return (
        <KeyboardProvider>
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: theme.background }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, maxWidth: 480, alignSelf: 'center', width: '100%' }}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={{ flex: 1, paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl, paddingHorizontal: WebSidePadding }}>
                        <View style={{ marginBottom: Spacing.xl4, alignItems: 'center' }}>
                            <Text style={[Typography.Heading2, { color: theme.text, textAlign: 'center' }]}>Autentificare</Text>
                            <Text style={[Typography.Paragraph2, { color: theme.textSecondary, marginTop: Spacing.xs, textAlign: 'center' }]}>
                                Introdu datele pentru a intra în cont
                            </Text>
                        </View>

                        <View style={{ gap: Spacing.xxl }}>
                            {errors.general && (
                                <View style={{ backgroundColor: theme.secondary + '10', padding: Spacing.lg, borderRadius: Spacing.sm, borderWidth: 1, borderColor: theme.secondary }}>
                                    <Text style={[Typography.Paragraph3, { color: theme.secondary }]}>{errors.general}</Text>
                                </View>
                            )}

                            {/* Email Input */}
                            <View style={{ gap: Spacing.xs }}>
                                <Text style={[Typography.Heading5, { color: theme.text }]}>Email</Text>
                                <TextInput
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        if (errors.email) setErrors({ ...errors, email: undefined });
                                    }}
                                    placeholder="exemplu@ugal.ro"
                                    placeholderTextColor={theme.textSecondary}
                                    style={{
                                        height: 56,
                                        borderWidth: errors.email ? 1.5 : 0,
                                        borderColor: theme.secondary,
                                        borderRadius: Spacing.md,
                                        paddingHorizontal: Spacing.lg,
                                        ...Typography.Paragraph2,
                                        color: theme.text,
                                        backgroundColor: theme.surface
                                    }}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    returnKeyType="next"
                                />
                                {errors.email && (
                                    <Text style={[Typography.Paragraph3, { color: theme.secondary, marginLeft: Spacing.xs }]}>{errors.email}</Text>
                                )}
                            </View>

                            {/* Password Input */}
                            <View style={{ gap: Spacing.xs }}>
                                <Text style={[Typography.Heading5, { color: theme.text }]}>Parolă</Text>
                                <TextInput
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (errors.password) setErrors({ ...errors, password: undefined });
                                    }}
                                    placeholder="••••••••"
                                    placeholderTextColor={theme.textSecondary}
                                    secureTextEntry
                                    style={{
                                        height: 56,
                                        borderWidth: errors.password ? 1.5 : 0,
                                        borderColor: theme.secondary,
                                        borderRadius: Spacing.md,
                                        paddingHorizontal: Spacing.lg,
                                        ...Typography.Paragraph2,
                                        color: theme.text,
                                        backgroundColor: theme.surface
                                    }}
                                    returnKeyType="done"
                                />
                                {errors.password && (
                                    <Text style={[Typography.Paragraph3, { color: theme.secondary, marginLeft: Spacing.xs }]}>{errors.password}</Text>
                                )}
                            </View>

                            <Pressable
                                style={({ pressed }) => ({
                                    height: 56,
                                    borderRadius: Spacing.md,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    marginTop: Spacing.lg,
                                    backgroundColor: theme.primary,
                                    opacity: pressed ? 0.9 : 1
                                })}
                                onPress={handleLogin}
                            >
                                <Text style={[Typography.Heading4, { color: 'white' }]}>Autentificare</Text>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </KeyboardProvider>
    );
}
