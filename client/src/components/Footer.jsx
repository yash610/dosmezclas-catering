import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-20">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 grid md:grid-cols-3 gap-10">
        <div>
          <Brand />
          <p className="text-cream/60 text-sm mt-4 max-w-xs">
            Bold Tex-Mex, Latin, and Indian-inspired fusion catering for weddings,
            corporate events, graduations, and celebrations of every size.
          </p>
        </div>
        <div className="text-sm text-cream/70 space-y-2">
          <div className="font-semibold text-cream mb-1">Contact</div>
          <div>202B S Main St, Aubrey, TX 76227</div>
          <div><a className="hover:text-accent-orange" href="tel:+14696889450">469-688-9450</a></div>
          <div><a className="hover:text-accent-orange" href="mailto:manager@dosmezclas.com">manager@dosmezclas.com</a></div>
        </div>
        <div className="text-sm text-cream/70 space-y-2">
          <div className="font-semibold text-cream mb-1">Catering</div>
          <Link to="/request-quote" className="block hover:text-accent-orange">Request a Quote</Link>
          <Link to="/admin/login" className="block hover:text-accent-orange">Staff Login</Link>
        </div>
      </div>
      <div className="text-center text-cream/40 text-xs pb-8">
        © {new Date().getFullYear()} Dos Mezclas LLC. All rights reserved. · Savor the Fusion
      </div>
    </footer>
  );
}
