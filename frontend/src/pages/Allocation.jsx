import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable.jsx';
import Loading from '../components/Loading.jsx';
import ModalForm from '../components/ModalForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { endpoints } from '../utils/api.js';
import useReferenceOptions from '../hooks/useReferenceOptions.js';
import { useAuth } from '../context/AuthContext.jsx';
import { LANGUAGE_OPTIONS } from '../data/formOptions.js';

const allocationFields = (references) => [
  ['project', 'Project', 'multicombobox', references.projects],
  ['personType', 'Person Type', 'select', ['Employee', 'Vendor', 'Freelancer', 'Candidate']],
  ['people', 'Select People', 'allocationPeople', references],
  ['languages', 'Languages', 'multicombobox', LANGUAGE_OPTIONS],
  ['languageTeamCounts', 'Language-wise Team Count', 'languageTeamCounts', 'languages'],
  ['role', 'Role', 'select', ['Project Manager', 'Team Lead', 'Recruiter', 'Annotator', 'Transcriber', 'Reviewer', 'Vendor Partner']],
  ['workStatus', 'Work Status', 'select', ['Assigned', 'In Progress', 'Review', 'Completed', 'Paused']],
  ['completionPercentage', 'Completion %', 'number']
];

export default function Allocation() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const [emailingId, setEmailingId] = useState('');
  const { user } = useAuth();
  const access = user?.accessPermissions?.allocation;
  const roleCanManage = ['super_admin', 'admin'].includes(user?.role);
  const can = (action) => user?.role === 'super_admin' || (access ? Boolean(access[action]) : roleCanManage);
  const canManage = can('create') || can('edit');
  const references = useReferenceOptions(canManage ? ['projects', 'employees', 'vendors', 'freelancers', 'candidates'] : []);

  async function load() {
    const data = await endpoints.list('allocations');
    setRows(data.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(payload) {
    try {
      const projects = Array.isArray(payload.project) ? payload.project : [payload.project].filter(Boolean);
      const personTypes = Array.isArray(payload.personType) ? payload.personType : [payload.personType].filter(Boolean);
      const people = personTypes.flatMap((personType) => {
        const field = personType.toLowerCase();
        const ids = Array.isArray(payload[field]) ? payload[field] : [payload[field]].filter(Boolean);
        return ids.map((id) => ({ personType, field, id }));
      });
      const languages = Array.isArray(payload.languages) ? payload.languages : [payload.languages].filter(Boolean);
      const languageTeamCounts = Array.isArray(payload.languageTeamCounts) ? payload.languageTeamCounts : [];
      if (!projects.length) {
        toast.error('Select at least one project');
        return;
      }
      if (!personTypes.length) {
        toast.error('Select at least one person type');
        return;
      }
      const missingType = personTypes.find((personType) => !people.some((person) => person.personType === personType));
      if (missingType) {
        toast.error(`Select at least one ${missingType.toLowerCase()} for this allocation`);
        return;
      }
      if (languages.length && (languageTeamCounts.length !== languages.length || languageTeamCounts.some((item) => !languages.includes(item.language) || !Number.isFinite(Number(item.teamCount)) || Number(item.teamCount) < 0))) {
        toast.error('Enter a valid team count for every selected language');
        return;
      }
      const allocations = projects.flatMap((project) => people.map(({ personType, field, id }) => ({
        project,
        personType,
        [field]: id,
        role: payload.role,
        workStatus: payload.workStatus,
        completionPercentage: payload.completionPercentage,
        languages,
        languageTeamCounts
      })));
      if (payload._id) {
        await endpoints.update('allocations', payload._id, allocations[0]);
        await Promise.all(allocations.slice(1).map((allocation) => endpoints.create('allocations', allocation)));
      } else {
        const results = await Promise.all(allocations.map((allocation) => endpoints.create('allocations', allocation)));
        const failedEmail = results.find((result) => result.emailDelivery && result.emailDelivery.status !== 'sent');
        if (failedEmail) toast.error(`Allocation saved, but email was not sent: ${failedEmail.emailDelivery.reason}`);
      }
      toast.success(`${allocations.length} allocation${allocations.length > 1 ? 's' : ''} saved`);
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function sendAllocationEmail(row) {
    setEmailingId(row._id);
    try {
      const result = await endpoints.sendAllocationEmail(row._id);
      if (result.emailDelivery?.status === 'sent') toast.success(result.message);
      else toast.error(result.message);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setEmailingId('');
    }
  }

  return (
    <>
      <PageHeader
        title="Project Allocation"
        action={
          can('create') && <button className="btn-primary" onClick={() => setEditing({})}>
            <Plus className="h-4 w-4" />
            Add Allocation
          </button>
        }
      >
        Assign employees, vendors, freelancers, and candidates to project roles. The API blocks inactive employee assignment.
      </PageHeader>
      {!rows ? (
        <Loading />
      ) : (
        <DataTable
          rows={rows.map((row) => ({
            ...row,
            personName: row.employee?.name || row.vendor?.agencyName || row.freelancer?.name || row.candidate?.fullName,
            projectName: row.project?.name
          }))}
          columns={['personName', 'personType', 'projectName', 'languages', 'role', 'workStatus', 'completionPercentage']}
          basePath="/allocation"
          onEdit={can('edit') ? setEditing : undefined}
          onEmail={can('create') ? sendAllocationEmail : undefined}
          emailingId={emailingId}
          onDelete={can('delete') ? async (row) => {
            await endpoints.remove('allocations', row._id);
            load();
          } : undefined}
        />
      )}
      {editing && <ModalForm title="Allocation" fields={allocationFields(references)} requiredFields={['project', 'personType']} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />}
    </>
  );
}
