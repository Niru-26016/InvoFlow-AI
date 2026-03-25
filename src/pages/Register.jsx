import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Eye, EyeOff, ArrowRight, Building, Landmark, ShoppingCart } from 'lucide-react';

const roles = [
  { value: 'msme', label: 'MSME', description: 'Upload invoices & get funding', icon: Building },
  { value: 'funder', label: 'Funder', description: 'Fund invoices & earn returns', icon: Landmark },
  { value: 'buyer', label: 'Buyer', description: 'Confirm & pay invoices', icon: ShoppingCart },
];

export default function Register() {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', role: '', companyName: '', gstin: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedTheme = localStorage.getItem('invoflow-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!form.role) {
      setError('Please select a role');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await register(form.email, form.password, form.role, form.companyName, form.gstin);
      const routes = { msme: '/msme', funder: '/funder', buyer: '/buyer' };
      navigate(routes[form.role]);
    } catch (err) {
      setError(err.message?.includes('already') ? 'Email already in use' : 'Registration failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-8" style={{ background: 'var(--th-bg)' }}>
      {/* Background effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md mx-4 animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mb-4 glow-primary">
            <Zap size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: 'var(--th-text)' }}>Join InvoFlow</h1>
          <p className="mt-2" style={{ color: 'var(--th-text-muted)' }}>Start financing in minutes</p>
        </div>

        {/* Form */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--th-text)' }}>Create your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--th-text-secondary)' }}>I am a...</label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => updateForm('role', role.value)}
                    className="p-3 rounded-xl border text-center transition-all"
                    style={{
                      background: form.role === role.value ? 'rgba(99, 102, 241, 0.1)' : 'var(--th-bg-input)',
                      borderColor: form.role === role.value ? 'rgba(99, 102, 241, 0.3)' : 'var(--th-border)',
                      color: form.role === role.value ? 'var(--color-primary-500)' : 'var(--th-text-muted)',
                    }}
                  >
                    <role.icon size={20} className="mx-auto mb-1" />
                    <p className="text-xs font-semibold">{role.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--th-text-secondary)' }}>Company Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => updateForm('companyName', e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                style={{ background: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                placeholder="Enter company name"
              />
            </div>

            {form.role === 'msme' && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--th-text-secondary)' }}>GSTIN</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => updateForm('gstin', e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  style={{ background: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                  placeholder="e.g. 33ABCDE1234F1Z5"
                  maxLength={15}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--th-text-secondary)' }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateForm('email', e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                style={{ background: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--th-text-secondary)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => updateForm('password', e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 pr-12"
                  style={{ background: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--th-text-faint)' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--th-text-secondary)' }}>Confirm Password</label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateForm('confirmPassword', e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                style={{ background: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl gradient-primary text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--th-text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
