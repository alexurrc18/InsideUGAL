"use client";
import { useState } from "react";
import Map, { Marker, Popup } from "react-map-gl/maplibre";
import { Config } from "../../lib/config";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin } from "./MapPin";

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
    >
      {cladiri.map((c) => (
        c.lat && c.lng && (
          <Marker
            key={c.id}
            longitude={parseFloat(c.lng)}
            latitude={parseFloat(c.lat)}
            onClick={() => setSelected(c)}
          >
            <MapPin name={c.denumire} facultyId={c.facultate} />
          </Marker>
        )
      ))}
      {selected && (
        <Popup
          longitude={parseFloat(selected.lng)}
          latitude={parseFloat(selected.lat)}
          onClose={() => setSelected(null)}
        >
          <div><strong>{selected.denumire}</strong><p>{selected.adresa}</p></div>
        </Popup>
      )}
    </Map>
  );
}