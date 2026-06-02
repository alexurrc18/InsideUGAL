interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserModal({ isOpen, onClose }: UserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-16 backdrop-blur-sm">
      {/* max-h-[90vh] și overflow-y-auto pentru a preveni blocarea în ecran */}
      <div className="bg-white w-full max-w-[500px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-32 relative border border-steel-100">
        
        {/* Buton Închidere X */}
        <button 
          onClick={onClose} 
          className="absolute top-16 right-16 text-steel-400 hover:text-steel-800 font-bold transition-colors text-24"
        >
          ✕
        </button>
        
        <div className="flex flex-col items-center mb-24 text-center">
          <div className="w-64 h-64 bg-steel-100 rounded-full flex items-center justify-center text-24 mb-12 border border-steel-200 shadow-sm">
            👤
          </div>
          <h2 className="text-20 font-black text-steel-800 uppercase tracking-tight">
            Editare Profil Utilizator
          </h2>
        </div>

        <form className="space-y-20">
          <div>
            <label className="block text-12 font-black mb-6 text-steel-500 uppercase tracking-widest">
              Nume Complet
            </label>
            <input 
              type="text" 
              placeholder="Ex: Ion Popescu" 
              className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg outline-none focus:border-steel-800 transition-all shadow-sm" 
            />
          </div>

          <div>
            <label className="block text-12 font-black mb-6 text-steel-500 uppercase tracking-widest">
              Email Instituțional
            </label>
            <input 
              type="email" 
              placeholder="nume@student.ugal.ro" 
              className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg outline-none focus:border-steel-800 transition-all shadow-sm" 
            />
          </div>

          <div>
            <label className="block text-12 font-black mb-8 text-steel-500 uppercase tracking-widest">
              Nivel Acces & Responsabilități
            </label>
            <select className="w-full p-12 bg-white border border-steel-200 rounded-lg focus:border-steel-800 outline-none transition-all font-medium text-14 cursor-pointer shadow-sm">
              <option value="admin">🔴 Șef de departament (Acces Total)</option>
              <option value="staff">🟡 Profesor / Staff (Gestiune Conținut)</option>
              <option value="student_responsabil">🟢 Student Responsabil (Operativ)</option>
              <option value="student">🔵 Student (Vizualizare & Raportare)</option>
            </select>
            
            <div className="mt-12 text-11 text-steel-400 italic leading-relaxed bg-steel-50 p-12 rounded-lg border border-dashed border-steel-200">
              <span className="font-bold text-steel-500">Notă:</span> Alocarea unui rol superior permite modificarea datelor oficiale ale sistemului InsideUGAL.
            </div>
          </div>

          <div className="flex flex-col gap-10 pt-10 border-t border-steel-100">
            <button 
              type="submit" 
              className="w-full bg-steel-800 text-white py-14 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-[0.98]"
            >
              Salvează Modificările
            </button>
            <button 
              type="button" 
              onClick={onClose} 
              className="w-full text-steel-500 py-10 font-bold hover:text-steel-800 transition-all text-14 text-center"
            >
              Anulează
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}