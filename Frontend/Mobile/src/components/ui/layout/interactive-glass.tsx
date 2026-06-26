import { useColorScheme } from "@/hooks/use-color-scheme";
import React from 'react';
import { GlassView, GlassViewProps } from 'expo-glass-effect';
import { Platform } from "react-native";
import { Colors } from '@/constants/theme';

export interface InteractiveGlassProps extends Partial<GlassViewProps> {
  size?: number;
  children?: React.ReactNode;
}

export function InteractiveGlass({
  isInteractive = true,
  glassEffectStyle = { style: 'regular', animate: true },
  style,
  size,
  children,
  ...props
}: InteractiveGlassProps) {
  const sizeStyle = size ? { width: size, height: size, borderRadius: size / 2 } : {};
  const themeName = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const theme = Colors[themeName];

  return (
    <GlassView
      isInteractive={isInteractive}
      glassEffectStyle={glassEffectStyle}
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
        },
        sizeStyle,
        Platform.select({
          android: { backgroundColor: theme.primary },
        }),
        style,
      ]}
      {...props}
    >
      {children}
    </GlassView>
  );
}
