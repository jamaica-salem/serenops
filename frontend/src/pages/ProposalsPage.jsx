import { useEffect, useState } from "react";
import api from "../lib/api";

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);

  const load = async () => {
    try {
      const { data } = await api.get("/proposals");
      setProposals(data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Proposals load failed:", e);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 animate-fade-up" data-testid="proposals-page">
      <div>
        <p className="text-sm text-gray-500">Track draft and sent proposals</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6]">Proposals</h1>
      </div>

      <div className="space-y-3">
        {proposals.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-[#1C4B3E] dark:text-[#d7e6b6]">{p.project_title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{String(p.status || "").replace(/_/g, " ")}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{p.scope_of_work || "No scope details"}</p>
          </div>
        ))}
        {proposals.length === 0 && <div className="text-sm text-gray-400 italic text-center py-10">No proposals yet.</div>}
      </div>
    </div>
  );
}
