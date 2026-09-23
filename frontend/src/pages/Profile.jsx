import { LocateFixed, MapPin, ShieldCheck, UserRound } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { endpoints } from '../utils/api.js';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [locating, setLocating] = useState(false);

  function enableLocation() {
    if (!navigator.geolocation) return toast.error('Geolocation is not supported by this browser');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const data = await endpoints.updateLocation({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy, enabled: true });
        updateUser(data);
        toast.success('Live location sharing enabled');
      } catch (error) {
        toast.error(error.message);
      } finally {
        setLocating(false);
      }
    }, () => {
      setLocating(false);
      toast.error('Location permission was not granted');
    }, { enableHighAccuracy: true, timeout: 15000 });
  }

  async function disableLocation() {
    const data = await endpoints.updateLocation({ enabled: false });
    updateUser(data);
    toast.success('Location sharing disabled');
  }
  return (
    <>
      <PageHeader title="Profile">Your authenticated Trimurya Enterprise CRM session and role scope.</PageHeader>
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
              <p className="mt-1 text-sm text-slate-500">{user?.locationSharingEnabled ? 'Sharing while CRM is open' : 'Location sharing is off'}</p>
            </div>
            {user?.locationSharingEnabled ? (
              <button className="btn-secondary" onClick={disableLocation}>Stop sharing</button>
            ) : (
              <button className="btn-primary" onClick={enableLocation} disabled={locating}><LocateFixed className="h-4 w-4" />{locating ? 'Locating...' : 'Enable location'}</button>
            )}
          </div>
          {user?.lastLocation?.latitude && (
            <a className="mt-3 block text-sm font-medium text-indigo-600" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${user.lastLocation.latitude},${user.lastLocation.longitude}`}>
              View last reported location on map
            </a>
          )}
        </div>
      </div>
    </>
  );
}
