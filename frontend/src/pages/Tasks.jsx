import { Download, Eye, FileText, FolderOpen, ListChecks, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModalForm from '../components/ModalForm.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { endpoints, SERVER_URL } from '../utils/api.js';
import useReferenceOptions from '../hooks/useReferenceOptions.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LANGUAGE_OPTIONS } from '../data/formOptions.js';

const statuses = ['To Do', 'In Progress', 'Review', 'Completed'];
const formatRate = (amount, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount || 0);
const taskFields = (references) => [
  ['title', 'Task Title'],
  ['languages', 'Languages', 'multicombobox', LANGUAGE_OPTIONS],
  ['assignedToType', 'Assigned To Type', 'select', ['Employee', 'Vendor', 'Freelancer', 'Candidate']],
  ['assignee', 'Assigned To', 'taskAssignee', references],
  ['languageTeamCounts', 'Selected Language Team Count', 'taskLanguageTeamCounts', references],
  ['dueDate', 'Due Date', 'date'],
  ['priority', 'Priority', 'select', ['Low', 'Medium', 'High', 'Urgent']],
  ['status', 'Status', 'select', statuses],
  ['description', 'Description', 'textarea']
];

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [folders, setFolders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [folderEditing, setFolderEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin', 'employee'].includes(user?.role);
  const references = useReferenceOptions(canManage ? ['projects', 'employees', 'vendors', 'freelancers', 'candidates'] : []);

  async function load() {
    const [taskData, folderData] = await Promise.all([endpoints.list('tasks'), endpoints.list('task-folders')]);
    setTasks(taskData.items || []);
    setFolders(folderData.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  const folderTasks = useMemo(() => new Map(
    folders.map((folder) => [String(folder._id), tasks.filter((task) => String(task.folder?._id || task.folder) === String(folder._id))])
  ), [folders, tasks]);

  async function save(payload) {
    try {
      const data = { ...payload, folder: payload.folder?._id || payload.folder };
      if (payload._id) await endpoints.update('tasks', payload._id, data);
      else await endpoints.create('tasks', data);
      toast.success('Task saved');
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveFolder(payload) {
    try {
      const data = { ...payload, project: payload.project?._id || payload.project };
      if (payload._id) await endpoints.update('task-folders', payload._id, data);
      else await endpoints.create('task-folders', data);
      toast.success(payload._id ? 'Folder updated' : 'Folder created');
      setFolderEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function confirmRemove() {
    if (!deleting) return;
    setDeleteSaving(true);
    try {
      if (deleting.type === 'folder') {
        const relatedTasks = folderTasks.get(String(deleting.item._id)) || [];
        await Promise.all(relatedTasks.map((task) => endpoints.remove('tasks', task._id)));
        await endpoints.remove('task-folders', deleting.item._id);
      } else {
        await endpoints.remove('tasks', deleting.item._id);
      }
      toast.success(`${deleting.type === 'folder' ? 'Folder' : 'Task'} deleted`);
      setDeleting(null);
      load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleteSaving(false);
    }
  }

  function actionButton(label, Icon, onClick, tone = 'default') {
    const colors = tone === 'danger' ? 'text-rose-600 hover:border-rose-200 hover:bg-rose-50' : 'text-slate-500 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700';
    return <button type="button" aria-label={label} title={label} onClick={onClick} className={`rounded-md border border-transparent p-1.5 transition ${colors}`}><Icon className="h-4 w-4" /></button>;
  }

  return (
    <>
      <PageHeader
        title="Project Tasks"
        action={
          canManage && <button className="btn-primary" onClick={() => setFolderEditing({})}>
            <Plus className="h-4 w-4" />
            Create Folder
          </button>
        }
      >
        Create a folder first, then add the related tasks inside it.
      </PageHeader>
      <div className="space-y-4">
        {folders.map((folder) => {
          const tasksInFolder = folderTasks.get(String(folder._id)) || [];
          return (
          <details key={folder._id} className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-slate-50 px-4 py-3 marker:hidden hover:bg-indigo-50">
              <div className="flex min-w-0 items-center gap-3">
                <FolderOpen className="h-5 w-5 shrink-0 text-indigo-600" />
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-900">{folder.project?.name || folder.name}</h3>
                  <p className="text-xs text-slate-500">Task folder</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{tasksInFolder.length} task{tasksInFolder.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center rounded-md bg-white ring-1 ring-slate-200">
                  {actionButton('View folder', Eye, (event) => { event.preventDefault(); event.stopPropagation(); setViewing({ type: 'folder', item: folder }); })}
                  {canManage && actionButton('Edit folder', Pencil, (event) => { event.preventDefault(); event.stopPropagation(); setFolderEditing(folder); })}
                  {canManage && actionButton('Delete folder', Trash2, (event) => { event.preventDefault(); event.stopPropagation(); setDeleting({ type: 'folder', item: folder }); }, 'danger')}
                </div>
              </div>
            </summary>
            <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {folder.project && <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-4 sm:col-span-2 xl:col-span-3">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <h4 className="font-bold text-slate-900">{folder.project.name}</h4>
                      {folder.project.code && <span className="text-xs font-semibold text-indigo-700">{folder.project.code}</span>}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{folder.project.description || folder.project.notes || 'No project description added.'}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      {folder.project.status && <span><strong>Status:</strong> {folder.project.status}</span>}
                      {folder.project.endDate && <span><strong>Deadline:</strong> {new Date(folder.project.endDate).toLocaleDateString()}</span>}
                      {folder.project.vendorRate !== undefined && <span><strong>Vendor Rate:</strong> {formatRate(folder.project.vendorRate, folder.project.currency)}</span>}
                      {folder.project.freelancerRate !== undefined && <span><strong>Freelancer Rate:</strong> {formatRate(folder.project.freelancerRate, folder.project.currency)}</span>}
                    </div>
                    <div className="mt-4 border-t border-indigo-100 pt-3">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Project PDFs & Documents</p>
                      <div className="flex flex-wrap gap-2">
                        {(folder.project.files || []).map((file, index) => file.key ? (
                          <button key={file.key} type="button" onClick={() => endpoints.downloadProjectFile(folder.project._id, index, file.name).catch((error) => toast.error(error.message))} className="inline-flex max-w-full items-center gap-2 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:border-indigo-400">
                            <FileText className="h-4 w-4 shrink-0" /><span className="truncate">{file.name}</span><Download className="h-4 w-4 shrink-0" />
                          </button>
                        ) : (
                          <a key={file.url || index} href={file.url?.startsWith('http') ? file.url : `${SERVER_URL}${file.url}`} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-2 rounded-md border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:border-indigo-400">
                            <FileText className="h-4 w-4 shrink-0" /><span className="truncate">{file.name}</span><Download className="h-4 w-4 shrink-0" />
                          </a>
                        ))}
                        {!folder.project.files?.length && <span className="text-sm text-slate-500">No PDF or document uploaded for this project.</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>}
              {canManage && <button onClick={() => setEditing({ folder: folder._id, status: 'To Do' })} className="flex min-h-36 flex-col items-center justify-center rounded-lg border-2 border-dashed border-indigo-200 bg-indigo-50 p-4 text-center text-indigo-700 hover:border-indigo-400 hover:bg-indigo-100">
                <Plus className="h-5 w-5" />
                <span className="mt-2 font-semibold">Add Task</span>
                <span className="mt-1 text-xs text-indigo-500">Add a task to this folder</span>
              </button>}
              {tasksInFolder.map((task) => (
                <article key={task._id} className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-300 hover:shadow">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <div className="flex items-center gap-1">
                      <StatusBadge value={task.priority} />
                      <div className="flex rounded-md border border-slate-100 bg-slate-50">
                        {actionButton('View task', Eye, () => setViewing({ type: 'task', item: task }))}
                        {canManage && actionButton('Edit task', Pencil, () => setEditing(task))}
                        {canManage && actionButton('Delete task', Trash2, () => setDeleting({ type: 'task', item: task }), 'danger')}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{task.description || 'Sample task'}</p>
                  {task.languages?.length > 0 && <p className="mt-2 line-clamp-1 text-xs font-medium text-indigo-600">Languages: {task.languages.join(', ')}</p>}
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs font-medium text-slate-400">
                    <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                    <span className="flex items-center gap-1 text-slate-500"><ListChecks className="h-3.5 w-3.5" />{task.status}</span>
                  </div>
                </article>
              ))}
              {!tasksInFolder.length && !canManage && <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No tasks in this folder</div>}
            </div>
          </details>
          );
        })}
        {!folders.length && <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No folders yet. Create a folder to begin adding tasks.</div>}
      </div>
      {editing && <ModalForm title="Task" fields={canManage ? taskFields(references) : [['status', 'Status', 'select', statuses]]} requiredFields={canManage ? ['title'] : ['status']} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />}
      {folderEditing && <ModalForm title={folderEditing._id ? 'Edit Task Folder' : 'Create Task Folder'} fields={[['project', 'Project', 'select', references.projects]]} requiredFields={['project']} initial={folderEditing} onClose={() => setFolderEditing(null)} onSubmit={saveFolder} />}
      {viewing && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-[2px]">
        <section role="dialog" aria-modal="true" aria-labelledby="task-view-title" className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 id="task-view-title" className="text-lg font-bold text-slate-950">{viewing.type === 'folder' ? 'Folder Details' : 'Task Details'}</h2>
            <button type="button" aria-label="Close" onClick={() => setViewing(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-4 p-5 text-sm">
            {viewing.type === 'folder' ? <>
              <div><p className="text-xs font-bold uppercase text-slate-500">Project</p><p className="mt-1 font-semibold text-slate-900">{viewing.item.project?.name || viewing.item.name}</p></div>
              {viewing.item.project?.code && <div><p className="text-xs font-bold uppercase text-slate-500">Project Code</p><p className="mt-1 text-slate-700">{viewing.item.project.code}</p></div>}
              {viewing.item.project?.vendorRate !== undefined && <div><p className="text-xs font-bold uppercase text-slate-500">Vendor Rate</p><p className="mt-1 text-slate-700">{formatRate(viewing.item.project.vendorRate, viewing.item.project.currency)}</p></div>}
              {viewing.item.project?.freelancerRate !== undefined && <div><p className="text-xs font-bold uppercase text-slate-500">Freelancer Rate</p><p className="mt-1 text-slate-700">{formatRate(viewing.item.project.freelancerRate, viewing.item.project.currency)}</p></div>}
              <div><p className="text-xs font-bold uppercase text-slate-500">Description</p><p className="mt-1 leading-6 text-slate-700">{viewing.item.project?.description || viewing.item.project?.notes || 'No project description added.'}</p></div>
            </> : <>
              <div><p className="text-xs font-bold uppercase text-slate-500">Task</p><p className="mt-1 font-semibold text-slate-900">{viewing.item.title}</p></div>
              <div className="flex flex-wrap gap-2"><StatusBadge value={viewing.item.status} /><StatusBadge value={viewing.item.priority} /></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Description</p><p className="mt-1 leading-6 text-slate-700">{viewing.item.description || 'No description added.'}</p></div>
              <div><p className="text-xs font-bold uppercase text-slate-500">Languages</p><p className="mt-1 text-slate-700">{viewing.item.languages?.length ? viewing.item.languages.join(', ') : 'No languages selected'}</p></div>
              {viewing.item.languageTeamCounts?.length > 0 && <div><p className="text-xs font-bold uppercase text-slate-500">Language-wise Team Count</p><p className="mt-1 text-slate-700">{viewing.item.languageTeamCounts.map((item) => `${item.language}: ${item.teamCount}`).join(', ')}</p></div>}
              <div><p className="text-xs font-bold uppercase text-slate-500">Due Date</p><p className="mt-1 text-slate-700">{viewing.item.dueDate ? new Date(viewing.item.dueDate).toLocaleDateString() : 'No due date'}</p></div>
            </>}
          </div>
        </section>
      </div>}
      {deleting && <ConfirmDialog title={`Delete ${deleting.type === 'folder' ? 'folder' : 'task'}?`} message={deleting.type === 'folder' ? 'This will also delete all tasks inside this folder. This action cannot be undone.' : 'This action cannot be undone.'} confirming={deleteSaving} onCancel={() => setDeleting(null)} onConfirm={confirmRemove} />}
    </>
  );
}
