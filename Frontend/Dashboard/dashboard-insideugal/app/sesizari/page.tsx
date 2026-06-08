"use client";

import React, { useState } from "react";
import Table, { Column } from "../components/ui/Table";
import Modal from "../components/ui/Modal";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { mockComplaints, Complaint, ComplaintStatus } from "../data/complaints";

export default function SesizariPage() {
  const [complaints] = useState<Complaint[]>(mockComplaints);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    const styles = {
      in_asteptare: "bg-amber-100 text-amber-700 border-amber-200",
      in_lucru: "bg-blue-100 text-blue-700 border-blue-200",
      finalizat: "bg-emerald-100 text-emerald-700 border-emerald-200",
      respins: "bg-rose-100 text-rose-700 border-rose-200",
    };

    const labels = {
      in_asteptare: "În așteptare",
      in_lucru: "În lucru",
      finalizat: "Finalizat",
      respins: "Respins",
    };

    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  const columns: Column<Complaint>[] = [
    {
      header: "Titlu",
      key: "title",
      render: (item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.title}</span>
          <span className="text-xs text-muted truncate max-w-[200px]">
            {item.description}
          </span>
        </div>
      ),
    },
    {
      header: "Locație",
      key: "location",
    },
    {
      header: "Utilizator",
      key: "user",
    },
    {
      header: "Dată",
      key: "date",
    },
    {
      header: "Status",
      key: "status",
      render: (item) => getStatusBadge(item.status),
    },
  ];

  const stats = [
    {
      title: "Total Sesizări",
      value: complaints.length,
      color: "text-foreground",
    },
    {
      title: "În așteptare",
      value: complaints.filter((c) => c.status === "in_asteptare").length,
      color: "text-amber-600",
    },
    {
      title: "În lucru",
      value: complaints.filter((c) => c.status === "in_lucru").length,
      color: "text-blue-600",
    },
    {
      title: "Rezolvate",
      value: complaints.filter((c) => c.status === "finalizat").length,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Statistici */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted">
                {stat.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Tabel Sesizări */}
      <Card>
        <CardHeader>
          <CardTitle>Listă Sesizări</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table
            data={complaints}
            columns={columns}
            onRowClick={handleRowClick}
          />
        </CardContent>
      </Card>

      {/* Detalii Sesizare Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Detalii Sesizare"
      >
        {selectedComplaint && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold uppercase text-muted mb-1">
                Titlu
              </h4>
              <p className="text-base font-semibold">
                {selectedComplaint.title}
              </p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase text-muted mb-1">
                Descriere
              </h4>
              <p className="text-sm leading-relaxed">
                {selectedComplaint.description}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold uppercase text-muted mb-1">
                  Locație
                </h4>
                <p className="text-sm">{selectedComplaint.location}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-muted mb-1">
                  Dată
                </h4>
                <p className="text-sm">{selectedComplaint.date}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-muted mb-1">
                  Utilizator
                </h4>
                <p className="text-sm">{selectedComplaint.user}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase text-muted mb-1">
                  Status
                </h4>
                <div>{getStatusBadge(selectedComplaint.status)}</div>
              </div>
            </div>
            <div className="pt-4 border-t border-border flex justify-end space-x-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors"
              >
                Închide
              </button>
              <button className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Schimbă Status
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
