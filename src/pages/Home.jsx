import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './Home.css'

const sections = [
  {
    path: '/user-profile',
    title: 'User Profile',
    description: 'Manage your personal information and notification preferences.',
  },
  {
    path: '/strategy-management',
    title: 'Strategy Management',
    description: 'Configure and manage your trading strategies.',
  },
  {
    path: '/login',
    title: 'Log In',
    description: 'Sign in to your TradeOn account.',
  },
  {
    path: '/signup',
    title: 'Sign Up',
    description: 'Create a new TradeOn account.',
  },
]

function Home() {
  const navigate = useNavigate()
  const { userId } = useAuth()

  const visibleSections = userId
    ? sections.filter(s => s.path !== '/login' && s.path !== '/signup')
    : sections

  return (
    <div className="home">
      <h1>Welcome to TradeOn</h1>
      <div className="home-grid">
        {visibleSections.map((section) => (
          <button
            key={section.path}
            className="home-card"
            onClick={() => navigate(section.path)}
          >
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Home
