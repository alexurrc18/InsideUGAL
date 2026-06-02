interface DishRowProps {
  name: string;
  calories: string;
  price: string;
  category: "Meniul Zilei" | "Desert" | "Garnitură" | "Băuturi" | "Salate/Sosuri" | "Pâine";
}

export default function DishRow({ name, calories, price, category }: DishRowProps) {
  return (
    <div className="flex items-center gap-16 p-12 bg-white border border-steel-100 rounded-lg hover:border-steel-400 transition-all mb-8 shadow-sm group">
      {/* Nume Preparat */}
      <div className="flex-1">
        <input 
          type="text" 
          defaultValue={name} 
          className="w-full font-bold text-steel-800 bg-transparent outline-none border-b border-transparent focus:border-steel-300"
        />
        <span className="text-10 text-steel-400 uppercase font-black tracking-widest">{category}</span>
      </div>

      {/* Valori Nutriționale */}
      <div className="w-110">
        <label className="block text-9 text-steel-400 uppercase font-bold mb-2">Val. Nutrițională</label>
        <input 
          type="text" 
          defaultValue={calories} 
          className="w-full text-13 text-steel-600 bg-steel-50 rounded p-6 outline-none focus:bg-white border border-transparent focus:border-steel-200"
        />
      </div>

      {/* Preț */}
      <div className="w-90">
        <label className="block text-9 text-steel-400 uppercase font-bold mb-2">Preț (RON)</label>
        <input 
          type="text" 
          defaultValue={price} 
          className="w-full text-14 font-black text-green-700 bg-green-50 rounded p-6 outline-none border border-transparent focus:border-green-200"
        />
      </div>

      {/* Buton Ștergere (Apare la hover) */}
      <button className="opacity-0 group-hover:opacity-100 p-8 text-red-300 hover:text-red-600 transition-opacity">
        🗑️
      </button>
    </div>
  );
}