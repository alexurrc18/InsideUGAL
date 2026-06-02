interface FacultyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FacultyModal({ isOpen, onClose }: FacultyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-16 backdrop-blur-sm">
      {/* Containerul are acum text-left, w-[550px] forțat și flex-col ca să alinieze totul curat de sus în jos */}
      <div className="bg-white w-full max-w-[550px] max-h-[85vh] flex flex-col rounded-xl shadow-2xl relative border border-steel-100 text-left">
        
        {/* Buton Închidere X */}
        <button 
          onClick={onClose} 
          className="absolute top-20 right-20 text-steel-400 hover:text-steel-800 text-24 font-bold transition-colors z-10"
        >
          ✕
        </button>
        
        {/* Header fix */}
        <div className="p-24 pb-16 border-b border-steel-100">
          <h2 className="text-20 font-black text-[#003A70] uppercase tracking-tight">
            Adaugă / Editează Facultate
          </h2>
        </div>

        {/* Zona de formular cu scroll propriu, perfect aliniată */}
        <div className="p-24 overflow-y-auto flex-1">
          <form className="space-y-20">
            <div>
              <label className="block text-12 font-black uppercase text-steel-500 mb-6 tracking-wider">
                Nume Facultate*
              </label>
              <input 
                type="text" 
                placeholder="Ex: Facultatea de Automatizare și Calculatoare" 
                className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg focus:border-[#003A70] outline-none transition-all text-14 text-steel-800" 
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
              <div>
                <label className="block text-12 font-black uppercase text-steel-500 mb-6 tracking-wider">
                  Locație (Corp)
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Corp D" 
                  className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg focus:border-[#003A70] outline-none transition-all text-14 text-steel-800" 
                />
              </div>
              <div>
                <label className="block text-12 font-black uppercase text-steel-500 mb-6 tracking-wider">
                  Contact (Telefon)
                </label>
                <input 
                  type="text" 
                  placeholder="0236 xxxxxxx" 
                  className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg focus:border-[#003A70] outline-none transition-all text-14 text-steel-800" 
                />
              </div>
            </div>

            <div>
              <label className="block text-12 font-black uppercase text-steel-500 mb-6 tracking-wider">
                Thumbnail (Imagine URL)
              </label>
              <input 
                type="text" 
                placeholder="https://upload.wikimedia.org/..." 
                className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg focus:border-[#003A70] outline-none transition-all text-14 text-steel-800" 
              />
            </div>
          </form>
        </div>

        {/* Footer fix pentru butoane */}
        <div className="p-24 pt-16 border-t border-steel-100 flex justify-end gap-12 bg-steel-50/50 rounded-b-xl">
          <button 
            type="button" 
            onClick={onClose}
            className="px-20 py-10 rounded-lg font-bold text-steel-500 hover:bg-steel-100 transition-all text-14"
          >
            Anulează
          </button>
          <button 
            type="submit" 
            className="bg-[#003A70] text-white px-20 py-10 rounded-lg font-bold hover:bg-[#002548] shadow-md transition-all active:scale-95 text-14"
          >
            Salvează
          </button>
        </div>

      </div>
    </div>
  );
}