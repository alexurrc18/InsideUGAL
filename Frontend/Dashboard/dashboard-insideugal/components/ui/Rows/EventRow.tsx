interface EventRowProps {
  title: string;
  description: string;
  location: string;
  period: string; // Ex: "21 mai 2026 - 26 mai 2026"
}

export default function EventRow({ title, description, location, period }: EventRowProps) {
  return (
    <tr className="border-b border-steel-100 hover:bg-steel-50 transition-colors">
      {/* Titlu Eveniment - Bold */}
      <td className="p-16 font-bold text-steel-800 text-14">
        {title}
      </td>
      
      {/* Descriere - Truncată dacă e prea lungă */}
      <td className="p-16 text-steel-600 text-14 max-w-xs truncate">
        {description}
      </td>
      
      {/* Locație (ex: FACIEE, Cantină, etc.) */}
      <td className="p-16 text-steel-500 text-14 font-medium uppercase">
        {location}
      </td>
      
      {/* Perioadă / Data */}
      <td className="p-16 text-steel-400 text-12 leading-relaxed">
        {period}
      </td>
      
      {/* Acțiuni (Edit/Delete) */}
      <td className="p-16">
        <div className="flex gap-8">
          <button className="w-32 h-32 bg-steel-200 rounded hover:bg-steel-300 flex items-center justify-center">
            <span className="text-12">✏️</span>
          </button>
          <button className="w-32 h-32 bg-steel-200 rounded hover:bg-steel-300 flex items-center justify-center">
            <span className="text-12">🗑️</span>
          </button>
        </div>
      </td>
    </tr>
  );
}