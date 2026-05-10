import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, User, Mail, Phone, ArrowLeft, CheckCircle, Lock, Eye, EyeOff, LayoutGrid, Users } from 'lucide-react';
import mainLogo from '../assets/mainlogo.png';

export default function SchoolRegistration() {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    schoolName: '', adminName: '', email: '', phone: '', schoolCategory: '', schoolGender: '', password: '', confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordError('');
    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        setPasswordError(data.error || "Registration failed. Please try again.");
      }
    } catch (error) {
      setPasswordError("Server connection error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-screen font-sans">
      <div className="hidden md:flex flex-1 bg-blue-600 flex-col justify-center items-center text-white p-8">
        <div className="bg-white/20 p-4 rounded-2xl mb-6">
          <img src={mainLogo} alt="SisuLink Logo" className="w-20 h-20 object-contain" />
        </div>
        <h1 className="text-5xl font-black mb-2 text-center tracking-tight">
          <span className="text-white">Join Sisu</span>
          <span className="text-blue-200">Link</span>
        </h1>
        <p className="text-blue-100 text-lg text-center max-w-md">Bring your institution into the future with our unified education management platform.</p>
      </div>

      <div className="flex-1 bg-slate-50 flex justify-center items-start md:items-center p-4 overflow-y-auto">
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-xl w-full max-w-md my-auto">
          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle size={32} /></div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Application Received!</h2>
              <p className="text-slate-500 mb-8">Thank you for applying. A Super Admin will review your details shortly. You will receive an email with your login credentials once approved.</p>
              <button onClick={() => navigate('/login')} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-lg transition-colors">Return to Login</button>
            </div>
          ) : (
            <>
              <div className="mb-6 relative">
                <button onClick={() => navigate('/login')} className="absolute -left-2 -top-2 p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Back to Login"><ArrowLeft size={20} /></button>
                <h2 className="text-3xl font-bold text-slate-800 mb-2 text-center">Register School</h2>
                <p className="text-slate-500 text-center">Apply for a SisuLink instance</p>
              </div>

              {passwordError && <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-sm border border-red-200 text-center font-medium">{passwordError}</div>}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Institution Name</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Building2 size={18} className="text-slate-400 mr-3 shrink-0" /><input type="text" required placeholder="e.g. S. Thomas' College" value={formData.schoolName} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} className="bg-transparent border-none outline-none w-full text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-600">School Category</label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <LayoutGrid size={18} className="text-slate-400 mr-3 shrink-0" />
                      <select required value={formData.schoolCategory} onChange={(e) => setFormData({...formData, schoolCategory: e.target.value})} className="bg-transparent border-none outline-none w-full text-slate-800 cursor-pointer"><option value="" disabled>Select Type...</option><option value="Government">Government</option><option value="Semi-Government">Semi-Government</option><option value="Private">Private</option></select>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-600">Student Type</label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <Users size={18} className="text-slate-400 mr-3 shrink-0" />
                      <select required value={formData.schoolGender} onChange={(e) => setFormData({...formData, schoolGender: e.target.value})} className="bg-transparent border-none outline-none w-full text-slate-800 cursor-pointer"><option value="" disabled>Select Type...</option><option value="Boys">Boys School</option><option value="Girls">Girls School</option><option value="Mixed">Mixed School</option></select>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Principal / Admin Name</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <User size={18} className="text-slate-400 mr-3 shrink-0" /><input type="text" required placeholder="e.g. Principal Perera" value={formData.adminName} onChange={(e) => setFormData({...formData, adminName: e.target.value})} className="bg-transparent border-none outline-none w-full text-slate-800" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Official Email</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Mail size={18} className="text-slate-400 mr-3 shrink-0" /><input type="email" required placeholder="admin@school.edu" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="bg-transparent border-none outline-none w-full text-slate-800" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-slate-600">Contact Number</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Phone size={18} className="text-slate-400 mr-3 shrink-0" /><input type="tel" required placeholder="+94 11 234 5678" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="bg-transparent border-none outline-none w-full text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-600">Create Password</label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <Lock size={18} className="text-slate-400 mr-3 shrink-0" /><input type={showPassword ? "text" : "password"} required placeholder="••••••••" minLength={8} value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="bg-transparent border-none outline-none w-full text-slate-800" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600 ml-2 transition-colors">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-semibold text-slate-600">Confirm Password</label>
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                      <Lock size={18} className="text-slate-400 mr-3 shrink-0" /><input type={showConfirmPassword ? "text" : "password"} required placeholder="••••••••" minLength={8} value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="bg-transparent border-none outline-none w-full text-slate-800" /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-slate-400 hover:text-slate-600 ml-2 transition-colors">{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-4 rounded-lg transition-colors mt-2 shadow-sm flex justify-center items-center">
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}