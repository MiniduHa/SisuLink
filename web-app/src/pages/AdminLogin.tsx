import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Lock, Mail } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // --- TEMPORARY ROUTING LOGIC FOR TESTING ---
    if (email === 'super@admin.com' && password === 'admin123') {
      navigate('/super-admin');
    } else if (email === 'school@admin.com' && password === 'admin123') {
      navigate('/school-admin');
    } else {
      setError('Invalid credentials. Try super@admin.com or school@admin.com');
    }
  };

  return (
    <div className="flex h-screen w-screen font-sans">
      
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden md:flex flex-1 bg-blue-600 flex-col justify-center items-center text-white p-8">
        <div className="bg-white/20 p-6 rounded-2xl mb-6">
          <GraduationCap size={56} color="#FFFFFF" />
        </div>
        <h1 className="text-4xl font-bold mb-2">School Connect</h1>
        <p className="text-blue-100 text-lg">Unified Education Management System</p>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 bg-slate-50 flex justify-center items-center p-4">
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xl w-full max-w-md">
          
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">Admin Portal</h2>
            <p className="text-slate-500">Sign in to manage your institution</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            
            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-600">Email Address</label>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                <Mail size={18} className="text-slate-400 mr-3" />
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
                <Lock size={18} className="text-slate-400 mr-3" />
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
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-2 shadow-sm"
            >
              Sign In to Dashboard
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