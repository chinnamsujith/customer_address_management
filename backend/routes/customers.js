import { Router } from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Address from '../models/Address.js';

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

// routes/customers.js
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid customer id' });
    }

    const { firstName, lastName, email, phone } = req.body;
    const update = {};
    if (firstName != null) update.firstName = String(firstName).trim();
    if (lastName != null)  update.lastName  = String(lastName).trim();
    if (email != null)     update.email     = String(email).trim();
    if (phone != null)     update.phone     = String(phone).trim();

    // If email provided, ensure unique (excluding current doc)
    if (update.email) {
      const exists = await Customer.findOne({ email: update.email, _id: { $ne: id } }).lean();
      if (exists) {
        return res.status(409).json({ message: 'Email already in use by another customer' });
      }
    }

    const updated = await Customer.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: 'Customer not found' });

    // also return addresses for convenience
    const addresses = await Address.find({ customerId: id }).lean();
    return res.status(200).json({ ...updated, addresses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


// routes/customers.js
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid customer id' });
  }

  let session = null;
  try {
    // Start a transaction if possible
    session = await mongoose.startSession();
    session.startTransaction();

    const customer = await Customer.findById(id).session(session);
    if (!customer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Customer not found' });
    }

    await Address.deleteMany({ customerId: id }).session(session);
    await Customer.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(204).send(); // No Content
  } catch (err) {
    console.warn('Transaction failed, attempting non-transactional cleanup...', err?.message);
    if (session) {
      try { await session.abortTransaction(); session.endSession(); } catch {}
    }
    try {
      // Fallback non-transactional (best effort)
      const existed = await Customer.findById(id);
      if (!existed) return res.status(404).json({ message: 'Customer not found' });
      await Address.deleteMany({ customerId: id });
      await Customer.deleteOne({ _id: id });
      return res.status(204).send();
    } catch (err2) {
      console.error(err2);
      return res.status(500).json({ message: 'Internal server error' });
    }
  }
});

router.delete('/:customerId/addresses/:addressId', async (req, res) => {
  const { customerId, addressId } = req.params;

  if (!mongoose.isValidObjectId(customerId) || !mongoose.isValidObjectId(addressId)) {
    return res.status(400).json({ message: 'Invalid id(s)' });
  }

  try {
    const customer = await Customer.findById(customerId).lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Optional guard: prevent deleting the last address
    // const addrCount = await Address.countDocuments({ customerId });
    // if (addrCount <= 1) return res.status(400).json({ message: 'Customer must have at least one address' });

    // Ensure address belongs to this customer
    const addr = await Address.findOne({ _id: addressId, customerId }).lean();
    if (!addr) return res.status(404).json({ message: 'Address not found for this customer' });

    await Address.deleteOne({ _id: addressId, customerId });

    const addresses = await Address.find({ customerId }).lean();
    return res.status(200).json({ ...customer, addresses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch('/:customerId/addresses/:addressId', async (req, res) => {
  const { customerId, addressId } = req.params;

  if (!mongoose.isValidObjectId(customerId) || !mongoose.isValidObjectId(addressId)) {
    return res.status(400).json({ message: 'Invalid id(s)' });
  }

  // Only allow these fields to be edited
  const ALLOWED = ['label', 'line1', 'line2', 'city', 'state', 'postalCode', 'country'];
  const update = {};
  for (const k of ALLOWED) {
    if (k in req.body) {
      const v = req.body[k];
      update[k] = typeof v === 'string' ? v.trim() : v;
    }
  }

  try {
    const customer = await Customer.findById(customerId).lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    // Ensure the address belongs to this customer
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: addressId, customerId },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedAddress) {
      return res.status(404).json({ message: 'Address not found for this customer' });
    }

    const addresses = await Address.find({ customerId }).lean();
    return res.status(200).json({ ...customer, addresses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


export default router;
