import { Clock3, MapPin, MonitorSmartphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import Loading from '../components/Loading.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { endpoints } from '../utils/api.js';

export default function Activity() {
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([endpoints.activeUsers(), endpoints.activity(), endpoints.deliveryLogs()]).then(([users, activity, deliveries]) => setData({ users: users.items || [], activity: activity.items || [], deliveries: deliveries.items || [] }));
  }, []);

  if (!data) return <Loading label="Loading user activity..." />;

  return (
    <>
      <PageHeader title="User Activity Monitor">Login presence, device metadata, consented locations, and auditable CRM actions.</PageHeader>
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 p-5"><h3 className="font-bold text-slate-950">Users and Presence</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50"><tr>{['User', 'Role', 'Last login', 'Last active', 'Location', 'Status'].map((label) => <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.map((user) => {
                const online = user.lastSeenAt && Date.now() - new Date(user.lastSeenAt).getTime() < 120000;
                return <tr key={user._id}>
                  <td className="px-4 py-3"><p className="font-semibold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td>
                  <td className="px-4 py-3"><StatusBadge value={user.role?.replace('_', ' ')} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '-'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : '-'}</td>
                  <td className="px-4 py-3">{user.locationSharingEnabled && user.lastLocation?.latitude ? <a className="inline-flex items-center gap-1 font-medium text-indigo-600" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${user.lastLocation.latitude},${user.lastLocation.longitude}`}><MapPin className="h-4 w-4" />Map</a> : <span className="text-slate-400">Not shared</span>}</td>
                  <td className="px-4 py-3"><StatusBadge value={online ? 'Online' : user.isActive ? 'Offline' : 'Inactive'} /></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card mt-6 p-5">
        <h3 className="flex items-center gap-2 font-bold text-slate-950"><Clock3 className="h-5 w-5 text-indigo-600" />Audit Trail</h3>
        <div className="mt-4 divide-y divide-slate-100">
          {data.activity.map((entry) => <div key={entry._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div><p className="font-semibold text-slate-800">{entry.userName || 'System'} · {entry.action} {entry.resource}</p><p className="text-sm text-slate-500">{entry.summary || entry.resourceId || 'Session activity'}</p></div>
            <div className="text-right"><p className="flex items-center gap-1 text-xs text-slate-500"><MonitorSmartphone className="h-3.5 w-3.5" />{entry.ipAddress || '-'}</p><p className="mt-1 text-xs text-slate-400">{new Date(entry.occurredAt).toLocaleString()}</p></div>
          </div>)}
          {!data.activity.length && <p className="py-8 text-center text-sm text-slate-500">No tracked activity yet.</p>}
        </div>
      </div>
      <div className="card mt-6 overflow-hidden">
        <div className="border-b border-slate-200 p-5"><h3 className="font-bold text-slate-950">Notification Deliveries</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50"><tr>{['Project', 'Recipient', 'Type', 'Channel', 'Destination', 'Status', 'Time'].map((label) => <th key={label} className="px-4 py-3 text-left font-semibold text-slate-600">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.deliveries.map((item) => <tr key={item._id}>
                <td className="px-4 py-3 font-semibold text-slate-800">{item.project?.name || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{item.recipientName}</td>
                <td className="px-4 py-3 text-slate-600">{item.recipientType}</td>
                <td className="px-4 py-3 capitalize text-slate-600">{item.channel}</td>
                <td className="px-4 py-3 text-slate-600">{item.destination || '-'}</td>
                <td className="px-4 py-3"><StatusBadge value={item.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{new Date(item.createdAt).toLocaleString()}</td>
              </tr>)}
              {!data.deliveries.length && <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No delivery attempts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
