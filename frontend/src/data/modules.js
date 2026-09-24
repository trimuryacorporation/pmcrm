import { Activity, Briefcase, Building2, CircleDollarSign, ClipboardList, LayoutDashboard, Settings, ShieldCheck, UserCheck, Users, WalletCards } from 'lucide-react';
import { availabilityOptions, EXPERIENCE_OPTIONS, LANGUAGE_OPTIONS, PROJECT_TYPE_OPTIONS } from './formOptions.js';

export const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', icon: Briefcase },
  { label: 'Candidates', path: '/candidates', icon: UserCheck, roles: ['super_admin', 'admin', 'employee', 'vendor'] },
  { label: 'Vendors', path: '/vendors', icon: Building2, roles: ['super_admin', 'admin', 'employee', 'vendor'] },
  { label: 'Freelancers', path: '/freelancers', icon: Users, roles: ['super_admin', 'admin', 'employee', 'vendor', 'freelancer'] },
  { label: 'Employees', path: '/employees', icon: Users, roles: ['super_admin', 'admin', 'vendor', 'employee'] },
  { label: 'Allocation', path: '/allocation', icon: ClipboardList },
  { label: 'Tasks', path: '/tasks', icon: ClipboardList },
  { label: 'Payments', path: '/payments', icon: WalletCards, roles: ['super_admin', 'admin'] },
  { label: 'Reports', path: '/reports', icon: CircleDollarSign, roles: ['super_admin', 'admin'] },
  { label: 'Activity', path: '/activity', icon: Activity, roles: ['super_admin', 'admin'] },
  { label: 'Administrators', path: '/administrators', icon: ShieldCheck, roles: ['super_admin'] },
  { label: 'Settings', path: '/settings', icon: Settings, roles: ['super_admin'] }
];

export const moduleConfig = {
  projects: {
    title: 'Projects',
    singular: 'Project',
    endpoint: 'projects',
    adminOnlyColumns: ['clientName', 'clientRate'],
    adminOnlyFields: ['clientName', 'clientRate'],
    columns: ['name', 'code', 'clientName', 'projectType', 'requiredLanguage', 'clientRate', 'vendorRate', 'freelancerRate', 'status', 'priority', 'progress'],
    fields: [
      ['name', 'Project Name'],
      ['code', 'Project Code'],
      ['clientName', 'Client Name'],
      ['projectType', 'Project Type', 'combobox', PROJECT_TYPE_OPTIONS],
      ['requiredLanguage', 'Required Language', 'combobox', LANGUAGE_OPTIONS],
      ['budget', 'Budget', 'number'],
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
  candidates: {
    title: 'Candidates',
    singular: 'Candidate',
    endpoint: 'candidates',
    requiredFields: ['fullName', 'mobile'],
    columns: ['fullName', 'email', 'mobile', 'vendor', 'ownerEmployee', 'language', 'status', 'completedProjectCount'],
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
    columns: ['agencyName', 'contactPerson', 'email', 'phone', 'ownerEmployee', 'location', 'languagesAvailable', 'projectTypes', 'teamCapacity', 'status'],
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
    columns: ['name', 'email', 'phone', 'vendor', 'ownerEmployee', 'language', 'projectTypes', 'status'],
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
