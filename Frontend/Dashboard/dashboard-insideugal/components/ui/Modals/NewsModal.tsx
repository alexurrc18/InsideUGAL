interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewsModal({ isOpen, onClose }: NewsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-16 backdrop-blur-sm">
      {/* 1. Am pus max-w-[500px] ca să nu mai fie așa lat
         2. text-left forțat peste tot
      */}
      <div className="bg-white w-full max-w-[800px] max-h-[90vh] flex flex-col rounded-2xl shadow-2xl relative border border-zinc-100 text-left overflow-hidden">
        
        {/* Buton X */}
        <button 
          onClick={onClose} 
          className="absolute top-16 right-16 text-zinc-400 hover:text-zinc-800 text-20 z-20"
        >
          ✕
        </button>
        
        {/* Header - Aliniat stânga */}
        <div className="p-24 pb-12 border-b border-zinc-100">
          <h2 className="text-18 font-black text-[#003A70] uppercase tracking-tight">
            Adaugă / Editează Noutate
          </h2>
        </div>

        {/* Zona Formular - Fără spații uriașe */}
        <div className="p-24 overflow-y-auto bg-white">
          <form className="space-y-16">
            <div className="space-y-16">
              <div>
                <label className="block text-11 font-black uppercase text-zinc-500 mb-4 tracking-wider">Titlu*</label>
                <input 
                  type="text" 
                  placeholder="Titlul știrii..."
                  className="w-full p-10 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-[#003A70] outline-none text-14" 
                />
              </div>
              <div>
                <label className="block text-11 font-black uppercase text-zinc-500 mb-4 tracking-wider">Thumbnail URL</label>
                <input 
                  type="text" 
                  placeholder="https://..."
                  className="w-full p-10 bg-zinc-50 border border-zinc-200 rounded-lg focus:border-[#003A70] outline-none text-14" 
                />
              </div>
            </div>

            <div>
              <label className="block text-11 font-black uppercase text-zinc-500 mb-4 tracking-wider">Descriere*</label>
              <textarea 
                placeholder="Detalii..."
                className="w-full p-10 bg-zinc-50 border border-zinc-200 rounded-lg h-100 resize-none focus:border-[#003A70] outline-none text-14"
              ></textarea>
            </div>
          </form>
        </div>

        {/* Footer - Butoane MICI și ALINIATE LA DREAPTA */}
        <div className="p-20 border-t border-zinc-100 flex justify-end items-center gap-12 bg-zinc-50/30">
          <button 
            type="button" 
            onClick={onClose}
            className="px-16 py-8 text-13 font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            Anulează
          </button>
          <button 
            type="submit" 
            className="bg-[#003A70] text-white px-20 py-10 rounded-lg text-13 font-bold hover:bg-[#002548] shadow-sm transition-all active:scale-95"
          >
            Salvează noutatea
          </button>
        </div>

      </div>
    </div>
  );
}