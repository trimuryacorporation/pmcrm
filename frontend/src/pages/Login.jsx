import { LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(event) {
    event.preventDefault();
    if (!email || !password) return toast.error('Email and password are required');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,.45),transparent_28%),radial-gradient(circle_at_70%_35%,rgba(124,58,237,.35),transparent_28%),linear-gradient(135deg,#0f172a,#111827_55%,#1e1b4b)]" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">Enterprise CRM</h1>
            </div>
            <div className="max-w-2xl">
              <h2 className="text-5xl font-black leading-tight">Enterprise operations for projects, talent, vendors, tasks, and payments.</h2>
              <p className="mt-5 text-lg text-slate-200">One secure workspace for managers, employees, vendors, freelancers, and candidates.</p>
            </div>
            <div />
          </div>
        </section>
        <section className="grid place-items-center bg-slate-50 p-6">
          <form onSubmit={submit} className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase text-indigo-600">Secure Login</p>
              <h2 className="mt-1 text-3xl font-bold text-slate-950">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-500">Use your account credentials to continue.</p>
            </div>
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Email</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
                <Mail className="h-4 w-4 text-slate-400" />
                <input className="w-full outline-none" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </label>
            <label className="mb-6 block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Password</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
                <LockKeyhole className="h-4 w-4 text-slate-400" />
                <input className="w-full outline-none" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </label>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Login to CRM'}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
