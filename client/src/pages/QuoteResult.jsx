import { Link, Navigate, useLocation } from 'react-router-dom';

export default function QuoteResult() {
  const { state } = useLocation();
  if (!state?.result) return <Navigate to="/request-quote" replace />;

  const { result, form } = state;
  const { quote, squarePaymentLink, leadId, email } = result;

  return (
    <div className="max-w-2xl mx-auto px-5 md:px-8 py-12 md:py-16 print:text-clay">
      <div className="text-center mb-8">
        <span className="badge-green mb-3">Request #{leadId} Received</span>
        <h1 className="section-title text-3xl">Your Catering Estimate</h1>
        <p className="section-sub mx-auto">
          Thank you, {form.fullName}! Here's your instant estimate for {form.eventDate} at {form.eventTime}.
        </p>
      </div>

      <div className="card">
        <div className="flex justify-between items-start border-b border-clay/10 pb-4 mb-4">
          <div>
            <div className="font-display font-bold text-lg">Dos Mezclas Catering</div>
            <div className="text-clay/60 text-sm">202B S Main St, Aubrey, TX · 469-688-9450</div>
          </div>
          <div className="text-right text-sm text-clay/60">
            <div>{form.guestCount} guests</div>
            <div className="capitalize">{form.serviceType.replace('_', ' ')}</div>
          </div>
        </div>

        {quote.requiresManualQuote ? (
          <p className="text-clay/80">{quote.message}</p>
        ) : (
          <div className="space-y-2 text-sm">
            {quote.packages.map((p) => (
              <Row key={p.key} label={`${p.label} × ${quote.guestCount} guests`} value={p.total} />
            ))}
            {quote.addons.map((a) => <Row key={a.key} label={a.label} value={a.total} />)}
            <Row label={quote.serviceType.label} value={quote.serviceType.total} />
            {quote.breakdown.discountAmount > 0 && (
              <Row label={quote.breakdown.discountLabel} value={-quote.breakdown.discountAmount} accent="green" />
            )}
            <Row label={`Service Charge (${(quote.breakdown.serviceChargeRate * 100).toFixed(0)}%)`} value={quote.breakdown.serviceCharge} />
            <Row label={`Tax (${(quote.breakdown.taxRate * 100).toFixed(2)}%)`} value={quote.breakdown.tax} />
            <div className="border-t border-clay/15 my-3" />
            <Row label="Total" value={quote.breakdown.total} bold />
            <Row label="30% Deposit Due to Reserve Your Date" value={quote.breakdown.depositDue} accent="orange" bold />
            <Row label="Remaining Balance (due day of event)" value={quote.breakdown.balanceDue} />
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 print:hidden">
        {!quote.requiresManualQuote && (
          squarePaymentLink ? (
            <a href={squarePaymentLink} target="_blank" rel="noreferrer" className="btn-primary flex-1 text-center">
              Pay Deposit & Reserve Date
            </a>
          ) : (
            <a href="tel:+14696889450" className="btn-primary flex-1 text-center">Call to Secure Your Date</a>
          )
        )}
        <button onClick={() => window.print()} className="btn-secondary flex-1">Print / Save as PDF</button>
      </div>

      <p className="text-cream/50 text-xs text-center mt-6 print:hidden">
        {email?.sent
          ? `A confirmation was also emailed to ${form.email}.`
          : 'Prices are estimates. We may follow up with any final adjustments before your deposit.'}
      </p>

      <div className="text-center mt-8 print:hidden">
        <Link to="/" className="nav-link">← Back to Home</Link>
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }) {
  const color = accent === 'green' ? 'text-accent-green' : accent === 'orange' ? 'text-accent-red' : '';
  return (
    <div className={`flex justify-between ${bold ? 'font-bold text-base' : color}`}>
      <span>{label}</span>
      <span>{value < 0 ? '-' : ''}${Math.abs(value).toFixed(2)}</span>
    </div>
  );
}
