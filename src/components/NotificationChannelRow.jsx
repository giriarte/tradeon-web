import './NotificationChannelRow.css'

function NotificationChannelRow({ channel, index, onChange, onRemove }) {
  return (
    <div className="channel-row">
      {channel.channelId && (
        <div className="channel-field">
          <label>Channel ID</label>
          <input type="text" value={channel.channelId} readOnly className="input-readonly" />
        </div>
      )}
      <div className="channel-field channel-type">
        <label>Type</label>
        <select
          value={channel.type}
          onChange={(e) => onChange(index, 'type', e.target.value)}
        >
          <option value="Email">Email</option>
          <option value="Phone">Phone</option>
        </select>
      </div>
      <div className="channel-field channel-value">
        <label>Value</label>
        <input
          type="text"
          value={channel.value}
          onChange={(e) => onChange(index, 'value', e.target.value)}
          placeholder={channel.type === 'Email' ? 'email@example.com' : '+1 555 000 0000'}
        />
      </div>
      <button className="btn-remove" onClick={() => onRemove(index)}>Remove</button>
    </div>
  )
}

export default NotificationChannelRow
