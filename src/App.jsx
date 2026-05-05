import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import UserProfile from './pages/UserProfile'
import StrategyManagement from './pages/StrategyManagement'
import Alerts from './pages/Alerts'
import Subscription from './pages/Subscription'
import Billing from './pages/Billing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/user-profile" element={<UserProfile />} />
            <Route path="/strategy-management" element={<StrategyManagement />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
