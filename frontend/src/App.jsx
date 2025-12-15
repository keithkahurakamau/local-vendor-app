import {Routes, Route} from 'react-router-dom'
import LandingPage from './pages/customer/landingPage'
import './App.css'

function App() {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path='/' element={<LandingPage />} />
    </Routes>


    );
    
}

export default App
