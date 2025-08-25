import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import customerRoute from "./routes/customers.js"
import cors from 'cors';


const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/customers", customerRoute);
console.log("Inside Server.js");
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('-- Connection to MongoDB Successful --'))
  .catch(err => console.log(err));

// Use PORT = 5001 set in .env file
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`-- Server running on port ${PORT}. --`);
});