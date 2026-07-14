import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const EVENT_TYPES = ['Wedding', 'Corporate', 'Graduation', 'Birthday', 'Other'];

const emptyForm = {
  fullName: '', phone: '', email: '',
  eventType: 'Wedding', eventDate: '', eventTime: '', guestCount: '',
  serviceType: 'drop_off', eventLocation: '', withinDeliveryRadius: true,
  packages: ['fajita_mixed'], addons: [],
  budget: '', specialInstructions: '', promoCode: '',
};

export default function RequestQuote() {
  const navigate = useNavigate();
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    api.get('/api/catering/options').then(setOptions).catch(() => {});
  }, []);

  const guestsValid = Number(form.guestCount) >= 10;

  // Debounced live preview
  useEffect(() => {
    if (!guestsValid || form.packages.length === 0 || !form.serviceType) { setPreview(null); return; }
    const t = setTimeout(() => {
      api.post('/api/catering/preview', {
        packages: form.packages,
        addons: form.addons,
        serviceType: form.serviceType,
        guestCount: form.guestCount,
        promoCode: form.promoCode,
        withinDeliveryRadius: form.withinDeliveryRadius,
      }).then((q) => { setPreview(q); setPreviewError(null); })
        .catch((e) => { setPreview(null); setPreviewError(e.message); });
    }, 350);
    return () => clearTimeout(t);
  }, [form.packages, form.addons, form.serviceType, form.guestCount, form.promoCode, form.withinDeliveryRadius, guestsValid]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleAddon(key) {
    setForm((f) => ({
      ...f,
      addons: f.addons.includes(key) ? f.addons.filter((a) => a !== key) : [...f.addons, key],
    }));
  }

  function togglePackage(key) {
    setForm((f) => ({
      ...f,
      packages: f.packages.includes(key) ? f.packages.filter((p) => p !== key) : [...f.packages, key],
    }));
  }

  const canSubmit = useMemo(() => {
    return form.fullName && form.phone && form.email && form.eventDate && form.eventTime
      && guestsValid && form.eventLocation && form.packages.length > 0 && form.serviceType;
  }, [form, guestsValid]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await api.post('/api/catering/submit', form);
      navigate('/quote-result', { state: { result, form } });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!options) {
    return <div className="max-w-3xl mx-auto px-5 py-20 text-cream/60">Loading catering options…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-12 md:py-16">
      <h1 className="section-title text-3xl md:text-4xl">Dos Mezclas Catering Request</h1>
      <p className="section-sub">Savor the Fusion — tell us about your event and get an instant quote.</p>

      <form onSubmit={handleSubmit} className="mt-10 space-y-10">
        {/* Contact Info */}
        <FormSection title="Contact Info">
          <Field label="Full Name" required>
            <input className="input" value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone Number" required>
              <input className="input" type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
            </Field>
            <Field label="Email Address" required>
              <input className="input" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            </Field>
          </div>
        </FormSection>

        {/* Event Details */}
        <FormSection title="Event Details">
          <Field label="Event Type">
            <select className="input" value={form.eventType} onChange={(e) => update('eventType', e.target.value)}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Event Date" required>
              <input className="input" type="date" value={form.eventDate} onChange={(e) => update('eventDate', e.target.value)} required />
            </Field>
            <Field label="Event Time" required>
              <input className="input" type="time" value={form.eventTime} onChange={(e) => update('eventTime', e.target.value)} required />
            </Field>
          </div>
          <Field label="Number of Guests (minimum 10)" required>
            <input className="input" type="number" min="10" value={form.guestCount} onChange={(e) => update('guestCount', e.target.value)} required />
          </Field>
          <Field label="Service Type" required>
            <div className="grid gap-3">
              {Object.entries(options.serviceTypes).map(([key, s]) => (
                <button type="button" key={key}
                  onClick={() => update('serviceType', key)}
                  className={`text-left ${form.serviceType === key ? 'pill-select-on' : 'pill-select-off'}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span>{s.label}</span>
                    <span className="text-xs opacity-70 font-normal whitespace-nowrap">
                      {s.serviceChargeRate > 0 ? `${(s.serviceChargeRate * 100).toFixed(0)}% service charge` : 'No service charge'}
                    </span>
                  </div>
                  <div className="text-xs opacity-70 font-normal mt-1">{s.description}</div>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Event Location" required>
            <input className="input" placeholder="Street address, city" value={form.eventLocation} onChange={(e) => update('eventLocation', e.target.value)} required />
          </Field>
          <Field label="Is your location within 10 miles of Aubrey, TX?">
            <div className="grid grid-cols-2 gap-3">
              <button type="button"
                onClick={() => update('withinDeliveryRadius', true)}
                className={form.withinDeliveryRadius ? 'pill-select-on' : 'pill-select-off'}>
                Yes
              </button>
              <button type="button"
                onClick={() => update('withinDeliveryRadius', false)}
                className={!form.withinDeliveryRadius ? 'pill-select-on' : 'pill-select-off'}>
                No / Not sure
              </button>
            </div>
            {!form.withinDeliveryRadius && (
              <p className="text-xs text-accent-orange mt-2">
                Additional delivery fees may apply outside our 10-mile radius — we'll confirm the exact amount when we follow up.
              </p>
            )}
          </Field>
        </FormSection>

        {/* Food Selection */}
        <FormSection title="Food Selection">
          <Field label="Main Package (select one or more — mix and match)" required>
            <div className="grid sm:grid-cols-2 gap-3">
              {Object.entries(options.packages).map(([key, p]) => (
                <button type="button" key={key}
                  onClick={() => togglePackage(key)}
                  className={`text-left ${form.packages.includes(key) ? 'pill-select-on' : 'pill-select-off'}`}>
                  <div>{p.label}</div>
                  <div className="text-xs opacity-70 font-normal">
                    {p.pricePerGuest === null ? 'Quoted individually' : `$${p.pricePerGuest}/guest`}
                  </div>
                  {form.packages.includes(key) && p.description && (
                    <div className="text-xs opacity-90 font-normal mt-2 pt-2 border-t border-current/20">
                      {p.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Add-Ons">
            <div className="grid sm:grid-cols-3 gap-3">
              {Object.entries(options.addons).map(([key, a]) => (
                <button type="button" key={key}
                  onClick={() => toggleAddon(key)}
                  className={form.addons.includes(key) ? 'pill-select-on' : 'pill-select-off'}>
                  {a.label} <span className="opacity-70 font-normal">${a.pricePerGuest}/guest</span>
                </button>
              ))}
            </div>
            {options.complimentaryNote && (
              <p className="text-xs text-accent-green mt-1">🌶 {options.complimentaryNote}</p>
            )}
          </Field>
        </FormSection>

        {/* Extra Info */}
        <FormSection title="Extra Info">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Budget (optional)">
              <input className="input" placeholder="e.g. $1,500" value={form.budget} onChange={(e) => update('budget', e.target.value)} />
            </Field>
            <Field label="Promo Code (optional)">
              <input className="input" placeholder="e.g. DOSMEZCLAS10" value={form.promoCode} onChange={(e) => update('promoCode', e.target.value)} />
            </Field>
          </div>
          <Field label="Special Instructions">
            <textarea className="input" rows={3} value={form.specialInstructions} onChange={(e) => update('specialInstructions', e.target.value)} />
          </Field>
        </FormSection>

        {/* Live preview */}
        {guestsValid && (
          <div className="card-dark">
            <div className="font-display font-bold text-lg mb-3">Estimated Pricing</div>
            {previewError && <div className="text-accent-red text-sm">{previewError}</div>}
            {preview?.requiresManualQuote && (
              <div className="text-cream/70 text-sm">{preview.message}</div>
            )}
            {preview && !preview.requiresManualQuote && (
              <div className="text-sm space-y-1.5">
                <div className="text-cream/60 text-xs mb-2">Service: {preview.serviceType.label}</div>
                {preview.packages.map((p) => (
                  <Row key={p.key} label={`${p.label} × ${preview.guestCount} guests`} value={p.total} />
                ))}
                {preview.addons.map((a) => <Row key={a.key} label={a.label} value={a.total} />)}
                {preview.breakdown.discountAmount > 0 && (
                  <Row label={preview.breakdown.discountLabel} value={-preview.breakdown.discountAmount} accent="green" />
                )}
                {preview.breakdown.serviceChargeRate > 0 && (
                  <Row label={`Service Charge (${(preview.breakdown.serviceChargeRate * 100).toFixed(0)}%)`} value={preview.breakdown.serviceCharge} />
                )}
                <Row label={`Tax (${(preview.breakdown.taxRate * 100).toFixed(2)}%)`} value={preview.breakdown.tax} />
                <div className="border-t border-white/10 my-2" />
                <Row label="Estimated Total" value={preview.breakdown.total} bold />
                <Row label="30% Deposit Due to Reserve" value={preview.breakdown.depositDue} accent="orange" />
                {!form.withinDeliveryRadius && (
                  <p className="text-xs text-accent-orange pt-2">
                    Additional delivery fees may apply outside our 10-mile radius and are not included above — we'll confirm when we follow up.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {submitError && <div className="text-accent-red text-sm">{submitError}</div>}

        <button type="submit" disabled={!canSubmit || submitting} className="btn-primary w-full disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Get My Quote'}
        </button>
        <p className="text-center text-cream/50 text-xs">
          Thank you for choosing Dos Mezclas. We'll follow up with any final details within 24 hours.
        </p>
      </form>
    </div>
  );
}

function FormSection({ title, children }) {
  return (
    <section>
      <h2 className="font-display font-bold text-xl mb-4 text-accent-orange">{title}</h2>
      <div className="card space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-accent-red"> *</span>}</label>
      {children}
    </div>
  );
}

function Row({ label, value, bold, accent }) {
  const color = accent === 'green' ? 'text-accent-green' : accent === 'orange' ? 'text-accent-orange' : '';
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-base' : color}`}>
      <span>{label}</span>
      <span>{value < 0 ? '-' : ''}${Math.abs(value).toFixed(2)}</span>
    </div>
  );
}
