"use client";

import React, { useMemo, useState } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";

import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "@/hooks/useCantinaApi";
import { Product } from "@/lib/api-types";

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

const DAYS = [
  "Toate preparatele",
  "Luni",
  "Marți",
  "Miercuri",
  "Joi",
  "Vineri",
];

const mapProductToDish = (p: Product): Dish => ({
  id: String(p.id),
  name: p.name,
  category: p.category,
  description: p.description ?? "",
  price: `${p.price} RON`,
  nutritionalValues: p.nutritional_values ?? "",
  weight: p.quantity ?? "",
  availableDays: [],
});

export default function Page() {
  const [activeDay, setActiveDay] = useState("Toate preparatele");
  const [activeModal, setActiveModal] = useState<"add" | "edit" | null>(null);
  const [selectedItem, setSelectedItem] = useState<Dish | null>(null);
  const [formState, setFormState] = useState<Partial<Dish>>({});
  const [customCategory, setCustomCategory] = useState("");

  // ✅ API
  const { data, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  // ✅ mapping backend → UI
  const dishes: Dish[] = useMemo(() => {
    return data?.items?.map(mapProductToDish) ?? [];
  }, [data]);

  const filteredData = dishes;

  const columns: Column<Dish>[] = [
    {
      header: "Preparat",
      key: "name",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {item.name}
          </span>
          <span className="text-[10px] text-blue-600 font-bold uppercase">
            {item.category}
          </span>
        </div>
      ),
    },
    {
      header:
        activeDay === "Toate preparatele"
          ? "Zile afișare"
          : `Disponibil ${activeDay}`,
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
                <span className="text-[10px] text-slate-400 italic">
                  Nicio zi
                </span>
              )}
            </div>
          );
        }

        const isChecked = item.availableDays.includes(activeDay);

        return (
          <div
            className="flex items-center space-x-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={isChecked}
              readOnly
              className="w-4 h-4"
            />
            <span className="text-xs">
              {isChecked ? "Inclus" : "Nu este inclus"}
            </span>
          </div>
        );
      },
    },
    {
      header: "Preț",
      key: "price",
      render: (item) => (
        <span className="font-bold text-xs">{item.price}</span>
      ),
    },
    {
      header: "Acțiuni",
      key: "actions",
      render: (item) => (
        <div
          className="flex space-x-3 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="text-blue-600 font-medium"
            onClick={() => {
              setSelectedItem(item);
              setFormState(item);
              setCustomCategory("");
              setActiveModal("edit");
            }}
          >
            Editare
          </button>

          <button
            className="text-red-500 font-medium"
            onClick={() =>
              deleteProduct.mutate(Number(item.id))
            }
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
        <div className="flex flex-wrap gap-2 p-1 bg-background/50 border rounded-2xl w-fit">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium ${
                activeDay === day
                  ? "bg-card text-blue-600"
                  : "text-muted"
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setFormState({ category: "Meniul Zilei", availableDays: [] });
            setCustomCategory("");
            setActiveModal("add");
          }}
          className="bg-brand text-white px-5 py-2.5 rounded-xl text-sm font-bold"
        >
          + Adaugă
        </button>
      </div>

      <div className="bg-card border rounded-2xl overflow-hidden">
        <Table data={filteredData} columns={columns} />
      </div>

      <Modal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        title="Configurare Preparat"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();

            const payload = {
              name: formState.name ?? "",
              category: formState.category ?? "",
              description: formState.description ?? "",
              price: Number(
                String(formState.price).replace("RON", "")
              ),
              quantity: formState.weight ?? "",
              nutritional_values:
                formState.nutritionalValues ?? "",
            };

            if (activeModal === "edit" && selectedItem) {
              await updateProduct.mutateAsync({
                id: Number(selectedItem.id),
                data: payload,
              });
            } else {
              await createProduct.mutateAsync(payload);
            }

            setActiveModal(null);
          }}
          className="space-y-4 text-sm"
        >
          <div className="grid grid-cols-2 gap-4">
            <input
              value={formState.name || ""}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  name: e.target.value,
                })
              }
              placeholder="Nume"
              className="border p-2 rounded"
              required
            />

            <input
              value={formState.category || ""}
              onChange={(e) =>
                setFormState({
                  ...formState,
                  category: e.target.value,
                })
              }
              placeholder="Categorie"
              className="border p-2 rounded"
            />
          </div>

          <input
            value={formState.price || ""}
            onChange={(e) =>
              setFormState({
                ...formState,
                price: e.target.value,
              })
            }
            placeholder="Preț"
            className="border p-2 rounded w-full"
          />

          <input
            value={formState.weight || ""}
            onChange={(e) =>
              setFormState({
                ...formState,
                weight: e.target.value,
              })
            }
            placeholder="Gramaj"
            className="border p-2 rounded w-full"
          />

          <textarea
            value={formState.description || ""}
            onChange={(e) =>
              setFormState({
                ...formState,
                description: e.target.value,
              })
            }
            placeholder="Descriere"
            className="border p-2 rounded w-full"
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-3 py-2 border rounded"
            >
              Anulează
            </button>

            <button
              type="submit"
              className="px-3 py-2 bg-blue-600 text-white rounded"
            >
              Salvează
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}