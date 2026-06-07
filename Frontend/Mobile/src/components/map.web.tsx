import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MockData from '@/constants/mock-data.json';
import { Config } from '@/constants/config';
import { Colors } from '@/constants/theme';
import { getBuildingLetter } from '@/utils/map-helper';

interface MapProps {
  themeName: 'light' | 'dark';
  selectedFacultyId: string | null;
  onFacultySelect: (id: string | null) => void;
}

export default function Map({ themeName, selectedFacultyId, onFacultySelect }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

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

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const visibleBuildings = selectedFacultyId
      ? MockData.buildings.filter(b => b.facultyId === selectedFacultyId)
      : MockData.buildings;

    const theme = Colors[themeName];

    visibleBuildings.forEach(b => {
      const el = document.createElement('div');
      
      el.style.display = 'flex';
      el.style.flexDirection = 'column';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.cursor = 'pointer';

      const isFacility = b.facultyId === 'f8';
      const pinColor = isFacility ? theme.secondary : theme.primary;

      const bubble = document.createElement('div');
      bubble.style.backgroundColor = pinColor;
      bubble.style.borderRadius = '50%';
      bubble.style.width = '36px';
      bubble.style.height = '36px';
      bubble.style.border = `2px solid ${theme.background}`;
      bubble.style.display = 'flex';
      bubble.style.alignItems = 'center';
      bubble.style.justifyContent = 'center';
      bubble.style.position = 'relative';
      bubble.style.zIndex = '1';

      if (!isFacility) {
        const text = document.createElement('span');
        text.innerText = getBuildingLetter(b.name);
        text.style.color = theme.textOnDark;
        text.style.fontSize = '13px';
        text.style.fontWeight = 'bold';
        text.style.fontFamily = 'sans-serif';
        text.style.textAlign = 'center';
        text.style.userSelect = 'none';
        bubble.appendChild(text);
      } else {
        const lower = b.name.toLowerCase();
        let svgMarkup = '';

        if (lower.includes('cantina')) {
          svgMarkup = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M14 2h-2v7h-2V2H8v7H6V2H4v8c0 1.65 1.35 3 3 3h1v9h2v-9h1c1.65 0 3-1.35 3-3zm3 11h1v9h2V3c0-.55-.45-1-1-1-1.65 0-3 1.35-3 3v7c0 .55.45 1 1 1"></path>
            </svg>
          `;
        } else if (lower.includes('biblioteca')) {
          svgMarkup = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M8 6h9v2H8z"></path>
              <path d="M20 2H6C4.35 2 3 3.35 3 5v14c0 1.65 1.35 3 3 3h15v-2H6c-.55 0-1-.45-1-1s.45-1 1-1h14c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1m-6 14H6c-.35 0-.69.07-1 .18V5c0-.55.45-1 1-1h13v12z"></path>
            </svg>
          `;
        } else if (lower.includes('cămin') || lower.includes('camin') || lower.includes('dorm')) {
          svgMarkup = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M19 2H9c-1.1 0-2 .9-2 2v5.59L2.29 14.3c-.29.29-.37.72-.22 1.09s.52.62.92.62v5c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V4c0-1.1-.9-2-2-2Zm-8 18H5v-5.59l3-3 3 3zm8 0h-6v-4a1.002 1.002 0 0 0 .7-1.71L8.99 9.58V3.99h10v16Z"></path>
              <path d="M11 6h2v2h-2zm4 0h2v2h-2zm0 4.03h2V12h-2zM7 15h2v2H7z"></path>
            </svg>
          `;
        } else if (lower.includes('medic') || lower.includes('cabinet') || lower.includes('sănătate') || lower.includes('sanatate') || lower.includes('doctor')) {
          svgMarkup = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
              <path d="M21 7.99h-5V3c0-.55-.45-1-1-1H9c-.55 0-1 .45-1 1v4.99H3c-.55 0-1 .45-1 1v6c0 .55.45 1 1 1h5V21c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-5.01h5c.55 0 1-.45 1-1v-6c0-.55-.45-1-1-1m-1 6h-5c-.55 0-1 .45-1 1V20h-4v-5.01c0-.55-.45-1-1-1H4v-4h5c.55 0 1-.45 1-1V4h4v4.99c0 .55.45 1 1 1h5z"></path>
            </svg>
          `;
        } else {
          const text = document.createElement('span');
          text.innerText = getBuildingLetter(b.name);
          text.style.color = theme.textOnDark;
          text.style.fontSize = '13px';
          text.style.fontWeight = 'bold';
          text.style.fontFamily = 'sans-serif';
          text.style.textAlign = 'center';
          text.style.userSelect = 'none';
          bubble.appendChild(text);
        }

        if (svgMarkup) {
          bubble.innerHTML = svgMarkup;
        }
      }

      el.appendChild(bubble);

      const arrow = document.createElement('div');
      arrow.style.width = '0px';
      arrow.style.height = '0px';
      arrow.style.borderLeft = '6px solid transparent';
      arrow.style.borderRight = '6px solid transparent';
      arrow.style.borderTop = `8px solid ${theme.background}`;
      arrow.style.marginTop = '-2px';
      arrow.style.filter = 'drop-shadow(0px 1px 1px rgba(0, 0, 0, 0.12))';
      arrow.style.position = 'relative';
      arrow.style.zIndex = '2';

      el.appendChild(arrow);

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