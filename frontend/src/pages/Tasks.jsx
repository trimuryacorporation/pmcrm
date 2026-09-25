import { Download, FileText, FolderOpen, ListChecks, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModalForm from '../components/ModalForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { endpoints, SERVER_URL } from '../utils/api.js';
import useReferenceOptions from '../hooks/useReferenceOptions.js';
import { useAuth } from '../context/AuthContext.jsx';

const statuses = ['To Do', 'In Progress', 'Review', 'Completed'];
const taskFields = (references) => [
  ['title', 'Task Title'],
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
  const [folders, setFolders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [folderEditing, setFolderEditing] = useState(null);
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin'].includes(user?.role);
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
      if (payload._id) await endpoints.update('tasks', payload._id, payload);
      else await endpoints.create('tasks', payload);
      toast.success('Task saved');
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveFolder(payload) {
    try {
      await endpoints.create('task-folders', payload);
      toast.success('Folder created');
      setFolderEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
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
              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">{tasksInFolder.length} task{tasksInFolder.length !== 1 ? 's' : ''}</span>
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
                      {folder.project.clientName && <span><strong>Client:</strong> {folder.project.clientName}</span>}
                      {folder.project.status && <span><strong>Status:</strong> {folder.project.status}</span>}
                      {folder.project.endDate && <span><strong>Deadline:</strong> {new Date(folder.project.endDate).toLocaleDateString()}</span>}
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
                <button key={task._id} onClick={() => setEditing(task)} className="w-full rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm hover:border-indigo-300 hover:shadow">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <StatusBadge value={task.priority} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-500">{task.description || 'Sample task'}</p>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs font-medium text-slate-400">
                    <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}</span>
                    <span className="flex items-center gap-1 text-slate-500"><ListChecks className="h-3.5 w-3.5" />{task.status}</span>
                  </div>
                </button>
              ))}
              {!tasksInFolder.length && !canManage && <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No tasks in this folder</div>}
            </div>
          </details>
          );
        })}
        {!folders.length && <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">No folders yet. Create a folder to begin adding tasks.</div>}
      </div>
      {editing && <ModalForm title="Task" fields={canManage ? taskFields(references) : [['status', 'Status', 'select', statuses]]} requiredFields={canManage ? ['title'] : ['status']} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />}
      {folderEditing && <ModalForm title="Create Task Folder" fields={[['project', 'Project', 'select', references.projects]]} requiredFields={['project']} initial={folderEditing} onClose={() => setFolderEditing(null)} onSubmit={saveFolder} />}
    </>
  );
}
