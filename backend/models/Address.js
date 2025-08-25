import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
  label: { type: String, trim: true },
  line1:      { type: String, required: true, trim: true, maxlength: 50 },
  line2:      { type: String, trim: true, maxlength: 50 },
  city:       { type: String, required: true, trim: true, maxlength: 20 },
  state:      { type: String, required: true, trim: true, maxlength: 20 },
  postalCode: { type: String, required: true, trim: true, maxlength: 20 },
  country:    { type: String, required: true, trim: true, maxlength: 30 },
});

/*addressSchema.index(
  { customerId: 1, line1: 1, line2: 1, city: 1, state: 1, postalCode: 1, country: 1 },
  { unique: true, partialFilterExpression: { line1: { $exists: true } } }
);*/

export default mongoose.model("Address", addressSchema);
