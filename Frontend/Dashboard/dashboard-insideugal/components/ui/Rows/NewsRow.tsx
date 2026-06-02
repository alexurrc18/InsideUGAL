interface NewsRowProps {
  title: string;
  description: string;
  faculty: string;
  date: string;
}

export default function NewsRow({ title, description, faculty, date }: NewsRowProps) {
  return (
    <tr className="border-b border-steel-100 hover:bg-steel-50 transition-colors">
      {/* Titlu - Bold, conform Figma */}
      <td className="p-16 font-bold text-steel-800 text-14">
        {title}
      </td>
      
      {/* Descriere - Text mai gri și mai mic */}
      <td className="p-16 text-steel-600 text-14 max-w-xs truncate">
        {description}
      </td>
      
      {/* Facultăți relevante */}
      <td className="p-16 text-steel-500 text-14">
        {faculty}
      </td>
      
      {/* Data publicării */}
      <td className="p-16 text-steel-400 text-12">
        {date}
      </td>
      
      {/* Acțiuni (Pătrățelele gri din Figma) */}
      <td className="p-16">
        <div className="flex gap-8">
          <button className="w-32 h-32 bg-steel-200 rounded hover:bg-steel-300 transition-colors flex items-center justify-center">
            <span className="text-12">✏️</span>
          </button>
          <button className="w-32 h-32 bg-steel-200 rounded hover:bg-steel-300 transition-colors flex items-center justify-center">
            <span className="text-12">🗑️</span>
          </button>
        </div>
      </td>
    </tr>
  );
}