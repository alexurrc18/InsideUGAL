import React from 'react';
import { isFacilityOpen } from '../utils/map-helper';

interface MapPinProps {
  name: string;
  marker?: string | null;
  isFacility: boolean;
}

export function MapPin({ name, marker, isFacility }: MapPinProps) {
  const open = isFacility ? isFacilityOpen(name) : true;
  const pinColor = isFacility ? (open ? '#E53935' : '#9E9E9E') : '#1e3a5f';

  return (
    <div
      className="flex flex-col items-center"
      style={{ opacity: open ? 1 : 0.6 }}
    >
      <div
        className="rounded-full w-9 h-9 border-2 border-white flex items-center justify-center cursor-pointer"
        style={{
          backgroundColor: pinColor,
          boxShadow: open ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)',
        }}
      >
        <span className="max-w-full px-0.5 text-center text-[12px] font-bold leading-none text-white">
          {marker?.trim()}
        </span>
      </div>
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white -mt-0.5" />
    </div>
  );
}
