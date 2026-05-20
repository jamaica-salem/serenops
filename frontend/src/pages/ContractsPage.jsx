import { useEffect, useState } from "react";
import api from "../lib/api";

export default function ContractsPage() {
  const [contracts, setContracts] = useState([]);

  const load = async () => {
    try {
      const { data } = await api.get("/contracts");
      setContracts(data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Contracts load failed:", e);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 animate-fade-up" data-testid="contracts-page">
      <div>
        <p className="text-sm text-gray-500">Track sent and signed agreements</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-gray-900">Contracts</h1>
      </div>

      <div className="space-y-3">
        {contracts.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-gray-900">{c.title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{String(c.status || "").replace(/_/g, " ")}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{c.scope_of_work || "No scope details"}</p>
          </div>
        ))}
        {contracts.length === 0 && <div className="text-sm text-gray-400 italic text-center py-10">No contracts yet.</div>}
      </div>
    </div>
  );
}
