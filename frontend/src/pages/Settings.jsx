import { CheckCircle2, ChevronDown, ChevronRight, Cloud, Mail, MessageCircle, Save, TestTube2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { endpoints } from '../utils/api.js';

export default function Settings() {
  const [storage, setStorage] = useState(null);
  const [communications, setCommunications] = useState(null);
  const [testTargets, setTestTargets] = useState({ email: '', whatsapp: '' });
  const [busy, setBusy] = useState('');
  const [expanded, setExpanded] = useState({ storage: true, email: false, whatsapp: false });

  useEffect(() => {
    Promise.all([endpoints.storageSettings(), endpoints.communicationSettings()])
      .then(([storageData, communicationData]) => {
        setStorage({ ...storageData, accessKeyId: '', secretAccessKey: '' });
        setCommunications(communicationData);
      })
      .catch((error) => toast.error(error.message));
  }, []);

  function setStorageValue(name, value) {
    setStorage((current) => ({ ...current, [name]: value }));
  }

  function setCommunication(channel, name, value) {
    setCommunications((current) => ({ ...current, [channel]: { ...current[channel], [name]: value } }));
  }

  function toggleSection(section) {
    setExpanded((current) => ({ ...current, [section]: !current[section] }));
  }

  async function execute(key, operation) {
    setBusy(key);
    try {
      const result = await operation();
      toast.success(result.message);
      if (key === 'storage-save') {
        const refreshed = await endpoints.storageSettings();
        setStorage({ ...refreshed, accessKeyId: '', secretAccessKey: '' });
      }
      if (key === 'communications-save') {
        const refreshed = await endpoints.communicationSettings();
        setCommunications(refreshed);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy('');
    }
  }

  if (!storage || !communications) return <Loading label="Loading secure settings..." />;

  return (
    <>
      <PageHeader title="Settings">Secure storage and outbound notification configuration.</PageHeader>

      <section className="card p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <button type="button" className="flex min-w-0 items-start gap-3 text-left" onClick={() => toggleSection('storage')} aria-expanded={expanded.storage}>
            {expanded.storage ? <ChevronDown className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" /> : <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />}
            <span><span className="flex items-center gap-2 text-lg font-bold text-slate-950"><Cloud className="h-5 w-5 text-indigo-600" />Cloudflare R2 Storage</span><span className="mt-1 block text-sm text-slate-500">Project documents are uploaded directly to this private bucket.</span></span>
          </button>
          <span className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">R2</span>
        </div>
        {expanded.storage && <><div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Account ID" value={storage.accountId} onChange={(value) => setStorageValue('accountId', value.trim())} />
          <Field label="Bucket Name" value={storage.bucket} onChange={(value) => setStorageValue('bucket', value.trim())} />
          <Field label="Access Key ID" type="password" value={storage.accessKeyId} placeholder={storage.accessKeyConfigured ? 'Configured - enter only to replace' : ''} onChange={(value) => setStorageValue('accessKeyId', value.trim())} />
          <Field label="Secret Access Key" type="password" value={storage.secretAccessKey} placeholder={storage.secretKeyConfigured ? 'Configured - enter only to replace' : ''} onChange={(value) => setStorageValue('secretAccessKey', value)} />
        </div>
        <Actions busy={busy} testKey="storage-test" saveKey="storage-save" onTest={() => execute('storage-test', () => endpoints.testStorageSettings(storage))} onSave={() => execute('storage-save', () => endpoints.saveStorageSettings(storage))} />
        </>}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <ChannelHeader icon={Mail} title="Email API (SMTP)" expanded={expanded.email} onExpand={() => toggleSection('email')} enabled={communications.email.enabled} onToggle={(value) => setCommunication('email', 'enabled', value)} />
          {expanded.email && <><div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="SMTP Host" value={communications.email.host} onChange={(value) => setCommunication('email', 'host', value.trim())} />
            <Field label="SMTP Port" type="number" value={communications.email.port} onChange={(value) => setCommunication('email', 'port', Number(value))} />
            <Field label="SMTP Username" value={communications.email.user} onChange={(value) => setCommunication('email', 'user', value.trim())} />
            <Field label="SMTP Password" type="password" value={communications.email.password} placeholder={communications.email.passwordConfigured ? 'Configured - enter only to replace' : ''} onChange={(value) => setCommunication('email', 'password', value)} />
            <Field label="From Address" value={communications.email.from} onChange={(value) => setCommunication('email', 'from', value)} />
            <label className="flex items-center gap-3 pt-6 text-sm font-semibold text-slate-700"><input type="checkbox" checked={communications.email.secure} onChange={(e) => setCommunication('email', 'secure', e.target.checked)} />Use implicit TLS (port 465)</label>
          </div>
          <div className="mt-4 flex gap-2"><input className="input" type="email" placeholder="Test recipient email" value={testTargets.email} onChange={(e) => setTestTargets((current) => ({ ...current, email: e.target.value }))} /><button className="btn-secondary shrink-0" disabled={Boolean(busy)} onClick={() => execute('email-test', () => endpoints.testEmail(testTargets.email))}><TestTube2 className="h-4 w-4" />{busy === 'email-test' ? 'Sending...' : 'Send Test'}</button></div></>}
        </section>

        <section className="card p-6">
          <ChannelHeader icon={MessageCircle} title="WhatsApp Cloud API" expanded={expanded.whatsapp} onExpand={() => toggleSection('whatsapp')} enabled={communications.whatsapp.enabled} onToggle={(value) => setCommunication('whatsapp', 'enabled', value)} />
          {expanded.whatsapp && <><div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field label="Phone Number ID" value={communications.whatsapp.phoneNumberId} onChange={(value) => setCommunication('whatsapp', 'phoneNumberId', value.trim())} />
            <Field label="API Version" value={communications.whatsapp.apiVersion} onChange={(value) => setCommunication('whatsapp', 'apiVersion', value.trim())} />
            <Field label="Permanent Access Token" type="password" value={communications.whatsapp.accessToken} placeholder={communications.whatsapp.tokenConfigured ? 'Configured - enter only to replace' : ''} onChange={(value) => setCommunication('whatsapp', 'accessToken', value)} />
            <Field label="Template Name" value={communications.whatsapp.templateName} onChange={(value) => setCommunication('whatsapp', 'templateName', value.trim())} />
            <Field label="Template Language" value={communications.whatsapp.templateLanguage} onChange={(value) => setCommunication('whatsapp', 'templateLanguage', value.trim())} />
            <Field label="Default Country Code" value={communications.whatsapp.countryCode} onChange={(value) => setCommunication('whatsapp', 'countryCode', value.replace(/\D/g, ''))} />
          </div>
          <div className="mt-4 flex gap-2"><input className="input" placeholder="Test WhatsApp number" value={testTargets.whatsapp} onChange={(e) => setTestTargets((current) => ({ ...current, whatsapp: e.target.value }))} /><button className="btn-secondary shrink-0" disabled={Boolean(busy)} onClick={() => execute('whatsapp-test', () => endpoints.testWhatsApp(testTargets.whatsapp))}><TestTube2 className="h-4 w-4" />{busy === 'whatsapp-test' ? 'Sending...' : 'Send Test'}</button></div></>}
        </section>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-indigo-900"><CheckCircle2 className="h-5 w-5" />Credentials are encrypted and never returned to the browser.</p>
        <button className="btn-primary shrink-0" disabled={Boolean(busy)} onClick={() => execute('communications-save', () => endpoints.saveCommunicationSettings(communications))}><Save className="h-4 w-4" />{busy === 'communications-save' ? 'Saving...' : 'Save Notification APIs'}</button>
      </div>
    </>
  );
}

function Field({ label, value = '', onChange, type = 'text', placeholder = '' }) {
  return <label><span className="mb-1 block text-sm font-semibold text-slate-700">{label}</span><input className="input" type={type} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function ChannelHeader({ icon: Icon, title, expanded, onExpand, enabled, onToggle }) {
  return <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-5"><button type="button" onClick={onExpand} className="flex items-center gap-2 text-left text-lg font-bold text-slate-950" aria-expanded={expanded}>{expanded ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}<Icon className="h-5 w-5 text-indigo-600" />{title}</button><label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} />Enabled</label></div>;
}

function Actions({ busy, testKey, saveKey, onTest, onSave }) {
  return <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 pt-5"><button className="btn-secondary" disabled={Boolean(busy)} onClick={onTest}><TestTube2 className="h-4 w-4" />{busy === testKey ? 'Testing...' : 'Test Connection'}</button><button className="btn-primary" disabled={Boolean(busy)} onClick={onSave}><Save className="h-4 w-4" />{busy === saveKey ? 'Saving...' : 'Verify & Save'}</button></div>;
}
