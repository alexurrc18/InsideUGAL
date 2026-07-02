import { useColorScheme } from "@/hooks/use-color-scheme";
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { View } from "react-native";
import { Colors } from '@/constants/theme';
import { useNavigation } from 'expo-router';
import { Ace } from '@/components/ui/layout/ace';
import { Typography } from '@/constants/typography';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
    const navigation = useNavigation<any>();
    const themeName = (useColorScheme() ?? 'light') as keyof typeof Colors;
    const theme = Colors[themeName];
    const activeColor = theme.primary;
    const { t } = useTranslation();

    return (
        <View style={{ flex: 1 }}>
            <NativeTabs
                labelVisibilityMode="labeled"
                labelStyle={{
                    color: theme.text,
                    fontFamily: Typography.Small2.fontFamily,
                    fontSize: Typography.Small2.fontSize,
                    fontWeight: Typography.Small2.fontWeight,
                }}
                tintColor={activeColor}
                backgroundColor={theme.background}
                screenListeners={() => ({
                    tabPress: (e) => {
                        const state = navigation.getState();
                        if (state) {
                            const current = state.routes[state.index];
                            const route = state.routes.find((r: any) => r.key === e.target);
                            if (current?.name === 'acasa' && route?.name !== 'acasa') {
                                navigation.navigate('acasa', { screen: 'index' });
                            }
                            if (current?.name === 'sesizari' && route?.name !== 'sesizari') {
                                navigation.navigate('sesizari', { screen: 'index' });
                            }
                            if (route) {
                                navigation.navigate(route.name, { screen: 'index' });
                            }
                        }
                    }
                })}
            >
                <NativeTabs.Trigger name='acasa'>
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require('@/assets/icons/png/home.png'),
                            selected: require('@/assets/icons/png/home-filled.png')
                        }}
                        renderingMode='template'
                    />
                    <NativeTabs.Trigger.Label>{t('nav.home')}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name='harta'>
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require('@/assets/icons/png/map.png'),
                            selected: require('@/assets/icons/png/map-filled.png')
                        }}
                        renderingMode='template'
                    />
                    <NativeTabs.Trigger.Label>{t('nav.map')}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name='cantina'>
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require('@/assets/icons/png/fork-knife.png'),
                            selected: require('@/assets/icons/png/fork-knife-filled.png')
                        }}
                        renderingMode='template'
                    />
                    <NativeTabs.Trigger.Label>{t('nav.canteen')}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name='sesizari'>
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require('@/assets/icons/png/traffic-cone.png'),
                            selected: require('@/assets/icons/png/traffic-cone-filled.png')
                        }}
                        renderingMode='template'
                    />
                    <NativeTabs.Trigger.Label>{t('nav.reports')}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name='more'>
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require('@/assets/icons/png/dots-horizontal-rounded.png'),
                            selected: require('@/assets/icons/png/dots-horizontal-rounded-filled.png')
                        }}
                        renderingMode='template'
                    />
                    <NativeTabs.Trigger.Label>{t('nav.more')}</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>
            </NativeTabs>
            <Ace />
        </View>
    );
}