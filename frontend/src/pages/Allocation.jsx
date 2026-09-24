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

const allocationFields = (references) => [
  ['project', 'Project', 'multicombobox', references.projects],
  ['personType', 'Person Type', 'multicombobox', ['Employee', 'Vendor', 'Freelancer', 'Candidate']],
  ['employee', 'Employee', 'multicombobox', references.employees],
  ['vendor', 'Vendor', 'multicombobox', references.vendors],
  ['freelancer', 'Freelancer', 'multicombobox', references.freelancers],
  ['candidate', 'Candidate', 'multicombobox', references.candidates],
  ['role', 'Role', 'select', ['Project Manager', 'Team Lead', 'Recruiter', 'Annotator', 'Transcriber', 'Reviewer', 'Vendor Partner']],
  ['workStatus', 'Work Status', 'select', ['Assigned', 'In Progress', 'Review', 'Completed', 'Paused']],
  ['completionPercentage', 'Completion %', 'number']
];

export default function Allocation() {
  const [rows, setRows] = useState(null);
  const [editing, setEditing] = useState(null);
  const { user } = useAuth();
  const canManage = ['super_admin', 'admin'].includes(user?.role);
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
      const allocations = projects.flatMap((project) => people.map(({ personType, field, id }) => ({
        project,
        personType,
        [field]: id,
        role: payload.role,
        workStatus: payload.workStatus,
        completionPercentage: payload.completionPercentage
      })));
      if (payload._id) {
        await endpoints.update('allocations', payload._id, allocations[0]);
        await Promise.all(allocations.slice(1).map((allocation) => endpoints.create('allocations', allocation)));
      } else {
        await Promise.all(allocations.map((allocation) => endpoints.create('allocations', allocation)));
      }
      toast.success(`${allocations.length} allocation${allocations.length > 1 ? 's' : ''} saved`);
      setEditing(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Project Allocation"
        action={
          canManage && <button className="btn-primary" onClick={() => setEditing({})}>
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
          columns={['personName', 'personType', 'projectName', 'role', 'workStatus', 'completionPercentage']}
          basePath="/allocation"
          onEdit={canManage ? setEditing : undefined}
          onDelete={canManage ? async (row) => {
            await endpoints.remove('allocations', row._id);
            load();
          } : undefined}
        />
      )}
      {editing && <ModalForm title="Allocation" fields={allocationFields(references)} requiredFields={['project', 'personType']} initial={editing} onClose={() => setEditing(null)} onSubmit={save} />}
    </>
  );
}
