import Image from "next/image";

interface UserRowProps {
  name: string;
  email: string;
  role: 'admin' | 'staff' | 'student_responsabil' | 'student';
  imageUrl?: string;
}

export default function UserRow({ name, email, role, imageUrl }: UserRowProps) {
  const roleConfig = {
    admin: { label: 'Șef Departament', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    staff: { label: 'Profesor / Staff', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    student_responsabil: { label: 'Student Responsabil', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    student: { label: 'Student', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' }
  };

  const current = roleConfig[role];

  return (
    <tr className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors h-80">
      {/* Coloana 1: Profil */}
      <td className="p-16 align-middle">
        <div className="flex items-center gap-12">
          {/* Avatar forțat la 40px */}
          <div className="w-40 h-40 rounded-full overflow-hidden border border-zinc-200 bg-zinc-100 flex-shrink-0 relative">
            {imageUrl ? (
              <Image src={imageUrl} alt={name} fill className="object-cover" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400">👤</div>
            )}
          </div>
          <div className="flex flex-col justify-center">
            <p className="font-bold text-[#003A70] text-14 leading-none mb-4">{name}</p>
            <p className="text-12 text-zinc-400 leading-none">{email}</p>
          </div>
        </div>
      </td>
      
      {/* Coloana 2: Badge Status */}
      <td className="p-16 align-middle">
        <div className="flex items-center">
          <span className={`inline-flex items-center px-12 py-4 rounded-full text-11 font-bold border ${current.bg} ${current.text} ${current.border}`}>
            <span className={`w-6 h-6 rounded-full bg-current mr-8`}></span>
            {current.label}
          </span>
        </div>
      </td>

      {/* Coloana 3: Acțiuni */}
      <td className="p-16 align-middle text-right">
        <div className="flex gap-4 justify-end items-center">
          <button className="p-10 hover:bg-zinc-100 rounded-lg text-[#003A70] transition-all" title="Editare">
            ⚙️
          </button>
          <button className="p-10 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-lg transition-all" title="Elimină">
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
}