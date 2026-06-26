import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import Map from '@/components/map/map';
import { CategoryHeader } from '@/components/ui/display/category-header';
import api, { storage } from '@/services/api';

export default function HartaScreen() {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const insets = useSafeAreaInsets();
  const themeName = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const theme = Colors[themeName];

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        // Load cached data first for immediate render
        const [cachedFacs, cachedLocs] = await Promise.all([
          storage.getItem('cached_faculties'),
          storage.getItem('cached_facilities'),
        ]);

        if (active) {
          if (cachedFacs) setFaculties(JSON.parse(cachedFacs));
          if (cachedLocs) setLocations(JSON.parse(cachedLocs));
        }

        // Fetch fresh data from API
        const [facsRes, locsRes] = await Promise.all([
          api.get('/faculties/', { params: { page: 1, size: 50 } }),
          api.get('/locations/', { params: { page: 1, size: 50 } })
        ]);

        if (active) {
          if (facsRes.data?.items) {
            setFaculties(facsRes.data.items);
            await storage.setItem('cached_faculties', JSON.stringify(facsRes.data.items));
          }
          if (locsRes.data?.items) {
            setLocations(locsRes.data.items);
            await storage.setItem('cached_facilities', JSON.stringify(locsRes.data.items));
          }
        }
      } catch (err) {
        console.warn('[API] Error loading map screen data:', err);
      }
    }
    loadData();
    return () => { active = false; };
  }, []);

  const facultyFilters = useMemo(() => {
    return [
      { id: null, title: 'Toate locațiile' },
      { id: 'f8', title: 'Facilități' },
      ...faculties.map(f => ({
        id: f.id.toString(),
        title: f.abbreviation || f.name
      }))
    ];
  }, [faculties]);

  const mappedBuildings = useMemo(() => {
    return locations.map((item: any) => ({
      id: item.id.toString(),
      name: item.name,
      facultyIds: Array.isArray(item.faculty_ids) ? item.faculty_ids.map((id: number) => id.toString()) : [],
      isFacility: item.facility_id !== null && item.facility_id !== undefined,
      lat: item.coordinates.latitude,
      lng: item.coordinates.longitude,
      description: item.name,
    }));
  }, [locations]);

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
          buildings={mappedBuildings}
        />
      </View>
    </View>
  );
}
