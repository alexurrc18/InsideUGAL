interface FacultyRowProps {
  name: string;
  location: string;
  buildings: string; // Am adăugat această coloană
  image: string; 
  phone: string;
}

export default function FacultyRow({ name, location, buildings, phone }: FacultyRowProps) {
  return (
    <tr className="border-b border-steel-100 hover:bg-steel-50 transition-colors text-14">
      <td className="p-16 font-bold text-steel-800">{name}</td>
      <td className="p-16 text-steel-600">{location}</td>
      <td className="p-16 text-steel-600 font-medium italic">{buildings}</td>
      <td className="p-16">
        <div className="w-40 h-40 bg-steel-100 rounded border border-steel-200 flex items-center justify-center text-10 text-steel-400">Img</div>
      </td>
      <td className="p-16 text-steel-500">{phone}</td>
      <td className="p-16">
        <div className="flex gap-8">
          <button className="w-32 h-32 bg-steel-200 rounded hover:bg-steel-300 flex items-center justify-center">✏️</button>
          <button className="w-32 h-32 bg-steel-200 rounded hover:bg-steel-300 flex items-center justify-center">🗑️</button>
        </div>
      </td>
    </tr>
  );
}
