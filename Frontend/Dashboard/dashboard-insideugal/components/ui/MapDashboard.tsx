interface MapLocation {
  id: string;
  name: string;
  type: 'cladire' | 'facultate' | 'cantina' | 'camin';
  lat: number;
  lng: number;
  description: string;
}

export default function MapDashboard() {
  return (
    <div className="flex h-[calc(100-200px)] gap-24 p-24">
      {/* 1. Zona de Hartă (Stânga) */}
      <div className="flex-1 bg-steel-100 rounded-lg border-2 border-steel-200 relative overflow-hidden shadow-inner">
        {/* Aici va veni componenta de Google Maps / Leaflet */}
        <div className="absolute inset-0 flex items-center justify-center text-steel-400 italic">
          <div className="text-center">
            <span className="text-48 block">📍</span>
            Harta Interactivă UGAL
          </div>
        </div>
        
        {/* Overlay de Filtrare Rapidă (cum e pe mobil în mockup) */}
        <div className="absolute top-16 left-16 flex gap-8">
          <button className="bg-white px-12 py-8 rounded-full shadow-md text-12 font-bold text-steel-700 hover:bg-steel-50">🏢 Clădiri</button>
          <button className="bg-white px-12 py-8 rounded-full shadow-md text-12 font-bold text-steel-700 hover:bg-steel-50">🍴 Cantine</button>
          <button className="bg-white px-12 py-8 rounded-full shadow-md text-12 font-bold text-steel-700 hover:bg-steel-50">🛏️ Cămine</button>
        </div>
      </div>

      {/* 2. Lista de Locații (Dreapta) */}
      <div className="w-350 bg-white rounded-lg border border-steel-200 shadow-sm flex flex-col">
        <div className="p-16 border-b border-steel-100">
          <h3 className="font-black text-steel-800 text-18">Puncte de interes</h3>
          <input 
            type="text" 
            placeholder="Caută o clădire..." 
            className="w-full mt-12 p-8 bg-steel-50 border border-steel-200 rounded text-14"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-16 space-y-12">
          {/* Exemplu de locație în listă */}
          <div className="p-12 border border-steel-100 rounded-md hover:border-steel-400 cursor-pointer transition-all">
            <p className="font-bold text-steel-800 text-14">Corp D - Facultatea de Inginerie</p>
            <p className="text-12 text-steel-500">Strada Domnească nr. 111</p>
            <button className="mt-8 text-12 text-blue-600 font-bold">Vezi pe hartă →</button>
          </div>
          
          <div className="p-12 border border-steel-100 rounded-md hover:border-steel-400 cursor-pointer transition-all">
            <p className="font-bold text-steel-800 text-14">Cantina Studențească</p>
            <p className="text-12 text-steel-500">Complex Campus Al. I. Cuza</p>
            <button className="mt-8 text-12 text-blue-600 font-bold">Vezi pe hartă →</button>
          </div>
        </div>
      </div>
    </div>
  );
}