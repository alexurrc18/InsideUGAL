"use client";
import { useState } from "react";
import { APIProvider, Map as GoogleMap, AdvancedMarker } from "@vis.gl/react-google-maps";

export default function MapComponent({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const handleMapClick = (e: any) => {
    const newLat = e.detail.latLng.lat;
    const newLng = e.detail.latLng.lng;
    setPosition({ lat: newLat, lng: newLng });
    onLocationSelect(newLat, newLng);
  };

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <GoogleMap
        defaultCenter={{ lat: 45.4353, lng: 28.0501 }}
        defaultZoom={14}
        mapId="map"
        onClick={handleMapClick}
        style={{ height: "100%", width: "100%" }}
      >
        {position && <AdvancedMarker position={position} />}
      </GoogleMap>
    </APIProvider>
  );
}