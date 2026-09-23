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
  ['project', 'Project', 'select', references.projects],
  ['personType', 'Person Type', 'select', ['Employee', 'Vendor', 'Freelancer', 'Candidate']],
  ['employee', 'Employee', 'select', references.employees],
  ['vendor', 'Vendor', 'select', references.vendors],
  ['freelancer', 'Freelancer', 'select', references.freelancers],
  ['candidate', 'Candidate', 'select', references.candidates],
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
      const selectedPerson = payload[payload.personType?.toLowerCase()];
      if (!selectedPerson) {
        toast.error(`Select a ${payload.personType || 'person'} for this allocation`);
        return;
      }
      if (payload._id) await endpoints.update('allocations', payload._id, payload);
      else await endpoints.create('allocations', payload);
      toast.success('Allocation saved');
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
