import { ArrowLeft, Building2, CheckCircle2, ChevronRight, LoaderCircle, ShieldCheck, UserCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EXPERIENCE_OPTIONS, LANGUAGE_OPTIONS, PROJECT_TYPE_OPTIONS, availabilityOptions } from '../data/formOptions.js';
import { endpoints } from '../utils/api.js';
import MultiSearchableSelect from '../components/MultiSearchableSelect.jsx';
import LanguageTeamCounts from '../components/LanguageTeamCounts.jsx';

const profiles = {
  candidate: { title: 'Candidate', icon: UserCheck, description: 'Create your candidate profile and share your skills.' },
  vendor: { title: 'Vendor / Agency', icon: Building2, description: 'Register your agency, capacity and language coverage.' },
  freelancer: { title: 'Freelancer', icon: Users, description: 'Create your professional freelancer profile.' }
};

const requiredFields = {
  candidate: ['fullName', 'email', 'mobile', 'location', 'language', 'experience', 'availabilityStatus', 'candidateType'],
  vendor: ['agencyName', 'contactPerson', 'email', 'phone', 'address', 'location', 'languagesAvailable', 'projectTypes', 'teamCapacity', 'dailyProductionCapacity', 'rate'],
  freelancer: ['name', 'email', 'phone', 'location', 'language', 'projectTypes', 'experience', 'availability']
};

export default function Onboarding() {
  const [params, setParams] = useSearchParams();
  const initialType = params.get('type');
  const [type, setType] = useState(profiles[initialType] ? initialType : '');
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function chooseType(nextType) { setType(nextType); setForm({}); setError(''); setParams({ type: nextType }); }
  function setValue(name, value) { setForm((current) => ({ ...current, [name]: value })); }
  async function submit(event) {
    event.preventDefault(); setSubmitting(true); setError('');
    const missing = requiredFields[type].find((field) => {
      const value = form[field];
      return value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length);
    });
    if (missing) { setError(`Please complete every required field before submitting. Missing: ${missing.replace(/([A-Z])/g, ' $1')}.`); setSubmitting(false); return; }
    if (['vendor', 'freelancer'].includes(type)) {
      const languages = type === 'vendor' ? form.languagesAvailable : form.language;
      const counts = form.languageTeamCounts || [];
      if (counts.length !== languages.length || counts.some((item) => !Number.isFinite(Number(item.teamCount)) || Number(item.teamCount) < 0)) { setError('Enter a team count for every selected language.'); setSubmitting(false); return; }
    }
    try { const result = await endpoints.onboard({ ...form, type }); setMessage(result.message); }
    catch (requestError) { setError(requestError.message); }
    finally { setSubmitting(false); }
  }

  const profile = profiles[type];
  return <main className="min-h-screen bg-slate-950"><div className="absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_25%_0%,rgba(59,130,246,.5),transparent_32%),radial-gradient(circle_at_80%_15%,rgba(124,58,237,.45),transparent_28%)]" />
    <div className="relative mx-auto max-w-5xl p-5 sm:p-8"><header className="flex items-center justify-between py-3 text-white"><Link to="/login" className="flex items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to login</Link><span className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-indigo-300" /> Enterprise CRM</span></header>
      <section className="mt-8 text-center text-white"><p className="text-xs font-bold uppercase tracking-[.18em] text-indigo-200">Self-service onboarding</p><h1 className="mt-3 text-3xl font-black sm:text-5xl">Join the Enterprise CRM network</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-200 sm:text-base">Choose your profile type, complete your details, and submit your onboarding request securely.</p></section>
      {!type ? <TypeChooser onChoose={chooseType} /> : message ? <SuccessCard message={message} /> : <section className="mx-auto mt-10 max-w-3xl rounded-2xl bg-white p-6 shadow-2xl shadow-slate-950/30 sm:p-8"><button onClick={() => { setType(''); setParams({}); }} className="mb-6 text-sm font-semibold text-indigo-600 hover:text-indigo-700">← Change profile type</button><div className="mb-7 flex items-center gap-4 border-b border-slate-100 pb-6"><span className="grid h-12 w-12 place-items-center rounded-xl bg-indigo-50 text-indigo-600"><profile.icon className="h-6 w-6" /></span><div><h2 className="text-2xl font-black text-slate-950">{profile.title} onboarding</h2><p className="mt-1 text-sm text-slate-500">{profile.description}</p></div></div><form className="grid gap-5 sm:grid-cols-2" onSubmit={submit}><ProfileFields type={type} form={form} setValue={setValue} /><div className="sm:col-span-2"><p className="text-xs leading-5 text-slate-500">By submitting, you confirm that the details provided are accurate. {type !== 'candidate' && 'A password-setup link will be sent to your email.'}</p>{error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}<button className="btn-primary mt-5 h-11 w-full sm:w-auto" disabled={submitting}>{submitting ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Submitting...</> : <>Submit onboarding <ChevronRight className="h-4 w-4" /></>}</button></div></form></section>}
    </div></main>;
}

function TypeChooser({ onChoose }) { return <div className="mt-10 grid gap-4 md:grid-cols-3">{Object.entries(profiles).map(([key, profile]) => <button key={key} onClick={() => onChoose(key)} className="group rounded-2xl border border-white/15 bg-white/10 p-6 text-left text-white shadow-xl backdrop-blur transition hover:-translate-y-1 hover:border-indigo-300 hover:bg-white/15"><span className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-indigo-200 group-hover:bg-indigo-500 group-hover:text-white"><profile.icon className="h-6 w-6" /></span><h2 className="mt-6 text-xl font-bold">{profile.title}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{profile.description}</p><span className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-indigo-200">Continue <ChevronRight className="h-4 w-4" /></span></button>)}</div>; }

function ProfileFields({ type, form, setValue }) {
  const common = <><Input label="Email address" name="email" type="email" form={form} setValue={setValue} /><Input label="LinkedIn profile (optional)" name="linkedinUrl" required={false} form={form} setValue={setValue} /></>;
  const setLanguages = (field, languages) => {
    setValue(field, languages);
    setValue('languageTeamCounts', languages.map((language) => (form.languageTeamCounts || []).find((item) => item.language === language) || { language, teamCount: 0 }));
  };
  if (type === 'candidate') return <><Input label="Full name" name="fullName" required form={form} setValue={setValue} /><Input label="Mobile number" name="mobile" required form={form} setValue={setValue} />{common}<Input label="Location" name="location" form={form} setValue={setValue} /><Select label="Primary language" name="language" required options={LANGUAGE_OPTIONS} form={form} setValue={setValue} /><Select label="Experience" name="experience" options={EXPERIENCE_OPTIONS} form={form} setValue={setValue} /><Select label="Availability" name="availabilityStatus" options={availabilityOptions()} form={form} setValue={setValue} /><Select label="Candidate type" name="candidateType" options={['Individual', 'Team Member']} form={form} setValue={setValue} /><TextArea label="Notes (optional)" name="notes" form={form} setValue={setValue} /></>;
  if (type === 'vendor') return <><Input label="Agency / vendor name" name="agencyName" required form={form} setValue={setValue} /><Input label="Contact person" name="contactPerson" required form={form} setValue={setValue} />{common}<Input label="Phone number" name="phone" required form={form} setValue={setValue} /><Input label="Location" name="location" form={form} setValue={setValue} /><Input label="Address" name="address" form={form} setValue={setValue} /><div className="sm:col-span-2"><Multi label="Languages" name="languagesAvailable" options={LANGUAGE_OPTIONS} form={form} setValue={setValue} onChange={(languages) => setLanguages('languagesAvailable', languages)} /><div className="mt-3"><LanguageTeamCounts languages={form.languagesAvailable} value={form.languageTeamCounts} onChange={(value) => setValue('languageTeamCounts', value)} /></div></div><Multi label="Project types" name="projectTypes" options={PROJECT_TYPE_OPTIONS} form={form} setValue={setValue} /><Input label="Team capacity" name="teamCapacity" type="number" form={form} setValue={setValue} /><Input label="Daily production capacity" name="dailyProductionCapacity" form={form} setValue={setValue} /><Input label="Rate / pricing" name="rate" type="number" form={form} setValue={setValue} /><TextArea label="Notes (optional)" name="notes" form={form} setValue={setValue} /></>;
  return <><Input label="Full name" name="name" required form={form} setValue={setValue} />{common}<Input label="Phone number" name="phone" required form={form} setValue={setValue} /><Input label="Location" name="location" form={form} setValue={setValue} /><div className="sm:col-span-2"><Multi label="Languages" name="language" options={LANGUAGE_OPTIONS} form={form} setValue={setValue} onChange={(languages) => setLanguages('language', languages)} /><div className="mt-3"><LanguageTeamCounts languages={form.language} value={form.languageTeamCounts} onChange={(value) => setValue('languageTeamCounts', value)} /></div></div><Multi label="Project types" name="projectTypes" options={PROJECT_TYPE_OPTIONS} form={form} setValue={setValue} /><Select label="Experience" name="experience" options={EXPERIENCE_OPTIONS} form={form} setValue={setValue} /><Select label="Availability" name="availability" options={availabilityOptions()} form={form} setValue={setValue} /><Input label="Payment details (optional)" name="paymentDetails" form={form} setValue={setValue} /></>;
}

function Input({ label, name, type = 'text', required = true, form, setValue }) { return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-rose-500">*</span>}</span><input className="input h-11" name={name} type={type} required={required} value={form[name] ?? ''} onChange={(event) => setValue(name, type === 'number' ? Number(event.target.value) : event.target.value)} /></label>; }
function Select({ label, name, options, required = true, form, setValue }) { return <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}{required && <span className="ml-1 text-rose-500">*</span>}</span><select className="input h-11" required={required} value={form[name] || ''} onChange={(event) => setValue(name, event.target.value)}><option value="">Select {label}</option>{options.map((option) => { const item = typeof option === 'object' ? option : { value: option, label: option }; return <option key={item.value} value={item.value}>{item.label}</option>; })}</select></label>; }
function Multi({ label, name, options, form, setValue, onChange }) { return <div className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><MultiSearchableSelect value={form[name] || []} options={options} placeholder={`Search and select ${label.toLowerCase()}`} noResultsText={`No ${label.toLowerCase()} found`} onChange={(value) => (onChange || ((next) => setValue(name, next)))(value)} /><span className="mt-1 block text-xs text-slate-500">Search and click an option to add it. Use × to remove.</span></div>; }
function TextArea({ label, name, form, setValue }) { return <label className="block sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</span><textarea className="input min-h-24 resize-y" value={form[name] || ''} onChange={(event) => setValue(name, event.target.value)} /></label>; }
function SuccessCard({ message }) { return <section className="mx-auto mt-10 max-w-lg rounded-2xl bg-white p-8 text-center shadow-2xl shadow-slate-950/30"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></span><h2 className="mt-5 text-2xl font-black text-slate-950">Submission received</h2><p className="mt-3 text-sm leading-6 text-slate-600">{message}</p><Link className="btn-primary mt-7" to="/login">Go to CRM login</Link></section>; }
