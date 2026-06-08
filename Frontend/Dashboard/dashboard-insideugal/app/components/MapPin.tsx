import React from 'react';
import Image from 'next/image';
import { getBuildingLetter, isFacilityOpen } from '../utils/map-helper';

interface MapPinProps {
  name: string;
  facultyId?: string;
}

export function MapPin({ name, facultyId }: MapPinProps) {
  const isFacility = facultyId === 'f8';
  const open = isFacility ? isFacilityOpen(name) : true;
  const pinColor = isFacility ? (open ? '#E53935' : '#9E9E9E') : '#1e3a5f';
  const letter = getBuildingLetter(name);
  const lower = name.toLowerCase();

  const renderContent = () => {
    if (!isFacility) {
      return <span style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>{letter}</span>;
    }
    if (lower.includes('cantina')) return <Image src="/assets/icons/fork-knife.svg" width={18} height={18} alt="Iconiță Cantină" style={{ filter: 'brightness(0) invert(1)' }} />;
    if (lower.includes('biblioteca')) return <Image src="/assets/icons/book.svg" width={18} height={18} alt="Iconiță Bibliotecă" style={{ filter: 'brightness(0) invert(1)' }} />;
    if (lower.includes('cămin') || lower.includes('camin') || lower.includes('dorm')) return <Image src="/assets/icons/apartment.svg" width={18} height={18} alt="Iconiță Cămin" style={{ filter: 'brightness(0) invert(1)' }} />;
    if (lower.includes('consiliere')) return <Image src="/assets/icons/handshake.svg" width={18} height={18} alt="Iconiță Consiliere" style={{ filter: 'brightness(0) invert(1)' }} />;
    if (lower.includes('medic') || lower.includes('cabinet') || lower.includes('sănătate') || lower.includes('sanatate') || lower.includes('doctor')) return <Image src="/assets/icons/plus-big.svg" width={18} height={18} alt="Iconiță Cabinet Medical" style={{ filter: 'brightness(0) invert(1)' }} />;
    return <span style={{ color: 'white', fontSize: 13, fontWeight: 'bold' }}>{letter}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: open ? 1 : 0.6 }}>
      <div style={{
        backgroundColor: pinColor,
        borderRadius: '50%',
        width: 36,
        height: 36,
        border: '2px solid white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: open ? '0 2px 4px rgba(0,0,0,0.2)' : '0 1px 2px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      }}>
        {renderContent()}
      </div>
      <div style={{
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '8px solid white',
        marginTop: -2,
      }} />
    </div>
  );
}