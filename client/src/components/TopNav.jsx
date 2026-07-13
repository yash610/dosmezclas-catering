import { Link, NavLink } from 'react-router-dom';
import Brand from './Brand.jsx';

export default function TopNav() {
  return (
    <header className="sticky top-0 z-40 bg-charcoal/90 backdrop-blur border-b border-white/5">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-20 flex items-center justify-between">
        <Link to="/"><Brand /></Link>
        <nav className="hidden md:flex items-center gap-8">
          <NavLink to="/" end className={({isActive}) => `nav-link ${isActive ? 'text-accent-orange' : ''}`}>Home</NavLink>
          <NavLink to="/request-quote" className={({isActive}) => `nav-link ${isActive ? 'text-accent-orange' : ''}`}>Request a Quote</NavLink>
          <a href="tel:+14696889450" className="nav-link">469-688-9450</a>
        </nav>
        <Link to="/request-quote" className="btn-primary text-sm">Get a Quote</Link>
      </div>
    </header>
  );
}
