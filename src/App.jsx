import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import UserProfile from './pages/UserProfile'
import StrategyManagement from './pages/StrategyManagement'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/user-profile" element={<UserProfile />} />
          <Route path="/strategy-management" element={<StrategyManagement />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
