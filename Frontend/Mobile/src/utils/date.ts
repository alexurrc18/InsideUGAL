/**
 * Formatează o dată din formatul "21 septembrie 2026" în "Luni, 21 sept."
 */
export const getFormattedDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split(" ");
    if (parts.length < 2) return dateStr;

    const day = parts[0];
    const monthName = parts[1].toLowerCase();
    const year = parts[2] || "2026";

    const monthRO: Record<string, number> = {
        'ianuarie': 0, 'februarie': 1, 'martie': 2, 'aprilie': 3, 'mai': 4, 'iunie': 5,
        'iulie': 6, 'august': 7, 'septembrie': 8, 'octombrie': 9, 'noiembrie': 10, 'decembrie': 11
    };
    const shortMonths = ['ian.', 'feb.', 'mar.', 'apr.', 'mai', 'iun.', 'iul.', 'aug.', 'sept.', 'oct.', 'nov.', 'dec.'];
    const dayNames = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă'];

    const monthIndex = monthRO[monthName];
    if (monthIndex === undefined) return dateStr;

    const d = new Date(parseInt(year), monthIndex, parseInt(day));
    const dayOfWeek = dayNames[d.getDay()];
    const shortMonth = shortMonths[monthIndex];

    return `${dayOfWeek}, ${day} ${shortMonth}`;
};

/**
 * Calculează timpul de citire estimat bazat pe lungimea textului
 */
export const getReadingTime = (text?: string) => {
    if (!text) return "1 min citire";
    const words = text.split(/\s+/).length;
    const minutes = Math.max(1, Math.ceil(words / 200));
    return `${minutes} min citire`;
};

/**
 * Convertește o dată din formatul "21 septembrie 2026" și un timp opțional "10:00" într-un obiect Date
 */
export const parseRomanianDate = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return new Date();
    
    // Eliminăm eventualele caractere suplimentare (ex: virgule)
    const cleanDateStr = dateStr.replace(",", "");
    const parts = cleanDateStr.trim().split(/\s+/);
    
    if (parts.length < 2) return new Date();

    const day = parseInt(parts[0]);
    const monthName = parts[1].toLowerCase();
    
    // Dacă anul lipsește, presupunem anul curent sau 2026 conform contextului proiectului
    const year = parseInt(parts[2] || "2026");

    const monthRO: Record<string, number> = {
        'ianuarie': 0, 'februarie': 1, 'martie': 2, 'aprilie': 3, 'mai': 4, 'iunie': 5,
        'iulie': 6, 'august': 7, 'septembrie': 8, 'octombrie': 9, 'noiembrie': 10, 'decembrie': 11
    };

    const monthIndex = monthRO[monthName] !== undefined ? monthRO[monthName] : 0;
    
    let hours = 0;
    let minutes = 0;
    if (timeStr) {
        // Suport pentru formate ca "10:00" sau "10"
        const timeParts = timeStr.split(":");
        hours = parseInt(timeParts[0]) || 0;
        minutes = parseInt(timeParts[1]) || 0;
    }

    return new Date(year, monthIndex, day, hours, minutes);
};
