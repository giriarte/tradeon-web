import { NavLink } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  const handleLogout = (e) => {
    e.preventDefault()
    // logout logic goes here
  }

  return (
    <nav className="navbar">
      <span className="navbar-brand">TradeOn</span>
      <ul className="navbar-links">
        <li><NavLink to="/" end>Home</NavLink></li>
        <li><NavLink to="/user-profile">User Profile</NavLink></li>
        <li><NavLink to="/strategy-management">Strategy Management</NavLink></li>
        <li><a href="#" onClick={handleLogout} className="logout-link">Logout</a></li>
      </ul>
    </nav>
  )
}

export default Navbar
