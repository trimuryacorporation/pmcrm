import { ListChecks, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModalForm from '../components/ModalForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { endpoints } from '../utils/api.js';
import useReferenceOptions from '../hooks/useReferenceOptions.js';
import { useAuth } from '../context/AuthContext.jsx';

const statuses = ['To Do', 'In Progress', 'Review', 'Completed'];
const taskFields = (references) => [
  ['title', 'Task Title'],
  ['project', 'Project', 'select', references.projects],
  ['assignedToType', 'Assigned To Type', 'select', ['Employee', 'Vendor', 'Freelancer', 'Candidate']],
  ['employee', 'Employee', 'select', references.employees],
  ['vendor', 'Vendor', 'select', references.vendors],
  ['freelancer', 'Freelancer', 'select', references.freelancers],
  ['candidate', 'Candidate', 'select', references.candidates],
  ['dueDate', 'Due Date', 'date'],
  ['priority', 'Priority', 'select', ['Low', 'Medium', 'High', 'Urgent']],
  ['status', 'Status', 'select', statuses],
  ['description', 'Description', 'textarea']
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [editing, setEditing] = useState(null);
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin'].includes(user?.role);
  const references = useReferenceOptions(canManage ? ['projects', 'employees', 'vendors', 'freelancers', 'candidates'] : []);

  async function load() {
    const data = await endpoints.list('tasks');
    setTasks(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => Object.fromEntries(statuses.map((status) => [status, tasks.filter((task) => task.status === status)])), [tasks]);

  async function save(payload) {
    try {
      if (payload._id) await endpoints.update('tasks', payload._id, payload);
      else await endpoints.create('tasks', payload);
      toast.success('Task saved');
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Tasks / Kanban Board"
        action={
          canManage && <button className="btn-primary" onClick={() => setEditing({ status: 'To Do' })}>
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        }
      >
        Track project work across list-ready task cards, deadlines, priorities, comments, and attachments.
      </PageHeader>
      <div className="grid gap-4 xl:grid-cols-4">
        {statuses.map((status) => (
          <section key={status} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-bold text-slate-800">
                <ListChecks className="h-4 w-4 text-indigo-600" />
                {status}
              </h3>
              <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500">{grouped[status].length}</span>
            </div>
            <div className="space-y-3">
              {grouped[status].map((task) => (
                <button key={task._id} onClick={() => setEditing(task)} className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-indigo-200">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <StatusBadge value={task.priority} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{task.description || task.project?.name}</p>
                  <p className="mt-3 text-xs font-medium text-slate-400">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</p>
                </button>
              ))}
              {!grouped[status].length && <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Empty state</div>}
            </div>
          </section>
        ))}
      </div>
      {editing && <ModalForm title="Task" fields={canManage ? taskFields(references) : [['status', 'Status', 'select', statuses]]} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />}
    </>
  );
}
