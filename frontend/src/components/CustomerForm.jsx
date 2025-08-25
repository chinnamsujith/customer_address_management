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
  // Customer fields
  const [firstName, setFirstName] = useState('');
  const [fnameError, setFnameError] = useState('');
  const [lastName, setLastName] = useState('');
  const [lnameError, setLnameError] = useState('');
  const [email, setEmail] = useState('');
  const [mailError, setMailError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [formError, setFormError] = useState('');

  // Addresses (no primary flag)
  const [addresses, setAddresses] = useState([ emptyAddress() ]);
  const [addrErrors, setAddrErrors] = useState([{}]); // errors per address

  const navigate = useNavigate();

  // Add/remove/update address helpers
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

  // Validators
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
    const hasErrors = nextErrors.some(e => Object.keys(e).length > 0);
    return !hasErrors;
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // reset errors
    setMailError('');
    setPhoneError('');
    setLnameError('');
    setFnameError('');
    setFormError('');

    // customer validation
    if (!firstName.trim()) {
      setFnameError('Please enter first name');
      return;
    }
    if (!lastName.trim()) {
      setLnameError('Please enter last name');
      return;
    }
    if (!phone.trim()) {
      setPhoneError('Please enter phone number');
      return;
    }
    if (!phoneValid(phone)) {
      setPhoneError('Please enter a valid phone number');
      return;
    }
    if (!email.trim()) {
      setMailError('Please enter your email');
      return;
    }
    if (!emailValid(email)) {
      setMailError('Please enter a valid email');
      return;
    }

    // addresses validation
    if (addresses.length === 0) {
      setFormError('Please add at least one address.');
      return;
    }
    if (!validateAddresses()) return;

    try {
      const payload = {
        firstName,
        lastName,
        email,
        phone,
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

      // reset form
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setAddresses([emptyAddress()]);
      setAddrErrors([{}]);
      navigate('/');
    } catch (err) {
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          setFormError(data);
        } else if (data.field === 'email') {
          setMailError(data.message || 'Email already exists');
        } else if (data.field === 'phone') {
          setPhoneError(data.message || 'Phone already exists');
        } else {
          setFormError(data.message || 'An unexpected error occurred. Please try again.');
        }
      } else {
        console.error(err);
        setFormError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-3xl p-8 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Customer Details
        </h2>

        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={onSubmitHandler} className="space-y-6">
          {/* Customer fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Enter First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fnameError && <p className="mt-1 text-sm text-red-500">{fnameError}</p>}
            </div>
            <div>
              <input
                type="text"
                placeholder="Enter Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {lnameError && <p className="mt-1 text-sm text-red-500">{lnameError}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="email"
                placeholder="Enter Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {mailError && <p className="mt-1 text-sm text-red-500">{mailError}</p>}
            </div>
            <div>
              <input
                type="text"
                placeholder="Enter Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {phoneError && <p className="mt-1 text-sm text-red-500">{phoneError}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Addresses</h3>
              <button
                type="button"
                onClick={addAddress}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-white text-sm hover:bg-green-700 shadow"
              >
                + Add address
              </button>
            </div>

            {addresses.map((addr, index) => (
              <div key={index} className="rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <input
                    type="text"
                    placeholder="Label (e.g., Home, Office)"
                    value={addr.label}
                    onChange={(e) => updateAddressField(index, 'label', e.target.value)}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {addresses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAddress(index)}
                      className="rounded-lg bg-red-600 px-3 py-2 text-white text-sm hover:bg-red-700 shadow"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      placeholder="Address Line 1"
                      value={addr.line1}
                      onChange={(e) => updateAddressField(index, 'line1', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {addrErrors[index]?.line1 && (
                      <p className="mt-1 text-sm text-red-500">{addrErrors[index].line1}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Address Line 2 (optional)"
                      value={addr.line2}
                      onChange={(e) => updateAddressField(index, 'line2', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="City"
                      value={addr.city}
                      onChange={(e) => updateAddressField(index, 'city', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {addrErrors[index]?.city && (
                      <p className="mt-1 text-sm text-red-500">{addrErrors[index].city}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="State"
                      value={addr.state}
                      onChange={(e) => updateAddressField(index, 'state', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {addrErrors[index]?.state && (
                      <p className="mt-1 text-sm text-red-500">{addrErrors[index].state}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={addr.postalCode}
                      onChange={(e) => updateAddressField(index, 'postalCode', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {addrErrors[index]?.postalCode && (
                      <p className="mt-1 text-sm text-red-500">{addrErrors[index].postalCode}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Country"
                      value={addr.country}
                      onChange={(e) => updateAddressField(index, 'country', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {addrErrors[index]?.country && (
                      <p className="mt-1 text-sm text-red-500">{addrErrors[index].country}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition"
          >
            Add Details
          </button>
        </form>
      </div>
    </div>
  );
};

/*import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const CustomerForm = () => {
  const [firstName, setFirstName] = useState('');
  const [fnameError, setFnameError] = useState('');
  const [lastName, setLastName] = useState('');
  const [lnameError, setLnameError] = useState('');
  const [email, setEmail] = useState('');
  const [mailError, setMailError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const navigate = useNavigate();

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setMailError('');
    setPhoneError('');
    setLnameError('');
    setFnameError('');

    if ('' === firstName) {
      setFnameError('Please enter first name');
      return;
    }
    if ('' === lastName) {
      setLnameError('Please enter last name');
      return;
    }
    if ('' === phone) {
      setPhoneError('Please enter phone number');
      return;
    }
    if ('' === email) {
      setMailError('Please enter your email');
      return;
    }

    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      setMailError('Please enter a valid email');
      return;
    }

    try {
      const result = await axios.post('http://localhost:5000/api/customers', {
        firstName,
        lastName,
        email,
        phone,
      });
      if (result) alert('Customer Added Successfully');
      navigate('/');
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
    } catch (err) {
      if (err.response && err.response.data) {
        console.error(err.response.data);
        setMailError(err.response.data);
      } else {
        console.error(err);
        setMailError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          Customer Details
        </h2>

        <form onSubmit={onSubmitHandler} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Enter First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {fnameError && (
                <p className="mt-1 text-sm text-red-500">{fnameError}</p>
              )}
            </div>
            <div>
              <input
                type="text"
                placeholder="Enter Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {lnameError && (
                <p className="mt-1 text-sm text-red-500">{lnameError}</p>
              )}
            </div>
          </div>
          <div>
            <input
              type="email"
              placeholder="Enter Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {mailError && <p className="mt-1 text-sm text-red-500">{mailError}</p>}
          </div>
          <div>
            <input
              type="text"
              placeholder="Enter Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {phoneError && <p className="mt-1 text-sm text-red-500">{phoneError}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition"
          >
            Add Details
          </button>
        </form>
      </div>
    </div>
  );
};*/
