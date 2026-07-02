import { useColorScheme } from "@/hooks/use-color-scheme";
import { useState } from "react";
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useAuth } from "@/contexts/auth-context";
import { useTranslation } from 'react-i18next';

export default function LoginScreen() {
    const router = useRouter();
    const themeName = (useColorScheme() ?? "light") as keyof typeof Colors;
    const theme = Colors[themeName];
    const { login } = useAuth();
    const { t } = useTranslation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

    const validate = () => {
        const newErrors: { email?: string; password?: string } = {};

        if (!email) {
            newErrors.email = t('auth.emailRequired');
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = t('auth.emailInvalid');
        }

        if (!password) {
            newErrors.password = t('auth.passwordRequired');
        } else if (password.length < 6) {
            newErrors.password = t('auth.passwordTooShort');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validate() || submitting) return;
        setSubmitting(true);
        setErrors(prev => ({ ...prev, general: undefined }));
        try {
            await login(email, password);
            router.back();
        } catch (err: any) {
            setErrors(prev => ({
                ...prev,
                general: err.message || t('auth.invalidCredentials')
            }));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardProvider>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1, backgroundColor: theme.background }}
            >
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1 }}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={{ flex: 1, padding: Spacing.xxl }}>
                        <View style={{ marginBottom: Spacing.xl4 }}>
                            <Text style={[Typography.Heading2, { color: theme.text }]}>{t('auth.title')}</Text>
                            <Text style={[Typography.Paragraph2, { color: theme.textSecondary, marginTop: Spacing.xs }]}>
                                {t('auth.subtitle')}
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
                                <Text style={[Typography.Heading5, { color: theme.text }]}>{t('auth.email')}</Text>
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
                                    editable={!submitting}
                                />
                                {errors.email && (
                                    <Text style={[Typography.Paragraph3, { color: theme.secondary, marginLeft: Spacing.xs }]}>{errors.email}</Text>
                                )}
                            </View>

                            {/* Password Input */}
                            <View style={{ gap: Spacing.xs }}>
                                <Text style={[Typography.Heading5, { color: theme.text }]}>{t('auth.password')}</Text>
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
                                    onSubmitEditing={handleLogin}
                                    editable={!submitting}
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
                                    opacity: (pressed || submitting) ? 0.7 : 1
                                })}
                                onPress={handleLogin}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={[Typography.Heading4, { color: 'white' }]}>{t('auth.login')}</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </KeyboardProvider>
    );
}
