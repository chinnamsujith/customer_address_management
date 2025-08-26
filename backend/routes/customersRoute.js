// routes/customers.js
import { Router } from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Address from '../models/Address.js';

const router = Router();

/* API to fetch all the customers */
router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      page = '1',
      limit = '10',
      sort = 'firstName,lastName',   // default sort
    } = req.query;

    const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

    // helpers
    const escapeRx = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const digits   = (s = '') => s.toString().replace(/\D/g, '');

    // build filter
    let filter = {};
    if (search.trim()) {
      const rx = new RegExp(escapeRx(search.trim()), 'i'); // case-insensitive
      const phoneDigits = digits(search);
      filter = {
        $or: [
          { firstName: rx },
          { lastName: rx },
          { email: rx },
          ...(phoneDigits ? [{ phone: { $regex: phoneDigits, $options: 'i' } }] : []),
        ],
      };
    }

    // sort parser: "firstName,-createdAt" -> { firstName: 1, createdAt: -1 }
    const sortObj = {};
    sort.toString()
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .forEach(key => {
        if (key.startsWith('-')) sortObj[key.slice(1)] = -1;
        else sortObj[key] = 1;
      });

    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Customer.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Customer.countDocuments(filter),
    ]);

    res.json({
      data: items,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/* API to fetch a particular customer */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid customer id' });
    }

    const [customerDetails, addresses] = await Promise.all([
      Customer.findById(id).lean(),
      Address.find({ customerId: id }).lean(),
    ]);

    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // NOTE: 200 (OK) is more appropriate than 201 (Created)
    return res.status(200).json({ ...customerDetails, addresses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/* API to add a new customer */
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
    const lookup = await Customer.findOne({ email });
    if (lookup) {
      return res.status(409).json({ error: 'Customer email already exists' });
    }

    const customer = await Customer.create({ firstName, lastName, email, phone });

    try {
      const prepared = addresses.map(addr => ({ ...addr, customerId: customer._id }));
      const createdAddresses = await Address.insertMany(prepared);
      return res.status(201).json({ ...customer.toObject(), addresses: createdAddresses });
    } catch (addrErr) {
      console.error('Address insert error:', addrErr?.message, addrErr?.errors);
      // FIX: 'details' was undefined previously
      return res.status(400).json({ message: 'Invalid address data', details: addrErr?.errors });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/* API to update customer details */
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

/* API to delete a customer (and their addresses) */
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

export default router;
