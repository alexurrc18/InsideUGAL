"use client";

import React from "react";
import Table, { Column } from "../components/ui/Table";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { mockFaculties, Faculty } from "../data/faculties";

export default function FacultatiPage() {
  const columns: Column<Faculty>[] = [
    {
      header: "Facultate",
      key: "name",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{item.name}</span>
          <span className="text-xs text-blue-600 font-semibold uppercase">
            {item.abbreviation}
          </span>
        </div>
      ),
    },
    {
      header: "Decan",
      key: "dean",
    },
    {
      header: "Studenți",
      key: "studentsCount",
      render: (item) => (
        <span className="font-medium">{item.studentsCount.toLocaleString()}</span>
      ),
    },
    {
      header: "Website",
      key: "website",
      render: (item) => (
        <a
          href={item.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-xs"
        >
          Vizitează site
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Total Facultăți</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockFaculties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Total Studenți</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockFaculties.reduce((acc, f) => acc + f.studentsCount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted">Campusuri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Listă Facultăți</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table data={mockFaculties} columns={columns} />
        </CardContent>
      </Card>
    </div>
  );
}
