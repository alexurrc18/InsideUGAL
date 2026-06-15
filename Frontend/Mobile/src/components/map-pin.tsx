import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ColorScheme } from '@/constants/theme';
import { getBuildingLetter, isFacilityOpen } from '@/utils/map-helper';

import ForkKnifeIcon from '@/assets/icons/svg/fork-knife.svg';
import BookIcon from '@/assets/icons/svg/book.svg';
import ApartmentIcon from '@/assets/icons/svg/apartment.svg';
import PlusBigIcon from '@/assets/icons/svg/plus-big.svg';
import HandshakeIcon from '@/assets/icons/svg/handshake.svg';

interface MapPinProps {
  name: string;
  facultyId: string;
}

export const MapPin = ({ name, facultyId }: MapPinProps) => {
  const theme = useTheme();
  const letter = getBuildingLetter(name);
  const isFacility = facultyId === 'f8';
  const open = isFacility ? isFacilityOpen(name) : true;
  const pinColor = isFacility ? (open ? theme.secondary : theme.textSecondary) : ColorScheme.white;

  const renderContent = () => {
    if (!isFacility) {
      return (
        <Text style={{ color: theme.textOnDark, fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
          {letter}
        </Text>
      );
    }

    const lower = name.toLowerCase();
    if (lower.includes('cantina')) {
      return <ForkKnifeIcon width={18} height={18} fill="#FFFFFF" />;
    }
    if (lower.includes('biblioteca')) {
      return <BookIcon width={18} height={18} fill="#FFFFFF" />;
    }
    if (lower.includes('cămin') || lower.includes('camin') || lower.includes('dorm')) {
      return <ApartmentIcon width={18} height={18} fill="#FFFFFF" />;
    }
    if (lower.includes('consiliere')) {
      return <HandshakeIcon width={18} height={18} fill="#FFFFFF" />;
    }
    if (lower.includes('medic') || lower.includes('cabinet') || lower.includes('sănătate') || lower.includes('sanatate') || lower.includes('doctor')) {
      return <PlusBigIcon width={18} height={18} fill="#FFFFFF" />;
    }

    return (
      <Text style={{ color: theme.textOnDark, fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
        {letter}
      </Text>
    );
  };

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          opacity: open ? 1 : 0.6,
        },
        Platform.OS === 'web'
          ? ({ filter: `drop-shadow(0px 1.5px 2.5px rgba(0,0,0,${open ? 0.15 : 0.05}))` } as any)
          : {
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1.5 },
              shadowOpacity: open ? 0.15 : 0.05,
              shadowRadius: 2.5,
              elevation: open ? 3 : 1,
            }
      ]}
    >
      <View
        style={{
          backgroundColor: pinColor,
          borderRadius: 18,
          width: 36,
          height: 36,
          borderWidth: 2,
          borderColor: theme.background,
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        {renderContent()}
      </View>
      <View
        style={{
          width: 0,
          height: 0,
          backgroundColor: 'transparent',
          borderStyle: 'solid',
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: theme.background,
          marginTop: -2,
          zIndex: 2,
        }}
      />
    </View>
  );
};