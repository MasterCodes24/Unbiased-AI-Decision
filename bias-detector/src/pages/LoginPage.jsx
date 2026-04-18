import { Link } from 'react-router-dom';
import { signInWithGoogle } from '../firebase';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-6">
      {/* Container Card */}
      <div className="bg-white p-10 max-w-sm w-full text-center rounded-2xl border border-gray-100 shadow-xl border-t-4 border-t-google-blue relative">
        
        {/* The New "Go Back" Button */}
        <Link 
          to="/" 
          className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-all flex items-center gap-1 text-xs font-medium"
        >
          <ArrowLeft size={14} />
          Back
        </Link>

        <div className="flex justify-center mb-6 mt-2">
          <div className="p-4 rounded-full bg-blue-50 text-google-blue">
            <ShieldCheck size={48} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2 brand-font">FairLens Audit</h1>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          Securely audit your hiring datasets for hidden bias using our AI-powered analysis tool.
        </p>
        
        <button 
          onClick={handleLogin} 
          className="google-btn-secondary w-full justify-center py-3.5 text-base border-gray-300"
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            className="w-5 h-5 mr-2" 
            alt="Google Logo" 
          />
          Continue with Google
        </button>

        {/* Alternative escape route at the bottom */}
        <div className="mt-8 pt-6 border-t border-gray-50">
          <Link to="/" className="text-xs text-gray-400 hover:text-google-blue transition-colors">
            Not ready to sign in? <span className="underline">View Home Page</span>
          </Link>
        </div>
      </div>

      <p className="mt-6 text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
        Member of GDG Solution Challenge
      </p>
    </div>
  );
}