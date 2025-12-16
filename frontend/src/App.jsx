import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LocationProvider } from './context/LocationContext';
import { AuthProvider } from './context/AuthContext';

// Import your pages
import MapPage from './pages/customer/mapPage';
// import other pages...

function App() {
  return (
    <Router>
      <AuthProvider>
        <LocationProvider>
          <Routes>
            {/* Customer Routes */}
            <Route path="/customer/map" element={<MapPage />} />
            {/* Add other routes here */}
            
            {/* Example: */}
            {/* <Route path="/customer/order" element={<OrderPage />} /> */}
            {/* <Route path="/vendor/checkin" element={<VendorCheckIn />} /> */}
          </Routes>
        </LocationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;