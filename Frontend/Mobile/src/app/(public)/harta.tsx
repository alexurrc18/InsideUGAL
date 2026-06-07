import React, { useState, useMemo, useCallback } from 'react';
import { View, useColorScheme } from 'react-native';
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

  const facultyFilters = useMemo(() => {
    const abbreviations: Record<string, string> = {
      'f1': 'ACIEE',
      'f2': 'Inginerie',
      'f3': 'FEAA',
      'f4': 'Medicină',
      'f5': 'Litere',
      'f6': 'Sport',
      'f7': 'FSED'
    };

    const list: Array<{ id: string | null; title: string }> = [
      { id: null, title: 'Toate locațiile' },
      { id: 'f8', title: 'Facilități' }
    ];

    MockData.faculties.forEach(f => {
      list.push({
        id: f.id,
        title: abbreviations[f.id] || f.title
      });
    });

    return list;
  }, []);

  const handleSelectFilter = useCallback((id: string | null) => {
    // If the same filter is clicked again, deselect it
    setSelectedFacultyId(prev => prev === id ? null : id);
  }, []);

  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: theme.background,
      paddingTop: insets.top + Spacing.md
    }}>
      <CategoryHeader 
        title='Facultăți'
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