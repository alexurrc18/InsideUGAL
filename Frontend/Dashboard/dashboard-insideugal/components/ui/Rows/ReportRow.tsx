interface ReportRowProps {
  id: string;
  faculty: string; // Nou: Facultatea vizată
  category: string;
  description: string;
  author: string;
  hasImages: boolean; // Indică dacă studentul a urcat poze
  status: 'noua' | 'in_lucru' | 'rezolvata';
  date: string;
}

export default function ReportRow({ faculty, category, description, author, hasImages, status, date }: ReportRowProps) {
  const statusStyles = {
    noua: "bg-red-100 text-red-700 border-red-200",
    in_lucru: "bg-amber-100 text-amber-700 border-amber-200",
    rezolvata: "bg-green-100 text-green-700 border-green-200"
  };

  return (
    <tr className="border-b border-steel-100 hover:bg-steel-50 transition-colors">
      <td className="p-16 font-bold text-steel-800 text-14">{faculty}</td>
      <td className="p-16 text-steel-600 font-medium text-13 uppercase tracking-tight">{category}</td>
      <td className="p-16 text-steel-600 max-w-xs truncate text-14">{description}</td>
      <td className="p-16 text-steel-500 text-14">{author}</td>
      <td className="p-16 text-center">
        {hasImages ? <span title="Are poze atașate">🖼️</span> : <span className="opacity-20 text-12">Fără poze</span>}
      </td>
      <td className="p-16">
        <span className={`px-12 py-4 rounded-full text-11 font-black border ${statusStyles[status]}`}>
          {status.toUpperCase()}
        </span>
      </td>
      <td className="p-16 text-steel-400 text-12">{date}</td>
      <td className="p-16 flex gap-8">
        <button className="w-32 h-32 bg-steel-200 rounded hover:bg-steel-300 flex items-center justify-center">✏️</button>
        <button className="w-32 h-32 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center">🗑️</button>
      </td>
    </tr>
  );
}