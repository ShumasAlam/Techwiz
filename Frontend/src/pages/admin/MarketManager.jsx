import { LocateFixed, MapPin, Navigation } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import api from '../../api'
import { marketEmbedUrl, parseMapCoordinates } from '../../utils/maps'

const empty = { name: '', address: '', day: '', openingTime: '08:00', closingTime: '13:00', lat: '', lng: '', mapUrl: '' }
const defaultTimes = { 'm-1': ['08:00', '13:00'], 'm-2': ['09:00', '14:00'], 'm-3': ['16:00', '20:00'] }

export default function MarketManager({ markets, onChange }) {
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const applyMapLink = (value) => {
    const coords = parseMapCoordinates(value)
    setForm((current) => ({ ...current, mapUrl: value, ...(coords ? { lat: String(coords.lat), lng: String(coords.lng) } : {}) }))
    if (value && !coords) toast.info('Paste a full Google Maps link that includes coordinates, or use current location.')
  }

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not available in this browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const lat = Number(coords.latitude.toFixed(6))
      const lng = Number(coords.longitude.toFixed(6))
      setForm((current) => ({ ...current, lat: String(lat), lng: String(lng), mapUrl: `https://www.google.com/maps?q=${lat},${lng}` }))
      toast.success('Current location added')
    }, () => toast.error('Could not get current location. Allow location permission and try again.'))
  }

  const save = async (event) => {
    event.preventDefault()
    try {
      await api.markets.save({ ...form, lat: Number(form.lat), lng: Number(form.lng), mapUrl: form.mapUrl?.trim() || `https://www.google.com/maps?q=${form.lat},${form.lng}` })
      onChange()
      setForm(null)
      toast.success('Market saved')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return <section className="portal-panel"><button className="btn" onClick={() => setForm({ ...empty })}>Add Market</button>{form && <form className="dashboard-edit-form" onSubmit={save}><h2>{form.id ? 'Edit Market' : 'Add Market'}</h2><div className="form-grid">{[['name', 'Market Name', 'text'], ['address', 'Address', 'text'], ['day', 'Operating Days', 'text'], ['openingTime', 'Opening Time', 'time'], ['closingTime', 'Closing Time', 'time']].map(([key, label, type]) => <label key={key}>{label}<input required type={type} value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>)}<label className="span-two">Google Maps Link<input type="url" value={form.mapUrl || ''} onChange={(event) => applyMapLink(event.target.value)} placeholder="Paste Google Maps link with coordinates" /></label><div className="market-location-tools span-two"><button className="btn btn--outline" type="button" onClick={useCurrentLocation}><LocateFixed /> Use my current location</button><a className="btn btn--outline" href="https://www.google.com/maps" target="_blank" rel="noreferrer"><Navigation /> Open Google Maps</a></div>{[['lat', 'Latitude'], ['lng', 'Longitude']].map(([key, label]) => <label key={key}>{label}<input required type="number" step="any" min={key === 'lat' ? -90 : -180} max={key === 'lat' ? 90 : 180} value={form[key]} onChange={(event) => update(key, event.target.value)} /></label>)}</div>{form.lat && form.lng && <div className="market-location-preview"><iframe title="Selected market map preview" src={marketEmbedUrl(form, 15)} loading="lazy" /><p><MapPin /> Preview of selected pickup point</p></div>}<button className="btn">Save Market</button><button className="text-btn" type="button" onClick={() => setForm(null)}>Cancel</button></form>}
    {deleting && <div className="dashboard-confirm" role="alert"><h3>Delete {deleting.name}?</h3><p>This removes the market from listings and farmer pickup choices. Historical orders are kept. Markets with active pickups cannot be deleted.</p><button className="btn" onClick={async () => { try { await api.markets.remove(deleting.id); onChange(); setDeleting(null); toast.success('Market deleted') } catch (error) { toast.error(error.message) } }}>Confirm Delete</button><button className="text-btn" onClick={() => setDeleting(null)}>Cancel</button></div>}
    <div className="table-wrap"><table><thead><tr><th>Market</th><th>Operating Days</th><th>Hours</th><th>Address</th><th>Actions</th></tr></thead><tbody>{markets.map((market) => <tr key={market.id}><td>{market.name}</td><td>{market.day}</td><td>{market.hours}</td><td>{market.address}</td><td><div className="table-actions"><Link to={`/markets/${market.id}`}>View</Link><button onClick={() => setForm({ ...empty, ...market, mapUrl: market.mapUrl || '', openingTime: market.openingTime || defaultTimes[market.id]?.[0] || '08:00', closingTime: market.closingTime || defaultTimes[market.id]?.[1] || '13:00' })}>Edit</button><button onClick={() => setDeleting(market)}>Delete</button></div></td></tr>)}</tbody></table></div>
  </section>
}
