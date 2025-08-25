import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [custDetails, setCustDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {

    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`http://localhost:5000/api/customers/${id}`);
        setCustDetails(data);
        console.log(data);
      } catch (e) {
        console.error(e);
      } finally{
        setLoading(false);
      }
    })();

  }, [id]);

  if (loading) return <p>Loading…</p>;
  if (err) return <p>{err}</p>;
  if (!custDetails) return <p>Not found</p>;

  return (
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h2>{custDetails.firstName} {custDetails.lastName}</h2>
      <p>Email: {custDetails.email}</p>
      <p>Phone: {custDetails.phone}</p>

      <h3>Addresses</h3>
      {(custDetails.addresses ?? []).length === 0 && <p>No addresses.</p>}
      {(custDetails.addresses ?? []).map((addr) => (
        <div key={addr._id} style={{ marginBottom: 8 }}>
          <div>{addr.label}</div>
          <div>{addr.line1}</div>
          <div>{addr.line2}</div>
          <div>{addr.city}, {addr.state} {addr.postalCode}</div>
          <div>{addr.country}</div>
        </div>
      ))}
    </div>
  );
};

export default CustomerDetails;

/*import React, {useState, useEffect} from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom'

const CustomerDetails = () => {
    const { id } = useParams();
    const [custDetails, setCustDetails] = useState("");
    
    
    useEffect = (() => {( async () => 
        {
            try{
                const {data} = await axios.get(`http://localhost:5000/api/customers/${id}`);
                setCustDetails(data);
            }
            catch(e){
                console.log(e);
            }
        
        })();
    },[id]);

    if (!custDetails) return <p>Not found</p>;

  return (
    
    <div style={{ padding: 16 }}>
      <button onClick={() => navigate(-1)}>← Back</button>
      <h2>{custDetails.firstName} {custDetails.lastName}</h2>
      <p>Email: {custDetails.email}</p>
      <p>Phone: {custDetails.phone}</p>

      <h3>Addresses</h3>
      {(custDetails.addresses ?? []).map((addr) => (
        <div key={addr._id} style={{ marginBottom: 8 }}>
          <div>{addr.line1}</div>
          <div>{addr.city}, {addr.state} {addr.zip}</div>
          <div>{addr.country}</div>
        </div>
      ))}
    </div>
  )
}

export default CustomerDetails*/