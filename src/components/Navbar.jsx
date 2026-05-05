import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Navbar.css'

function Navbar() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = (e) => {
    e.preventDefault()
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand">TradeOn</span>
      <ul className="navbar-links">
        <li><NavLink to="/" end>Home</NavLink></li>
        <li><NavLink to="/user-profile">User Profile</NavLink></li>
        <li><NavLink to="/strategy-management">Strategy Management</NavLink></li>
        <li><NavLink to="/alerts">Alerts</NavLink></li>
        <li><NavLink to="/subscription">Subscription</NavLink></li>
        <li><NavLink to="/billing">Billing</NavLink></li>
        <li><a href="#" onClick={handleLogout} className="logout-link">Logout</a></li>
      </ul>
    </nav>
  )
}

export default Navbar
