import Customer from '../models/Customer.js';
import Address from '../models/Address.js';
import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

/*const sanitizeAddress = (a = {}) => ({
  label: a.label?.trim() || null,
  line1: a.line1?.trim(),
  line2: a.line2?.trim() || null,
  city: a.city?.trim(),
  state: a.state?.trim(),
  postalCode: a.postalCode?.trim(),
  country: a.country?.trim(),
});*/

router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find();
    res.json(customers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try{
    const {id} = req.params;
    console.log(id);
  if(!mongoose.isValidObjectId(id)){
    return res.status(400).json({message:"Invalid customer id"});
  }

  const [customerDetails, addresses] = await Promise.all([Customer.findById(id).lean(),
   Address.find({customerId: id}).lean()]);

   console.log(customerDetails);
   console.log(addresses);
   console.log('Addr count:', await Address.countDocuments({ customerId: id }));
   if(!customerDetails)
   {
    return res.status(404).json({message: "Customer not found"})
   }


   return res.status(201).json({...customerDetails,addresses});


  }
  catch(err){
    return res.status(500).json({ message: "Internal server error" });
  }
  
})

router.post('/add-customer', async (req, res) => {
  const { firstName, lastName, email, phone, addresses = [] } = req.body;

  if (!firstName || !lastName || !email || !phone) {
    return res.status(400).json({ message: 'FirstName, LastName, Email, Phone are required' });
  }
  if (!Array.isArray(addresses) || addresses.length < 1) {
    return res.status(400).json({ message: 'At least one address is required.' });
  }

  const invalidIdx = addresses.findIndex(
    a => !a?.line1?.trim() || !a?.city?.trim() || !a?.state?.trim() || !a?.postalCode?.trim() || !a?.country?.trim()
  );
  if (invalidIdx !== -1) {
    return res.status(400).json({ message: `Address #${invalidIdx + 1} is missing required fields.` });
  }

  try {
    const lookup = await Customer.findOne({email});
    if (lookup) {
      return res.status(409).json({ error: "Customer email already exists" });
    }

    const customer = await Customer.create({ firstName, lastName, email, phone });

    try {
      const prepared = addresses.map(addr => ({...addr, customerId: customer._id}));
      console.log('Prepared addresses:', prepared);
      const createdAddresses = await Address.insertMany(prepared);
      return res.status(201).json({ ...customer.toObject(), addresses: createdAddresses });
    } catch (addrErr) {
      console.error('Address insert error:', addrErr?.message, addrErr?.errors);
      return res.status(400).json({ message: 'Invalid address data', details });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
