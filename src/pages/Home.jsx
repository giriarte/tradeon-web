import { useNavigate } from 'react-router-dom'
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
]

function Home() {
  const navigate = useNavigate()

  return (
    <div className="home">
      <h1>Welcome to TradeOn</h1>
      <div className="home-grid">
        {sections.map((section) => (
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
