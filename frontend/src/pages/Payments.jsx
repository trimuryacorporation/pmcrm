import { FilePlus2, IndianRupee } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ModalForm from '../components/ModalForm.jsx';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { endpoints } from '../utils/api.js';
import useReferenceOptions from '../hooks/useReferenceOptions.js';

const paymentFields = (projects) => [
  ['project', 'Project', 'select', projects],
  ['payeeType', 'Payee Type', 'select', ['Vendor', 'Freelancer', 'Employee']],
  ['payeeName', 'Payee Name'],
  ['amount', 'Amount', 'number'],
  ['status', 'Payment Status', 'select', ['Pending', 'Partial', 'Paid']],
  ['dueDate', 'Due Date', 'date'],
  ['paidDate', 'Payment Date', 'date'],
  ['notes', 'Notes', 'textarea']
];

const invoiceFields = (projects) => [
  ['invoiceNumber', 'Invoice Number'],
  ['project', 'Project', 'select', projects],
  ['payeeName', 'Payee Name'],
  ['amount', 'Amount', 'number'],
  ['paymentStatus', 'Payment Status', 'select', ['Pending', 'Partial', 'Paid']],
  ['invoiceDate', 'Invoice Date', 'date'],
  ['dueDate', 'Due Date', 'date'],
  ['paymentDate', 'Payment Date', 'date'],
  ['notes', 'Notes', 'textarea']
];

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [modal, setModal] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const references = useReferenceOptions(['projects']);

  async function load() {
    const [paymentData, invoiceData] = await Promise.all([endpoints.list('payments'), endpoints.list('invoices')]);
    setPayments(paymentData.items || []);
    setInvoices(invoiceData.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function save(payload) {
    try {
      const resource = modal.type;
      if (payload._id) await endpoints.update(resource, payload._id, payload);
      else await endpoints.create(resource, payload);
      toast.success('Finance record saved');
      setModal(null);
      load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function confirmRemove() {
    if (!deleting) return;
    setDeleteSaving(true);
    try {
      await endpoints.remove(deleting.type, deleting.item._id);
      toast.success(`${deleting.type === 'payments' ? 'Payment' : 'Invoice'} deleted successfully`);
      setDeleting(null);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setDeleteSaving(false);
    }
  }

  const pending = payments.filter((item) => item.status !== 'Paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paid = payments.filter((item) => item.status === 'Paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <>
      <PageHeader
        title="Payments and Invoices"
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setModal({ type: 'invoices', item: {} })}>
              <FilePlus2 className="h-4 w-4" />
              Add Invoice
            </button>
            <button className="btn-primary" onClick={() => setModal({ type: 'payments', item: {} })}>
              <IndianRupee className="h-4 w-4" />
              Add Payment
            </button>
          </div>
        }
      >
        Track project budgets, vendor payments, freelancer payouts, employee payouts, uploaded invoices, and overdue balances.
      </PageHeader>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <StatCard label="Total Pending Payments" value={`₹${pending.toLocaleString('en-IN')}`} icon={IndianRupee} accent="from-rose-500 to-orange-500" />
        <StatCard label="Total Paid Payments" value={`₹${paid.toLocaleString('en-IN')}`} icon={IndianRupee} accent="from-emerald-500 to-teal-600" />
      </div>
      <div className="space-y-6">
        <DataTable rows={payments} columns={['payeeName', 'payeeType', 'amount', 'status', 'dueDate']} basePath="/payments/payment" onEdit={(item) => setModal({ type: 'payments', item })} onDelete={(item) => setDeleting({ type: 'payments', item })} empty="No payments yet." />
        <DataTable rows={invoices} columns={['invoiceNumber', 'payeeName', 'amount', 'paymentStatus', 'dueDate']} basePath="/payments/invoice" onEdit={(item) => setModal({ type: 'invoices', item })} onDelete={(item) => setDeleting({ type: 'invoices', item })} empty="No invoices yet." />
      </div>
      {modal && <ModalForm title={modal.type === 'payments' ? 'Payment' : 'Invoice'} fields={modal.type === 'payments' ? paymentFields(references.projects) : invoiceFields(references.projects)} initial={modal.item} onClose={() => setModal(null)} onSubmit={save} />}
      {deleting && <ConfirmDialog title={`Delete ${deleting.type === 'payments' ? 'Payment' : 'Invoice'}?`} message="Are you sure you want to delete this record? This action cannot be undone." confirming={deleteSaving} onCancel={() => setDeleting(null)} onConfirm={confirmRemove} />}
    </>
  );
}
