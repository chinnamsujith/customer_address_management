// src/components/CustomerDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api/customers";

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [custDetails, setCustDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isEditing, setIsEditing] = useState(false); // editing CUSTOMER (top)
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // NEW: address editing state
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: ""
  });
  const [savingAddressId, setSavingAddressId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const { data } = await axios.get(`${API}/${id}`);
        setCustDetails(data);
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
        });
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErr("");
      const { data } = await axios.put(`${API}/${id}`, form);
      setCustDetails(data);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this customer and all their addresses? This cannot be undone.")) return;
    try {
      setDeleting(true);
      setErr("");
      await axios.delete(`${API}/${id}`);
      navigate("/"); // or "/customers"
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // Existing: delete address
  const onDeleteAddress = async (addrId) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      setDeletingAddressId(addrId);
      setErr("");
      const { data } = await axios.delete(`${API}/${id}/addresses/${addrId}`);
      setCustDetails(data);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to delete address");
    } finally {
      setDeletingAddressId(null);
    }
  };

  // NEW: start editing a specific address
  const startEditAddress = (addr) => {
    setEditingAddressId(addr._id);
    setAddressForm({
      label: addr.label ?? "",
      line1: addr.line1 ?? "",
      line2: addr.line2 ?? "",
      city: addr.city ?? "",
      state: addr.state ?? "",
      postalCode: addr.postalCode ?? "",
      country: addr.country ?? "",
    });
  };

  // NEW: cancel address edit
  const cancelEditAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      label: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: ""
    });
  };

  // NEW: save address edit
  const saveAddress = async (addrId) => {
    try {
      setSavingAddressId(addrId);
      setErr("");
      const { data } = await axios.patch(`${API}/${id}/addresses/${addrId}`, addressForm);
      setCustDetails(data);
      cancelEditAddress();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to update address");
    } finally {
      setSavingAddressId(null);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (err) return <p style={{ color: "crimson" }}>{err}</p>;
  if (!custDetails) return <p>Not found</p>;

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {!isEditing && (
          <>
            <button onClick={() => setIsEditing(true)}>Edit</button>
            <button onClick={onDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        )}
      </div>

      {/* Customer view / edit */}
      {!isEditing ? (
        <>
          <h2>{custDetails.firstName} {custDetails.lastName}</h2>
          <p><strong>Email:</strong> {custDetails.email}</p>
          <p><strong>Phone:</strong> {custDetails.phone}</p>

          <h3>Addresses</h3>
          {(custDetails.addresses ?? []).length === 0 && <p>No addresses.</p>}
          {(custDetails.addresses ?? []).map((addr) => {
            const isAddrEditing = editingAddressId === addr._id;
            return (
              <div
                key={addr._id}
                style={{ marginBottom: 8, border: "1px solid #ddd", padding: 8, borderRadius: 8 }}
              >
                {!isAddrEditing ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{addr.label || "Address"}</strong>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => startEditAddress(addr)}>Edit</button>
                        <button
                          onClick={() => onDeleteAddress(addr._id)}
                          disabled={deletingAddressId === addr._id}
                          title="Delete address"
                        >
                          {deletingAddressId === addr._id ? "Deleting…" : "Delete"}
                        </button>
                      </div>
                    </div>
                    <div>{addr.line1}</div>
                    {addr.line2 && <div>{addr.line2}</div>}
                    <div>{addr.city}, {addr.state} {addr.postalCode}</div>
                    <div>{addr.country}</div>
                  </>
                ) : (
                  // Inline edit form for this address
                  <div style={{ display: "grid", gap: 8 }}>
                    <label>Label
                      <input
                        name="label"
                        value={addressForm.label}
                        onChange={(e) => setAddressForm(f => ({ ...f, label: e.target.value }))}
                      />
                    </label>
                    <label>Line 1*
                      <input
                        required
                        name="line1"
                        value={addressForm.line1}
                        onChange={(e) => setAddressForm(f => ({ ...f, line1: e.target.value }))}
                      />
                    </label>
                    <label>Line 2
                      <input
                        name="line2"
                        value={addressForm.line2}
                        onChange={(e) => setAddressForm(f => ({ ...f, line2: e.target.value }))}
                      />
                    </label>
                    <label>City*
                      <input
                        required
                        name="city"
                        value={addressForm.city}
                        onChange={(e) => setAddressForm(f => ({ ...f, city: e.target.value }))}
                      />
                    </label>
                    <label>State*
                      <input
                        required
                        name="state"
                        value={addressForm.state}
                        onChange={(e) => setAddressForm(f => ({ ...f, state: e.target.value }))}
                      />
                    </label>
                    <label>Postal Code*
                      <input
                        required
                        name="postalCode"
                        value={addressForm.postalCode}
                        onChange={(e) => setAddressForm(f => ({ ...f, postalCode: e.target.value }))}
                      />
                    </label>
                    <label>Country*
                      <input
                        required
                        name="country"
                        value={addressForm.country}
                        onChange={(e) => setAddressForm(f => ({ ...f, country: e.target.value }))}
                      />
                    </label>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => saveAddress(addr._id)}
                        disabled={savingAddressId === addr._id}
                      >
                        {savingAddressId === addr._id ? "Saving…" : "Save"}
                      </button>
                      <button type="button" onClick={cancelEditAddress}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <form onSubmit={onSave} style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <label>
            First name
            <input name="firstName" value={form.firstName} onChange={onChange} required />
          </label>
          <label>
            Last name
            <input name="lastName" value={form.lastName} onChange={onChange} required />
          </label>
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={onChange} required />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={onChange} required />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CustomerDetails;


/*// src/components/CustomerDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api/customers";

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [custDetails, setCustDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // NEW: track which address is currently being deleted
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const { data } = await axios.get(`${API}/${id}`);
        setCustDetails(data);
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
        });
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErr("");
      const { data } = await axios.put(`${API}/${id}`, form);
      setCustDetails(data);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this customer and all their addresses? This cannot be undone.")) return;
    try {
      setDeleting(true);
      setErr("");
      await axios.delete(`${API}/${id}`);
      navigate("/"); // or "/customers"
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // NEW: delete a single address
  const onDeleteAddress = async (addrId) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      setDeletingAddressId(addrId);
      setErr("");

      // If your backend returns updated customer+addresses (200):
      const { data } = await axios.delete(`${API}/${id}/addresses/${addrId}`);
      setCustDetails(data);

      // If your backend returns 204 No Content instead, use this:
      // await axios.delete(`${API}/${id}/addresses/${addrId}`);
      // setCustDetails(prev => ({
      //   ...prev,
      //   addresses: (prev.addresses ?? []).filter(a => a._id !== addrId)
      // }));

    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to delete address");
    } finally {
      setDeletingAddressId(null);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (err) return <p style={{ color: "crimson" }}>{err}</p>;
  if (!custDetails) return <p>Not found</p>;

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        {!isEditing && (
          <>
            <button onClick={() => setIsEditing(true)}>Edit</button>
            <button onClick={onDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </>
        )}
      </div>

      {!isEditing ? (
        <>
          <h2>{custDetails.firstName} {custDetails.lastName}</h2>
          <p><strong>Email:</strong> {custDetails.email}</p>
          <p><strong>Phone:</strong> {custDetails.phone}</p>

          <h3>Addresses</h3>
          {(custDetails.addresses ?? []).length === 0 && <p>No addresses.</p>}
          {(custDetails.addresses ?? []).map((addr) => (
            <div
              key={addr._id}
              style={{ marginBottom: 8, border: "1px solid #ddd", padding: 8, borderRadius: 8 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{addr.label || "Address"}</strong>
                <button
                  onClick={() => onDeleteAddress(addr._id)}
                  disabled={deletingAddressId === addr._id}
                  title="Delete address"
                >
                  {deletingAddressId === addr._id ? "Deleting…" : "Delete"}
                </button>
              </div>
              <div>{addr.line1}</div>
              {addr.line2 && <div>{addr.line2}</div>}
              <div>{addr.city}, {addr.state} {addr.postalCode}</div>
              <div>{addr.country}</div>
            </div>
          ))}
        </>
      ) : (
        <form onSubmit={onSave} style={{ marginTop: 16, display: "grid", gap: 8 }}>
          <label>
            First name
            <input name="firstName" value={form.firstName} onChange={onChange} required />
          </label>
          <label>
            Last name
            <input name="lastName" value={form.lastName} onChange={onChange} required />
          </label>
          <label>
            Email
            <input type="email" name="email" value={form.email} onChange={onChange} required />
          </label>
          <label>
            Phone
            <input name="phone" value={form.phone} onChange={onChange} required />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CustomerDetails;


*/