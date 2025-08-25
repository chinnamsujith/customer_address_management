import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { CustomerForm } from './components/customerForm';
import CustomerDetails from './components/CustomerDetails';
import Dashboard from './components/Dashboard';
import './App.css'

function App() {

  return (
   <div>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/add-customer" element={<CustomerForm />} />
          <Route path="/customers/:id" element = {<CustomerDetails/>} />
        </Routes>
      </Router>
    </div>
  )
}

export default App
