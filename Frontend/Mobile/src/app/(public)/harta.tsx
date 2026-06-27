import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '@/constants/theme';
import Map from '@/components/map/map';
import { CategoryHeader } from '@/components/ui/display/category-header';
import api, { storage } from '@/services/api';
import { ErrorState } from '@/components/ui/display/error-state';
import * as Location from 'expo-location';

export default function HartaScreen() {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const insets = useSafeAreaInsets();
  const themeName = (useColorScheme() ?? 'light') as keyof typeof Colors;
  const theme = Colors[themeName];
  const [hasError, setHasError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setHasError(false);
      // Load cached data first for immediate render
      const [cachedFacs, cachedLocs] = await Promise.all([
        storage.getItem('cached_faculties'),
        storage.getItem('cached_facilities'),
      ]);

      if (cachedFacs) setFaculties(JSON.parse(cachedFacs));
      if (cachedLocs) setLocations(JSON.parse(cachedLocs));

      // Fetch fresh data from API
      const [facsRes, locsRes] = await Promise.all([
        api.get('/faculties/', { params: { page: 1, size: 50 } }),
        api.get('/locations/', { params: { page: 1, size: 50 } })
      ]);

      if (facsRes.data?.items) {
        setFaculties(facsRes.data.items);
        await storage.setItem('cached_faculties', JSON.stringify(facsRes.data.items));
      }
      if (locsRes.data?.items) {
        setLocations(locsRes.data.items);
        await storage.setItem('cached_facilities', JSON.stringify(locsRes.data.items));
      }
    } catch (err) {
      console.warn('[API] Error loading map screen data:', err);
      setHasError(true);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        (loc) => setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
      );
    })();

    return () => { subscription?.remove(); };
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
      facultyId: item.faculty_id !== null ? item.faculty_id.toString() : 'f8',
      lat: item.coordinates.latitude,
      lng: item.coordinates.longitude,
      description: item.name,
    }));
  }, [locations]);

  const handleSelectFilter = useCallback((id: string | null) => {
    setSelectedFacultyId(prev => prev === id ? null : id);
  }, []);

  if (hasError && locations.length === 0) {
    return <ErrorState onRetry={loadData} />;
  }

  return (
    <View style={{
      flex: 1,
      backgroundColor: theme.background,
      paddingTop: insets.top + Spacing.md,
    }}>
      <CategoryHeader
        title='Hartă'
        filters={facultyFilters}
        selectedFilterId={selectedFacultyId}
        onSelectFilter={handleSelectFilter}
      />

      <View style={{
        flex: 1,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.md,
        marginBottom: insets.bottom + Spacing.lg,
      }}>
        <Map
          themeName={themeName}
          selectedFacultyId={selectedFacultyId}
          onFacultySelect={setSelectedFacultyId}
          buildings={mappedBuildings}
          userLocation={userLocation}
        />
      </View>
    </View>
  );
}