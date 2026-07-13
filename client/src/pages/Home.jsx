import { Link } from 'react-router-dom';

const PACKAGES = [
  { key: 'fajita_mixed', label: 'Fajitas – Mixed', badge: 'Most Popular', price: '$15/guest',
    desc: 'Chicken & beef fajitas, rice & beans, corn & flour tortillas, chips & salsa.' },
  { key: 'fajita_chicken', label: 'Fajitas – Chicken', price: '$14/guest',
    desc: 'Grilled chicken fajitas with all the classic fixings.' },
  { key: 'fajita_beef', label: 'Fajitas – Beef', price: '$14/guest',
    desc: 'Grilled steak fajitas with all the classic fixings.' },
  { key: 'tacos', label: 'Tacos Bar', price: '$14/guest',
    desc: 'Build-your-own taco bar — a crowd favorite for casual events.' },
];

const ADDONS = [
  { label: 'Chips & Salsa', price: '$2/guest' },
  { label: 'Guacamole', price: '$2.50/guest' },
  { label: 'Queso', price: '$2.50/guest' },
  { label: 'Churros', price: '$3/guest' },
  { label: 'Gulab Churro Balls', price: '$3.50/guest' },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-red/20 via-transparent to-accent-orange/10 pointer-events-none" />
        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-20 relative">
          <span className="badge-orange mb-5">Aubrey, TX · Weddings · Corporate · Celebrations</span>
          <h1 className="section-title max-w-3xl">Catering With A Fusion of Flavor</h1>
          <p className="section-sub text-lg">
            Bring the bold, vibrant taste of Dos Mezclas to your next event. Tex-Mex favorites,
            Latin specialties, and an Indian twist — designed to impress every guest.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Link to="/request-quote" className="btn-primary">Get an Instant Quote</Link>
            <a href="tel:+14696889450" className="btn-ghost">Call 469-688-9450</a>
          </div>
        </div>
      </section>

      {/* Packages */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14">
        <h2 className="section-title text-2xl md:text-3xl">Catering Packages</h2>
        <p className="section-sub">Every package is priced per guest and fully customizable.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
          {PACKAGES.map((p) => (
            <div key={p.key} className="card flex flex-col">
              {p.badge && <span className="badge-red mb-3 self-start">{p.badge}</span>}
              <div className="font-display font-bold text-xl">{p.label}</div>
              <div className="text-accent-red font-semibold mt-1">{p.price}</div>
              <p className="text-clay/70 text-sm mt-3 flex-1">{p.desc}</p>
            </div>
          ))}
        </div>
        <div className="card-dark mt-6">
          <div className="font-display font-bold text-lg mb-1">Custom Menu</div>
          <p className="text-cream/70 text-sm">
            Have something specific in mind? We'll build a custom fusion menu for your event —
            request a quote and select "Custom Menu" to tell us more.
          </p>
        </div>
      </section>

      {/* Add-ons */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14">
        <h2 className="section-title text-2xl md:text-3xl">Popular Add-Ons</h2>
        <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-8">
          {ADDONS.map((a) => (
            <div key={a.label} className="card-dark text-center">
              <div className="font-semibold">{a.label}</div>
              <div className="text-accent-orange text-sm mt-1">{a.price}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14">
        <h2 className="section-title text-2xl md:text-3xl">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6 mt-8">
          {[
            ['1', 'Fill out the form', 'Tell us about your event, guest count, and menu preferences.'],
            ['2', 'Get an instant quote', 'Our pricing engine calculates your total on the spot — no waiting.'],
            ['3', 'Secure your date', 'Pay a 30% deposit to lock in your event date.'],
            ['4', 'We handle the rest', 'Pickup, delivery, or full-service setup with servers — your choice.'],
          ].map(([n, title, desc]) => (
            <div key={n} className="card-dark">
              <div className="w-10 h-10 rounded-full bg-accent-red flex items-center justify-center font-display font-bold mb-3">{n}</div>
              <div className="font-semibold">{title}</div>
              <p className="text-cream/60 text-sm mt-2">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-16">
        <div className="card-dark flex flex-col md:flex-row items-center justify-between gap-6 !p-10 bg-gradient-to-br from-charcoal-700 to-charcoal-600">
          <div>
            <div className="font-display font-bold text-2xl">Ready to Savor the Fusion?</div>
            <p className="text-cream/70 mt-2">Get your custom catering quote in under a minute.</p>
          </div>
          <Link to="/request-quote" className="btn-primary whitespace-nowrap">Start Your Quote</Link>
        </div>
      </section>
    </div>
  );
}
