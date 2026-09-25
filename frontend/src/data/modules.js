import { Activity, Briefcase, Building2, CircleDollarSign, ClipboardList, ExternalLink, KeyRound, LayoutDashboard, Settings, ShieldCheck, UserCheck, Users, WalletCards } from 'lucide-react';
import { availabilityOptions, EXPERIENCE_OPTIONS, LANGUAGE_OPTIONS, PROJECT_TYPE_OPTIONS } from './formOptions.js';

export const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, section: 'Workspace', roles: ['super_admin', 'admin', 'employee'] },
  { label: 'Projects', path: '/projects', icon: Briefcase, section: 'Operations', roles: ['super_admin', 'admin', 'employee', 'vendor', 'freelancer'] },
  { label: 'Tasks', path: '/tasks', icon: ClipboardList, section: 'Operations', roles: ['super_admin', 'admin', 'employee'] },
  { label: 'Allocation', path: '/allocation', icon: ClipboardList, section: 'Operations', roles: ['super_admin', 'admin', 'employee'] },
  { label: 'Clients', path: '/clients', icon: Building2, section: 'People', roles: ['super_admin', 'admin'] },
  { label: 'Candidates', path: '/candidates', icon: UserCheck, section: 'People', roles: ['super_admin', 'admin', 'employee', 'candidate'] },
  { label: 'Vendors', path: '/vendors', icon: Building2, section: 'People', roles: ['super_admin', 'admin', 'employee'] },
  { label: 'Freelancers', path: '/freelancers', icon: Users, section: 'People', roles: ['super_admin', 'admin', 'employee'] },
  { label: 'Employees', path: '/employees', icon: Users, section: 'People', roles: ['super_admin', 'admin', 'employee'] },
  { label: 'Payments', path: '/payments', icon: WalletCards, section: 'Finance & Reports', roles: ['super_admin', 'admin'] },
  { label: 'Reports', path: '/reports', icon: CircleDollarSign, section: 'Finance & Reports', roles: ['super_admin', 'admin'] },
  { label: 'Employee Activity', path: '/employee-activity', icon: Activity, section: 'Administration', roles: ['super_admin', 'admin'] },
  { label: 'Activity', path: '/activity', icon: Activity, section: 'Administration', roles: ['super_admin', 'admin'] },
  { label: 'Portal', path: '/portal', icon: ExternalLink, section: 'Administration', roles: ['super_admin', 'admin'] },
  { label: 'Administrators', path: '/administrators', icon: ShieldCheck, section: 'Administration', roles: ['super_admin'] },
  { label: 'API Access', path: '/api-access', icon: KeyRound, section: 'Administration', roles: ['super_admin'] },
  { label: 'Settings', path: '/settings', icon: Settings, section: 'Administration', roles: ['super_admin'] }
];

export const moduleConfig = {
  financePayments: {
    title: 'Payments',
    singular: 'Payment',
    endpoint: 'payments',
    listPath: '/payments'
  },
  financeInvoices: {
    title: 'Invoices',
    singular: 'Invoice',
    endpoint: 'invoices',
    listPath: '/payments'
  },
  projects: {
    title: 'Projects',
    singular: 'Project',
    endpoint: 'projects',
    adminOnlyColumns: ['clientName', 'clientRate'],
    adminOnlyFields: ['clientName', 'clientRate'],
    columns: ['name', 'code', 'clientName', 'projectType', 'requiredLanguage', 'currency', 'clientRate', 'vendorRate', 'freelancerRate', 'status', 'priority', 'progress'],
    fields: [
      ['name', 'Project Name'],
      ['code', 'Project Code'],
      ['clientName', 'Client Name'],
      ['projectType', 'Project Type', 'multicombobox', PROJECT_TYPE_OPTIONS],
      ['requiredLanguage', 'Required Language', 'multicombobox', LANGUAGE_OPTIONS],
      ['applicationQuestions', 'Additional Application Questions (one per line)', 'textarea'],
      ['budget', 'Budget', 'number'],
      ['currency', 'Currency', 'select', ['INR', 'USD']],
      ['clientRate', 'Client Rate', 'number'],
      ['vendorRate', 'Vendor Rate', 'number'],
      ['freelancerRate', 'Freelancer Rate', 'number'],
      ['requiredCandidateCount', 'Required Candidate Count', 'number'],
      ['requiredVendorCount', 'Required Vendor Count', 'number'],
      ['progress', 'Progress %', 'number'],
      ['status', 'Status', 'select', ['Pre-Sale', 'Live', 'Not Live', 'On Hold', 'Completed', 'Cancelled']],
      ['priority', 'Priority', 'select', ['Low', 'Medium', 'High', 'Urgent']],
      ['documentFiles', 'Project Documents', 'file', '.pdf,.doc,.docx'],
      ['description', 'Description', 'textarea'],
      ['notes', 'Notes', 'textarea']
    ]
  },
  clients: {
    title: 'Clients',
    singular: 'Client',
    endpoint: 'clients',
    requiredFields: ['name'],
    columns: ['name', 'companyName', 'contactPerson', 'email', 'phone', 'location', 'country', 'status'],
    fields: [
      ['name', 'Client Name'],
      ['companyName', 'Company Name'],
      ['contactPerson', 'Contact Person'],
      ['email', 'Email', 'email'],
      ['phone', 'Phone Number'],
      ['address', 'Address', 'textarea'],
      ['location', 'Location'],
      ['country', 'Country'],
      ['status', 'Status', 'select', ['Active', 'Inactive']],
      ['notes', 'Notes', 'textarea']
    ]
  },
  candidates: {
    title: 'Candidates',
    singular: 'Candidate',
    endpoint: 'candidates',
    requiredFields: ['fullName', 'mobile'],
    columns: ['fullName', 'email', 'mobile', 'vendor', 'ownerEmployee', 'language', 'passwordSetupStatus', 'status', 'completedProjectCount'],
    fields: [
      ['fullName', 'Full Name'],
      ['mobile', 'Mobile Number'],
      ['email', 'Email', 'email'],
      ['linkedinUrl', 'LinkedIn ID / Profile URL'],
      ['location', 'Location'],
      ['language', 'Language', 'combobox', LANGUAGE_OPTIONS],
      ['experience', 'Experience', 'select', EXPERIENCE_OPTIONS],
      ['availabilityStatus', 'Availability', 'select', availabilityOptions],
      ['candidateType', 'Candidate Type', 'select', ['Individual', 'Team Member']],
      ['status', 'Status', 'select', ['New', 'Contacted', 'Selected', 'Rejected', 'Active', 'Completed']],
      ['notes', 'Notes', 'textarea']
    ]
  },
  vendors: {
    title: 'Vendors',
    singular: 'Vendor',
    endpoint: 'vendors',
    columns: ['agencyName', 'contactPerson', 'email', 'phone', 'ownerEmployee', 'location', 'languagesAvailable', 'passwordSetupStatus', 'projectTypes', 'teamCapacity', 'status'],
    fields: [
      ['agencyName', 'Vendor / Agency Name'],
      ['contactPerson', 'Contact Person'],
      ['email', 'Email', 'email'],
      ['linkedinUrl', 'LinkedIn ID / Profile URL'],
      ['phone', 'Phone Number'],
      ['address', 'Address'],
      ['location', 'Location'],
      ['languagesAvailable', 'Languages', 'multicombobox', LANGUAGE_OPTIONS],
      ['languageTeamCounts', 'Language-wise Team Count', 'languageTeamCounts', 'languagesAvailable'],
      ['projectTypes', 'Project Types', 'multicombobox', PROJECT_TYPE_OPTIONS],
      ['teamCapacity', 'Team Capacity', 'number'],
      ['dailyProductionCapacity', 'Daily Production Capacity'],
      ['rate', 'Rate / Pricing', 'number'],
      ['paymentStatus', 'Payment Status', 'select', ['Pending', 'Partial', 'Paid']],
      ['status', 'Vendor Status', 'select', ['Active', 'Inactive', 'Blocked']],
      ['notes', 'Notes', 'textarea']
    ]
  },
  freelancers: {
    title: 'Freelancers',
    singular: 'Freelancer',
    endpoint: 'freelancers',
    columns: ['name', 'email', 'phone', 'vendor', 'ownerEmployee', 'language', 'passwordSetupStatus', 'projectTypes', 'status'],
    fields: [
      ['name', 'Name'],
      ['email', 'Email', 'email'],
      ['linkedinUrl', 'LinkedIn ID / Profile URL'],
      ['phone', 'Phone'],
      ['location', 'Location'],
      ['language', 'Languages', 'multicombobox', LANGUAGE_OPTIONS],
      ['languageTeamCounts', 'Language-wise Team Count', 'languageTeamCounts', 'language'],
      ['projectTypes', 'Project Types', 'multicombobox', PROJECT_TYPE_OPTIONS],
      ['experience', 'Experience', 'select', EXPERIENCE_OPTIONS],
      ['availability', 'Availability', 'select', availabilityOptions],
      ['paymentDetails', 'Payment Details'],
      ['status', 'Status', 'select', ['Active', 'Inactive', 'Blocked']]
    ]
  },
  employees: {
    title: 'Employees',
    singular: 'Employee',
    endpoint: 'employees',
    columns: ['employeeId', 'name', 'email', 'vendor', 'department', 'designation', 'currentWorkload', 'status'],
    fields: [
      ['employeeId', 'Employee ID'],
      ['name', 'Name'],
      ['email', 'Email', 'email'],
      ['phone', 'Phone'],
      ['department', 'Department'],
      ['designation', 'Designation'],
      ['joiningDate', 'Joining Date', 'date'],
      ['currentWorkload', 'Current Workload', 'number'],
      ['completedProjectsCount', 'Completed Projects', 'number'],
      ['status', 'Status', 'select', ['Active', 'Inactive']]
    ]
  }
};
