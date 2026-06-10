import React, { useState, useMemo, useCallback } from 'react';
import { View, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import Map from '@/components/map';
import { CategoryHeader } from '@/components/ui/category-header';
import MockData from '@/constants/mock-data.json';

export default function HartaScreen() {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const themeName = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const theme = Colors[themeName];

  const facultyFilters = useMemo(() => [
    { id: null, title: 'Toate locațiile' },
    { id: 'f8', title: 'Facilități' },
    ...MockData.faculties.map(f => ({
      id: f.id,
      title: f.title
    }))
  ], []);

  const handleSelectFilter = useCallback((id: string | null) => {
    setSelectedFacultyId(prev => prev === id ? null : id);
  }, []);

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: theme.background,
      paddingTop: insets.top + Spacing.md + (Platform.OS === 'web' ? 80 : 0)
    }}>
      <CategoryHeader 
        title='Hartă'
        filters={facultyFilters}
        selectedFilterId={selectedFacultyId}
        onSelectFilter={handleSelectFilter}
      />
      
      <View style={{ 
        flex: 1, 
        marginLeft: Spacing.lg, 
        marginRight: Spacing.lg, 
        marginBottom: insets.bottom + Spacing.lg 
      }}>
        <Map 
          themeName={themeName} 
          selectedFacultyId={selectedFacultyId}
          onFacultySelect={setSelectedFacultyId}
        />
      </View>
    </View>
  );
}