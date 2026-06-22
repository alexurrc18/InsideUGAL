"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { apiBaseUrl, getAuthHeaders } from "@/lib/api-client";

const API = apiBaseUrl;

function apiFetch(path: string, init?: RequestInit) {
  return fetch(`${API}${path}`, {
    ...init,
    credentials: init?.credentials ?? "include",
    headers: getAuthHeaders(init?.headers),
  });
}

// Structura unui produs din baza de date
interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  quantity: string; // Mapat ca Gramaj/Weight în UI
  price: number;
  nutritional_values?: string;
}

// Structura unui meniu zilnic din baza de date
interface DailyMenu {
  id: number;
  day_of_week: number;
  products: Product[];
}

interface ProductResponse {
  items: Product[];
  total: number;
}

interface DailyMenuResponse {
  items: DailyMenu[];
  total: number;
}

// Interfața completă folosită în interiorul tabelului și formularelor
interface Dish {
  id: number;
  name: string;
  category: string;
  description: string;
  price: number;
  nutritionalValues: string;
  weight: string;
  availableDays: string[];
}

const DAYS = ["Toate preparatele", "Luni", "Marți", "Miercuri", "Joi", "Vineri"];

// Mapare între textul din UI și ID-urile zilelor din API
const DAY_MAP: { [key: string]: number } = {
  "Luni": 1,
  "Marți": 2,
  "Miercuri": 3,
  "Joi": 4,
  "Vineri": 5,
};

const REV_DAY_MAP: { [key: number]: string } = {
  1: "Luni",
  2: "Marți",
  3: "Miercuri",
  4: "Joi",
  5: "Vineri",
};

export default function Page() {
  const [products, setProducts] = useState<Product[]>([]);
  const [menus, setMenus] = useState<DailyMenu[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeDay, setActiveDay] = useState("Toate preparatele");
  const [activeModal, setActiveModal] = useState<"add" | "edit" | null>(null);
  const [selectedItem, setSelectedItem] = useState<Dish | null>(null);
  const [formState, setFormState] = useState<Partial<Dish>>({});
  const [customCategory, setCustomCategory] = useState("");

  /////////////////////////////////////////////////////////////////
  // API Core Functions (wrapped in useCallback to fix ESLint & cascading renders)
  /////////////////////////////////////////////////////////////////

  const fetchMenus = useCallback(async () => {
    const res = await apiFetch("/cafeteria_menus?page=1&size=20");
    if (!res.ok) throw new Error("Menus error");
    const data: DailyMenuResponse = await res.json();
    setMenus(data.items);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Products logic inside the callback to prevent reference changing
      let allProducts: Product[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 50;

      while (hasMore) {
        const res = await apiFetch(`/products?page=${page}&size=${pageSize}`);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Products error:", res.status, res.statusText, errorText);
          throw new Error(`Products error: ${res.status} ${res.statusText}`);
        }
        const data: ProductResponse = await res.json();
        allProducts = [...allProducts, ...data.items];
        
        if (allProducts.length >= data.total || data.items.length < pageSize) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      setProducts(allProducts);
      await fetchMenus();
    } catch (err) {
      console.error("Eroare la încărcarea datelor din API:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchMenus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /////////////////////////////////////////////////////////////////
  // Mapare și Filtrare Date
  /////////////////////////////////////////////////////////////////

  const tableData = useMemo<Dish[]>(() => {
    return products.map((p) => {
      // Identificăm în ce zile este inclus produsul curent
      const availableDays: string[] = [];
      menus.forEach((menu) => {
        const exists = menu.products.some((prod) => prod.id === p.id);
        if (exists && REV_DAY_MAP[menu.day_of_week]) {
          availableDays.push(REV_DAY_MAP[menu.day_of_week]);
        }
      });

      return {
        id: p.id,
        name: p.name,
        category: p.category || "Generale",
        description: p.description || "",
        price: p.price,
        nutritionalValues: p.nutritional_values || "",
        weight: p.quantity || "",
        availableDays: availableDays,
      };
    });
  }, [products, menus]);

  const filteredData = useMemo(() => {
    if (activeDay === "Toate preparatele") return tableData;
    return tableData.filter((item) => item.availableDays.includes(activeDay));
  }, [activeDay, tableData]);

  /////////////////////////////////////////////////////////////////
  // Meniuri Zilnice (Asociere API Action)
  /////////////////////////////////////////////////////////////////

  const toggleMenuAction = useCallback(async (dayNumber: number, productId: number, forceState?: boolean) => {
    const menu = menus.find((m) => m.day_of_week === dayNumber);
    if (!menu) return;

    const currentlyExists = menu.products.some((p) => p.id === productId);
    const dynamicNextState = forceState !== undefined ? forceState : !currentlyExists;

    let nextProductIds: number[] = [];
    if (dynamicNextState) {
      nextProductIds = [...menu.products.map((p) => p.id), productId];
    } else {
      nextProductIds = menu.products.filter((p) => p.id !== productId).map((p) => p.id);
    }

    await apiFetch(`/cafeteria_menus/${menu.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: nextProductIds }),
    });
  }, [menus]);

  /////////////////////////////////////////////////////////////////
  // Operațiuni CRUD (Products)
  /////////////////////////////////////////////////////////////////

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalCategory = formState.category === "Alta" ? customCategory : formState.category;

    const payload = {
      name: formState.name,
      category: finalCategory || "Meniul Zilei",
      description: formState.description,
      quantity: formState.weight,
      price: Number(formState.price),
      nutritional_values: formState.nutritionalValues,
    };

    try {
      if (activeModal === "add") {
        const res = await apiFetch("/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        
        // Dacă s-au selectat zile din modalul de adăugare, le asociem noului produs creat
        if (res.ok && formState.availableDays && formState.availableDays.length > 0) {
          const createdProduct: Product = await res.json();
          for (const dayName of formState.availableDays) {
            const dayNum = DAY_MAP[dayName];
            await toggleMenuAction(dayNum, createdProduct.id, true);
          }
        }
      } else if (activeModal === "edit" && selectedItem) {
        await apiFetch(`/products/${selectedItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setCustomCategory("");
      setActiveModal(null);
      await loadData();
    } catch (error) {
      console.error("Eroare la salvarea produsului:", error);
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm("Sigur dorești ștergerea produsului?")) return;
    try {
      await apiFetch(`/products/${id}`, { method: "DELETE" });
      await loadData();
    } catch (error) {
      console.error("Eroare la ștergerea produsului:", error);
    }
  }

  async function handleCheckboxToggle(item: Dish, targetDay: string) {
    const dayNumber = DAY_MAP[targetDay];
    if (!dayNumber) return;

    // Trimitere cerere către API și reîmprospătare meniuri
    await toggleMenuAction(dayNumber, item.id);
    await fetchMenus();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm font-medium text-muted">Se încarcă datele din sistem...</p>
      </div>
    );
  }

  /////////////////////////////////////////////////////////////////
  // Structură Coloane Tabel UI
  /////////////////////////////////////////////////////////////////

  const columns: Column<Dish>[] = [
    {
      header: "Preparat",
      key: "name",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.name}</span>
          <span className="text-[10px] text-blue-600 font-bold uppercase">{item.category}</span>
        </div>
      ),
    },
    {
      header: activeDay === "Toate preparatele" ? "Zile afișare" : `Disponibil ${activeDay}`,
      key: "availableDays",
      render: (item) => {
        if (activeDay === "Toate preparatele") {
          return (
            <div className="flex flex-wrap gap-1">
              {item.availableDays.length > 0 ? (
                item.availableDays.map((d) => (
                  <span
                    key={d}
                    className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 font-medium"
                  >
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
              onChange={() => handleCheckboxToggle(item, activeDay)}
              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            <label
              htmlFor={`check-${item.id}`}
              className={`text-xs font-medium cursor-pointer ${
                isChecked ? "text-blue-600 font-semibold" : "text-slate-400"
              }`}
            >
              {isChecked ? "Inclus" : "Nu este inclus"}
            </label>
          </div>
        );
      },
    },
    {
      header: "Preț",
      key: "price",
      render: (item) => <span className="font-bold text-foreground text-xs">{item.price} lei</span>,
    },
    {
      header: "Acțiuni",
      key: "actions",
      render: (item) => (
        <div className="flex space-x-3 text-xs" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="text-blue-600 hover:underline cursor-pointer font-medium"
            onClick={() => {
              setSelectedItem(item);
              setFormState({ ...item });
              setCustomCategory("");
              setActiveModal("edit");
            }}
          >
            Editare
          </button>
          <button
            type="button"
            className="text-red-500 hover:underline cursor-pointer font-medium"
            onClick={() => deleteProduct(item.id)}
          >
            Ștergere
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 p-1 bg-background/50 border border-border rounded-2xl w-fit">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setActiveDay(day)}
                className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  activeDay === day
                    ? "bg-card text-blue-600 shadow-sm border border-border"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormState({ category: "Meniul Zilei", availableDays: [], price: 0 });
            setCustomCategory("");
            setActiveModal("add");
          }}
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer hover:opacity-90 transition-all shadow-md"
        >
          + Adaugă
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <Table data={filteredData} columns={columns} />
      </div>

      <Modal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        title="Configurare Preparat"
      >
        <form
          onSubmit={handleFormSubmit}
          className="space-y-4 text-sm max-h-[80vh] flex flex-col justify-between"
        >
          <div
            className="space-y-4 overflow-y-auto pr-1 pb-4"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            <style
              dangerouslySetInnerHTML={{
                __html: `
              div::-webkit-scrollbar {
                display: none;
              }
            `,
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nume Preparat</label>
                <input
                  type="text"
                  value={formState.name || ""}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  className="w-full border border-border p-2 rounded-lg bg-background outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Categorie</label>
                <select
                  value={
                    [
                      "Meniul Zilei",
                      "Ciorbe și Supe",
                      "Garnituri",
                      "Preparate Carne",
                      "Salate/Sosuri",
                      "Pâine",
                      "Desert",
                    ].includes(formState.category || "")
                      ? formState.category
                      : "Alta"
                  }
                  onChange={(e) => setFormState({ ...formState, category: e.target.value })}
                  className="w-full border border-border p-2 rounded-lg bg-background outline-none cursor-pointer"
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
                {formState.category === "Alta" && (
                  <input
                    type="text"
                    placeholder="Categorie nouă..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full border border-blue-400 p-2 mt-2 rounded-lg bg-background outline-none"
                    required
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Preț (RON)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formState.price || ""}
                  onChange={(e) => setFormState({ ...formState, price: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-border p-2 rounded-lg bg-background outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Gramaj</label>
                <input
                  type="text"
                  value={formState.weight || ""}
                  onChange={(e) => setFormState({ ...formState, weight: e.target.value })}
                  className="w-full border border-border p-2 rounded-lg bg-background outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Valori Nutriționale</label>
              <input
                type="text"
                placeholder="kcal | P | C | G"
                value={formState.nutritionalValues || ""}
                onChange={(e) => setFormState({ ...formState, nutritionalValues: e.target.value })}
                className="w-full border border-border p-2 rounded-lg bg-background outline-none"
              />
            </div>
            
            {activeModal === "add" && (
              <div>
                <label className="block text-xs font-bold mb-2">Zile afișare inițiale</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.filter((d) => d !== "Toate preparatele").map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const current = formState.availableDays || [];
                        setFormState({
                          ...formState,
                          availableDays: current.includes(day)
                            ? current.filter((d) => d !== day)
                            : [...current, day],
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
                        formState.availableDays?.includes(day)
                          ? "bg-blue-50 border-blue-200 text-blue-600"
                          : "bg-card text-slate-400 border-border hover:border-slate-300"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold mb-1">Descriere / Ingrediente</label>
              <textarea
                value={formState.description || ""}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                className="w-full border border-border p-2 rounded-lg h-20 bg-background resize-none outline-none"
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-card pt-4 border-t border-border z-10 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 border border-border rounded-lg text-muted text-xs cursor-pointer hover:bg-slate-50"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold cursor-pointer hover:opacity-90"
            >
              Salvează
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}