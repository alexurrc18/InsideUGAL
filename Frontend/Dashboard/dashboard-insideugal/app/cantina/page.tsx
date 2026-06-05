"use client";

import React, { useState } from 'react';
import Table, { Column } from '../components/ui/Table';
import Modal from '../components/ui/Modal';

interface Dish {
  id: string;
  name: string;
  category: string; // Am schimbat în string pentru a permite categorii noi
  description: string;
  price: string;
  nutritionalValues: string;
  weight: string;
  availableDays: string[];
}

const DAYS = ['Toate preparatele', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri'];

const initialDishes: Dish[] = [
  // --- SECȚIUNEA: MENIUL ZILEI ---
  { id: 'c1', name: 'Meniu zilei', category: 'Meniul Zilei', description: 'Conține: Borș de zarzavat (420 ml), Cartofi prăjiți (150g), Mici(40g), Pâine(75g)', price: '14 RON', nutritionalValues: '1450 kcal | P: 51.5g | C: 105g | G: 87.5g', weight: 'Set', availableDays: [] },
  
  // --- SECȚIUNEA: CIORBE ȘI SUPE ---
  { id: 'c2', name: 'Borș de zarzavat', category: 'Ciorbe și Supe', description: 'Mix de legume (morcov, ceapă, țelină, ardei gras, rădăcină de pătrunjel și păstârnac), borș proaspăt , ulei, roșii sau bulion, verdeață (leuștean, pătrunjel) și sare.', price: '4,40 RON', nutritionalValues: '140 kcal | P: 3g | C: 15g | G: 6g', weight: '420ml', availableDays: [] },
  { id: 'c3', name: 'Ciorbă de burtă', category: 'Ciorbe și Supe', description: 'Apă, burtă de vită, SMÂNTÂNĂ, OUĂ, morcov, ceapă, rădăcină de ȚELINĂ, rădăcină de pătrunjel, oțet, usturoi, sare.', price: '12 RON', nutritionalValues: '450 kcal | P: 25g | C: 8g | G: 28g', weight: '420ml', availableDays: [] },
  
  // --- SECȚIUNEA: GARNITURI ---
  { id: 'c4', name: 'Piure', category: 'Garnituri', description: 'Cartofi, LAPTE, MARGARINĂ, sare.', price: '1,90 RON', nutritionalValues: '220 kcal | P: 4g | C: 32g | G: 8g', weight: '200g', availableDays: [] },
  { id: 'c5', name: 'Amestec mexican', category: 'Garnituri', description: 'Amestec mexican (produs congelat) (morcov, porumb dulce, mazăre, fasole verde/galbenă, ardei gras verde/ galben), MARGARINĂ, ulei, sare, verdeață.', price: '3,70 RON', nutritionalValues: '120 kcal | P: 4g | C: 18g | G: 4g', weight: '150g', availableDays: [] },
  { id: 'c6', name: 'Pilaf', category: 'Garnituri', description: 'Orez, morcov, ulei, MARGARINĂ, delikat de legume.', price: '1,00 RON', nutritionalValues: '260 kcal | P: 4,5g | C: 46g | G: 6g', weight: '200g', availableDays: [] },
  { id: 'c7', name: 'Varză la cuptor', category: 'Garnituri', description: 'Varză albă, borș, ceapă, morcov, pastă de tomate, rădăcină de ȚELINĂ, roșii în bulion, ulei, suc de roșii delikat de legume.', price: '4,50 RON', nutritionalValues: '160 kcal | P: 3g | C: 14g | G: 10g', weight: '200g', availableDays: [] },
  { id: 'c8', name: 'Cartofi prăjiți', category: 'Garnituri', description: 'Cartofi(congelați), ulei, sare.', price: '4,50 RON', nutritionalValues: '480 kcal | P: 5g | C: 58g | G: 25g', weight: '150g', availableDays: [] },
  
  // --- SECȚIUNEA: PREPARATE CARNE ---
  { id: 'c9', name: 'Ceafă de porc la tavă cu sos tomate', category: 'Preparate Carne', description: 'Ceafă de porc, suc de roșii, pastă de tomate, condiment de porc, boia de ardei dulce, boia de ardei iute, cimbru, usturoi, ulei.', price: '8,80 RON', nutritionalValues: '240 kcal | P: 19g | C: 3g | G: 17g', weight: '100 g', availableDays: [] },
  { id: 'c10', name: 'Crispy de pui', category: 'Preparate Carne', description: 'Piept de pui, ulei, FĂINĂ DE GRÂU, FULGI DE PORUMB, OUĂ, sare.', price: '7,50 RON', nutritionalValues: '210 kcal | P: 14g | C: 12g | G: 11g', weight: '70g', availableDays: [] },
  { id: 'c11', name: 'Tochitură de porc', category: 'Preparate Carne', description: 'Gulaș de porc, mămăligă (apă, FĂINĂ DE PORUMB, sare, ulei), TELEMEA, OUĂ, usturoi, delikat de legume, ulei, piper.', price: '9,90 RON', nutritionalValues: '680 kcal | P: 42g | C: 16g | G: 50g', weight: '150/100/50 g', availableDays: [] },
  { id: 'c12', name: 'Mici', category: 'Preparate Carne', description: 'Mici (carne de porc,sare iodată, bicarbonat de sodiu, antioxidant:acid I-ascorbic, condimente: piper, usturoi,cimbru, boia de ardei iute).', price: '3,20 RON', nutritionalValues: '120 kcal | P: 6.5g | C: 0.5g | G: 10g', weight: '40g', availableDays: [] },
  { id: 'c13', name: 'Piept de pui la grătar', category: 'Preparate Carne', description: 'Piept de pui, ulei, sare.', price: '7,40 RON', nutritionalValues: '135 kcal | P: 26g | C: 0g | G: 3.2g', weight: '90 g', availableDays: [] },
  { id: 'c14', name: 'Șnițel de porc', category: 'Preparate Carne', description: 'Pulpă de porc, FĂINĂ DE GRÂU, OU, ulei, sare,piper.', price: '4,60 RON', nutritionalValues: '250 kcal | P: 21g | C: 9g | G: 14g', weight: '90 g', availableDays: [] },
  
  // --- SECȚIUNEA: SALATE/SOSURI ---
  { id: 'c15', name: 'Salată de castraveți', category: 'Salate/Sosuri', description: 'Castraveți, apă, oțet din alcool, sare, MUȘTAR BOABE, mărar.', price: '2,20 RON', nutritionalValues: '45 kcal | P: 0.6g | C: 2.5g | G: 3.5g', weight: '100 g', availableDays: [] },
  { id: 'c16', name: 'Salată de gogoșari', category: 'Salate/Sosuri', description: 'Gogoșari, apă, oțet din alcool, sare, zahăr', price: '3,50 RON', nutritionalValues: '30 kcal | P: 0.7g | C: 6g | G: 0.3g', weight: '100 g', availableDays: [] },
  { id: 'c17', name: 'Salată de varză', category: 'Salate/Sosuri', description: 'Varză albă, oțet, ulei, piper, sare', price: '1,30 RON', nutritionalValues: '60 kcal | P: 1.2g | C: 5g | G: 4g', weight: '100 g', availableDays: [] },
  { id: 'c18', name: 'Salată de morcovi cu țelină', category: 'Salate/Sosuri', description: 'Morcov, ȚELINĂ, ulei, oțet, sare, piper.', price: '1,70 RON', nutritionalValues: '75 kcal | P: 1g | C: 8g | G: 4.5g', weight: '100 g', availableDays: [] },
  { id: 'c19', name: 'Salată de murături asortate', category: 'Salate/Sosuri', description: 'Apă, varză, castraveți, morcovi, ardei roșu, roșii, ardei iute,migdale, sare (5%), agenți de îngroșare a acidității: acid acetic, acid citric, conservant: sorbat de potasiu.', price: '3,40 RON', nutritionalValues: '18 kcal | P: 0.6g | C: 3.5g | G: 0.1g', weight: '100 g', availableDays: [] },
  { id: 'c20', name: 'Salată asortată de roșii', category: 'Salate/Sosuri', description: 'Roșii proaspete, castraveți verzi,ardei kapia,ceapă, sare, piper, ulei.', price: '4,90 RON', nutritionalValues: '70 kcal | P: 1.3g | C: 6g | G: 4.5g', weight: '150 g', availableDays: [] },
  
  // --- SECȚIUNEA: PÂINE ---
  { id: 'c21', name: 'Mămăligă', category: 'Pâine', description: 'Apă, FĂINĂ DE PORUMB, sare.', price: '0.50 RON', nutritionalValues: '240 kcal', weight: '150 g', availableDays: [] },
  { id: 'c23', name: 'Chiflă', category: 'Pâine', description: 'FĂINĂ DE GRÂU, sare, zahăr, margarină vegetală, drojdie, apă, ameliorator.', price: '1.50 RON', nutritionalValues: '215 kcal | P: 7g | C: 43g | G: 1.2g', weight: '75 g', availableDays: [] },

  // --- SECȚIUNEA: DESERT ---
  { id: 'c24', name: 'Budincă cu brânză', category: 'Desert', description: 'LAPTE, TELEMEA, SPAGHETE, zahăr, OUĂ, SMÂNTÂNĂ, GRIȘ, MARGARINĂ, zahăr vanilat .', price: '7,20 RON', nutritionalValues: '390 kcal | P: 18.5g | C: 42g | G: 16g', weight: '250g', availableDays: [] }
];

export default function Page() {
  const [data, setData] = useState<Dish[]>(initialDishes);
  const [activeDay, setActiveDay] = useState('Toate preparatele');
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | null>(null);
  const [selectedItem, setSelectedItem] = useState<Dish | null>(null);
  const [formState, setFormState] = useState<Partial<Dish>>({});
  const [customCategory, setCustomCategory] = useState(''); // State nou pentru categoria manuală

  const filteredData = data; 

  const columns: Column<Dish>[] = [
    { 
      header: 'Preparat', 
      key: 'name', 
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{item.name}</span>
          <span className="text-[10px] text-blue-600 font-bold uppercase">{item.category}</span>
        </div>
      )
    },
    { 
      header: activeDay === 'Toate preparatele' ? 'Zile afișare' : `Disponibil ${activeDay}`, 
      key: 'availableDays', 
      render: (item) => {
        if (activeDay === 'Toate preparatele') {
          return (
            <div className="flex flex-wrap gap-1">
              {item.availableDays.length > 0 ? (
                item.availableDays.map(d => (
                  <span key={d} className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-medium">
                    {d}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-slate-400 italic">Nicio zi</span>
              )}
            </div>
          );
        }

        const isChecked = item.availableDays.includes(activeDay);
        
        return (
          <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              id={`check-${item.id}`}
              checked={isChecked}
              onChange={() => {
                const updatedDays = isChecked
                  ? item.availableDays.filter(d => d !== activeDay)
                  : [...item.availableDays, activeDay];
                
                setData(data.map(d => d.id === item.id ? { ...d, availableDays: updatedDays } : d));
              }}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor={`check-${item.id}`} className={`text-xs font-medium cursor-pointer ${isChecked ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
              {isChecked ? 'Inclus' : 'Nu este inclus'}
            </label>
          </div>
        );
      }
    },
    { 
      header: 'Preț', 
      key: 'price', 
      render: (item) => <span className="font-bold text-slate-700 text-xs">{item.price}</span> 
    },
    { 
      header: 'Acțiuni', 
      key: 'actions', 
      render: (item) => (
        <div className="flex space-x-3 text-xs" onClick={e => e.stopPropagation()}>
          <button type="button" className="text-blue-600 hover:underline cursor-pointer font-medium" onClick={() => { 
            setSelectedItem(item); 
            setFormState({...item}); 
            setCustomCategory(''); // Resetăm la editare
            setActiveModal('edit'); 
          }}>Editare</button>
          <button type="button" className="text-red-500 hover:underline cursor-pointer font-medium" onClick={() => setData(data.filter(d => d.id !== item.id))}>Ștergere</button>
        </div>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Gestiune Cantină</h1>
            <p className="text-sm text-muted">Panou administrativ pentru configurarea meniului zilnic web/mobil.</p>
          </div>
          <div className="flex flex-wrap gap-2 p-1 bg-slate-100/50 border border-slate-200 rounded-2xl w-fit">
            {DAYS.map(day => (
              <button key={day} type="button" onClick={() => setActiveDay(day)} className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${activeDay === day ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}>{day}</button>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => { setFormState({ category: 'Meniul Zilei', availableDays: [] }); setCustomCategory(''); setActiveModal('add'); }} className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md">+ Adaugă</button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <Table data={filteredData} columns={columns} />
      </div>

      <Modal isOpen={activeModal !== null} onClose={() => setActiveModal(null)} title="Configurare Preparat">
        <form onSubmit={(e) => {
          e.preventDefault();
          const finalCategory = formState.category === 'Alta' ? customCategory : formState.category;
          const itemToSave = { ...formState, category: finalCategory || 'Meniul Zilei' };

          if (activeModal === 'edit') setData(data.map(d => d.id === selectedItem?.id ? {...d, ...itemToSave} as Dish : d));
          else setData([...data, {...itemToSave, id: `c-${Date.now()}`, availableDays: formState.availableDays || []} as Dish]);
          
          setCustomCategory('');
          setActiveModal(null);
        }} className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Nume Preparat</label>
              <input type="text" value={formState.name || ''} onChange={e => setFormState({...formState, name: e.target.value})} className="w-full border p-2 rounded-lg bg-background outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Categorie</label>
              <select 
                value={['Meniul Zilei', 'Ciorbe și Supe', 'Garnituri', 'Preparate Carne', 'Salate/Sosuri', 'Pâine', 'Desert'].includes(formState.category || '') ? formState.category : 'Alta'} 
                onChange={e => setFormState({...formState, category: e.target.value})} 
                className="w-full border p-2 rounded-lg bg-background outline-none cursor-pointer"
              >
                <option value="Meniul Zilei">Meniul Zilei</option>
                <option value="Ciorbe și Supe">Ciorbe și Supe</option>
                <option value="Garnituri">Garnituri</option>
                <option value="Preparate Carne">Preparate Carne</option>
                <option value="Salate/Sosuri">Salate/Sosuri</option>
                <option value="Pâine">Pâine</option>
                <option value="Desert">Desert</option>
                <option value="Alta">-- Altă categorie --</option>
              </select>
              {formState.category === 'Alta' && (
                <input type="text" placeholder="Categorie nouă..." value={customCategory} onChange={e => setCustomCategory(e.target.value)} className="w-full border border-blue-400 p-2 mt-2 rounded-lg bg-background outline-none" required />
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Preț</label>
              <input type="text" value={formState.price || ''} onChange={e => setFormState({...formState, price: e.target.value})} className="w-full border p-2 rounded-lg bg-background outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Gramaj</label>
              <input type="text" value={formState.weight || ''} onChange={e => setFormState({...formState, weight: e.target.value})} className="w-full border p-2 rounded-lg bg-background outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Valori Nutriționale</label>
            <input type="text" placeholder="kcal | P | C | G" value={formState.nutritionalValues || ''} onChange={e => setFormState({...formState, nutritionalValues: e.target.value})} className="w-full border p-2 rounded-lg bg-background outline-none" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-2">Zile afișare</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.filter(d => d !== 'Toate preparatele').map(day => (
                <button key={day} type="button" onClick={() => {
                  const current = formState.availableDays || [];
                  setFormState({...formState, availableDays: current.includes(day) ? current.filter(d => d !== day) : [...current, day]});
                }} className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${formState.availableDays?.includes(day) ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white text-slate-400 border-border hover:border-slate-300'}`}>{day}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Descriere / Ingrediente</label>
            <textarea value={formState.description || ''} onChange={e => setFormState({...formState, description: e.target.value})} className="w-full border p-2 rounded-lg h-20 bg-background resize-none outline-none" />
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <button type="button" onClick={() => setActiveModal(null)} className="px-4 py-2 border rounded-lg text-xs cursor-pointer">Anulează</button>
            <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90">Salvează</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}