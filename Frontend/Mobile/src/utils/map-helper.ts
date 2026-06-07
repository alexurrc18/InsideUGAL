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
  if (clean.toLowerCase() === 'cantina') {
    return 'C';
  }
  if (clean.toLowerCase() === 'biblioteca') {
    return 'B';
  }
  return clean.substring(0, 2).toUpperCase();
}
