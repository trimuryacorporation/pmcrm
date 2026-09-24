import { LocateFixed, MapPin, Pencil, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import ModalForm from '../components/ModalForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { endpoints } from '../utils/api.js';

const profileFields = [
  ['name', 'Full Name'],
  ['email', 'Email', 'email'],
  ['currentPassword', 'Current Password', 'password'],
  ['newPassword', 'New Password', 'password'],
  ['confirmPassword', 'Confirm New Password', 'password']
];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);

  async function saveProfile(payload) {
    if (payload.newPassword && payload.newPassword !== payload.confirmPassword) {
      toast.error('New password and confirmation do not match');
      return;
    }
    try {
      const data = await endpoints.updateProfile({
        name: payload.name,
        email: payload.email,
        currentPassword: payload.currentPassword,
        newPassword: payload.newPassword
      });
      updateUser(data.user);
      setEditing(false);
      toast.success(data.message);
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <>
      <PageHeader title="Profile" action={<button className="btn-primary" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit Profile</button>}>Your authenticated Trimurya Enterprise CRM session and role scope.</PageHeader>
      <div className="card max-w-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <UserRound className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-950">{user?.name}</h3>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>
        <div className="mt-6 rounded-lg bg-slate-50 p-4">
          <p className="flex items-center gap-2 font-semibold text-slate-800">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            {user?.role?.replace('_', ' ')}
          </p>
        </div>
        <div className="mt-4 rounded-lg border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-semibold text-slate-800"><MapPin className="h-5 w-5 text-indigo-600" />Live location</p>
              <p className="mt-1 text-sm text-slate-500">{user?.locationSharingEnabled ? 'Updating automatically while CRM is open' : 'Waiting for browser location permission'}</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700"><LocateFixed className="h-4 w-4" />Automatic</span>
          </div>
          {user?.lastLocation?.latitude && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm"><a className="font-medium text-indigo-600" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${user.lastLocation.latitude},${user.lastLocation.longitude}`}>View last reported location on map</a><span className="text-slate-400">{user.lastLocation.updatedAt ? new Date(user.lastLocation.updatedAt).toLocaleString() : ''}</span></div>
          )}
        </div>
      </div>
      {editing && <ModalForm title="Edit Profile" fields={profileFields} initial={{ name: user?.name || '', email: user?.email || '', currentPassword: '', newPassword: '', confirmPassword: '' }} requiredFields={['name', 'email']} onClose={() => setEditing(false)} onSubmit={saveProfile} />}
    </>
  );
}
