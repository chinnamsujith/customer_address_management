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


export default mongoose.model("Address", addressSchema);
