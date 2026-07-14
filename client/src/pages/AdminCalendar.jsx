import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAdminAuth } from '../context/AdminAuthContext.jsx';
import Brand from '../components/Brand.jsx';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function buildGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function AdminCalendar() {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get('/api/admin/leads?status=confirmed')
      .then(setLeads)
      .finally(() => setLoading(false));
  }, []);

  const leadsByDate = useMemo(() => {
    const map = {};
    for (const lead of leads) {
      if (!lead.event_date) continue;
      (map[lead.event_date] ||= []).push(lead);
    }
    return map;
  }, [leads]);

  const weeks = useMemo(() => buildGrid(year, month), [year, month]);
  const todayKey = toDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  function goToMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
    setSelectedDate(null);
  }

  function goToToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(todayKey);
  }

  const monthEventDates = Object.keys(leadsByDate)
    .filter((key) => {
      const [y, m] = key.split('-').map(Number);
      return y === year && m === month + 1;
    })
    .sort();

  const visibleDate = selectedDate || (monthEventDates.length ? null : null);
  const listDates = selectedDate ? [selectedDate] : monthEventDates;

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
        <h1 className="section-title text-2xl">Confirmed Orders Calendar</h1>
        <div className="flex items-center gap-2">
          <Link to="/admin/leads" className="btn-ghost text-sm">Leads List</Link>
          <button onClick={goToToday} className="btn-secondary text-sm">Today</button>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => goToMonth(-1)} className="btn-ghost !px-3 !py-1.5 text-clay">‹</button>
          <div className="font-display font-bold text-lg text-clay">{MONTH_NAMES[month]} {year}</div>
          <button onClick={() => goToMonth(1)} className="btn-ghost !px-3 !py-1.5 text-clay">›</button>
        </div>

        {loading ? (
          <div className="text-clay/60 py-10 text-center">Loading confirmed orders…</div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-clay/50 mb-2">
              {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weeks.map((week, wi) => week.map((day, di) => {
                if (day === null) return <div key={`${wi}-${di}`} className="aspect-square" />;
                const dateKey = toDateKey(year, month, day);
                const dayLeads = leadsByDate[dateKey] || [];
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;
                return (
                  <button
                    key={dateKey}
                    onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                    className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-start text-left transition
                      ${isSelected ? 'bg-accent-red text-cream' : dayLeads.length ? 'bg-accent-red/10 hover:bg-accent-red/20' : 'hover:bg-clay/5'}
                      ${isToday && !isSelected ? 'ring-2 ring-accent-orange' : ''}`}
                  >
                    <span className={`text-xs font-semibold ${isSelected ? 'text-cream' : 'text-clay/70'}`}>{day}</span>
                    {dayLeads.length > 0 && (
                      <span className={`mt-1 text-[10px] font-bold rounded-full px-1.5 ${isSelected ? 'bg-cream/20 text-cream' : 'bg-accent-red text-cream'}`}>
                        {dayLeads.length}
                      </span>
                    )}
                  </button>
                );
              }))}
            </div>
          </>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-display font-bold text-lg mb-3">
          {selectedDate ? `Confirmed orders — ${selectedDate}` : `Confirmed orders this month (${monthEventDates.reduce((sum, k) => sum + leadsByDate[k].length, 0)})`}
        </h2>

        {listDates.length === 0 ? (
          <div className="card-dark text-cream/60">No confirmed orders {selectedDate ? 'on this day' : 'this month'}.</div>
        ) : (
          <div className="space-y-4">
            {listDates.map((dateKey) => (
              <div key={dateKey}>
                {!selectedDate && (
                  <div className="text-cream/50 text-xs uppercase tracking-wide mb-2">{dateKey}</div>
                )}
                <div className="space-y-3">
                  {(leadsByDate[dateKey] || []).map((lead) => (
                    <div key={lead.id} className="card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-display font-bold text-lg">{lead.full_name}</div>
                          <div className="text-clay/60 text-sm">{lead.email} · {lead.phone}</div>
                        </div>
                        <span className="badge-green">confirmed</span>
                      </div>
                      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-sm text-clay/80">
                        <div><span className="text-clay/50">Time</span><br/>{lead.event_time}</div>
                        <div><span className="text-clay/50">Guests</span><br/>{lead.guest_count} · {(lead.pricing?.serviceType?.label) || lead.service_type.replace('_',' ')}</div>
                        <div><span className="text-clay/50">Package</span><br/>{(lead.package || []).join(' + ')}</div>
                        <div><span className="text-clay/50">Location</span><br/>{lead.event_location}</div>
                      </div>
                      {lead.pricing?.breakdown && (
                        <div className="mt-4 flex flex-wrap gap-6 text-sm border-t border-clay/10 pt-3">
                          <div><span className="text-clay/50">Total</span> <span className="font-bold">${lead.pricing.breakdown.total.toFixed(2)}</span></div>
                          <div><span className="text-clay/50">Deposit Due</span> <span className="font-bold text-accent-red">${lead.pricing.breakdown.depositDue.toFixed(2)}</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
