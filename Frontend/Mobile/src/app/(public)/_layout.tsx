import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useColorScheme, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useNavigation, useRouter } from 'expo-router';
import { Ace } from '@/components/ui/layout/ace';
import { getAuthToken } from '@/services/api';

export default function TabLayout() {
    const navigation = useNavigation<any>();
    const router = useRouter();
    const themeName = (useColorScheme() ?? 'light') as keyof typeof Colors;
    const theme = Colors[themeName];
    const activeColor = theme.primary;

    return (
        <View style={{ flex: 1 }}>
            <NativeTabs
                labelStyle={{
                    color: activeColor,
                }}
                tintColor={activeColor}
                screenListeners={() => ({
                    tabPress: (e) => {
                        const state = navigation.getState();
                        if (state) {
                            const route = state.routes.find((r: any) => r.key === e.target);
                            if (route) {
                                if (route.name === 'sesizari') {
                                    (e as any).preventDefault();
                                    getAuthToken().then((token) => {
                                        if (token) {
                                            navigation.navigate('sesizari', { screen: 'index' });
                                        } else {
                                            router.push('/(auth)');
                                        }
                                    });
                                } else if (route.name === 'more' || route.name === 'acasa') {
                                    navigation.navigate(route.name, { screen: 'index' });
                                }
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
                    <NativeTabs.Trigger.Label>Acasă</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name='harta'>
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require('@/assets/icons/png/map.png'),
                            selected: require('@/assets/icons/png/map-filled.png')
                        }}
                        renderingMode='template'
                    />
                    <NativeTabs.Trigger.Label>Hartă</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name='cantina'>
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require('@/assets/icons/png/fork-knife.png'),
                            selected: require('@/assets/icons/png/fork-knife-filled.png')
                        }}
                        renderingMode='template'
                    />
                    <NativeTabs.Trigger.Label>Cantină</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name='sesizari'>
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require('@/assets/icons/png/traffic-cone.png'),
                            selected: require('@/assets/icons/png/traffic-cone-filled.png')
                        }}
                        renderingMode='template'
                    />
                    <NativeTabs.Trigger.Label>Sesizări</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>

                <NativeTabs.Trigger name='more'>
                    <NativeTabs.Trigger.Icon
                        src={{
                            default: require('@/assets/icons/png/dots-horizontal-rounded.png'),
                            selected: require('@/assets/icons/png/dots-horizontal-rounded-filled.png')
                        }}
                        renderingMode='template'
                    />
                    <NativeTabs.Trigger.Label>Mai multe</NativeTabs.Trigger.Label>
                </NativeTabs.Trigger>
            </NativeTabs>
            <Ace />
        </View>
    );
}