"use client";

import React, { useState, useMemo, useEffect } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";

import {
  useProducts,
  useMenus,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUpdateMenu,
} from "@/hooks/useCantinaApi";
import { canAccessCantina, useRequireDashboardAccess } from "@/lib/dashboard-auth";

interface Dish {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string;
  nutritionalValues: string;
  weight: string;
  availableDays: string[];
}

interface ApiProduct {
  id: number;
  name?: string;
  category?: string;
  description?: string;
  price?: number;
  nutritional_values?: string;
  quantity?: string;
}

interface ApiMenu {
  id: number;
  day_of_week: number;
  products?: { id: number }[];
}

const DAYS_MAPPING: { [key: number]: string } = {
  1: "Luni",
  2: "Marți",
  3: "Miercuri",
  4: "Joi",
  5: "Vineri",
};

const FILTER_DAYS = [
  "Toate preparatele",
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
];

export default function Page() {
  const access = useRequireDashboardAccess(canAccessCantina);
  const [activeDay, setActiveDay] = useState("Toate preparatele");
  const [activeModal, setActiveModal] = useState<"add" | "edit" | null>(null);
  const [selectedItem, setSelectedItem] = useState<Dish | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [formState, setFormState] = useState<Partial<Dish>>({
    name: "",
    category: "",
    description: "",
    price: "",
    weight: "",
    nutritionalValues: "",
    availableDays: [],
  });

  const { data: apiData } = useProducts();
  const { data: menusData } = useMenus();
  
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateMenu = useUpdateMenu();

  useEffect(() => {
    fetch("/product_categories/")
      .then((res) => res.json())
      .then((data) => {
        if (data.items) {
          const catNames = data.items.map((c: any) => c.name);
          setCategories(catNames);
        }
      })
      .catch((err) => console.error(err));
  }, []);

  const data = useMemo<Dish[]>(() => {
    if (!apiData || !menusData) return [];

    const items = (Array.isArray(apiData) 
      ? apiData 
      : ((apiData as { items?: ApiProduct[] }).items ?? [])) as ApiProduct[];
    
    const menus = (Array.isArray(menusData) 
      ? menusData 
      : ((menusData as { items?: ApiMenu[] })?.items ?? [])) as ApiMenu[];

    const productDaysMap: { [key: number]: string[] } = {};
    
    menus.forEach((menu) => {
      const dayName = DAYS_MAPPING[menu.day_of_week];
      if (dayName && Array.isArray(menu.products)) {
        menu.products.forEach((prod) => {
          if (!productDaysMap[prod.id]) {
            productDaysMap[prod.id] = [];
          }
          if (!productDaysMap[prod.id].includes(dayName)) {
            productDaysMap[prod.id].push(dayName);
          }
        });
      }
    });

    return items.map((p) => ({
      id: String(p.id),
      name: p.name ?? "",
      category: p.category || (categories[0] ?? "Meniul Zilei"),
      description: p.description ?? "",
      price: `${p.price ?? 0} RON`,
      nutritionalValues: p.nutritional_values ?? "",
      weight: p.quantity ?? "",
      availableDays: productDaysMap[p.id] ?? [],
    }));
  }, [apiData, menusData, categories]);

  const filteredData = useMemo(() => {
    return activeDay === "Toate preparatele" 
      ? data 
      : data.filter(item => item.availableDays.includes(activeDay));
  }, [data, activeDay]);

  const handleDayTagToggle = (day: string) => {
    const currentDays = formState.availableDays ?? [];
    if (currentDays.includes(day)) {
      setFormState({
        ...formState,
        availableDays: currentDays.filter((d) => d !== day),
      });
    } else {
      setFormState({
        ...formState,
        availableDays: [...currentDays, day],
      });
    }
  };

  const columns: Column<Dish>[] = [
    {
      header: "Preparat",
      key: "name",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.name}</span>
          <span className="text-[10px] text-blue-600 font-bold uppercase mt-0.5">
            {item.category}
          </span>
        </div>
      ),
    },
    {
      header: "Zile afișare",
      key: "availableDays",
      render: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.availableDays.length > 0 ? (
            item.availableDays.map((d) => (
              <span
                key={d}
                className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100 font-medium"
              >
                {d}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-400 italic">Nicio zi asociată</span>
          )}
        </div>
      ),
    },
    {
      header: "Preț",
      key: "price",
      render: (item) => <span className="font-bold text-xs text-foreground">{item.price}</span>,
    },
    {
      header: "Acțiuni",
      key: "actions",
      render: (item) => (
        <div className="flex space-x-4 text-xs">
          <button
            type="button"
            className="text-blue-600 font-medium hover:underline cursor-pointer transition-all"
            onClick={() => {
              setSelectedItem(item);
              setFormState({
                ...item,
                price: item.price.replace(" RON", ""),
                availableDays: [...item.availableDays]
              });
              setActiveModal("edit");
            }}
          >
            Editare
          </button>

          <button
            type="button"
            className="text-red-500 font-medium hover:underline cursor-pointer transition-all"
            onClick={() => {
              if(confirm("Sigur dorești ștergerea acestui produs?")) {
                deleteProduct.mutate(Number(item.id));
              }
            }}
          >
            Ștergere
          </button>
        </div>
      ),
    },
  ];

  if (access.loading || !access.allowed) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex flex-wrap gap-2 p-1 bg-background/50 border border-border rounded-2xl w-fit">
          {FILTER_DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
                activeDay === day ? "bg-card text-blue-600 shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setFormState({
              name: "",
              category: categories[0] || "",
              description: "",
              price: "",
              weight: "",
              nutritionalValues: "",
              availableDays: [],
            });
            setActiveModal("add");
          }}
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 shadow-sm transition-all"
        >
          + Adaugă
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <Table data={filteredData} columns={columns} />
      </div>

      <Modal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        title={activeModal === "edit" ? "Editare Preparat" : "Adăugare"}
      >
        <form
          className="relative max-h-[85vh] flex flex-col bg-white text-slate-800"
          onSubmit={async (e) => {
            e.preventDefault();

            const rawPrice = String(formState.price || "").replace(/[^0-9.]/g, "");
            const parsedPrice = parseFloat(rawPrice) || 0;

            const productPayload = {
              name: String(formState.name || "").trim(),
              category: String(formState.category || categories[0]).trim(),
              description: String(formState.description || "").trim(),
              price: parsedPrice,
              quantity: String(formState.weight || "").trim(),
              nutritional_values: String(formState.nutritionalValues || "").trim(),
            };

            try {
              let targetProductId: number;

              if (activeModal === "edit") {
                targetProductId = Number(selectedItem?.id);
                await updateProduct.mutateAsync({
                  id: targetProductId,
                  data: productPayload,
                });
              } else {
                const newProd = await createProduct.mutateAsync(productPayload);
                targetProductId = Number((newProd as { id: number }).id);
              }

              const menus = (Array.isArray(menusData) 
                ? menusData 
                : ((menusData as { items?: ApiMenu[] })?.items ?? [])) as ApiMenu[];
                
              const selectedDays = formState.availableDays ?? [];

              for (let dayNum = 1; dayNum <= 5; dayNum++) {
                const dayName = DAYS_MAPPING[dayNum];
                const currentMenuForDay = menus.find((m) => m.day_of_week === dayNum);

                if (currentMenuForDay) {
                  let existingProductIds: number[] = currentMenuForDay.products?.map((p) => p.id) ?? [];

                  if (selectedDays.includes(dayName)) {
                    if (!existingProductIds.includes(targetProductId)) {
                      existingProductIds.push(targetProductId);
                    }
                  } else {
                    existingProductIds = existingProductIds.filter(id => id !== targetProductId);
                  }

                  await updateMenu.mutateAsync({
                    id: currentMenuForDay.id,
                    productIds: existingProductIds,
                  });
                }
              }

              setActiveModal(null);
            } catch (error) {
              console.error(error);
            }
          }}
        >
          <div className="p-4 space-y-3 overflow-y-auto flex-1">
            <div className="w-full">
              <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Nume preparat</label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 focus:bg-white transition-all"
                value={formState.name || ""}
                onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                required
              />
            </div>

            <div className="w-full">
              <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Categorie</label>
              <select 
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 focus:bg-white transition-all"
                value={formState.category || ""}
                onChange={(e) => setFormState({ ...formState, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Preț (RON)</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={formState.price || ""}
                  onChange={(e) => setFormState({ ...formState, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Gramaj</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 focus:bg-white transition-all"
                  value={formState.weight || ""}
                  onChange={(e) => setFormState({ ...formState, weight: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="w-full">
              <label className="block text-[11px] font-semibold text-slate-400 mb-1.5">Zile afișare meniu</label>
              <div className="flex flex-wrap gap-2">
                {FILTER_DAYS.slice(1).map((day) => {
                  const isSelected = formState.availableDays?.includes(day) ?? false;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleDayTagToggle(day)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer select-none ${
                        isSelected
                          ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm font-semibold"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full">
              <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Descriere</label>
              <textarea
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 placeholder-slate-400 text-slate-800 text-sm rounded-lg p-2.5 outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                value={formState.description || ""}
                onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              />
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-4 py-3 flex justify-end items-center space-x-3 z-10">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-5 py-2 border border-slate-200 text-slate-500 text-xs font-medium rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
            >
              Anulează
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#004080] hover:bg-[#003366] text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Salvează
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}