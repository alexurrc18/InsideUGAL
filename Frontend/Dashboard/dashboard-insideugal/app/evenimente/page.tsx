"use client";

import React from "react";
import DashboardCalendar from "../components/ui/DashboardCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Table, { Column } from "../components/ui/Table";
import { dashboardEvents, DashboardEvent } from "../data/events";

export default function EvenimentePage() {
  const columns: Column<DashboardEvent>[] = [
    {
      header: "Data & Ora",
      key: "date",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.date}</span>
          <span className="text-xs text-muted">{item.time || "Toată ziua"}</span>
        </div>
      ),
    },
    {
      header: "Eveniment",
      key: "title",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-bold text-blue-600">{item.title}</span>
          <span className="text-xs text-muted truncate max-w-[300px]">
            {item.description}
          </span>
        </div>
      ),
    },
    {
      header: "Locație",
      key: "location",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Partea Stângă: Lista de evenimente */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Toate Evenimentele</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table data={dashboardEvents} columns={columns} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardEvents.slice(0, 2).map((event) => (
              <Card key={event.slug} className="border-l-4 border-l-blue-600">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                      Featured
                    </span>
                    <span className="text-xs text-muted">{event.date}</span>
                  </div>
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="flex items-center text-xs text-muted">
                    <span className="mr-3">📍 {event.location}</span>
                    <span>🕒 {event.time}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Partea Dreaptă: Calendar */}
        <div className="lg:col-span-4">
          <DashboardCalendar events={dashboardEvents} />
          
          <Card className="mt-6 bg-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-white">Organizezi un eveniment?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-100 text-sm mb-4">
                Adaugă evenimentul tău în calendarul universității pentru a ajunge la toți studenții.
              </p>
              <button className="w-full py-2 bg-white text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-50 transition-colors">
                Propune Eveniment
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
