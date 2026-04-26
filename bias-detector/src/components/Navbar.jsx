// Navbar.jsx — The top navigation bar that appears on every page.
// It's "sticky" so it stays at the top when you scroll down.

import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

export default function Navbar() {
  const location = useLocation(); // Tells us which page we're currently on

  return (
    // sticky top-0 = stays fixed at top of screen when scrolling
    // z-50 = appears above all other elements (like a floating layer)
    // backdrop-blur-sm = blurs the background behind the nav (frosted glass effect)
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo + Brand Name */}
        {/* Link = React Router's version of <a href="/">, navigates without page reload */}
        <Link to="/" className="flex items-center gap-2.5 group">
          {/* The four colored dots that echo the Google logo */}
          <div className="relative w-8 h-8 flex-shrink-0">
            <div className="absolute top-0 left-0 w-3.5 h-3.5 rounded-full bg-google-blue"></div>
            <div className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-google-red"></div>
            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full bg-google-green"></div>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-google-yellow"></div>
          </div>
          <span className="text-xl font-bold text-gray-900">
            Fair<span className="text-google-blue">Lens</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          <NavLink to="/" active={location.pathname === '/'}>Home</NavLink>
          <NavLink to="/upload" active={location.pathname === '/upload'}>Analyze</NavLink>
          <NavLink to="/results" active={location.pathname === '/results'}>Results</NavLink>
          
          {/* CTA Button */}
          <Link
            to="/upload"
            className="ml-4 google-btn-primary text-sm"
          >
            <ShieldCheck size={16} />
            Run Audit
          </Link>
        </div>
      </div>
    </nav>
  );
}

// A small helper component for each nav link.
// It changes style when it's the "active" (current) page.
function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-150
        ${active 
          ? 'bg-blue-50 text-google-blue'  // Active = blue background
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' // Inactive = grey hover
        }`}
    >
      {children}
    </Link>
  );
}