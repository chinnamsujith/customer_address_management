import { useEffect, useMemo, useState } from "react";
import AdvancedFilters from "../components/AdvancedFilters";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";

const BASE_URL = "http://localhost:5000";
const CUSTOMERS_API = `${BASE_URL}/api/customers`;
const ADDRESS_API = `${BASE_URL}/api/address`;

const SORTS = {
  NAME_ASC: "name_asc",
  NAME_DESC: "name_desc",
  CREATED_DESC: "created_desc", // newest first
  CREATED_ASC: "created_asc",   // oldest first
};

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [q, setQ]               = useState("");

  const [advLoading, setAdvLoading]   = useState(false);
  const [advError, setAdvError]       = useState("");
  const [advResults, setAdvResults]   = useState(null);
  const [advQuery, setAdvQuery]       = useState({ city: "", state: "", pincode: "" });

  // Address counts for normal list view { customerId: number }
  const [addrCounts, setAddrCounts] = useState({});

  // Sort state
  const [sortBy, setSortBy] = useState(SORTS.NAME_ASC);

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await axios.get(CUSTOMERS_API);
        setCustomers(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        if (!axios.isCancel(err)) setError("Failed to load customers.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fetch address counts for all loaded customers (regular list)
  useEffect(() => {
    if (!customers.length) return;

    (async () => {
      try {
        const ids = customers.map(c => c._id).join(",");
        const { data } = await axios.get(`${ADDRESS_API}/counts`, { params: { customerIds: ids } });
        setAddrCounts(data?.counts || {});
      } catch (e) {
        // Non-blocking
        console.warn("Failed to load address counts", e);
      }
    })();
  }, [customers]);

  const norm   = (s = "") => (s ?? "").toString().toLowerCase().trim();
  const digits = (s = "") => (s ?? "").toString().replace(/\D/g, "");

  const filtered = useMemo(() => {
    if (!q.trim()) return customers;
    const nq = norm(q);
    const nqDigits = digits(q);
    return customers.filter((c) => {
      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`;
      return (
        norm(fullName).includes(nq) ||
        norm(c.email ?? "").includes(nq) ||
        (nqDigits && digits(c.phone ?? "").includes(nqDigits))
      );
    });
  }, [customers, q]);

  // Helper: build a unified list of items so we can sort safely
  // In adv mode we carry matched addresses + count; in normal we just have customer.
  const baseItems = useMemo(() => {
    if (advResults) {
      return (advResults.data || []).map((x) => ({
        customer: x.customer,
        matched: x.matchedAddresses || [],
        totalAddressCount: x.totalAddressCount ?? 0,
      }));
    }
    return filtered.map((c) => ({ customer: c }));
  }, [advResults, filtered]);

  // Helpers for sorting
  const fullName = (c) => `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim().toLowerCase();

  // If createdAt missing, derive from ObjectId (first 8 hex chars = seconds since epoch)
  const createdMs = (c) => {
    if (c?.createdAt) {
      const t = Date.parse(c.createdAt);
      if (!Number.isNaN(t)) return t;
    }
    try {
      if (typeof c?._id === "string" && c._id.length >= 8) {
        const sec = parseInt(c._id.slice(0, 8), 16);
        if (!Number.isNaN(sec)) return sec * 1000;
      }
    } catch (_) {}
    return 0;
  };

  const sortedItems = useMemo(() => {
    const arr = [...baseItems];
    arr.sort((a, b) => {
      const ca = a.customer;
      const cb = b.customer;
      switch (sortBy) {
        case SORTS.NAME_ASC:
          return fullName(ca).localeCompare(fullName(cb));
        case SORTS.NAME_DESC:
          return fullName(cb).localeCompare(fullName(ca));
        case SORTS.CREATED_DESC: // newest first
          return createdMs(cb) - createdMs(ca);
        case SORTS.CREATED_ASC:  // oldest first
          return createdMs(ca) - createdMs(cb);
        default:
          return 0;
      }
    });
    return arr;
  }, [baseItems, sortBy]);

  const runAdvancedSearch = async ({ city, state, pincode, page = 1 }) => {
    try {
      setAdvLoading(true);
      setAdvError("");
      setAdvQuery({ city, state, pincode });
      const { data } = await axios.get(`${ADDRESS_API}/search-address`, {
        params: { city, state, pincode, page, limit: 20 },
      });
      setAdvResults(data);
    } catch (e) {
      setAdvError(
        e?.response?.status === 400
          ? e?.response?.data?.message || "Provide at least one of city/state/pincode."
          : "Failed to run address search."
      );
    } finally {
      setAdvLoading(false);
    }
  };

  const goPage = (delta) => {
    if (!advResults) return;
    const next = Math.min(Math.max(1, advResults.page + delta), advResults.totalPages);
    if (next === advResults.page) return;
    runAdvancedSearch({ ...advQuery, page: next });
  };

  const clearAdvanced = () => {
    setAdvResults(null);
    setAdvError("");
  };

  const clear = () => setQ("");

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Customers</h1>
          <div className="search-add">
            <SearchBar value={q} onChange={setQ} onClear={clear} />

            {/* Sort control */}
            <div className="sort-wrap">
              <label className="sort-label" htmlFor="sortBy">Sort by:</label>
              <select
                id="sortBy"
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value={SORTS.NAME_ASC}>Name (A → Z)</option>
                <option value={SORTS.NAME_DESC}>Name (Z → A)</option>
                <option value={SORTS.CREATED_DESC}>Created (Newest)</option>
                <option value={SORTS.CREATED_ASC}>Created (Oldest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="advanced-filters-section">
          <AdvancedFilters onSearch={runAdvancedSearch} onClear={clearAdvanced} />
          {advLoading && <div className="info-text">Searching addresses…</div>}
          {advError && <div className="error-text">{advError}</div>}
        </div>

        {/* Meta info */}
        {!loading && !error && (
          <div className="meta-row">
            <div>
              {advResults ? (
                <>
                  Showing <b>{sortedItems.length}</b> of <b>{advResults.total}</b> customers
                  <span className="badge">address filter active</span>
                </>
              ) : (
                <>
                  Showing <b>{sortedItems.length}</b> of <b>{customers.length}</b> customers
                  {q && <> for “<i>{q}</i>”</>}
                </>
              )}
            </div>

            {advResults && advResults.totalPages > 1 && (
              <div className="pagination">
                <button onClick={() => goPage(-1)} disabled={advResults.page <= 1 || advLoading}>Prev</button>
                <span>Page {advResults.page} / {advResults.totalPages}</span>
                <button onClick={() => goPage(1)} disabled={advResults.page >= advResults.totalPages || advLoading}>Next</button>
              </div>
            )}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid-cards">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card"></div>
            ))}
          </div>
        )}

        {/* Errors */}
        {error && <div className="error-text">{error}</div>}

        {/* Empty states */}
        {!loading && !error && customers.length === 0 && !advResults && <div className="info-text">No customers found.</div>}
        {!loading && !error && !advResults && customers.length > 0 && sortedItems.length === 0 && <div className="info-text">No matches for “{q}”.</div>}
        {!loading && !error && advResults && advResults.total === 0 && <div className="info-text">No customers matched the address filters.</div>}

        {/* Customers grid */}
        <div className="grid-cards">
          {sortedItems.map((item) => {
            const c = item.customer;

            // Count logic: use adv count if present, else fall back to addrCounts
            const totalAddressCount =
              typeof item.totalAddressCount === "number"
                ? item.totalAddressCount
                : (addrCounts[c._id] ?? 0);

            const onlyOne = totalAddressCount === 1;
            const fullNameDisp = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unnamed";
            const matched = advResults ? (item.matched || []) : [];

            return (
              <div key={c._id} className="customer-card">
                <div className="customer-info">
                  <div className="customer-name">
                    {fullNameDisp}
                    {onlyOne && <span className="badge one">Only 1 address</span>}
                  </div>
                  <div className="customer-email">{c.email || "-"}</div>
                  <div className="customer-phone">{c.phone || "-"}</div>
                </div>

                <button className="view-btn" onClick={() => navigate(`/customers/${c._id}`)}>View</button>

                {advResults && matched.length > 0 && (
                  <div className="matched-addresses">
                    <div className="matched-title">Matched addresses</div>
                    <ul>
                      {matched.map((a) => (
                        <li key={a._id}>
                          {[a.line1, a.line2].filter(Boolean).join(", ")}
                          {a.line1 || a.line2 ? ", " : ""}
                          {a.city}, {a.state} {a.postalCode}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Link to="/add-customer" className="add-btn">+ Add Customer</Link>
      </div>
    </div>
  );
}
