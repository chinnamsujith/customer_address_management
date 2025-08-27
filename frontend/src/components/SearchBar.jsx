import React from "react";

export default function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Search by name, email, or phone…",
}) {
  return (
    <div className="search-bar">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button type = "button" onClick={onClear}>
          &times;
        </button>
      )}
    </div>
  );
}
