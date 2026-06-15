import React from 'react';
import { GlassView, GlassViewProps } from 'expo-glass-effect';

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
        style,
      ]}
      {...props}
    >
      {children}
    </GlassView>
  );
}
