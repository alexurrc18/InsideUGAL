interface BuildingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BuildingModal({ isOpen, onClose }: BuildingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-16 backdrop-blur-sm">
      {/* max-h-[90vh] și overflow-y-auto adăugate ca să nu se mai blocheze pe ecrane mai mici */}
      <div className="bg-white w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-32 relative border border-steel-100">
        
        {/* Butonul X pentru închidere consistent cu restul componentelor */}
        <button 
          onClick={onClose} 
          className="absolute top-16 right-16 text-steel-400 hover:text-steel-800 text-24 font-bold transition-colors"
        >
          ✕
        </button>
        
        <h2 className="text-24 font-black text-steel-800 mb-24 border-b border-steel-100 pb-12 uppercase tracking-tight">
          Adaugă / Editează Clădire
        </h2>

        <form className="space-y-24">
          <div>
            <label className="block text-12 font-black uppercase text-steel-500 mb-8">
              Nume Clădire* (Ex: Corp D, Corp Ș)
            </label>
            <input 
              type="text" 
              placeholder="Introduceți corpul..."
              className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg outline-none focus:border-steel-800 transition-all" 
            />
          </div>

          <div>
            <label className="block text-12 font-black uppercase text-steel-500 mb-8">
              Adresă / Locație Campus
            </label>
            <input 
              type="text" 
              placeholder="Ex: Strada Domnească nr. 111..."
              className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg outline-none focus:border-steel-800 transition-all" 
            />
          </div>

          <div>
            <label className="block text-12 font-black uppercase text-steel-500 mb-8">
              Facultăți care activează aici
            </label>
            <textarea 
              placeholder="Enumerați facultățile (ex: Automatică, Calculatoare...)" 
              className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg h-100 resize-none outline-none focus:border-steel-800 transition-all"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
            <div>
              <label className="block text-12 font-black uppercase text-steel-500 mb-8">
                Coordonate (Lat/Long)
              </label>
              <input 
                type="text" 
                placeholder="Ex: 45.4475, 28.0519" 
                className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg outline-none focus:border-steel-800 transition-all" 
              />
            </div>
            <div>
              <label className="block text-12 font-black uppercase text-steel-500 mb-8">
                Thumbnail
              </label>
              <input 
                type="text" 
                placeholder="Link imagine (https://...)" 
                className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg outline-none focus:border-steel-800 transition-all" 
              />
            </div>
          </div>

          <div className="flex justify-end gap-12 pt-12 border-t border-steel-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-24 py-12 rounded-lg font-bold text-steel-500 hover:bg-steel-100 transition-all"
            >
              Anulează
            </button>
            <button 
              type="submit" 
              className="bg-steel-800 text-white px-24 py-12 rounded-lg font-bold hover:bg-steel-900 shadow-lg shadow-steel-200 transition-all active:scale-95"
            >
              Salvează Clădirea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}