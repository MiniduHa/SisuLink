import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ShieldAlert } from 'lucide-react';
import mainLogo from '../assets/mainlogo.png';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Send ONLY email and password. The backend is smart enough to figure out who they are!
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save user data to localStorage
        localStorage.setItem('sisuLinkUser', JSON.stringify(data.user || data.student));

        // The backend tells us what role they are, so we route them accordingly
        const userRole = data.user?.role || data.student?.role;

        if (userRole === 'SuperAdmin') {
          navigate('/super-admin');
        } else if (userRole === 'SchoolAdmin') {
          navigate('/school-admin');
        } else {
          // If a teacher/student somehow tries to log in here, redirect them or show an error
          setError("Access denied. This portal is for Administrators only.");
        }
      } else {
        setError(data.error || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('Server connection error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen font-sans">
      
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden md:flex flex-1 bg-blue-600 flex-col justify-center items-center text-white p-8">
        <div className="bg-white/20 p-4 rounded-2xl mb-6">
          <img src={mainLogo} alt="SisuLink Logo" className="w-20 h-20 object-contain" />
        </div>
        <h1 className="text-5xl font-black mb-2 tracking-tight">
          <span className="text-white">Sisu</span>
          <span className="text-blue-200">Link</span>
        </h1>
        <p className="text-blue-100 text-lg">Unified Education Management System</p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 bg-slate-50 flex justify-center items-center p-4">
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xl w-full max-w-md">
          
          <div className="mb-8 text-center sm:text-left">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Admin Portal</h2>
            <p className="text-slate-500">Sign in to manage your institution</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-lg mb-6 text-sm border border-red-200 flex items-start gap-2.5 font-medium">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            
            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-600">Email Address</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Mail size={18} className="text-slate-400 mr-3 shrink-0" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.edu"
                  className="bg-transparent border-none outline-none w-full text-slate-800"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-600">Password</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Lock size={18} className="text-slate-400 mr-3 shrink-0" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-transparent border-none outline-none w-full text-slate-800"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-4 shadow-sm flex justify-center items-center"
            >
              {isLoading ? "Verifying..." : "Sign In"}
            </button>

            {/* Registration Link */}
            <div className="mt-4 text-center text-sm text-slate-600">
              Is your school not registered yet?{' '}
              <button 
                type="button"
                onClick={() => navigate('/register')} 
                className="text-blue-600 font-semibold hover:underline transition-all"
              >
                Apply for access
              </button>
            </div>

          </form>
        </div>
      </div>

    </div>
  );
}