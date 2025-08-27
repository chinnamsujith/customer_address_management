// routes/addresses.js
import { Router } from 'express';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Address from '../models/Address.js';

const router = Router();

router.get('/counts', async (req, res) => {
  try {
    const raw = (req.query.customerIds || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const ids = raw
      .filter(mongoose.isValidObjectId)
      .map(id => new mongoose.Types.ObjectId(id));

    const match = ids.length ? { customerId: { $in: ids } } : {};

    const counts = await Address.aggregate([
      { $match: match },
      { $group: { _id: "$customerId", count: { $sum: 1 } } }
    ]);

    const out = {};
    for (const c of counts) out[String(c._id)] = c.count;

    return res.status(200).json({ counts: out });
  } catch (err) {
    console.error("address counts error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * Address search (kept as /api/customers/search-address for compatibility)
 * You can later move this under /api/addresses/search if you prefer.
 */
router.get('/search-address', async (req, res) => {
  try {
    const { city = "", state = "", pincode = "", page = "1", limit = "20" } = req.query;

    const pageNum  = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const skip     = (pageNum - 1) * limitNum;

    const esc     = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const starts  = (s = "") => new RegExp("^" + esc(s.trim()), "i");
    const onlyNum = (s = "") => s.toString().replace(/\D/g, "");

    const match = {};
    if (typeof city === "string" && city.trim())   match.city  = starts(city);
    if (typeof state === "string" && state.trim()) match.state = starts(state);
    if (typeof pincode === "string" && pincode.trim()) {
      const pin = onlyNum(pincode);
      if (pin) match.postalCode = { $regex: pin };
    }

    if (Object.keys(match).length === 0) {
      return res.status(200).json({ data: [], page: pageNum, limit: limitNum, total: 0, totalPages: 1 });
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: "$customerId",
          matchedAddresses: {
            $push: {
              _id: "$_id",
              label: "$label",
              line1: "$line1",
              line2: "$line2",
              city: "$city",
              state: "$state",
              postalCode: "$postalCode",
              country: "$country"
            },
          },
        },
      },
      {
        $addFields: {
          customerIdObj: {
            $cond: [
              { $eq: [{ $type: "$_id" }, "objectId"] },
              "$_id",
              { $toObjectId: "$_id" }
            ]
          }
        }
      },
      {
        $lookup: {
          from: Customer.collection.name,
          localField: "customerIdObj",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: "$customer" },
      { $sort: { customerIdObj: 1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limitNum }],
          meta:  [{ $count: "total" }],
        },
      },
      {
        $project: {
          items: 1,
          total: { $ifNull: [{ $arrayElemAt: ["$meta.total", 0] }, 0] },
        },
      },
    ];

    const [result] = await Address.aggregate(pipeline).allowDiskUse(true);
    const items = (result?.items || []).map(it => ({
      customer: it.customer,
      matchedAddresses: it.matchedAddresses || [],
    }));
    const total = result?.total || 0;

    return res.status(200).json({
      data: items,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.max(Math.ceil(total / limitNum), 1),
    });
  } catch (err) {
    console.error("search-address error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/* API to add a new address */
router.post('/:customerId/addresses', async (req, res) => {
  const { customerId } = req.params;

  if (!mongoose.isValidObjectId(customerId)) {
    return res.status(400).json({ message: 'Invalid customer id' });
  }

  const required = ['line1', 'city', 'state', 'postalCode', 'country'];
  const missing = required.filter((k) => !String(req.body?.[k] ?? '').trim());
  if (missing.length) {
    return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
  }

  const ALLOWED = ['label', 'line1', 'line2', 'city', 'state', 'postalCode', 'country'];
  const doc = { customerId };
  for (const k of ALLOWED) {
    if (k in req.body) {
      const v = req.body[k];
      doc[k] = typeof v === 'string' ? v.trim() : v;
    }
  }

  try {
    const customer = await Customer.findById(customerId).lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

    await Address.create(doc);

    const addresses = await Address.find({ customerId }).lean();
    return res.status(201).json({ ...customer, addresses });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/* API to update an address */
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

/* API to delete an address */
router.delete('/:customerId/addresses/:addressId', async (req, res) => {
  const { customerId, addressId } = req.params;

  if (!mongoose.isValidObjectId(customerId) || !mongoose.isValidObjectId(addressId)) {
    return res.status(400).json({ message: 'Invalid id(s)' });
  }

  try {
    const customer = await Customer.findById(customerId).lean();
    if (!customer) return res.status(404).json({ message: 'Customer not found' });

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

export default router;
