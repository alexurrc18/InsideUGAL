interface AddReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddReportModal({ isOpen, onClose }: AddReportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-16">
      {/* max-h-[90vh] și overflow-y-auto protejează ecranul să nu mai fie blocat dacă formularul se extinde */}
      <div className="bg-white w-full max-w-[650px] max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl p-32 relative">
        
        {/* Butonul X pentru închidere mai vizibil */}
        <button 
          onClick={onClose} 
          className="absolute top-16 right-16 text-steel-400 hover:text-steel-800 text-24 font-bold transition-colors"
        >
          ✕
        </button>
        
        <h2 className="text-22 font-black text-steel-800 mb-24 border-b pb-12 uppercase tracking-tight">
          Gestionare Sesizare
        </h2>

        <form className="space-y-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            {/* Filtrare pe Facultăți */}
            <div>
              <label className="block text-12 font-black uppercase text-steel-500 mb-6">
                Facultate Vizată*
              </label>
              <select className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg outline-none focus:border-steel-800 transition-all cursor-pointer">
                <option>SIA (Automatică)</option>
                <option>ACIE (Electrică)</option>
                <option>Litere</option>
                <option>Medicină</option>
                <option>Toate facultățile (Campus)</option>
              </select>
            </div>
            
            {/* Categorie */}
            <div>
              <label className="block text-12 font-black uppercase text-steel-500 mb-6">
                Categorie*
              </label>
              <select className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg outline-none focus:border-steel-800 transition-all cursor-pointer">
                <option>Deteriorare mobilier</option>
                <option>Probleme rețea/internet</option>
                <option>Curățenie/Igienă</option>
                <option>Lumină/Electricitate</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-12 font-black uppercase text-steel-500 mb-6">
              Descriere (văzută de admin și student)
            </label>
            <textarea 
              placeholder="Detalii despre problemă..."
              className="w-full p-12 bg-steel-50 border border-steel-200 rounded-lg h-100 resize-none outline-none focus:border-steel-800 transition-all"
            ></textarea>
          </div>

          {/* Secțiune vizualizare Poze */}
          <div className="p-16 bg-steel-50 rounded-lg border border-dashed border-steel-200">
            <p className="text-12 font-black text-steel-400 mb-12 uppercase tracking-wide">
              Dovezi foto atașate de student:
            </p>
            <div className="flex gap-12">
              <div className="w-72 h-72 bg-steel-200 hover:bg-steel-300 rounded-lg flex items-center justify-center text-11 font-bold text-steel-600 transition-colors cursor-pointer border border-steel-300/50 shadow-sm">
                Poza 1
              </div>
              <div className="w-72 h-72 bg-steel-200 hover:bg-steel-300 rounded-lg flex items-center justify-center text-11 font-bold text-steel-600 transition-colors cursor-pointer border border-steel-300/50 shadow-sm">
                Poza 2
              </div>
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
              className="bg-steel-800 text-white px-24 py-12 rounded-lg font-bold hover:bg-steel-900 shadow-lg shadow-steel-200 transition-all"
            >
              Salvează Modificările
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}