import React from 'react';
import Image from 'next/image';
import { getBuildingLetter, isFacilityOpen } from '../utils/map-helper';

interface MapPinProps {
  name: string;
  facultyId?: string;
}

interface MapPinContentProps {
  isFacility: boolean;
  lower: string;
  letter: string;
}

function MapPinContent({ isFacility, lower, letter }: MapPinContentProps) {
  if (!isFacility) {
    return <span className="text-white text-[13px] font-bold">{letter}</span>;
  }
  if (lower.includes('cantina')) return <Image src="/assets/icons/fork-knife.svg" width={18} height={18} alt="Iconiță Cantină" className="brightness-0 invert" />;
  if (lower.includes('biblioteca')) return <Image src="/assets/icons/book.svg" width={18} height={18} alt="Iconiță Bibliotecă" className="brightness-0 invert" />;
  if (lower.includes('cămin') || lower.includes('camin') || lower.includes('dorm')) return <Image src="/assets/icons/apartment.svg" width={18} height={18} alt="Iconiță Cămin" className="brightness-0 invert" />;
  if (lower.includes('consiliere')) return <Image src="/assets/icons/handshake.svg" width={18} height={18} alt="Iconiță Consiliere" className="brightness-0 invert" />;
  if (lower.includes('medic') || lower.includes('cabinet') || lower.includes('sănătate') || lower.includes('sanatate') || lower.includes('doctor')) return <Image src="/assets/icons/plus-big.svg" width={18} height={18} alt="Iconiță Cabinet Medical" className="brightness-0 invert" />;
  return <span className="text-white text-[13px] font-bold">{letter}</span>;
}

export function MapPin({ name, facultyId }: MapPinProps) {
  const isFacility = facultyId === 'f8';
  const open = isFacility ? isFacilityOpen(name) : true;
  const pinColor = isFacility ? (open ? '#E53935' : '#9E9E9E') : '#1e3a5f';
  const letter = getBuildingLetter(name);
  const lower = name.toLowerCase();

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
        <MapPinContent isFacility={isFacility} lower={lower} letter={letter} />
      </div>
      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white -mt-0.5" />
    </div>
  );
}