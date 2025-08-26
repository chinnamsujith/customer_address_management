// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import AdvancedFilters from "../components/AdvancedFilters";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";

const BASE_URL      = "http://localhost:5000";
const CUSTOMERS_API = `${BASE_URL}/api/customers`;
const ADDRESS_API   = `${BASE_URL}/api/address`;

export default function Dashboard() {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [q, setQ]                   = useState("");

  // advanced search state
  const [advLoading, setAdvLoading] = useState(false);
  const [advError, setAdvError]     = useState("");
  const [advResults, setAdvResults] = useState(null); // null = inactive; object when active
  const [advQuery, setAdvQuery]     = useState({ city: "", state: "", pincode: "" }); // keep last query for paging

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await axios.get(CUSTOMERS_API);
        setCustomers(Array.isArray(data) ? data : (data?.data || []));
      } catch (err) {
        if (!axios.isCancel(err)) setError("Failed to load customers.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const norm   = (s = "") => (s ?? "").toString().toLowerCase().trim();
  const digits = (s = "") => (s ?? "").toString().replace(/\D/g, "");

  const filtered = useMemo(() => {
    if (!q.trim()) return customers;
    const nq = norm(q);
    const nqDigits = digits(q);
    return customers.filter((c) => {
      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`;
      const nameHit  = norm(fullName).includes(nq);
      const emailHit = norm(c.email ?? "").includes(nq);
      const phoneHit = digits(c.phone ?? "").includes(nqDigits);
      return nameHit || emailHit || (nqDigits ? phoneHit : false);
    });
  }, [customers, q]);

  const list = advResults ? advResults.data.map((x) => x.customer) : filtered;

  // advanced search
  const runAdvancedSearch = async ({ city, state, pincode, page = 1 }) => {
    try {
      setAdvLoading(true);
      setAdvError("");
      setAdvQuery({ city, state, pincode });
      const { data } = await axios.get(
        `${ADDRESS_API}/search-address`,
        { params: { city, state, pincode, page, limit: 20 } }
      );
      setAdvResults(data);
    } catch (e) {
      const msg =
        e?.response?.status === 400
          ? e?.response?.data?.message || "Provide at least one of city/state/pincode."
          : "Failed to run address search.";
      setAdvError(msg);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Customers</h1>

          {/* search + add */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SearchBar value={q} onChange={setQ} onClear={clear} />
            <Link
              to="/add-customer"
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700 shadow"
            >
              + Add Customer
            </Link>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="mb-3">
          <AdvancedFilters onSearch={runAdvancedSearch} onClear={clearAdvanced} />
          {advLoading && <div className="mt-2 text-sm text-gray-600">Searching addresses…</div>}
          {advError && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {advError}
            </div>
          )}
        </div>

        {/* meta row */}
        {!loading && !error && (
          <div className="mb-3 text-xs text-gray-600 flex items-center justify-between">
            <div>
              {advResults ? (
                <>
                  Showing <span className="font-semibold">{list.length}</span> of{" "}
                  <span className="font-semibold">{advResults.total}</span> customers
                  <span className="ml-2 rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">
                    address filter active
                  </span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold">{filtered.length}</span> of{" "}
                  <span className="font-semibold">{customers.length}</span> customers
                  {q ? <> for “<span className="italic">{q}</span>”</> : null}
                </>
              )}
            </div>

            {/* pagination (only in advanced mode) */}
            {advResults && advResults.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goPage(-1)}
                  disabled={advResults.page <= 1 || advLoading}
                  className={`rounded-md border px-2 py-1 text-sm ${
                    advResults.page <= 1 || advLoading
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Prev
                </button>
                <span className="text-gray-700 text-sm">
                  Page {advResults.page} / {advResults.totalPages}
                </span>
                <button
                  onClick={() => goPage(1)}
                  disabled={advResults.page >= advResults.totalPages || advLoading}
                  className={`rounded-md border px-2 py-1 text-sm ${
                    advResults.page >= advResults.totalPages || advLoading
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* loading skeletons */}
        {loading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow">
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* empty states */}
        {!loading && !error && customers.length === 0 && !advResults && (
          <div className="text-gray-600">No customers found.</div>
        )}
        {!loading && !error && !advResults && customers.length > 0 && filtered.length === 0 && (
          <div className="text-gray-600">No matches for “{q}”.</div>
        )}
        {!loading && !error && advResults && advResults.total === 0 && (
          <div className="text-gray-600">No customers matched the address filters.</div>
        )}

        {/* results: GRID */}
        <div
          className="
            grid gap-4
            sm:grid-cols-2
            lg:grid-cols-3
          "
        >
          {list.map((c, idx) => {
            const matched = advResults ? (advResults.data[idx]?.matchedAddresses || []) : [];
            const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "Unnamed";
            return (
              <div
                key={c._id}
                className="bg-white rounded-xl shadow p-4 transition hover:shadow-md border border-transparent hover:border-gray-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-gray-900 truncate">{fullName}</div>
                    <div className="text-gray-700 truncate">{c.email || "-"}</div>
                    <div className="text-gray-700 truncate">{c.phone || "-"}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/customers/${c._id}`)}
                    className="rounded-md bg-gray-800 px-3 py-2 text-white text-sm hover:bg-black"
                  >
                    View
                  </button>
                </div>

                {advResults && matched.length > 0 && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Matched addresses</div>
                    <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
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
      </div>
    </div>
  );
}
/*
// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import AdvancedFilters from "../components/AdvancedFilters";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import SearchBar from "../components/SearchBar";

export default function Dashboard() {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [q, setQ]                   = useState("");

  // advanced search state
  const [advLoading, setAdvLoading] = useState(false);
  const [advError, setAdvError]     = useState("");
  const [advResults, setAdvResults] = useState(null); // null = inactive; object when active
  const [advQuery, setAdvQuery]     = useState({ city: "", state: "", pincode: "" }); // keep last query for paging

  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await axios.get("http://localhost:5000/api/customers");
        setCustomers(Array.isArray(data) ? data : (data?.data || []));
      } catch (err) {
        if (!axios.isCancel(err)) setError("Failed to load customers.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const norm   = (s = "") => (s ?? "").toString().toLowerCase().trim();
  const digits = (s = "") => (s ?? "").toString().replace(/\D/g, "");

  const filtered = useMemo(() => {
    if (!q.trim()) return customers;
    const nq = norm(q);
    const nqDigits = digits(q);
    return customers.filter((c) => {
      const fullName = `${c.firstName ?? ""} ${c.lastName ?? ""}`;
      const nameHit  = norm(fullName).includes(nq);
      const emailHit = norm(c.email ?? "").includes(nq);
      const phoneHit = digits(c.phone ?? "").includes(nqDigits);
      return nameHit || emailHit || (nqDigits ? phoneHit : false);
    });
  }, [customers, q]);

  const list = advResults ? advResults.data.map((x) => x.customer) : filtered;

  // advanced search
  const runAdvancedSearch = async ({ city, state, pincode, page = 1 }) => {
    try {
      setAdvLoading(true);
      setAdvError("");
      setAdvQuery({ city, state, pincode });
      const { data } = await axios.get(
        "http://localhost:5000/api/customers/search-address",
        { params: { city, state, pincode, page, limit: 20 } } // removed sort
      );
      setAdvResults(data);
    } catch (e) {
      const msg =
        e?.response?.status === 400
          ? e?.response?.data?.message || "Provide at least one of city/state/pincode."
          : "Failed to run address search.";
      setAdvError(msg);
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
//       header 
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Customers</h1>

//         search + add 
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <SearchBar value={q} onChange={setQ} onClear={clear} />
            <Link
              to="/add-customer"
              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700 shadow"
            >
              + Add Customer
            </Link>
          </div>
        </div>

//       Advanced Filters
        <div className="mb-3">
          <AdvancedFilters onSearch={runAdvancedSearch} onClear={clearAdvanced} />
          {advLoading && <div className="mt-2 text-sm text-gray-600">Searching addresses…</div>}
          {advError && (
            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {advError}
            </div>
          )}
        </div>

//       meta row
        {!loading && !error && (
          <div className="mb-3 text-xs text-gray-600 flex items-center justify-between">
            <div>
              {advResults ? (
                <>
                  Showing <span className="font-semibold">{list.length}</span> of{" "}
                  <span className="font-semibold">{advResults.total}</span> customers
                  <span className="ml-2 rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">
                    address filter active
                  </span>
                </>
              ) : (
                <>
                  Showing <span className="font-semibold">{filtered.length}</span> of{" "}
                  <span className="font-semibold">{customers.length}</span> customers
                  {q ? <> for “<span className="italic">{q}</span>”</> : null}
                </>
              )}
            </div>

//           pagination (only in advanced mode) 
            {advResults && advResults.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => goPage(-1)}
                  disabled={advResults.page <= 1 || advLoading}
                  className={`rounded-md border px-2 py-1 text-sm ${
                    advResults.page <= 1 || advLoading
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Prev
                </button>
                <span className="text-gray-700 text-sm">
                  Page {advResults.page} / {advResults.totalPages}
                </span>
                <button
                  onClick={() => goPage(1)}
                  disabled={advResults.page >= advResults.totalPages || advLoading}
                  className={`rounded-md border px-2 py-1 text-sm ${
                    advResults.page >= advResults.totalPages || advLoading
                      ? "text-gray-400 border-gray-200 cursor-not-allowed"
                      : "text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

//      loading skeletons 
        {loading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-white p-4 shadow">
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 w-1/4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        )}

//        error 
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

//        empty states 
        {!loading && !error && customers.length === 0 && !advResults && (
          <div className="text-gray-600">No customers found.</div>
        )}
        {!loading && !error && !advResults && customers.length > 0 && filtered.length === 0 && (
          <div className="text-gray-600">No matches for “{q}”.</div>
        )}
        {!loading && !error && advResults && advResults.total === 0 && (
          <div className="text-gray-600">No customers matched the address filters.</div>
        )}

//        results 
        <div className="space-y-4">
          {list.map((c, idx) => {
            const matched = advResults ? (advResults.data[idx]?.matchedAddresses || []) : [];
            return (
              <div key={c._id} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-gray-900 truncate">
                      {(c.firstName ?? "") + " " + (c.lastName ?? "")}
                    </div>
                    <div className="text-gray-700 truncate">{c.email}</div>
                    <div className="text-gray-700 truncate">{c.phone}</div>
                  </div>
                  <button
                    onClick={() => navigate(`/customers/${c._id}`)}
                    className="rounded-md bg-gray-800 px-3 py-2 text-white text-sm hover:bg-black"
                  >
                    View
                  </button>
                </div>

                {advResults && matched.length > 0 && (
                  <div className="mt-3 rounded-lg bg-gray-50 p-3">
                    <div className="text-xs font-semibold text-gray-700 mb-1">Matched addresses</div>
                    <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                      {matched.map((a) => (
                        <li key={a._id}>
                          {[a.line1, a.line2].filter(Boolean).join(", ")}{a.line1 || a.line2 ? ", " : ""}
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
      </div>
    </div>
  );
}
*/