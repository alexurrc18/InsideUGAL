interface MapSource {
  type?: string;
  tiles?: unknown;
  url?: unknown;
}

interface MapLayer {
  layout?: {
    'icon-overlap'?: string;
    'icon-allow-overlap'?: boolean;
    'text-overlap'?: string;
    'text-allow-overlap'?: boolean;
    [key: string]: unknown;
  };
}

interface MapStyle {
  sources?: Record<string, MapSource>;
  layers?: MapLayer[];
  [key: string]: unknown;
}

export function getBuildingLetter(name: string): string {
  const clean = name.trim();
  if (clean.startsWith('Corp ')) {
    const part = clean.substring(5).trim();
    const parenIdx = part.indexOf('(');
    if (parenIdx !== -1) {
      return part.substring(0, parenIdx).trim();
    }
    return part;
  }
  if (clean.toLowerCase() === 'cantina') return 'C';
  if (clean.toLowerCase() === 'biblioteca') return 'B';
  return clean.substring(0, 2).toUpperCase();
}

export function isFacilityOpen(name: string, date: Date = new Date()): boolean {
  const lower = name.toLowerCase();
  const day = date.getDay();
  const hour = date.getHours();
  const min = date.getMinutes();
  const timeVal = hour * 100 + min;
  if (lower.includes('cantina')) {
    if (day >= 1 && day <= 5) {
      if (lower.includes('cămine') || lower.includes('camine')) return timeVal >= 1200 && timeVal <= 1700;
      if (lower.includes('corp j')) return timeVal >= 1200 && timeVal <= 1530;
      if (lower.includes('universitate')) {
        if (day >= 1 && day <= 4) return timeVal >= 1200 && timeVal <= 1530;
        if (day === 5) return timeVal >= 1200 && timeVal <= 1400;
      }
      return timeVal >= 1200 && timeVal <= 1530;
    }
    return false;
  }
  if (lower.includes('cabinet') || lower.includes('medic')) {
    if (day >= 1 && day <= 5) return timeVal >= 700 && timeVal <= 1500;
    return false;
  }
  if (lower.includes('biblioteca')) {
    if (day >= 1 && day <= 4) return timeVal >= 1230 && timeVal <= 1430;
    if (day === 5) return timeVal >= 1230 && timeVal <= 1330;
    return false;
  }
  if (lower.includes('consiliere')) {
    if (day >= 1 && day <= 5) return timeVal >= 800 && timeVal <= 1400;
    return false;
  }
  return true;
}

// Aici erau erorile de tip "any" la argument și return type
export function cleanMapStyle(style: MapStyle): MapStyle {
  if (!style) return style;
  
  if (style.sources) {
    Object.keys(style.sources).forEach((sourceId) => {
      const src = style.sources![sourceId];
      if (src && (src.type === 'vector' || src.type === 'raster')) {
        if (!src.tiles && !src.url) {
          delete style.sources![sourceId];
        }
      }
    });
  }
  
  if (style.layers) {
    style.layers.forEach((layer) => {
      if (layer.layout) {
        if (layer.layout['icon-overlap'] !== undefined) {
          layer.layout['icon-allow-overlap'] = layer.layout['icon-overlap'] === 'always';
          delete layer.layout['icon-overlap'];
        }
        if (layer.layout['text-overlap'] !== undefined) {
          layer.layout['text-allow-overlap'] = layer.layout['text-overlap'] === 'always';
          delete layer.layout['text-overlap'];
        }
      }
    });
  }
  
  return style;
}