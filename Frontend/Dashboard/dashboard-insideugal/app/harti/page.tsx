"use client";
import { useState } from "react";
import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

export default function Page() {
  console.log(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)
  const [position, setPosition] = useState<{lat: number, lng: number} | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [denumire, setDenumire] = useState("");
  const [adresa, setAdresa] = useState("");
  const [facultate, setFacultate] = useState("");

  const handleMapClick = (e: any) => {
    const newLat = e.detail.latLng.lat;
    const newLng = e.detail.latLng.lng;
    setPosition({ lat: newLat, lng: newLng });
    setLat(newLat.toFixed(6));
    setLng(newLng.toFixed(6));
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>Adăugare Clădire</h1>

      <div style={{ display: "flex", gap: "2rem" }}>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            placeholder="Denumire clădire"
            value={denumire}
            onChange={(e) => setDenumire(e.target.value)}
          />
          <input
            placeholder="Adresă"
            value={adresa}
            onChange={(e) => setAdresa(e.target.value)}
          />
          <input placeholder="Latitudine" value={lat} readOnly />
          <input placeholder="Longitudine" value={lng} readOnly />
          <select value={facultate} onChange={(e) => setFacultate(e.target.value)}>
            <option value="">— Neasociată —</option>
            <option>Facultatea de Inginerie</option>
            <option>Facultatea de Științe</option>
            <option>Facultatea de Drept</option>
            <option>Facultatea de Medicină</option>
          </select>
          <button onClick={() => console.log({ denumire, adresa, lat, lng, facultate })}>
            Salvează clădirea
          </button>
        </div>

        <div style={{ flex: 1, height: "400px" }}>
          <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}>
            <Map
              defaultCenter={{ lat: 45.4353, lng: 28.0501 }}
              defaultZoom={14}
              mapId="map"
              onClick={handleMapClick}
            >
              {position && <AdvancedMarker position={position} />}
            </Map>
          </APIProvider>
        </div>

      </div>
    </div>
  );
}