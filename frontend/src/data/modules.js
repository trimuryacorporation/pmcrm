import { Activity, Briefcase, Building2, CircleDollarSign, ClipboardList, LayoutDashboard, Settings, ShieldCheck, UserCheck, Users, WalletCards } from 'lucide-react';

export const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', path: '/projects', icon: Briefcase },
  { label: 'Candidates', path: '/candidates', icon: UserCheck, roles: ['super_admin', 'admin', 'employee'] },
  { label: 'Vendors', path: '/vendors', icon: Building2, roles: ['super_admin', 'admin', 'vendor'] },
  { label: 'Freelancers', path: '/freelancers', icon: Users, roles: ['super_admin', 'admin', 'freelancer'] },
  { label: 'Employees', path: '/employees', icon: Users, roles: ['super_admin', 'admin', 'employee'] },
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
    columns: ['name', 'code', 'clientName', 'status', 'priority', 'progress'],
    fields: [
      ['name', 'Project Name'],
      ['code', 'Project Code'],
      ['clientName', 'Client Name'],
      ['projectType', 'Project Type'],
      ['requiredLanguage', 'Required Language'],
      ['budget', 'Budget', 'number'],
      ['paymentRate', 'Payment Rate', 'number'],
      ['requiredCandidateCount', 'Required Candidate Count', 'number'],
      ['requiredVendorCount', 'Required Vendor Count', 'number'],
      ['progress', 'Progress %', 'number'],
      ['status', 'Status', 'select', ['Draft', 'Active', 'On Hold', 'Completed', 'Cancelled']],
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
    columns: ['fullName', 'email', 'mobile', 'language', 'status', 'completedProjectCount'],
    fields: [
      ['fullName', 'Full Name'],
      ['mobile', 'Mobile Number'],
      ['email', 'Email', 'email'],
      ['location', 'Location'],
      ['language', 'Language'],
      ['experience', 'Experience'],
      ['availabilityStatus', 'Availability'],
      ['candidateType', 'Candidate Type', 'select', ['Individual', 'Team Member']],
      ['status', 'Status', 'select', ['New', 'Contacted', 'Selected', 'Rejected', 'Active', 'Completed']],
      ['notes', 'Notes', 'textarea']
    ]
  },
  vendors: {
    title: 'Vendors',
    singular: 'Vendor',
    endpoint: 'vendors',
    columns: ['agencyName', 'contactPerson', 'email', 'location', 'teamCapacity', 'status'],
    fields: [
      ['agencyName', 'Vendor / Agency Name'],
      ['contactPerson', 'Contact Person'],
      ['email', 'Email', 'email'],
      ['phone', 'Phone Number'],
      ['address', 'Address'],
      ['location', 'Location'],
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
    columns: ['name', 'email', 'phone', 'language', 'skillCategory', 'status'],
    fields: [
      ['name', 'Name'],
      ['email', 'Email', 'email'],
      ['phone', 'Phone'],
      ['location', 'Location'],
      ['language', 'Language'],
      ['skillCategory', 'Skill Category'],
      ['experience', 'Experience'],
      ['rate', 'Rate', 'number'],
      ['availability', 'Availability'],
      ['paymentDetails', 'Payment Details'],
      ['status', 'Status', 'select', ['Active', 'Inactive', 'Blocked']]
    ]
  },
  employees: {
    title: 'Employees',
    singular: 'Employee',
    endpoint: 'employees',
    columns: ['employeeId', 'name', 'email', 'department', 'designation', 'currentWorkload', 'status'],
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
