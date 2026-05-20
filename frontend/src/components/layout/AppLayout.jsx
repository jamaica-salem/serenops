import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AIChatPanel from "../AIChatPanel";

export default function AppLayout() {
  const [filter, setFilter] = useState("month");
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F7FAF8]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <TopBar
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearch={setSearch}
        />
        <main className="flex-1 overflow-y-auto" data-testid="main-content">
          <div className="px-4 md:px-10 py-6 md:py-8 max-w-[1520px] mx-auto">
            <Outlet context={{ filter, search }} />
          </div>
        </main>
      </div>
      <AIChatPanel />
    </div>
  );
}
