import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const emptyAddress = () => ({
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
});

export const CustomerForm = () => {
  const [firstName, setFirstName] = useState('');
  const [fnameError, setFnameError] = useState('');
  const [lastName, setLastName] = useState('');
  const [lnameError, setLnameError] = useState('');
  const [email, setEmail] = useState('');
  const [mailError, setMailError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [formError, setFormError] = useState('');
  const [addresses, setAddresses] = useState([emptyAddress()]);
  const [addrErrors, setAddrErrors] = useState([{}]);
  const navigate = useNavigate();

  const addAddress = () => {
    setAddresses(prev => [...prev, emptyAddress()]);
    setAddrErrors(prev => [...prev, {}]);
  };

  const removeAddress = (index) => {
    setAddresses(prev => prev.filter((_, i) => i !== index));
    setAddrErrors(prev => prev.filter((_, i) => i !== index));
  };

  const updateAddressField = (index, field, value) => {
    setAddresses(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    setAddrErrors(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: '' };
      return next;
    });
  };

  const emailValid = (val) => /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(val);
  const phoneValid = (val) => {
    const cleaned = (val || '').replace(/[^\d]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  };

  const validateAddresses = () => {
    const nextErrors = addresses.map(a => {
      const e = {};
      if (!a.line1?.trim()) e.line1 = 'Address line 1 is required';
      if (!a.city?.trim()) e.city = 'City is required';
      if (!a.state?.trim()) e.state = 'State is required';
      if (!a.postalCode?.trim()) e.postalCode = 'Postal code is required';
      if (!a.country?.trim()) e.country = 'Country is required';
      return e;
    });
    setAddrErrors(nextErrors);
    return !nextErrors.some(e => Object.keys(e).length > 0);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setMailError(''); setPhoneError(''); setLnameError(''); setFnameError(''); setFormError('');

    if (!firstName.trim()) { setFnameError('Please enter first name'); return; }
    if (!lastName.trim()) { setLnameError('Please enter last name'); return; }
    if (!phone.trim()) { setPhoneError('Please enter phone number'); return; }
    if (!phoneValid(phone)) { setPhoneError('Please enter a valid phone number'); return; }
    if (!email.trim()) { setMailError('Please enter your email'); return; }
    if (!emailValid(email)) { setMailError('Please enter a valid email'); return; }
    if (addresses.length === 0) { setFormError('Please add at least one address.'); return; }
    if (!validateAddresses()) return;

    try {
      const payload = {
        firstName, lastName, email, phone,
        addresses: addresses.map(a => ({
          label: a.label?.trim() || null,
          line1: a.line1.trim(),
          line2: a.line2?.trim() || null,
          city: a.city.trim(),
          state: a.state.trim(),
          postalCode: a.postalCode.trim(),
          country: a.country.trim(),
        })),
      };
      const result = await axios.post('http://localhost:5000/api/customers/add-customer', payload);
      if (result) alert('Customer Added Successfully');

      setFirstName(''); setLastName(''); setPhone(''); setEmail('');
      setAddresses([emptyAddress()]); setAddrErrors([{}]);
      navigate('/');
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') setFormError(data);
        else if (data.field === 'email') setMailError(data.message || 'Email already exists');
        else if (data.field === 'phone') setPhoneError(data.message || 'Phone already exists');
        else setFormError(data.message || 'Unexpected error occurred.');
      } else setFormError('Unexpected error occurred.');
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h2>Customer Details</h2>

        {formError && <div className="form-error">{formError}</div>}
         <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

        <form onSubmit={onSubmitHandler}>
          <div className="grid-2">
            <div>
              <input
                type="text" placeholder="Enter First Name" value={firstName}
                onChange={(e) => setFirstName(e.target.value)} className="input-field"
              />
              {fnameError && <p className="input-error">{fnameError}</p>}
            </div>
            <div>
              <input
                type="text" placeholder="Enter Last Name" value={lastName}
                onChange={(e) => setLastName(e.target.value)} className="input-field"
              />
              {lnameError && <p className="input-error">{lnameError}</p>}
            </div>
          </div>

          <div className="grid-2">
            <div>
              <input
                type="email" placeholder="Enter Email address" value={email}
                onChange={(e) => setEmail(e.target.value)} className="input-field"
              />
              {mailError && <p className="input-error">{mailError}</p>}
            </div>
            <div>
              <input
                type="text" placeholder="Enter Phone Number" value={phone}
                onChange={(e) => setPhone(e.target.value)} className="input-field"
              />
              {phoneError && <p className="input-error">{phoneError}</p>}
            </div>
          </div>

          <div className="addresses-section">
            <div className="addresses-header">
              <h3>Addresses</h3>
              <button type="button" className="add-btn" onClick={addAddress}>+ Add address</button>
            </div>

            {addresses.map((addr, index) => (
              <div key={index} className="address-card">
                <div className="address-top">
                  <input
                    type="text" placeholder="Label (Home, Office)" value={addr.label}
                    onChange={(e) => updateAddressField(index, 'label', e.target.value)}
                    className="input-field"
                  />
                  {addresses.length > 1 && (
                    <button type="button" className="remove-btn" onClick={() => removeAddress(index)}>Remove</button>
                  )}
                </div>

                <div className="grid-2">
                  <div>
                    <input type="text" placeholder="Address Line 1" value={addr.line1}
                      onChange={(e) => updateAddressField(index, 'line1', e.target.value)}
                      className="input-field"
                    />
                    {addrErrors[index]?.line1 && <p className="input-error">{addrErrors[index].line1}</p>}
                  </div>
                  <div>
                    <input type="text" placeholder="Address Line 2 (optional)" value={addr.line2}
                      onChange={(e) => updateAddressField(index, 'line2', e.target.value)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <input type="text" placeholder="City" value={addr.city}
                      onChange={(e) => updateAddressField(index, 'city', e.target.value)}
                      className="input-field"
                    />
                    {addrErrors[index]?.city && <p className="input-error">{addrErrors[index].city}</p>}
                  </div>
                  <div>
                    <input type="text" placeholder="State" value={addr.state}
                      onChange={(e) => updateAddressField(index, 'state', e.target.value)}
                      className="input-field"
                    />
                    {addrErrors[index]?.state && <p className="input-error">{addrErrors[index].state}</p>}
                  </div>
                  <div>
                    <input type="text" placeholder="Postal Code" value={addr.postalCode}
                      onChange={(e) => updateAddressField(index, 'postalCode', e.target.value)}
                      className="input-field"
                    />
                    {addrErrors[index]?.postalCode && <p className="input-error">{addrErrors[index].postalCode}</p>}
                  </div>
                  <div>
                    <input type="text" placeholder="Country" value={addr.country}
                      onChange={(e) => updateAddressField(index, 'country', e.target.value)}
                      className="input-field"
                    />
                    {addrErrors[index]?.country && <p className="input-error">{addrErrors[index].country}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="submit-btn">Add Details</button>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;
