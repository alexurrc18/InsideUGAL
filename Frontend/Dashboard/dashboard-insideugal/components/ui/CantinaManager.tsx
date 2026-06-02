import DishRow from "./DishRow";

export default function CantinaManager() {
  return (
    <div className="p-24 space-y-32">
      {/* Header cu selectorul de zile (Luni-Vineri) */}
      <div className="flex justify-between items-center bg-white p-16 rounded-xl border border-steel-200 shadow-sm">
        <div className="flex gap-8">
          {['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri'].map((zi) => (
            <button key={zi} className={`px-20 py-8 rounded-md font-bold ${zi === 'Luni' ? 'bg-steel-800 text-white' : 'hover:bg-steel-100 text-steel-600'}`}>
              {zi}
            </button>
          ))}
        </div>
        <button className="bg-green-600 text-white px-24 py-10 rounded-md font-bold hover:bg-green-700 shadow-md transition-all">
          💾 Salvează tot meniul
        </button>
      </div>

      {/* Grid-ul de categorii (3 coloane pe web) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-24">
        
        {/* 1. MENIUL ZILEI */}
        <section className="bg-steel-50/50 p-16 rounded-xl border border-steel-100">
          <h3 className="text-16 font-black text-steel-800 mb-16 flex justify-between">
            🍲 MENIUL ZILEI <button className="text-20 text-steel-400 hover:text-steel-800">+</button>
          </h3>
          <DishRow name="Ciorbă de pui" calories="280 kcal" price="10.50" category="Meniul Zilei" />
          <DishRow name="Friptură de porc" calories="450 kcal" price="16.00" category="Meniul Zilei" />
        </section>

        {/* 2. DESERT */}
        <section className="bg-steel-50/50 p-16 rounded-xl border border-steel-100">
          <h3 className="text-16 font-black text-steel-800 mb-16 flex justify-between">
            🍰 DESERT <button className="text-20 text-steel-400 hover:text-steel-800">+</button>
          </h3>
          <DishRow name="Ecler ciocolată" calories="320 kcal" price="8.00" category="Desert" />
        </section>

        {/* 3. GARNITURĂ */}
        <section className="bg-steel-50/50 p-16 rounded-xl border border-steel-100">
          <h3 className="text-16 font-black text-steel-800 mb-16 flex justify-between">
            🍚 GARNITURĂ <button className="text-20 text-steel-400 hover:text-steel-800">+</button>
          </h3>
          <DishRow name="Piure de cartofi" calories="180 kcal" price="6.50" category="Garnitură" />
        </section>

        {/* 4. BĂUTURI */}
        <section className="bg-steel-50/50 p-16 rounded-xl border border-steel-100">
          <h3 className="text-16 font-black text-steel-800 mb-16 flex justify-between">
            🥤 BĂUTURI <button className="text-20 text-steel-400 hover:text-steel-800">+</button>
          </h3>
          <DishRow name="Apă plată 0.5L" calories="0 kcal" price="4.00" category="Băuturi" />
        </section>

        {/* 5. SALATE */}
        <section className="bg-steel-50/50 p-16 rounded-xl border border-steel-100">
          <h3 className="text-16 font-black text-steel-800 mb-16 flex justify-between">
            🥗 SALATE <button className="text-20 text-steel-400 hover:text-steel-800">+</button>
          </h3>
          <DishRow name="Salată de varză" calories="45 kcal" price="5.00" category="Salate/Sosuri" />
        </section>

        {/* 6. PÂINE */}
        <section className="bg-steel-50/50 p-16 rounded-xl border border-steel-100">
          <h3 className="text-16 font-black text-steel-800 mb-16 flex justify-between">
            🍞 PÂINE <button className="text-20 text-steel-400 hover:text-steel-800">+</button>
          </h3>
          <DishRow name="Chiflă albă" calories="110 kcal" price="1.00" category="Pâine" />
        </section>

      </div>
    </div>
  );
}
