import { LockKeyhole } from 'lucide-react';
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
  const [password, setPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invite token is missing');
      return;
    }
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

  if (!invite && !error) return <main className="grid min-h-screen place-items-center bg-slate-50"><Loading label="Checking invite..." /></main>;

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
        {error ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Invite unavailable</h1>
            <p className="mt-3 text-sm text-slate-600">{error}</p>
            <Link className="btn-secondary mt-6 inline-flex" to="/login">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="text-sm font-semibold uppercase text-indigo-600">Account setup</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-950">Set your password</h1>
            <p className="mt-2 text-sm text-slate-500">Welcome, {invite.name}. Create a password for {invite.email}.</p>
            <label className="mt-7 block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">New password</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
                <LockKeyhole className="h-4 w-4 text-slate-400" />
                <input className="w-full outline-none" type="password" minLength="8" required value={password} onChange={(event) => setPasswordValue(event.target.value)} />
              </div>
            </label>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Confirm password</span>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100">
                <LockKeyhole className="h-4 w-4 text-slate-400" />
                <input className="w-full outline-none" type="password" minLength="8" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
            </label>
            <button className="btn-primary mt-6 w-full" disabled={saving}>{saving ? 'Saving...' : 'Set password'}</button>
          </form>
        )}
      </section>
    </main>
  );
}
