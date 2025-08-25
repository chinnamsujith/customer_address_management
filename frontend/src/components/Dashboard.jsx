import { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

export default function Dashboard() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const navigate = useNavigate();

  useEffect(() => { (async () => {
      try {
        setLoading(true);
        setError('');
        const { data } = await axios.get('http://localhost:5000/api/customers');
        // Backend may return an array or { data: [...] } — handle both:
        setCustomers(Array.isArray(data) ? data : (data?.data || []));
      } catch (err) {
        if (!axios.isCancel(err)) setError('Failed to load customers.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold text-gray-800">Customers</h1>
          <Link
            to="/add-customer"
            className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-2 text-white text-sm hover:bg-blue-700 shadow"
          >
            + Add Customer
          </Link>
        </div>

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

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && customers.length === 0 && (
          <div className="text-gray-600">No customers found.</div>
        )}

        {/* One-after-one stacked cards */}
        <div className="space-y-4">
          {customers.map((c) => (
            <div key={c._id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-gray-700">{c.email}</div>
                  <div className="text-gray-700">{c.phone}</div>
                </div>
                <button
                  onClick={() => navigate(`/customers/${c._id}`)}
                  className="rounded-md bg-gray-800 px-3 py-2 text-white text-sm hover:bg-black"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
