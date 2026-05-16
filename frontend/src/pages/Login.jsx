import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';
import { Activity, CheckCircle, TrendingUp, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Demo@123'); // Pre-filled for demo
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(`${apiUrl}/api/auth/login`, { email, password });
      
      login(res.data.user, res.data.token);
      toast.success('Signed in successfully');
      
      if (res.data.user.role === 'admin') navigate('/admin');
      else if (res.data.user.role === 'manager') navigate('/manager');
      else navigate('/employee');
      
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side: Hero / Landing */}
      <div className="hidden lg:flex lg:w-3/5 bg-primary relative overflow-hidden flex-col justify-between p-12 text-white">
        {/* Background Decorative Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="absolute w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-accent rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500 rounded-full blur-3xl opacity-20"></div>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 bg-accent text-white rounded-xl flex items-center justify-center shadow-lg">
            <Activity size={28} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">GoalPulse</h1>
        </div>

        <div className="relative z-10 max-w-xl my-12">
          <h2 className="text-5xl font-extrabold leading-tight mb-6">
            Align your workforce.<br />
            <span className="text-accent">Accelerate your growth.</span>
          </h2>
          <p className="text-xl text-blue-100 mb-10 leading-relaxed">
            GoalPulse is the next-generation OKR and performance management platform designed to keep your entire organization synchronized, focused, and executing on what matters most.
          </p>
          
          <div className="space-y-5">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="p-2 bg-success text-white rounded-lg"><CheckCircle size={24} /></div>
              <div>
                <h3 className="font-semibold text-lg">Goal Transparency</h3>
                <p className="text-sm text-blue-200">Cascade organizational objectives directly to individual contributors.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="p-2 bg-warning-dark text-white rounded-lg"><TrendingUp size={24} /></div>
              <div>
                <h3 className="font-semibold text-lg">Real-time Check-ins</h3>
                <p className="text-sm text-blue-200">Track progress organically through quarterly check-ins and pulse scores.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="p-2 bg-purple-500 text-white rounded-lg"><Users size={24} /></div>
              <div>
                <h3 className="font-semibold text-lg">Automated Governance</h3>
                <p className="text-sm text-blue-200">Stay compliant with automated cron-based escalations for missed deadlines.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-blue-200">
          &copy; {new Date().getFullYear()} GoalPulse Inc. All rights reserved.
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="w-full lg:w-2/5 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-gray-50/50">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center">
              <Activity size={24} />
            </div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">GoalPulse</h1>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-xl shadow-blue-900/5 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
            <p className="text-gray-500 mb-8">Please sign in to your account to continue.</p>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Work Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900"
                  placeholder="name@company.com"
                  required
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Password</label>
                  <a href="#" className="text-sm text-primary font-medium hover:underline">Forgot password?</a>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-gray-900"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-[#152a46] text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 disabled:opacity-70 shadow-md shadow-primary/20 mt-2"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            
            <div className="mt-8 pt-8 border-t border-gray-100">
              <div className="text-center mb-4">
                <span className="text-xs font-bold tracking-wider text-gray-400 uppercase">One-Click Demo Login</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button"
                  onClick={() => setEmail('employee@goalpulse.demo')} 
                  className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors border border-gray-200"
                >
                  Employee
                </button>
                <button 
                  type="button"
                  onClick={() => setEmail('manager@goalpulse.demo')} 
                  className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors border border-gray-200"
                >
                  Manager
                </button>
                <button 
                  type="button"
                  onClick={() => setEmail('admin@goalpulse.demo')} 
                  className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors border border-gray-200"
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
