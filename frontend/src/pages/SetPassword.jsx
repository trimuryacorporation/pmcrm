import { Check, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Loading from '../components/Loading.jsx';
import { endpoints } from '../utils/api.js';

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return setError('This account setup link is incomplete.');
    endpoints.validateInvite(token).then(setInvite).catch((requestError) => setError(requestError.message));
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    if (password !== confirmPassword) return toast.error('Passwords do not match');
    setSaving(true);
    try {
      const result = await endpoints.setPassword(token, password);
      toast.success(result.message);
      navigate('/login', { replace: true });
    } catch (requestError) {
      toast.error(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (!invite && !error) return <main className="grid min-h-screen place-items-center bg-slate-50"><Loading label="Verifying your secure invitation..." /></main>;

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(500px,0.9fr)]">
        <aside className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(59,130,246,.55),transparent_26%),radial-gradient(circle_at_78%_72%,rgba(124,58,237,.45),transparent_28%),linear-gradient(135deg,#0b1120,#111827_55%,#241153)]" />
          <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
            <div className="flex items-center gap-3 text-lg font-bold"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/20"><ShieldCheck className="h-5 w-5" /></span> Enterprise CRM</div>
            <div className="max-w-xl"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-indigo-100"><Sparkles className="h-4 w-4" /> Your workspace is ready</div><h1 className="text-5xl font-black leading-tight tracking-tight">One last step to get started.</h1><p className="mt-5 text-lg leading-8 text-slate-200">Create a secure password to access projects, talent, vendors, tasks and payments in one place.</p><div className="mt-10 space-y-4 text-sm text-slate-200">{['Your invitation is private and secure', 'Your password is never visible to our team', 'You can reset your password anytime'].map((item) => <div key={item} className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400/20 text-emerald-200"><Check className="h-4 w-4" /></span>{item}</div>)}</div></div>
            <p className="text-sm text-slate-400">© {new Date().getFullYear()} Trimurya Corporation</p>
          </div>
        </aside>
        <section className="grid place-items-center bg-slate-50 p-5 sm:p-8"><div className="w-full max-w-md"><div className="mb-8 flex items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white"><ShieldCheck className="h-5 w-5" /></span><span className="font-bold text-slate-950">Enterprise CRM</span></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 sm:p-8">{error ? <Unavailable error={error} /> : <form onSubmit={submit}><div className="mb-8"><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-600">Secure account setup</p><h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Welcome, {invite.name.split(' ')[0]}</h2><p className="mt-3 text-sm leading-6 text-slate-500">Set a password for your account. You’ll sign in with <span className="font-semibold text-slate-700">{invite.email}</span>.</p></div><div className="mb-6 flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-900"><Mail className="h-4 w-4 shrink-0" /><span>Invitation verified for your CRM account.</span></div><PasswordField label="Create password" value={password} onChange={setPassword} show={showPassword} setShow={setShowPassword} /><div className="mt-4"><PasswordField label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} show={showConfirmPassword} setShow={setShowConfirmPassword} /></div><p className="mt-3 text-xs leading-5 text-slate-500">Use at least 8 characters. A mix of letters, numbers and symbols is recommended.</p><button className="btn-primary mt-7 h-11 w-full" disabled={saving}>{saving ? 'Setting up your account...' : 'Set password and continue'}</button><p className="mt-5 text-center text-xs text-slate-500">Already have access? <Link className="font-semibold text-indigo-600 hover:text-indigo-700" to="/login">Go to login</Link></p></form>}</div></div></section>
      </div>
    </main>
  );
}

function PasswordField({ label, value, onChange, show, setShow }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-3 transition focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100"><LockKeyhole className="h-4 w-4 shrink-0 text-slate-400" /><input className="min-w-0 flex-1 bg-transparent text-sm text-slate-950 outline-none" type={show ? 'text' : 'password'} minLength="8" required value={value} autoComplete="new-password" onChange={(event) => onChange(event.target.value)} /><button className="text-slate-400 hover:text-slate-700" type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>;
}

function Unavailable({ error }) {
  return <div className="py-4 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-rose-100 text-rose-600"><LockKeyhole className="h-6 w-6" /></span><h1 className="mt-5 text-2xl font-black text-slate-950">Invitation unavailable</h1><p className="mt-3 text-sm leading-6 text-slate-600">{error}</p><Link className="btn-primary mt-7" to="/login">Back to login</Link></div>;
}
