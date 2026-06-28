import React from 'react';
import { View, Platform } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ColorScheme } from '@/constants/theme';
export const UserLocationPin = () => {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
        },
        Platform.OS === 'web'
          ? ({ filter: 'drop-shadow(0px 1.5px 2.5px rgba(0,0,0,0.2))' } as any)
          : {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1.5 },
              shadowOpacity: 0.2,
              shadowRadius: 2.5,
              elevation: 4,
            },
      ]}
    >
      <View
        style={{
          backgroundColor: theme.tertiary,
          borderRadius: 14,
          width: 28,
          height: 28,
          borderWidth: 2,
          borderColor: ColorScheme.white,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    </View>
  );
};
