import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const BASE_URL      = "http://localhost:5000";
const CUSTOMERS_API = `${BASE_URL}/api/customers`;
const ADDRESS_API   = `${BASE_URL}/api/address`;

const emptyAddr = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const Section = ({ title, right, children }) => (
  <div style={{ marginTop: 16 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

const Card = ({ children, tone = "default", style }) => (
  <div
    style={{
      border: "1px solid #e5e7eb",
      background: tone === "muted" ? "#fafafa" : "#fff",
      padding: 12,
      borderRadius: 10,
      ...style,
    }}
  >
    {children}
  </div>
);

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [custDetails, setCustDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // customer editing
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // address edit (per-address)
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddr);
  const [savingAddressId, setSavingAddressId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  // add new address
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

  // address delete
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

  // address edit start/cancel/save
  const startEditAddress = (addr) => {
    if (addingAddress) return; // avoid two edit surfaces
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

  const cancelEditAddress = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddr);
  };

  const saveAddress = async (addrId) => {
    const must = (v) => String(v ?? "").trim();
    if (
      !must(addressForm.line1) ||
      !must(addressForm.city) ||
      !must(addressForm.state) ||
      !must(addressForm.postalCode) ||
      !must(addressForm.country)
    ) {
      setErr("Please fill all required fields in the address form.");
      return;
    }
    try {
      setSavingAddressId(addrId);
      setErr("");
      const { data } = await axios.patch(`${ADDRESS_API}/${id}/addresses/${addrId}`, addressForm);
      setCustDetails(data);
      cancelEditAddress();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to update address.");
    } finally {
      setSavingAddressId(null);
    }
  };

  // add new address
  const onChangeNewAddr = (e) => setNewAddress((a) => ({ ...a, [e.target.name]: e.target.value }));

  const cancelNewAddress = () => {
    setAddingAddress(false);
    setNewAddress(emptyAddr);
  };

  const saveNewAddress = async () => {
    const must = (v) => String(v ?? "").trim();
    if (
      !must(newAddress.line1) ||
      !must(newAddress.city) ||
      !must(newAddress.state) ||
      !must(newAddress.postalCode) ||
      !must(newAddress.country)
    ) {
      setErr("Please fill all required fields for the new address.");
      return;
    }
    try {
      setSavingNewAddress(true);
      setErr("");
      const { data } = await axios.post(`${ADDRESS_API}/${id}/addresses`, newAddress);
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
  if (err) return <p style={{ color: "crimson" }}>{err}</p>;
  if (!custDetails) return <p>Not found</p>;

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
          ← Back
        </button>

        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>
              {custDetails.firstName} {custDetails.lastName}
            </h2>
            {!isEditing && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setIsEditing(true)}>Edit</button>
                <button onClick={onDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <>
              <div style={{ marginTop: 8 }}>
                <p style={{ margin: "4px 0" }}>
                  <strong>Email:</strong> {custDetails.email}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Phone:</strong> {custDetails.phone}
                </p>
              </div>

              <Section
                title="Addresses"
                right={
                  !addingAddress && !editingAddressId ? (
                    <button onClick={() => setAddingAddress(true)}>+ Add New Address</button>
                  ) : null
                }
              >
                {/* New Address Form */}
                {addingAddress && (
                  <Card tone="muted" style={{ marginBottom: 12 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label>
                        Label
                        <input name="label" value={newAddress.label} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        Line 1*
                        <input required name="line1" value={newAddress.line1} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        Line 2
                        <input name="line2" value={newAddress.line2} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        City*
                        <input required name="city" value={newAddress.city} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        State*
                        <input required name="state" value={newAddress.state} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        Postal Code*
                        <input required name="postalCode" value={newAddress.postalCode} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        Country*
                        <input required name="country" value={newAddress.country} onChange={onChangeNewAddr} />
                      </label>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={saveNewAddress} disabled={savingNewAddress}>
                          {savingNewAddress ? "Saving…" : "Save"}
                        </button>
                        <button type="button" onClick={cancelNewAddress}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Address List */}
                {(custDetails.addresses ?? []).length === 0 && <p>No addresses.</p>}

                {(custDetails.addresses ?? []).map((addr) => {
                  const isAddrEditing = editingAddressId === addr._id;
                  return (
                    <Card key={addr._id} style={{ marginBottom: 10 }}>
                      {!isAddrEditing ? (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <strong>{addr.label || "Address"}</strong>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => startEditAddress(addr)}
                                disabled={Boolean(addingAddress)}
                                title={addingAddress ? "Finish adding the new address first" : "Edit address"}
                              >
                                Edit
                              </button>
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
                          <div>
                            {addr.city}, {addr.state} {addr.postalCode}
                          </div>
                          <div>{addr.country}</div>
                        </>
                      ) : (
                        // Inline edit form
                        <div style={{ display: "grid", gap: 8 }}>
                          <label>
                            Label
                            <input
                              name="label"
                              value={addressForm.label}
                              onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))}
                            />
                          </label>
                          <label>
                            Line 1*
                            <input
                              required
                              name="line1"
                              value={addressForm.line1}
                              onChange={(e) => setAddressForm((f) => ({ ...f, line1: e.target.value }))}
                            />
                          </label>
                          <label>
                            Line 2
                            <input
                              name="line2"
                              value={addressForm.line2}
                              onChange={(e) => setAddressForm((f) => ({ ...f, line2: e.target.value }))}
                            />
                          </label>
                          <label>
                            City*
                            <input
                              required
                              name="city"
                              value={addressForm.city}
                              onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                            />
                          </label>
                          <label>
                            State*
                            <input
                              required
                              name="state"
                              value={addressForm.state}
                              onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
                            />
                          </label>
                          <label>
                            Postal Code*
                            <input
                              required
                              name="postalCode"
                              value={addressForm.postalCode}
                              onChange={(e) => setAddressForm((f) => ({ ...f, postalCode: e.target.value }))}
                            />
                          </label>
                          <label>
                            Country*
                            <input
                              required
                              name="country"
                              value={addressForm.country}
                              onChange={(e) => setAddressForm((f) => ({ ...f, country: e.target.value }))}
                            />
                          </label>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => saveAddress(addr._id)} disabled={savingAddressId === addr._id}>
                              {savingAddressId === addr._id ? "Saving…" : "Save"}
                            </button>
                            <button type="button" onClick={cancelEditAddress}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </Section>
            </>
          ) : (
            <form onSubmit={onSave} style={{ marginTop: 12, display: "grid", gap: 8 }}>
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
                <button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}


/*import React, { useState, useEffect } from "react";


import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "http://localhost:5000/api/customers";

const emptyAddr = {
  label: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const Section = ({ title, right, children }) => (
  <div style={{ marginTop: 16 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
      <h3 style={{ margin: 0 }}>{title}</h3>
      {right}
    </div>
    {children}
  </div>
);

const Card = ({ children, tone = "default", style }) => (
  <div
    style={{
      border: "1px solid #e5e7eb",
      background: tone === "muted" ? "#fafafa" : "#fff",
      padding: 12,
      borderRadius: 10,
      ...style,
    }}
  >
    {children}
  </div>
);

export default function CustomerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [custDetails, setCustDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // customer editing
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // address edit (per-address)
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [addressForm, setAddressForm] = useState(emptyAddr);
  const [savingAddressId, setSavingAddressId] = useState(null);
  const [deletingAddressId, setDeletingAddressId] = useState(null);

  // add new address
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddress, setNewAddress] = useState(emptyAddr);
  const [savingNewAddress, setSavingNewAddress] = useState(false);

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
      const { data } = await axios.put(`${API}/${id}`, form);
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
      await axios.delete(`${API}/${id}`);
      navigate("/");
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to delete.");
    } finally {
      setDeleting(false);
    }
  };

  // address delete
  const onDeleteAddress = async (addrId) => {
    if (!window.confirm("Delete this address?")) return;
    try {
      setDeletingAddressId(addrId);
      setErr("");
      const { data } = await axios.delete(`${API}/${id}/addresses/${addrId}`);
      setCustDetails(data);
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to delete address.");
    } finally {
      setDeletingAddressId(null);
    }
  };

  // address edit start/cancel/save
  const startEditAddress = (addr) => {
    if (addingAddress) return; // avoid two edit surfaces
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

  const cancelEditAddress = () => {
    setEditingAddressId(null);
    setAddressForm(emptyAddr);
  };

  const saveAddress = async (addrId) => {
    // simple front-end validation
    const must = (v) => String(v ?? "").trim();
    if (
      !must(addressForm.line1) ||
      !must(addressForm.city) ||
      !must(addressForm.state) ||
      !must(addressForm.postalCode) ||
      !must(addressForm.country)
    ) {
      setErr("Please fill all required fields in the address form.");
      return;
    }
    try {
      setSavingAddressId(addrId);
      setErr("");
      const { data } = await axios.patch(`${API}/${id}/addresses/${addrId}`, addressForm);
      setCustDetails(data);
      cancelEditAddress();
    } catch (e) {
      console.error(e);
      setErr(e?.response?.data?.message || "Failed to update address.");
    } finally {
      setSavingAddressId(null);
    }
  };

  // add new address
  const onChangeNewAddr = (e) => setNewAddress((a) => ({ ...a, [e.target.name]: e.target.value }));

  const cancelNewAddress = () => {
    setAddingAddress(false);
    setNewAddress(emptyAddr);
  };

  const saveNewAddress = async () => {
    const must = (v) => String(v ?? "").trim();
    if (
      !must(newAddress.line1) ||
      !must(newAddress.city) ||
      !must(newAddress.state) ||
      !must(newAddress.postalCode) ||
      !must(newAddress.country)
    ) {
      setErr("Please fill all required fields for the new address.");
      return;
    }
    try {
      setSavingNewAddress(true);
      setErr("");
      const { data } = await axios.post(`${API}/${id}/addresses`, newAddress);
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
  if (err) return <p style={{ color: "crimson" }}>{err}</p>;
  if (!custDetails) return <p>Not found</p>;

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: 16 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 8 }}>
          ← Back
        </button>

        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h2 style={{ margin: 0 }}>
              {custDetails.firstName} {custDetails.lastName}
            </h2>
            {!isEditing && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setIsEditing(true)}>Edit</button>
                <button onClick={onDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>

          {!isEditing ? (
            <>
              <div style={{ marginTop: 8 }}>
                <p style={{ margin: "4px 0" }}>
                  <strong>Email:</strong> {custDetails.email}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Phone:</strong> {custDetails.phone}
                </p>
              </div>

              <Section
                title="Addresses"
                right={
                  !addingAddress && !editingAddressId ? (
                    <button onClick={() => setAddingAddress(true)}>+ Add New Address</button>
                  ) : null
                }
              >
//               New Address Form 
                {addingAddress && (
                  <Card tone="muted" style={{ marginBottom: 12 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <label>
                        Label
                        <input name="label" value={newAddress.label} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        Line 1*
                        <input required name="line1" value={newAddress.line1} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        Line 2
                        <input name="line2" value={newAddress.line2} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        City*
                        <input required name="city" value={newAddress.city} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        State*
                        <input required name="state" value={newAddress.state} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        Postal Code*
                        <input required name="postalCode" value={newAddress.postalCode} onChange={onChangeNewAddr} />
                      </label>
                      <label>
                        Country*
                        <input required name="country" value={newAddress.country} onChange={onChangeNewAddr} />
                      </label>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={saveNewAddress} disabled={savingNewAddress}>
                          {savingNewAddress ? "Saving…" : "Save"}
                        </button>
                        <button type="button" onClick={cancelNewAddress}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  </Card>
                )}

//              Address List 
                {(custDetails.addresses ?? []).length === 0 && <p>No addresses.</p>}

                {(custDetails.addresses ?? []).map((addr) => {
                  const isAddrEditing = editingAddressId === addr._id;
                  return (
                    <Card key={addr._id} style={{ marginBottom: 10 }}>
                      {!isAddrEditing ? (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 4,
                            }}
                          >
                            <strong>{addr.label || "Address"}</strong>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                onClick={() => startEditAddress(addr)}
                                disabled={Boolean(addingAddress)}
                                title={addingAddress ? "Finish adding the new address first" : "Edit address"}
                              >
                                Edit
                              </button>
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
                          <div>
                            {addr.city}, {addr.state} {addr.postalCode}
                          </div>
                          <div>{addr.country}</div>
                        </>
                      ) : (
                        // Inline edit form
                        <div style={{ display: "grid", gap: 8 }}>
                          <label>
                            Label
                            <input
                              name="label"
                              value={addressForm.label}
                              onChange={(e) => setAddressForm((f) => ({ ...f, label: e.target.value }))}
                            />
                          </label>
                          <label>
                            Line 1*
                            <input
                              required
                              name="line1"
                              value={addressForm.line1}
                              onChange={(e) => setAddressForm((f) => ({ ...f, line1: e.target.value }))}
                            />
                          </label>
                          <label>
                            Line 2
                            <input
                              name="line2"
                              value={addressForm.line2}
                              onChange={(e) => setAddressForm((f) => ({ ...f, line2: e.target.value }))}
                            />
                          </label>
                          <label>
                            City*
                            <input
                              required
                              name="city"
                              value={addressForm.city}
                              onChange={(e) => setAddressForm((f) => ({ ...f, city: e.target.value }))}
                            />
                          </label>
                          <label>
                            State*
                            <input
                              required
                              name="state"
                              value={addressForm.state}
                              onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
                            />
                          </label>
                          <label>
                            Postal Code*
                            <input
                              required
                              name="postalCode"
                              value={addressForm.postalCode}
                              onChange={(e) => setAddressForm((f) => ({ ...f, postalCode: e.target.value }))}
                            />
                          </label>
                          <label>
                            Country*
                            <input
                              required
                              name="country"
                              value={addressForm.country}
                              onChange={(e) => setAddressForm((f) => ({ ...f, country: e.target.value }))}
                            />
                          </label>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => saveAddress(addr._id)} disabled={savingAddressId === addr._id}>
                              {savingAddressId === addr._id ? "Saving…" : "Save"}
                            </button>
                            <button type="button" onClick={cancelEditAddress}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </Section>
            </>
          ) : (
            <form onSubmit={onSave} style={{ marginTop: 12, display: "grid", gap: 8 }}>
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
                <button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}*/