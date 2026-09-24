import { ArrowLeft, Mail } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { endpoints } from '../utils/api.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setSending(true);
    try { await endpoints.forgotPassword(email.trim()); setSent(true); toast.success('If an active account exists, a reset link has been sent.'); }
    catch (error) { toast.error(error.message); }
    finally { setSending(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
    <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-indigo-600" to="/login"><ArrowLeft className="h-4 w-4" /> Back to login</Link>
    <p className="mt-7 text-sm font-semibold uppercase text-indigo-600">Password recovery</p><h1 className="mt-1 text-3xl font-bold text-slate-950">Forgot password?</h1>
    <p className="mt-2 text-sm text-slate-500">Enter your email and we’ll send a secure password-reset link.</p>
    {sent ? <div className="mt-7 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">If an active account exists for <strong>{email}</strong>, a reset link has been sent. Check your inbox.</div> : <form className="mt-7" onSubmit={submit}><label className="block"><span className="mb-1 block text-sm font-semibold text-slate-700">Email</span><div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-100"><Mail className="h-4 w-4 text-slate-400" /><input className="w-full outline-none" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div></label><button className="btn-primary mt-6 w-full" disabled={sending}>{sending ? 'Sending link...' : 'Send reset link'}</button></form>}
  </section></main>;
}