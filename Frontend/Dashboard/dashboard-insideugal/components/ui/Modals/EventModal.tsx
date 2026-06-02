interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EventModal({ isOpen, onClose }: EventModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-16 backdrop-blur-sm">
      {/* max-h-[90vh] și overflow-y-auto adăugate ca să prevină blocarea pe înălțime */}
      <div className="bg-white w-full max-w-[700px] max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-32 relative border border-steel-100">
        
        {/* Buton Închidere */}
        <button 
          onClick={onClose} 
          className="absolute top-16 right-16 text-steel-400 hover:text-steel-800 text-24 font-bold transition-colors"
        >
          ✕
        </button>
        
        <h2 className="text-24 font-black text-steel-800 mb-24 border-b pb-12 uppercase tracking-tight">
          Adaugă / Editează Eveniment
        </h2>

        <form className="space-y-24">
          {/* Rândul 1: Facultăți relevante (Select) */}
          <div>
            <label className="block text-12 font-black uppercase text-steel-500 mb-8">Facultăți relevante*</label>
            <select className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg text-steel-700 focus:outline-none focus:border-steel-800 transition-all cursor-pointer">
              <option>Selectează facultăți din listă</option>
              <option>Toate facultățile (Campus)</option>
            </select>
          </div>

          {/* Rândul 2: Titlu + Thumbnail */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
            <div>
              <label className="block text-12 font-black uppercase text-steel-500 mb-8">Titlu*</label>
              <input 
                type="text" 
                placeholder="Numele evenimentului..."
                className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg focus:outline-none focus:border-steel-800 transition-all" 
              />
            </div>
            <div>
              <label className="block text-12 font-black uppercase text-steel-400 mb-8">
                Thumbnail <span className="font-normal text-11 lowercase italic">(generat AI dacă lipsește)</span>
              </label>
              <input 
                type="text" 
                placeholder="Link imagine sau gol..."
                className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg focus:outline-none focus:border-steel-800 transition-all" 
              />
            </div>
          </div>

          {/* Rândul 3: Descriere */}
          <div>
            <label className="block text-12 font-black uppercase text-steel-500 mb-8">Descriere*</label>
            <textarea 
              placeholder="Despre ce este vorba în acest eveniment..."
              className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg h-100 resize-none focus:outline-none focus:border-steel-800 transition-all"
            ></textarea>
          </div>

          {/* Rândul 4: Locație */}
          <div>
            <label className="block text-12 font-black uppercase text-steel-500 mb-8">Locație</label>
            <input 
              type="text" 
              placeholder="Ex: Corp B, Amfiteatru..."
              className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg focus:outline-none focus:border-steel-800 transition-all" 
            />
          </div>

          {/* Rândul 5: Date Start/Stop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-16">
            <div>
              <label className="block text-12 font-black uppercase text-steel-500 mb-8">Data start</label>
              <input 
                type="date" 
                className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg text-steel-700 focus:outline-none focus:border-steel-800 transition-all cursor-pointer" 
              />
            </div>
            <div>
              <label className="block text-12 font-black uppercase text-steel-500 mb-8">Data stop</label>
              <input 
                type="date" 
                className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg text-steel-700 focus:outline-none focus:border-steel-800 transition-all cursor-pointer" 
              />
            </div>
          </div>

          {/* Butoane Acțiuni */}
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
              className="bg-steel-800 text-white px-24 py-12 rounded-lg font-bold hover:bg-steel-900 shadow-lg shadow-steel-200 transition-colors active:scale-95"
            >
              Salvează
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}