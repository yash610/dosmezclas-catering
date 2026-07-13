import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import Brand from '../components/Brand.jsx';

const STATUSES = ['new', 'quoted', 'deposit_pending', 'confirmed', 'cancelled'];
const STATUS_BADGE = {
  new: 'badge-orange', quoted: 'badge-yellow', deposit_pending: 'badge-red',
  confirmed: 'badge-green', cancelled: 'badge-gray',
};

export default function AdminLeads() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get(`/api/admin/leads${filter ? `?status=${filter}` : ''}`)
      .then(setLeads)
      .finally(() => setLoading(false));
  }

  useEffect(load, [filter]);

  async function updateStatus(id, status) {
    const updated = await api.patch(`/api/admin/leads/${id}/status`, { status });
    setLeads((ls) => ls.map((l) => (l.id === id ? updated : l)));
  }

  const totalPipeline = leads
    .filter((l) => l.status !== 'cancelled' && l.pricing?.breakdown)
    .reduce((sum, l) => sum + (l.pricing.breakdown.total || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <Brand compact />
        <div className="flex items-center gap-4">
          <span className="text-cream/60 text-sm">{admin?.email}</span>
          <button onClick={() => { logout(); navigate('/admin/login'); }} className="btn-ghost text-sm">Sign out</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="section-title text-2xl">Catering Leads</h1>
        <div className="flex items-center gap-3">
          <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="card-dark mb-6">
        <div className="text-cream/60 text-sm">Active Pipeline Value</div>
        <div className="font-display font-bold text-2xl text-accent-green">${totalPipeline.toFixed(2)}</div>
      </div>

      {loading ? (
        <div className="text-cream/60">Loading leads…</div>
      ) : leads.length === 0 ? (
        <div className="card-dark text-cream/60">No leads yet.</div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <div key={lead.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-display font-bold text-lg">{lead.full_name}</div>
                  <div className="text-clay/60 text-sm">{lead.email} · {lead.phone}</div>
                </div>
                <span className={STATUS_BADGE[lead.status] || 'badge-gray'}>{lead.status.replace('_', ' ')}</span>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm text-clay/80">
                <div><span className="text-clay/50">Event</span><br/>{lead.event_type} — {lead.event_date} {lead.event_time}</div>
                <div><span className="text-clay/50">Guests</span><br/>{lead.guest_count} · {lead.service_type.replace('_',' ')}</div>
                <div><span className="text-clay/50">Package</span><br/>{(lead.package || []).join(' + ')}{lead.addons?.length ? ` + ${lead.addons.length} add-ons` : ''}</div>
                <div><span className="text-clay/50">Location</span><br/>{lead.event_location}</div>
              </div>
              {lead.pricing?.breakdown && (
                <div className="mt-4 flex flex-wrap gap-6 text-sm border-t border-clay/10 pt-3">
                  <div><span className="text-clay/50">Total</span> <span className="font-bold">${lead.pricing.breakdown.total.toFixed(2)}</span></div>
                  <div><span className="text-clay/50">Deposit Due</span> <span className="font-bold text-accent-red">${lead.pricing.breakdown.depositDue.toFixed(2)}</span></div>
                </div>
              )}
              {lead.special_instructions && (
                <div className="mt-3 text-sm text-clay/70 italic">"{lead.special_instructions}"</div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => updateStatus(lead.id, s)}
                    className={`text-xs px-3 py-1.5 rounded-full border ${lead.status === s ? 'bg-clay text-cream border-clay' : 'border-clay/20 text-clay/60 hover:border-clay/50'}`}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
