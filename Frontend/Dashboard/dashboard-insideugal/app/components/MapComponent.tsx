"use client";
import { useState } from "react";
import Map, { Marker, MapLayerMouseEvent } from "react-map-gl/maplibre";
import { Config } from "@/lib/site-config";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapComponent({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = (e: MapLayerMouseEvent) => {
    // Verificăm dacă lngLat există pe eveniment pentru a evita erorile de runtime
    if (e.lngLat) {
      const { lat, lng } = e.lngLat;
      setPosition({ lat, lng });
      onLocationSelect(lat, lng);
    }
  };

  return (
    <Map
      initialViewState={{ 
        longitude: 28.0525, 
        latitude: 45.4450, 
        zoom: 15,
        pitch: 45,
        bearing: -10
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={Config.MAPTILER_STYLE_URL}
      onClick={handleMapClick}
    >
      {position && (
        <Marker longitude={position.lng} latitude={position.lat} />
      )}
    </Map>
  );
}