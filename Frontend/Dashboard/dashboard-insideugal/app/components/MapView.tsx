"use client";
import { APIProvider, Map as GoogleMap, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";

interface Cladire {
  id: number;
  denumire: string;
  adresa: string;
  lat: string;
  lng: string;
  facultate: string;
}

export default function MapView({ cladiri }: { cladiri: Cladire[] }) {
  const [selected, setSelected] = useState<Cladire | null>(null);

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
      <GoogleMap defaultCenter={{ lat: 45.4353, lng: 28.0501 }} defaultZoom={14} mapId="map" style={{ height: "100%", width: "100%" }}>
        {cladiri.map((c) => (
          c.lat && c.lng && (
            <AdvancedMarker
              key={c.id}
              position={{ lat: parseFloat(c.lat), lng: parseFloat(c.lng) }}
              onClick={() => setSelected(c)}
            />
          )
        ))}
        {selected && (
          <InfoWindow position={{ lat: parseFloat(selected.lat), lng: parseFloat(selected.lng) }} onCloseClick={() => setSelected(null)}>
            <div><strong>{selected.denumire}</strong><p>{selected.adresa}</p></div>
          </InfoWindow>
        )}
      </GoogleMap>
    </APIProvider>
  );
}