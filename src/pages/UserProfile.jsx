import { useState, useEffect } from 'react'
import { BASE_URL, USER_ID } from '../config'
import NotificationChannelRow from '../components/NotificationChannelRow'
import './UserProfile.css'

function UserProfile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    fetch(`${BASE_URL}/users/${USER_ID}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load profile (${res.status})`)
        return res.json()
      })
      .then((data) => {
        setUser(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const handleFieldChange = (field, value) => {
    setUser((prev) => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
  }

  const handleChannelChange = (index, field, value) => {
    setUser((prev) => {
      const channels = [...prev.notificationChannels]
      channels[index] = { ...channels[index], [field]: value }
      return { ...prev, notificationChannels: channels }
    })
    setSaveSuccess(false)
  }

  const addChannel = () => {
    setUser((prev) => ({
      ...prev,
      notificationChannels: [
        ...prev.notificationChannels,
        { channelId: '', type: 'Email', value: '' },
      ],
    }))
  }

  const removeChannel = (index) => {
    setUser((prev) => ({
      ...prev,
      notificationChannels: prev.notificationChannels.filter((_, i) => i !== index),
    }))
  }

  const handleSave = () => {
    setSaving(true)
    setSaveSuccess(false)
    fetch(`${BASE_URL}/users/${USER_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to save profile (${res.status})`)
        return res.json()
      })
      .then((data) => {
        setUser(data)
        setSaving(false)
        setSaveSuccess(true)
      })
      .catch((err) => {
        setError(err.message)
        setSaving(false)
      })
  }

  if (loading) return <div className="status-message">Loading profile...</div>
  if (error) return <div className="status-message error-message">{error}</div>
  if (!user) return null

  return (
    <div className="user-profile">
      <h1>User Profile</h1>

      <div className="profile-form">
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="userId">User ID</label>
            <input id="userId" type="text" value={user.userId ?? ''} readOnly className="input-readonly" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                value={user.firstName ?? ''}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                type="text"
                value={user.lastName ?? ''}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={user.email ?? ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                id="phoneNumber"
                type="tel"
                value={user.phoneNumber ?? ''}
                onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2>Notification Channels</h2>
          {user.notificationChannels?.length === 0 && (
            <p className="empty-channels">No notification channels configured.</p>
          )}
          {user.notificationChannels?.map((channel, index) => (
            <NotificationChannelRow
              key={index}
              channel={channel}
              index={index}
              onChange={handleChannelChange}
              onRemove={removeChannel}
            />
          ))}
          <button className="btn-add" onClick={addChannel}>+ Add Channel</button>
        </div>

        <div className="form-actions">
          {saveSuccess && <span className="save-success">Profile saved successfully.</span>}
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserProfile
