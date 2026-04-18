// src/app/admin/repairs/RepairsDashboardClient.tsx
"use client";

import { useState } from "react";
import { RmaHeader } from "./_components/RmaHeader";
import { RmaStats } from "./_components/RmaStats";
import { RmaTable } from "./_components/RmaTable";
import { RmaAddForm } from "./_components/RmaAddForm";

interface IRepair {
  id: string;
  client: string;
  item: string;
  serial: string;
  date: string;
  status: string;
}

export function RepairsDashboardClient({ initialRepairs }: { initialRepairs: IRepair[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const filteredRepairs = initialRepairs.filter(r => 
    r.client.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: initialRepairs.length,
    active: initialRepairs.filter(r => r.status !== 'ZAKOŃCZONE').length,
    completed: initialRepairs.filter(r => r.status === 'ZAKOŃCZONE').length
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <RmaHeader 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        isAdding={isAdding} 
        setIsAdding={setIsAdding} 
      />

      <RmaStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {isAdding && (
          <RmaAddForm onCancel={() => setIsAdding(false)} />
        )}

        <div className="lg:col-span-12">
          <RmaTable repairs={filteredRepairs} />
        </div>
      </div>
    </div>
  );
}
