import React, { useState } from 'react';
import {
  View,
  Pressable,
  Platform,
  Animated,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { InteractiveGlass } from './interactive-glass';
import SparkleIcon from '@/assets/icons/svg/message-circle-star.svg';

export function Ace() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [scaleAnim] = useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.12,
      useNativeDriver: true,
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1.0,
      useNativeDriver: true,
      stiffness: 300,
      damping: 15,
      mass: 0.5,
    }).start();
  };

  const themeWhite = theme.textOnDark === '#F8F9FA' ? theme.textOnDark : theme.text;
  const themeBlack = theme.text === '#121212' ? theme.text : theme.textOnDark;

  const commonPressableStyle: any = {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    zIndex: 999,
    shadowColor: themeBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    bottom: insets.bottom + 65, // Floats elegantly above the native tab bar
  };

  if (Platform.OS === 'ios') {
    return (
      <Pressable
        onPress={() => {
          router.push('/ace');
        }}
        style={commonPressableStyle}
      >
        <InteractiveGlass size={56}>
          <SparkleIcon width={34} height={34} color={theme.primary} style={{ marginLeft: 1, marginTop: -1 }} />
        </InteractiveGlass>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => {
        router.push('/ace');
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={commonPressableStyle}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: 56, height: 56 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.card,
          }}
        >
          <SparkleIcon width={34} height={34} color="#FFFFFF" style={{ marginLeft: 1, marginTop: -1 }} />
        </View>
      </Animated.View>
    </Pressable>
  );
}
