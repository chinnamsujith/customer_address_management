import { useEffect, useMemo, useState } from "react";
import AdvancedFilters from "../components/AdvancedFilters";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";

const BASE_URL      = "http://localhost:5000";
const CUSTOMERS_API = `${BASE_URL}/api/customers`;
const ADDRESS_API   = `${BASE_URL}/api/address`;

const SORTS = {
  NAME_ASC: "name_asc",
  NAME_DESC: "name_desc",
  CREATED_DESC: "created_desc", // newest first
  CREATED_ASC: "created_asc",   // oldest first
};

// map UI sort to backend "sort" param (comma list, minus = desc)
const sortParamFor = (sortBy) => {
  switch (sortBy) {
    case SORTS.NAME_ASC:
      return "lastName,firstName";            // A→Z
    case SORTS.NAME_DESC:
      return "-lastName,-firstName";          // Z→A
    case SORTS.CREATED_DESC:
      return "-_id";                          // newest first
    case SORTS.CREATED_ASC:
      return "_id";                           // oldest first
    default:
      return "lastName,firstName";
  }
};

export default function Dashboard() {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  // search & sort
  const [q, setQ]                   = useState("");
  const [sortBy, setSortBy]         = useState(SORTS.NAME_ASC);

  // server-side pagination (normal list)
  const [page, setPage]             = useState(1);
  const [limit, setLimit]           = useState(10);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Advanced search state (unchanged)
  const [advLoading, setAdvLoading] = useState(false);
  const [advError, setAdvError]     = useState("");
  const [advResults, setAdvResults] = useState(null);
  const [advQuery, setAdvQuery]     = useState({ city: "", state: "", pincode: "" });

  // Address counts for visible customers
  const [addrCounts, setAddrCounts] = useState({});

  const navigate = useNavigate();

  // debounce the search text so we don’t fetch on every keystroke
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch customers (NORMAL LIST) with server-side pagination/sort/search
  useEffect(() => {
    // If advanced mode is active, skip normal list fetch
    if (advResults) return;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const params = {
          search: debouncedQ || "",
          page,
          limit,
          sort: sortParamFor(sortBy),
        };

        const { data } = await axios.get(CUSTOMERS_API, { params });

        // Backend returns { data, page, limit, total, totalPages }
        const list = Array.isArray(data) ? data : (data?.data || []);
        setCustomers(list);
        setTotal(data?.total ?? list.length);
        setTotalPages(data?.totalPages ?? 1);

      } catch (err) {
        if (!axios.isCancel(err)) setError("Failed to load customers.");
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedQ, sortBy, page, limit, advResults]);

  // Fetch address counts for currently visible customers (normal list OR adv list)
  useEffect(() => {
    const visible = advResults ? (advResults.data || []).map(x => x.customer) : customers;
    if (!visible.length) return;

    (async () => {
      try {
        const ids = visible.map(c => c._id).join(",");
        const { data } = await axios.get(`${ADDRESS_API}/counts`, { params: { customerIds: ids } });
        setAddrCounts(data?.counts || {});
      } catch (e) {
        console.warn("Failed to load address counts", e);
      }
    })();
  }, [customers, advResults]);

  // Advanced Search (unchanged)
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

  // Pager for advanced mode
  const goPageAdv = (delta) => {
    if (!advResults) return;
    const next = Math.min(Math.max(1, advResults.page + delta), advResults.totalPages);
    if (next === advResults.page) return;
    runAdvancedSearch({ ...advQuery, page: next });
  };

  // Pager for normal list
  const goPage = (delta) => {
    if (advResults) return; // guard
    const next = Math.min(Math.max(1, page + delta), totalPages);
    if (next === page) return;
    setPage(next);
  };

  const clearAdvanced = () => {
    setAdvResults(null);
    setAdvError("");
    setPage(1); // reset normal pager when leaving adv mode
  };

  const clear = () => {
    setQ("");
    setPage(1); // go back to first page when clearing/typing search
  };

  // — Display helpers —
  const baseItems = useMemo(() => {
    if (advResults) {
      return (advResults.data || []).map((x) => ({
        customer: x.customer,
        matched: x.matchedAddresses || [],
        totalAddressCount: x.totalAddressCount ?? 0,
      }));
    }
    // for normal list, items are already server-filtered/paginated/sorted
    return customers.map((c) => ({ customer: c }));
  }, [advResults, customers]);

  const sortedItems = baseItems; // already sorted by server for normal list; keep as-is

  return (
    <div className="dashboard-container">
      <div className="dashboard-card">
        {/* Header */}
        <div className="dashboard-header">
          <h1>Customers</h1>
          <div className="search-add">
            <SearchBar value={q} onChange={(v) => { setQ(v); setPage(1); }} onClear={clear} />

            {/* Sort control */}
            <div className="sort-wrap">
              <label className="sort-label" htmlFor="sortBy">Sort by:</label>
              <select
                id="sortBy"
                className="sort-select"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
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
                  Showing page <b>{page}</b> of <b>{totalPages}</b> — {sortedItems.length} on this page
                  {debouncedQ && <> for “<i>{debouncedQ}</i>”</>}
                </>
              )}
            </div>

            {/* Pagination controls */}
            {advResults ? (
              advResults.totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => goPageAdv(-1)} disabled={advResults.page <= 1 || advLoading}>Prev</button>
                  <span>Page {advResults.page} / {advResults.totalPages}</span>
                  <button onClick={() => goPageAdv(1)} disabled={advResults.page >= advResults.totalPages || advLoading}>Next</button>
                </div>
              )
            ) : (
              totalPages > 1 && (
                <div className="pagination">
                  <button onClick={() => goPage(-1)} disabled={page <= 1 || loading}>Prev</button>
                  <span>Page {page} / {totalPages}</span>
                  <button onClick={() => goPage(1)} disabled={page >= totalPages || loading}>Next</button>
                </div>
              )
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
        {!loading && !error && !advResults && total === 0 && <div className="info-text">No customers found.</div>}
        {!loading && !error && advResults && advResults.total === 0 && <div className="info-text">No customers matched the address filters.</div>}

        {/* Customers grid */}
        <div className="grid-cards">
          {sortedItems.map((item) => {
            const c = item.customer;
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
