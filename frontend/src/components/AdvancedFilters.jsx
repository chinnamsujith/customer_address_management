import React, { useMemo, useState } from "react";

export default function AdvancedFilters({ onSearch, onClear, initial = {} }) {
  const [city, setCity]       = useState(initial.city || "");
  const [state, setState]     = useState(initial.state || "");
  const [pincode, setPincode] = useState(initial.pincode || "");

  const canSearch = useMemo(() => {
    return Boolean((city || "").trim() || (state || "").trim() || (pincode || "").trim());
  }, [city, state, pincode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSearch) return;
    onSearch?.({ city, state, pincode, page: 1 });
  };

  const handleClear = () => {
    setCity(""); setState(""); setPincode("");
    onClear?.();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          placeholder="Pincode"
          inputMode="numeric"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSearch}
            className={`flex-1 rounded-lg px-3 py-2 text-white text-sm shadow ${
              canSearch ? "bg-indigo-600 hover:bg-indigo-700" : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            Search
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
      </div>
    </form>
  );
}
