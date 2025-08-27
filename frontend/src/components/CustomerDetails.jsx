import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE_URL = "http://localhost:5000";
const CUSTOMERS_API = `${BASE_URL}/api/customers`;
const ADDRESS_API = `${BASE_URL}/api/address`;

const emptyAddr = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

// Allowed fields shown/edited for an address
const ADDRESS_FIELDS = [
  { key: "label",      label: "Label" },
  { key: "line1",      label: "Line 1",      required: true },
  { key: "line2",      label: "Line 2" },
  { key: "city",       label: "City",        required: true },
  { key: "state",      label: "State",       required: true },
  { key: "postalCode", label: "Postal Code", required: true },
  { key: "country",    label: "Country",     required: true },
];
const ADDRESS_KEYS = ADDRESS_FIELDS.map(f => f.key);

const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj && obj[k] !== undefined) acc[k] = obj[k];
    return acc;
  }, {});

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [custDetails, setCustDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddr);
  const [savingAddressId, setSavingAddressId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddr);
  const [savingNewAddress, setSavingNewAddress] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setErr("");
        setLoading(true);
        const { data } = await axios.get(`${CUSTOMERS_API}/${id}`);
        setCustDetails(data);
        setForm({
          firstName: data.firstName ?? "",
          lastName: data.lastName ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
        });
      } catch (e) {
        console.error(e);
        setErr(e?.response?.data?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setErr("");
      const { data } = await axios.put(`${CUSTOMERS_API}/${id}`, form);
      setCustDetails(data);
      setIsEditing(false);
    } catch (e2) {
      console.error(e2);
      setErr(e2?.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm("Delete this customer and all their addresses? This cannot be undone.")) return;
    try {
      setDeleting(true);
      setErr("");
      await axios.delete(`${CUSTOMERS_API}/${id}`);
      navigate("/");
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  // Address ops
  const startEditAddress = (addr) => {
    if (addingAddress) return;
    setEditingAddressId(addr._id);
    setAddressForm(pick(addr, ADDRESS_KEYS)); // whitelist fields only
  };

  const cancelEditAddress = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddr);
  };

  const saveAddress = async (addrId) => {
    const must = (v) => String(v ?? "").trim();
    const payload = pick(addressForm, ADDRESS_KEYS); // sanitize payload

    if (
      !must(payload.line1) ||
      !must(payload.city) ||
      !must(payload.state) ||
      !must(payload.postalCode) ||
      !must(payload.country)
    ) {
      setErr("Please fill all required fields in the address form.");
      return;
    }

    try {
      setSavingAddressId(addrId);
      setErr("");
      const { data } = await axios.patch(`${ADDRESS_API}/${id}/addresses/${addrId}`, payload);
      setCustDetails(data);
      cancelEditAddress();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to update address.");
    } finally {
      setSavingAddressId(null);
    }
  };

  const onDeleteAddress = async (addrId) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      setDeletingAddressId(addrId);
      setErr("");
      const { data } = await axios.delete(`${ADDRESS_API}/${id}/addresses/${addrId}`);
      setCustDetails(data);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to delete address.");
    } finally {
      setDeletingAddressId(null);
    }
  };

  // Add new address
  const onChangeNewAddr = (e) => setNewAddress((a) => ({ ...a, [e.target.name]: e.target.value }));

  const cancelNewAddress = () => {
    setAddingAddress(false);
    setNewAddress(emptyAddr);
  };

  const saveNewAddress = async () => {
    const must = (v) => String(v ?? "").trim();
    const payload = pick(newAddress, ADDRESS_KEYS); // sanitize payload

    if (
      !must(payload.line1) ||
      !must(payload.city) ||
      !must(payload.state) ||
      !must(payload.postalCode) ||
      !must(payload.country)
    ) {
      setErr("Please fill all required fields for the new address.");
      return;
    }

    try {
      setSavingNewAddress(true);
      setErr("");
      const { data } = await axios.post(`${ADDRESS_API}/${id}/addresses`, payload);
      setCustDetails(data);
      cancelNewAddress();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to add address.");
    } finally {
      setSavingNewAddress(false);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (err) return <p className="error">{err}</p>;
  if (!custDetails) return <p>Not found</p>;

  return (
    <div className="customer-page">
      <div className="container">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <div className="card">
          {/* Header */}
          <div className="card-header">
            <h2>{custDetails.firstName} {custDetails.lastName}</h2>
            {!isEditing && (
              <div className="btn-group">
                <button onClick={() => setIsEditing(true)}>Edit</button>
                <button onClick={onDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <>
              {/* Info */}
              <div className="customer-info">
                <p><strong>Email:</strong> {custDetails.email}</p>
                <p><strong>Phone:</strong> {custDetails.phone}</p>
              </div>

              {/* Addresses */}
              <section className="section">
                <div className="section-header">
                  <h3>Addresses</h3>
                  {!addingAddress && !editingAddressId && (
                    <div className="btn-group"><button onClick={() => setAddingAddress(true)}>+ Add New Address</button></div>
                  )}
                </div>

                {/* New address form */}
                {addingAddress && (
                  <div className="card muted-card">
                    <div className="address-form">
                      {ADDRESS_FIELDS.map(({ key, label, required }) => (
                        <label key={key}>
                          <div className="label">{label}{required ? " *" : ""}</div>
                          <input
                            name={key}
                            required={!!required}
                            value={newAddress[key] ?? ""}
                            onChange={onChangeNewAddr}
                          />
                        </label>
                      ))}
                      <div className="btn-group">
                        <button onClick={saveNewAddress} disabled={savingNewAddress}>
                          {savingNewAddress ? "Saving…" : "Save"}
                        </button>
                        <button type="button" onClick={cancelNewAddress}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Address list */}
                <div className="grid-cards">
                  {(custDetails.addresses ?? []).length === 0 && <p>No addresses.</p>}

                  {(custDetails.addresses ?? []).map((addr) => {
                    const isAddrEditing = editingAddressId === addr._id;

                    return (
                      <div className="card" key={addr._id}>
                        {!isAddrEditing ? (
                          <>
                            <div className="card-header">
                              <strong>{addr.label || "Address"}</strong>
                              <div className="btn-group">
                                <button onClick={() => startEditAddress(addr)} disabled={addingAddress}>Edit</button>
                                <button onClick={() => onDeleteAddress(addr._id)} disabled={deletingAddressId === addr._id}>
                                  {deletingAddressId === addr._id ? "Deleting…" : "Delete"}
                                </button>
                              </div>
                            </div>

                            {/* Read-only two-column layout */}
                            <div className="address-text">
                              <div className="label">Line 1</div>
                              <div>{addr.line1}</div>

                              {addr.line2 && (
                                <>
                                  <div className="label">Line 2</div>
                                  <div>{addr.line2}</div>
                                </>
                              )}

                              <div className="label">City</div>
                              <div>{addr.city}</div>

                              <div className="label">State</div>
                              <div>{addr.state}</div>

                              <div className="label">Postal Code</div>
                              <div>{addr.postalCode}</div>

                              <div className="label">Country</div>
                              <div>{addr.country}</div>
                            </div>
                          </>
                        ) : (
                          <div className="address-form">
                            {ADDRESS_FIELDS.map(({ key, label, required }) => (
                              <label key={key}>
                                <div className="label">{label}{required ? " *" : ""}</div>
                                <input
                                  name={key}
                                  required={!!required}
                                  value={addressForm[key] ?? ""}
                                  onChange={(e) => setAddressForm((f) => ({ ...f, [key]: e.target.value }))}
                                />
                              </label>
                            ))}
                            <div className="btn-group">
                              <button onClick={() => saveAddress(addr._id)} disabled={savingAddressId === addr._id}>
                                {savingAddressId === addr._id ? "Saving…" : "Save"}
                              </button>
                              <button type="button" onClick={cancelEditAddress}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <form onSubmit={onSave} className="form">
              <label>
                <div className="label">First name</div>
                <input name="firstName" value={form.firstName} onChange={onChange} required />
              </label>
              <label>
                <div className="label">Last name</div>
                <input name="lastName" value={form.lastName} onChange={onChange} required />
              </label>
              <label>
                <div className="label">Email</div>
                <input type="email" name="email" value={form.email} onChange={onChange} required />
              </label>
              <label>
                <div className="label">Phone</div>
                <input name="phone" value={form.phone} onChange={onChange} required />
              </label>
              <div className="btn-group">
                <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
                <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
