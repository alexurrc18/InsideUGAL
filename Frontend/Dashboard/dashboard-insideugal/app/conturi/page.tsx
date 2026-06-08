"use client";

import React from "react";
import Table, { Column } from "../components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { mockUsers, User } from "../data/users";

export default function ConturiPage() {
  const columns: Column<User>[] = [
    {
      header: "Nume",
      key: "lastName",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">
            {item.lastName} {item.firstName}
          </span>
          <span className="text-xs text-muted">{item.email}</span>
        </div>
      ),
    },
    {
      header: "Rol",
      key: "role",
      render: (item) => {
        const roleColors = {
          STUDENT: "text-blue-600 bg-blue-50 border-blue-100",
          PROFESOR: "text-purple-600 bg-purple-50 border-purple-100",
          ADMIN: "text-rose-600 bg-rose-50 border-rose-100",
        };
        return (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleColors[item.role]}`}>
            {item.role}
          </span>
        );
      },
    },
    {
      header: "Facultate",
      key: "faculty",
    },
    {
      header: "Status",
      key: "status",
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <div className={`h-2 w-2 rounded-full ${item.status === "activ" ? "bg-emerald-500" : "bg-slate-300"}`} />
          <span className="text-xs capitalize">{item.status}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Gestiune Utilizatori</h2>
        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Adaugă Utilizator
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toți Utilizatorii</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table data={mockUsers} columns={columns} />
        </CardContent>
      </Card>
    </div>
  );
}
