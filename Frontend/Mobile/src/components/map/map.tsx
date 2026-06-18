import React, { useEffect, useRef, useMemo, memo, useState } from 'react';
import { View, Text } from 'react-native';

let MapLibre: any = null;
let Camera: any = null;
let Marker: any = null;

try {
  const MapLibreModule = require('@maplibre/maplibre-react-native');
  MapLibre = MapLibreModule.Map;
  Camera = MapLibreModule.Camera;
  Marker = MapLibreModule.Marker;
} catch (e) {
  console.error('MapLibre module could not be loaded:', e);
}

import { Colors } from '@/constants/theme';
import { Spacing } from '@/constants/spacing';
import { Config } from '@/constants/config';
import { MapPin } from './map-pin';
import { cleanMapStyle } from '@/utils/map-helper';

interface MapProps {
  themeName: 'light' | 'dark';
  selectedFacultyId: string | null;
  onFacultySelect: (id: string | null) => void;
  buildings?: any[];
}

const MapComponent = ({ themeName, selectedFacultyId, onFacultySelect, buildings }: MapProps) => {
  const cameraRef = useRef<any>(null);
  const theme = Colors[themeName];

  const [defaultCenter, setDefaultCenter] = useState<[number, number] | undefined>(undefined);
  const [defaultZoom, setDefaultZoom] = useState<number | undefined>(undefined);
  const [defaultPitch, setDefaultPitch] = useState<number | undefined>(undefined);
  const [defaultBearing, setDefaultBearing] = useState<number | undefined>(undefined);
  const [mapStyle, setMapStyle] = useState<any>(null);
  const cameraInitialized = useRef(false);

  useEffect(() => {
    fetch(Config.MAPTILER_STYLE_URL)
      .then(res => res.json())
      .then(style => {
        if (style.center) setDefaultCenter(style.center);
        if (style.zoom) setDefaultZoom(style.zoom);
        if (style.pitch !== undefined) setDefaultPitch(style.pitch);
        if (style.bearing !== undefined) setDefaultBearing(style.bearing);
        setMapStyle(cleanMapStyle(style));
      })
      .catch(err => {
        console.error('Failed to fetch MapTiler style:', err);
        setMapStyle(Config.MAPTILER_STYLE_URL);
      });
  }, []);

  const visibleBuildings = useMemo(() => {
    const sourceBuildings = buildings && buildings.length > 0 ? buildings : [];
    const list = !selectedFacultyId
      ? sourceBuildings
      : sourceBuildings.filter(b => b.facultyId === selectedFacultyId);
    return [...list].sort((a, b) => b.lat - a.lat);
  }, [buildings, selectedFacultyId]);

  useEffect(() => {
    if (!cameraRef.current || !MapLibre || !defaultCenter || cameraInitialized.current) return;

    try {
      cameraRef.current.setStop({
        center: defaultCenter,
        zoom: defaultZoom,
        pitch: defaultPitch,
        bearing: defaultBearing,
      });
      cameraInitialized.current = true;
    } catch (e) {
      console.warn('Map camera setStop error:', e);
    }
  }, [defaultCenter, defaultZoom, defaultPitch, defaultBearing]);

  if (!MapLibre || !mapStyle) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{!MapLibre ? 'Eroare încărcare modul hartă.' : 'Se încarcă harta...'}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, borderRadius: Spacing.lg, overflow: 'hidden' }}>
      <MapLibre
        style={{ flex: 1 }}
        mapStyle={typeof mapStyle === 'object' ? JSON.stringify(mapStyle) : mapStyle}
        logo={false}
        attribution={false}
      >
        <Camera
          ref={cameraRef}
          initialViewState={defaultCenter ? {
            center: defaultCenter,
            zoom: defaultZoom,
            pitch: defaultPitch,
            bearing: defaultBearing,
          } : undefined}
        />

        {visibleBuildings.map(b => {
          const zIndex = Math.round((90 - b.lat) * 1000000);
          return (
            <Marker
              key={b.id}
              id={b.id}
              lngLat={[b.lng, b.lat]}
              anchor="bottom"
              onPress={() => {
                if (cameraRef.current) {
                  try {
                    cameraRef.current.setStop({
                      center: [b.lng, b.lat],
                      zoom: defaultZoom,
                    });
                  } catch (e) {
                    console.warn('Map camera setStop on marker press error:', e);
                  }
                }
              }}
            >
              <View style={{ zIndex }}>
                <MapPin name={b.name} facultyId={b.facultyId} />
              </View>
            </Marker>
          );
        })}
      </MapLibre>
    </View>
  );
};

export default memo(MapComponent);