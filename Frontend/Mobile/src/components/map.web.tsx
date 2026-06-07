import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MockData from '@/constants/mock-data.json';
import { Config } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { getBuildingLetter } from '@/utils/map-helper';
import { createRoot } from 'react-dom/client';
import { MapPin } from './map-pin';

interface MapProps {
  themeName: 'light' | 'dark';
  selectedFacultyId: string | null;
  onFacultySelect: (id: string | null) => void;
}

export default function Map({ themeName, selectedFacultyId, onFacultySelect }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const rootsRef = useRef<any[]>([]);

  const [defaultCenter, setDefaultCenter] = useState<[number, number] | undefined>(undefined);
  const [defaultZoom, setDefaultZoom] = useState<number | undefined>(undefined);
  const [defaultPitch, setDefaultPitch] = useState<number | undefined>(undefined);
  const [defaultBearing, setDefaultBearing] = useState<number | undefined>(undefined);
  const [mapLoaded, setMapLoaded] = useState(false);
  const cameraInitialized = useRef(false);

  useEffect(() => {
    fetch(Config.MAPTILER_STYLE_URL)
      .then(res => res.json())
      .then(style => {
        if (style.center) setDefaultCenter(style.center);
        if (style.zoom) setDefaultZoom(style.zoom);
        if (style.pitch !== undefined) setDefaultPitch(style.pitch);
        if (style.bearing !== undefined) setDefaultBearing(style.bearing);
      })
      .catch(err => console.error('Failed to fetch MapTiler style:', err));
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: Config.MAPTILER_STYLE_URL,
      antialias: true
    } as any);

    map.current = m;

    m.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      rootsRef.current.forEach(root => {
        try {
          root.unmount();
        } catch (e) {
        }
      });
      rootsRef.current = [];
      m.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    if (!map.current || !defaultCenter || cameraInitialized.current) return;

    map.current.jumpTo({
      center: defaultCenter,
      zoom: defaultZoom,
      pitch: defaultPitch,
      bearing: defaultBearing,
    });
    cameraInitialized.current = true;
  }, [defaultCenter, defaultZoom, defaultPitch, defaultBearing]);

  useEffect(() => {
    if (!map.current || !defaultCenter) return;

    rootsRef.current.forEach(root => {
      try {
        root.unmount();
      } catch (e) {
      }
    });
    rootsRef.current = [];

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const visibleBuildings = selectedFacultyId
      ? MockData.buildings.filter(b => b.facultyId === selectedFacultyId)
      : MockData.buildings;

    visibleBuildings.forEach(b => {
      const el = document.createElement('div');
      el.style.cursor = 'pointer';

      const root = createRoot(el);
      root.render(<MapPin name={b.name} facultyId={b.facultyId} />);
      rootsRef.current.push(root);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (map.current) {
          map.current.flyTo({
            center: [b.lng, b.lat],
            zoom: defaultZoom ?? map.current.getZoom(),
          });
        }
      });

      const marker = new maplibregl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([b.lng, b.lat])
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [mapLoaded, selectedFacultyId, defaultCenter, defaultZoom, themeName]);

  return (
    <div 
      ref={mapContainer} 
      style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }} 
    />
  );
}