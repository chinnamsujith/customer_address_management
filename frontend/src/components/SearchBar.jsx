import React from "react";

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search by name, email, or phone…",
}) {
  return (
    <div className="relative w-full sm:w-80">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") onClear?.(); }}
        type="text"
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-10 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Search customers"
      />
      {/* search icon 
      <span className="pointer-events-none absolute left-3 top-2.5 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m1.6-5.4a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>*/}
      {/* clear button */}
      {value && (
        <button
          onClick={onClear}
          aria-label="Clear search"
          className="absolute right-2 top-1.5 rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
        >
          Clear
        </button>
      )}
    </div>
  );
}
