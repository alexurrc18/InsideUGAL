import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Config } from '@/constants/config';
import { cleanMapStyle } from '@/utils/map-helper';
import { createRoot, flushSync } from 'react-dom/client';
import { MapPin } from './map-pin';
import { UserLocationPin } from './user-location-pin';

interface MapProps {
  themeName: 'light' | 'dark';
  selectedFacultyId: string | null;
  onFacultySelect: (id: string | null) => void;
  buildings?: any[];
  userLocation?: { lat: number; lng: number } | null;
  onMapClick?: () => void;
  focusKey?: number;
}

export default function Map({ themeName, selectedFacultyId, onFacultySelect, buildings, userLocation, onMapClick, focusKey }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const rootsRef = useRef<any[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userRootRef = useRef<any | null>(null);

  const [defaultCenter, setDefaultCenter] = useState<[number, number] | undefined>(undefined);
  const [defaultZoom, setDefaultZoom] = useState<number | undefined>(undefined);
  const [defaultPitch, setDefaultPitch] = useState<number | undefined>(undefined);
  const [defaultBearing, setDefaultBearing] = useState<number | undefined>(undefined);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState<any>(null);
  const cameraInitialized = useRef(false);

  useEffect(() => {
    if (!Config.MAPTILER_STYLE_URL) return;
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

  useEffect(() => {
    if (!mapStyle || map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: mapStyle,
      antialias: true
    } as any);

    map.current = m;

    m.on('load', () => {
      setMapLoaded(true);
    });

    if (onMapClick) {
      m.on('click', onMapClick);
    }

    return () => {
      rootsRef.current.forEach(root => {
        try {
          flushSync(() => root.unmount());
        } catch {}
      });
      rootsRef.current = [];
      m.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [mapStyle]);

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
        flushSync(() => root.unmount());
      } catch {}
    });
    rootsRef.current = [];

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const sourceBuildings = buildings && buildings.length > 0 ? buildings : [];
    const list = selectedFacultyId
      ? sourceBuildings.filter(b => b.facultyId === selectedFacultyId)
      : sourceBuildings;
    const visibleBuildings = [...list].sort((a, b) => b.lat - a.lat);

    visibleBuildings.forEach(b => {
      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.style.zIndex = Math.round((90 - b.lat) * 1000000).toString();

      const root = createRoot(el);
      root.render(<MapPin name={b.name} facultyId={b.facultyId} />);
      rootsRef.current.push(root);

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
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
  }, [mapLoaded, selectedFacultyId, defaultCenter, defaultZoom, themeName, buildings]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    if (!userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userRootRef.current) {
        const root = userRootRef.current;
        setTimeout(() => { try { root.unmount(); } catch {} }, 0);
        userRootRef.current = null;
      }
      return;
    }

    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.style.cursor = 'pointer';
      el.style.zIndex = '99999999';

      const root = createRoot(el);
      root.render(<UserLocationPin />);
      userRootRef.current = root;

      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([userLocation.lng, userLocation.lat])
        .addTo(map.current);

      userMarkerRef.current = marker;
    } else {
      userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
    }
  }, [userLocation, mapLoaded]);

  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Force map to recalculate size when screen comes into focus
    map.current.resize();

    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([userLocation.lng, userLocation.lat]);
        userMarkerRef.current.addTo(map.current);
      } else {
        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.style.zIndex = '99999999';

        const root = createRoot(el);
        root.render(<UserLocationPin />);
        userRootRef.current = root;

        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([userLocation.lng, userLocation.lat])
          .addTo(map.current);

        userMarkerRef.current = marker;
      }
    }
  }, [focusKey, mapLoaded]);

  useEffect(() => {
    return () => {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userRootRef.current) {
        const root = userRootRef.current;
        setTimeout(() => { try { root.unmount(); } catch {} }, 0);
        userRootRef.current = null;
      }
    };
  }, []);

  if (!mapStyle) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: '16px' }}>
        <span style={{ color: '#121212' }}>Se încarcă harta...</span>
      </div>
    );
  }

  return (
    <div 
      ref={mapContainer} 
      style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }} 
    />
  );
}