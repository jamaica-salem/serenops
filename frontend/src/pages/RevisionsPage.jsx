import { useEffect, useState } from "react";
import api from "../lib/api";

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState([]);

  const load = async () => {
    try {
      const { data } = await api.get("/revisions");
      setRevisions(data);
    } catch (e) {
      if (e?.response?.status !== 401) console.error("Revisions load failed:", e);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5 animate-fade-up" data-testid="revisions-page">
      <div>
        <p className="text-sm text-gray-500">Track client revision requests and approvals</p>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#1C4B3E] dark:text-[#d7e6b6]">Revisions</h1>
      </div>

      <div className="space-y-3">
        {revisions.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium text-[#1C4B3E] dark:text-[#d7e6b6]">{r.request_title}</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{String(r.status || "").replace(/_/g, " ")}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{r.description || "No description"}</p>
          </div>
        ))}
        {revisions.length === 0 && <div className="text-sm text-gray-400 italic text-center py-10">No revisions yet.</div>}
      </div>
    </div>
  );
}
