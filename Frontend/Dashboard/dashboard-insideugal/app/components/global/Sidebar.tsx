import React from "react";
import { Home, Newspaper, Calendar, GraduationCap, MapPin, AlertTriangle, Utensils, Users } from "lucide-react";

export default function Sidebar() {
  const menuItems = [
    { label: "Acasă", icon: <Home size={20} />, active: true },
    { label: "Noutăți", icon: <Newspaper size={20} />, active: false },
    { label: "Evenimente", icon: <Calendar size={20} />, active: false },
    { label: "Facultăți", icon: <GraduationCap size={20} />, active: false },
    { label: "Hărți", icon: <MapPin size={20} />, active: false },
    { label: "Sesizări", icon: <AlertTriangle size={20} />, active: false },
    { label: "Cantină", icon: <Utensils size={20} />, active: false },
    { label: "Conturi", icon: <Users size={20} />, active: false },
  ];

  return (
    // bg-sidebar aplică automat nuanța închisă (#003a70) din global.css
    <div className="w-full h-screen flex flex-col justify-between bg-sidebar text-text-main pt-8 pb-6 px-8 select-none border-r border-white/5 overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6 w-full flex-shrink-0">
          <h2 className="text-xl font-bold tracking-tight text-text-main uppercase font-sans">Inside UGAL</h2>
          <p className="text-sm text-text-muted mt-1 opacity-80">Dashboard Universitar</p>
        </div>

        {/* Meniu pastile */}
        <nav className="flex-1 overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
          {menuItems.map((item, index) => (
            <a
              key={index}
              href="#"
              className={`flex items-center gap-4 px-4 py-2.5 rounded-md font-semibold text-base transition-all duration-150 border w-full group ${
                item.active
                  ? "bg-white/20 border-white/20 text-text-main shadow-sm"
                  : "bg-transparent border-transparent text-text-muted hover:bg-white/10 hover:text-text-main"
              }`}
            >
              <div
                className={`transition-opacity duration-150 flex-shrink-0 ${item.active ? "opacity-100" : "opacity-60 group-hover:opacity-100"}`}
              >
                {item.icon}
              </div>
              <span className="tracking-wide whitespace-nowrap">{item.label}</span>
            </a>
          ))}
        </nav>
      </div>

      {/* Subsol */}
      <div className="w-full pt-4 border-t border-white/10 flex-shrink-0 mt-3">
        <div className="text-center text-xs font-medium text-text-muted opacity-40 w-full">
          <span>v1.0 • © 2026</span>
        </div>
      </div>
    </div>
  );
}
