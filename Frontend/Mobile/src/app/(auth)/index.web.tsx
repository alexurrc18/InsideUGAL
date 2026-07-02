import { useState, useRef } from "react";
import { View, Text, Pressable, TextInput, KeyboardAvoidingView, ScrollView, ActivityIndicator, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useRouter } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { Typography } from "@/constants/typography";
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useAuth } from "@/contexts/auth-context";
import { WEB_COMPACT_BREAKPOINT } from "@/components/ui/layout/web-container";
import CloseIcon from "@/assets/icons/svg/x.svg";
import { useTranslation } from 'react-i18next';

const LOGO = require("@/assets/images/logo.png");

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

    const { width } = useWindowDimensions();
    const isDesktop = width >= WEB_COMPACT_BREAKPOINT;
    const [logoRotate, setLogoRotate] = useState({ x: 0, y: 0 });
    const logoPanelRef = useRef<View>(null);

    const handleMouseMove = (e: any) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rotY = ((e.clientX - cx) / (rect.width / 2)) * 20;
        const rotX = -((e.clientY - cy) / (rect.height / 2)) * 20;
        setLogoRotate({ x: rotX, y: rotY });
    };

    const handleMouseLeave = () => setLogoRotate({ x: 0, y: 0 });

    return (
        <KeyboardProvider>
            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: theme.background, flexDirection: isDesktop ? "row" : "column" }}
            >
                {/* Floating Close Button */}
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => ({
                        position: "absolute",
                        top: Spacing.xl,
                        right: Spacing.xl,
                        zIndex: 10,
                        padding: Spacing.xs,
                        opacity: pressed ? 0.6 : 1,
                    })}
                >
                    <CloseIcon width={24} height={24} color={isDesktop ? "white" : theme.text} />
                </Pressable>

                {/* Stânga: formularul de logare */}
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
                    bounces={false}
                    keyboardShouldPersistTaps="handled"
                    style={isDesktop ? { flex: 1 } : undefined}
                >
                    <View style={{ paddingVertical: Spacing.xxl, paddingHorizontal: isDesktop ? Spacing.xxl * 2 : Spacing.xl, maxWidth: 480, width: '100%' }}>
                        <View style={{ marginBottom: Spacing.xl4, alignItems: 'center' }}>
                            <Text style={[Typography.Heading2, { color: theme.text, textAlign: 'center' }]}>{t('auth.title')}</Text>
                            <Text style={[Typography.Paragraph2, { color: theme.textSecondary, marginTop: Spacing.xs, textAlign: 'center' }]}>
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

                {/* Dreapta: logo mare (doar desktop) */}
                {isDesktop && (
                    <View
                        ref={logoPanelRef}
                        style={{ flex: 1, backgroundColor: theme.primary, justifyContent: "center", alignItems: "center" }}
                        {...({
                            onMouseMove: handleMouseMove,
                            onMouseLeave: handleMouseLeave,
                        } as any)}
                    >
                        <Image
                            source={LOGO}
                            style={{
                                width: 200,
                                height: 200,
                                ...({
                                    transform: `perspective(600px) rotateX(${logoRotate.x}deg) rotateY(${logoRotate.y}deg)`,
                                    transition: "transform 0.1s ease-out",
                                } as any),
                            }}
                            contentFit="contain"
                        />
                    </View>
                )}
            </KeyboardAvoidingView>
        </KeyboardProvider>
    );
}
