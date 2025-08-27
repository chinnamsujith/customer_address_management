import React, { useMemo, useState } from "react";


export default function AdvancedFilters({ onSearch, onClear, initial = {} }) {
  const [city, setCity] = useState(initial.city || "");
  const [state, setState] = useState(initial.state || "");
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
    setCity("");
    setState("");
    setPincode("");
    onClear?.();
  };

  return (
    <form onSubmit={handleSubmit} className="advanced-filters">
      <div className="inputs-wrapper">
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City"
        />
        <input
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="State"
        />
        <input
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          placeholder="Pincode"
          inputMode="numeric"
        />
        <div className="buttons-wrapper">
          <button type="submit" disabled={!canSearch} className={`search-btn ${canSearch ? "" : "disabled"}`}>
            Search
          </button>
          <button type="button" onClick={handleClear} className="clear-btn">
            Clear
          </button>
        </div>
      </div>
    </form>
  );
}
