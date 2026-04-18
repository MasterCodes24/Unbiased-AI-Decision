import { Link, useLocation, useNavigate } from 'react-router-dom'; // Added useNavigate
import { LogOut } from 'lucide-react';
import { logout } from '../firebase';

export default function Navbar({ user }) {
  const location = useLocation();
  const navigate = useNavigate(); // Initialize the navigator

  const handleLogout = async () => {
    try {
      await logout(); // 1. Ends the Firebase session
      navigate('/');  // 2. Forces the browser to go to the Home page
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8">
            <div className="absolute top-0 left-0 w-3.5 h-3.5 rounded-full bg-google-blue"></div>
            <div className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-google-red"></div>
            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 rounded-full bg-google-green"></div>
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-google-yellow"></div>
          </div>
          <span className="text-xl font-bold text-gray-900 brand-font">
            Fair<span className="text-google-blue">Lens</span>
          </span>
        </Link>

        {/* Dynamic Auth Section */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-gray-900 leading-none">{user.displayName}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Verified Auditor</span>
              </div>
              <img 
                src={user.photoURL} 
                className="w-9 h-9 rounded-full ring-2 ring-gray-50 border border-gray-200" 
                alt="Profile" 
              />
              {/* Changed onClick to use our new handleLogout function */}
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-google-red transition-colors"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="google-btn-primary text-sm px-8">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}