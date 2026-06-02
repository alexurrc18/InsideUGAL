"use client";

import { useState } from "react";
// Importuri RELATIVE
import UserModal from "../../components/ui/Modals/UserModal";
import NewsModal from "../../components/ui/Modals/NewsModal";
import FacultyModal from "../../components/ui/Modals/FacultyModal";

import UserRow from "../../components/ui/Rows/UserRow";
import NewsRow from "../../components/ui/Rows/NewsRow";
import FacultyRow from "../../components/ui/Rows/FacultyRow";
import EventRow from "../../components/ui/Rows/EventRow";

import DishRow from "../../components/ui/DishRow";

export default function FullTestPage() {
  const [modalStates, setModalStates] = useState({
    user: false,
    news: false,
    faculty: false,
  });

  const toggleModal = (type: 'user' | 'news' | 'faculty', value: boolean) => {
    setModalStates(prev => ({ ...prev, [type]: value }));
  };

  return (
    <div className="p-40 bg-zinc-100 min-h-screen space-y-48 text-zinc-900">
      <header className="border-b-2 border-zinc-300 pb-12 flex justify-between items-center">
        <h1 className="text-32 font-black uppercase tracking-tighter italic">🧪 Dashboard Test Bench</h1>
        <span className="bg-green-500 text-white px-12 py-4 rounded-full text-12 font-bold animate-pulse">Sistem Activ</span>
      </header>

      {/* --- SECȚIUNEA 1: MODALE --- */}
      <section className="space-y-16">
        <h2 className="text-14 font-black text-zinc-400 uppercase tracking-[0.2em]">Verificare Ferestre (Modals)</h2>
        <div className="flex gap-12 flex-wrap">
          <button onClick={() => toggleModal('user', true)} className="bg-white border-2 border-zinc-800 px-20 py-10 font-bold hover:bg-zinc-800 hover:text-white transition-all">
            👤 Test User Modal
          </button>
          <button onClick={() => toggleModal('news', true)} className="bg-white border-2 border-zinc-800 px-20 py-10 font-bold hover:bg-zinc-800 hover:text-white transition-all">
            📢 Test News Modal
          </button>
          <button onClick={() => toggleModal('faculty', true)} className="bg-white border-2 border-zinc-800 px-20 py-10 font-bold hover:bg-zinc-800 hover:text-white transition-all">
            🎓 Test Faculty Modal
          </button>
        </div>
      </section>

      {/* --- SECȚIUNEA 2: TABELE --- */}
      <section className="space-y-16">
        <h2 className="text-14 font-black text-zinc-400 uppercase tracking-[0.2em]">Verificare Rânduri (Rows)</h2>
        <div className="bg-white shadow-xl rounded-none border border-zinc-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-zinc-800 text-white text-12 uppercase font-bold">
              <tr>
                <th className="p-16 border-b border-zinc-700">Element / Info</th>
                <th className="p-16 border-b border-zinc-700">Status / Rol</th>
                <th className="p-16 text-right border-b border-zinc-700">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              <UserRow name="Andreea Ionescu" email="ai123@student.ugal.ro" role="admin" />
              
              <NewsRow title="Restanțe Toamnă" description="Programul a fost afișat" faculty="AC" date="27.05.2026" />
              
              {/* LINIA 71: Corectat EventRow cu description și period */}
              <EventRow 
                title="Hackathon Galați" 
                location="Corp B" 
                description="Concurs de programare" 
                period="15 Iunie" 
              />
              
              {/* LINIA 72: Corectat FacultyRow cu buildings (cu 's') */}
              <FacultyRow
                name="Facultatea de Automatică" 
                location="Strada Domneasca 111"
                buildings="Corp D" 
                image="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Facultatea_de_Automatic%C4%83_%C5%9Fi_Cibernetic%C4%83_%22Dimitrie_Cantemir%22_Gala%C8%9Bi.jpg/2560px-Facultatea_de_Automatic%C4%83_%C5%9Fi_Cibernetic%C4%83_%22Dimitrie_Cantemir%22_Gala%C8%9Bi.jpg"
                phone="0777777777"
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* --- SECȚIUNEA 3: CANTINĂ --- */}
      <section className="space-y-16">
        <h2 className="text-14 font-black text-zinc-400 uppercase tracking-[0.2em]">Verificare Cantină (DishRow)</h2>
        <div className="max-w-2xl">
          <DishRow name="Meniu Șnițel" calories="550 kcal" price="18.00" category="Meniul Zilei" />
        </div>
      </section>

      <UserModal isOpen={modalStates.user} onClose={() => toggleModal('user', false)} />
      <NewsModal isOpen={modalStates.news} onClose={() => toggleModal('news', false)} />
      <FacultyModal isOpen={modalStates.faculty} onClose={() => toggleModal('faculty', false)} />

    </div>
  );
}
