import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import TaskFolder from '../models/TaskFolder.js';
import { Candidate, Employee, Freelancer, Vendor } from '../models/People.js';
import { Allocation, Task } from '../models/Work.js';
import { Invoice, Payment } from '../models/Finance.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import DeliveryLog from '../models/DeliveryLog.js';

dotenv.config();

async function seed() {
  await connectDB();
  await Promise.all([
    User.deleteMany(),
    Project.deleteMany(),
    Candidate.deleteMany(),
    Employee.deleteMany(),
    Vendor.deleteMany(),
    Freelancer.deleteMany(),
    Allocation.deleteMany(),
    TaskFolder.deleteMany(),
    Task.deleteMany(),
    Payment.deleteMany(),
    Invoice.deleteMany(),
    Notification.deleteMany(),
    AuditLog.deleteMany(),
    DeliveryLog.deleteMany()
  ]);

  // Reconcile text-index options before inserting documents with a `language` field.
  await Promise.all([Candidate.syncIndexes(), Freelancer.syncIndexes()]);

  const employees = await Employee.insertMany([
    { employeeId: 'TRM-EMP-001', name: 'Aarav Mehta', email: 'aarav@trimurya.com', department: 'Operations', designation: 'Project Manager', joiningDate: '2023-04-10', skills: ['Hindi', 'QA', 'Annotation'], currentWorkload: 68, completedProjectsCount: 18 },
    { employeeId: 'TRM-EMP-002', name: 'Isha Rao', email: 'isha@trimurya.com', department: 'Delivery', designation: 'Team Lead', joiningDate: '2022-11-14', skills: ['Tamil', 'Transcription'], currentWorkload: 54, completedProjectsCount: 25 },
    { employeeId: 'TRM-EMP-003', name: 'Kabir Shah', email: 'kabir@trimurya.com', department: 'Recruitment', designation: 'Recruiter', joiningDate: '2024-01-08', skills: ['Vendor onboarding'], currentWorkload: 36, completedProjectsCount: 9 }
  ]);

  const vendors = await Vendor.insertMany([
    { agencyName: 'LinguaBridge Services', contactPerson: 'Neha Kulkarni', email: 'ops@linguabridge.in', phone: '+91 90000 11001', location: 'Pune', languagesAvailable: ['Marathi', 'Hindi', 'English'], teamCapacity: 42, dailyProductionCapacity: '18k records/day', rate: 7.5, performanceScore: 88 },
    { agencyName: 'DataWave Localization', contactPerson: 'Rohan Dutta', email: 'team@datawave.co', phone: '+91 90000 11002', location: 'Kolkata', languagesAvailable: ['Bengali', 'Assamese'], teamCapacity: 26, dailyProductionCapacity: '9k clips/day', rate: 8.2, paymentStatus: 'Partial', performanceScore: 81 }
  ]);

  const freelancers = await Freelancer.insertMany([
    { name: 'Meera Nair', email: 'meera@example.com', phone: '+91 90000 21001', location: 'Kochi', language: 'Malayalam', skillCategory: 'Reviewer', experience: '5 years', rate: 12, completedProjects: 31, performanceScore: 93 },
    { name: 'Ritwik Sen', email: 'ritwik@example.com', phone: '+91 90000 21002', location: 'Delhi', language: 'Hindi', skillCategory: 'Transcriber', experience: '3 years', rate: 9, availability: 'Limited', completedProjects: 16, performanceScore: 84 }
  ]);

  const candidates = await Candidate.insertMany([
    { fullName: 'Ananya Sharma', mobile: '+91 90000 31001', email: 'ananya@example.com', city: 'Jaipur', state: 'Rajasthan', location: 'Jaipur, Rajasthan', language: 'Hindi', skills: ['Voice collection', 'Annotation'], experience: '2 years', status: 'Selected', completedProjectCount: 6 },
    { fullName: 'Sahil Khan', mobile: '+91 90000 31002', email: 'sahil@example.com', city: 'Lucknow', state: 'Uttar Pradesh', location: 'Lucknow, UP', language: 'Urdu', skills: ['Transcription'], experience: '1 year', status: 'Active', completedProjectCount: 3 },
    { fullName: 'Priya Iyer', mobile: '+91 90000 31003', email: 'priya@example.com', city: 'Chennai', state: 'Tamil Nadu', location: 'Chennai, TN', language: 'Tamil', skills: ['QA', 'Translation'], experience: '4 years', status: 'Contacted', completedProjectCount: 12 }
  ]);

  const projects = await Project.insertMany([
    {
      name: 'Bharat Voice Intelligence',
      code: 'TRM-PRJ-1001',
      clientName: 'Nexus AI Labs',
      projectType: 'Speech Dataset',
      description: 'Multilingual speech data collection and validation across priority Indian languages.',
      requiredLanguage: 'Hindi, Tamil, Bengali',
      startDate: '2026-08-01',
      endDate: '2026-10-15',
      budget: 850000,
      paymentRate: 11,
      projectManager: employees[0]._id,
      status: 'Active',
      priority: 'High',
      requiredCandidateCount: 90,
      requiredVendorCount: 2,
      progress: 64,
      employees: [employees[0]._id, employees[2]._id],
      vendors: [vendors[0]._id],
      freelancers: [freelancers[1]._id],
      candidates: [candidates[0]._id, candidates[1]._id],
      notes: 'Client review every Friday.'
    },
    {
      name: 'Healthcare OCR Validation',
      code: 'TRM-PRJ-1002',
      clientName: 'Mediscan Global',
      projectType: 'Document AI',
      description: 'OCR correction and entity verification for scanned healthcare records.',
      requiredLanguage: 'English, Marathi',
      startDate: '2026-07-18',
      endDate: '2026-09-30',
      budget: 620000,
      paymentRate: 8,
      projectManager: employees[1]._id,
      status: 'On Hold',
      priority: 'Urgent',
      requiredCandidateCount: 35,
      requiredVendorCount: 1,
      progress: 42,
      employees: [employees[1]._id],
      vendors: [vendors[1]._id],
      freelancers: [freelancers[0]._id],
      candidates: [candidates[2]._id],
      notes: 'Awaiting client schema lock.'
    },
    {
      name: 'Retail Sentiment Taxonomy',
      code: 'TRM-PRJ-1003',
      clientName: 'OmniCart Analytics',
      projectType: 'Text Annotation',
      description: 'Product review sentiment and intent classification.',
      requiredLanguage: 'English',
      startDate: '2026-06-01',
      endDate: '2026-08-20',
      budget: 310000,
      paymentRate: 6,
      projectManager: employees[0]._id,
      status: 'Completed',
      priority: 'Medium',
      requiredCandidateCount: 20,
      requiredVendorCount: 0,
      progress: 100,
      employees: [employees[0]._id, employees[1]._id],
      freelancers: [freelancers[0]._id],
      notes: 'Completion report submitted.'
    }
  ]);

  await Employee.updateMany({ _id: employees[0]._id }, { assignedProjects: [projects[0]._id, projects[2]._id] });
  await Employee.updateMany({ _id: employees[1]._id }, { assignedProjects: [projects[1]._id, projects[2]._id] });
  await Vendor.updateOne({ _id: vendors[0]._id }, { assignedProjects: [projects[0]._id] });
  await Freelancer.updateOne({ _id: freelancers[0]._id }, { assignedProjects: [projects[1]._id, projects[2]._id] });

  await Allocation.insertMany([
    { project: projects[0]._id, personType: 'Employee', employee: employees[0]._id, role: 'Project Manager', workStatus: 'In Progress', completionPercentage: 64 },
    { project: projects[0]._id, personType: 'Vendor', vendor: vendors[0]._id, role: 'Vendor Partner', workStatus: 'In Progress', completionPercentage: 58 },
    { project: projects[1]._id, personType: 'Freelancer', freelancer: freelancers[0]._id, role: 'Reviewer', workStatus: 'Paused', completionPercentage: 42 },
    { project: projects[0]._id, personType: 'Candidate', candidate: candidates[0]._id, role: 'Annotator', workStatus: 'Review', completionPercentage: 72 }
  ]);

  const taskFolders = await TaskFolder.insertMany([
    { name: projects[0].name, project: projects[0]._id },
    { name: projects[1].name, project: projects[1]._id },
    { name: projects[2].name, project: projects[2]._id }
  ]);

  await Task.insertMany([
    { title: 'Finalize Hindi QA batch 12', description: 'Audit 1,200 accepted clips before delivery.', assignedToType: 'Employee', employee: employees[0]._id, folder: taskFolders[0]._id, project: projects[0]._id, dueDate: '2026-09-27', priority: 'High', status: 'In Progress' },
    { title: 'Vendor sample calibration', description: 'Run calibration on new Marathi sample set.', assignedToType: 'Vendor', vendor: vendors[0]._id, folder: taskFolders[0]._id, project: projects[0]._id, dueDate: '2026-09-29', priority: 'Medium', status: 'To Do' },
    { title: 'OCR entity review', description: 'Review pending medication entity mismatches.', assignedToType: 'Freelancer', freelancer: freelancers[0]._id, folder: taskFolders[1]._id, project: projects[1]._id, dueDate: '2026-09-25', priority: 'Urgent', status: 'Review' },
    { title: 'Completion report archive', description: 'Attach final report and delivery summary.', assignedToType: 'Employee', employee: employees[1]._id, folder: taskFolders[2]._id, project: projects[2]._id, dueDate: '2026-09-24', priority: 'Low', status: 'Completed' }
  ]);

  await Payment.insertMany([
    { project: projects[0]._id, payeeType: 'Vendor', payeeName: vendors[0].agencyName, amount: 180000, status: 'Pending', dueDate: '2026-10-05' },
    { project: projects[1]._id, payeeType: 'Freelancer', payeeName: freelancers[0].name, amount: 52000, status: 'Partial', dueDate: '2026-09-28' },
    { project: projects[2]._id, payeeType: 'Employee', payeeName: employees[1].name, amount: 35000, status: 'Paid', paidDate: '2026-08-25' }
  ]);

  await Invoice.insertMany([
    { invoiceNumber: 'INV-TRM-26001', project: projects[0]._id, payeeName: vendors[0].agencyName, amount: 180000, paymentStatus: 'Pending', invoiceDate: '2026-09-20', dueDate: '2026-10-05' },
    { invoiceNumber: 'INV-TRM-26002', project: projects[2]._id, payeeName: freelancers[0].name, amount: 46000, paymentStatus: 'Paid', invoiceDate: '2026-08-18', dueDate: '2026-08-28', paymentDate: '2026-08-25' }
  ]);

  await User.create([
    { name: 'Super Admin', email: 'superadmin@trimurya.com', password: 'password123', role: 'super_admin' },
    { name: 'Project Admin', email: 'admin@trimurya.com', password: 'password123', role: 'admin' },
    { name: employees[0].name, email: 'employee@trimurya.com', password: 'password123', role: 'employee', linkedEmployee: employees[0]._id },
    { name: vendors[0].agencyName, email: 'vendor@trimurya.com', password: 'password123', role: 'vendor', linkedVendor: vendors[0]._id },
    { name: freelancers[0].name, email: 'freelancer@trimurya.com', password: 'password123', role: 'freelancer', linkedFreelancer: freelancers[0]._id }
  ]);

  console.log('Seed complete. Demo login: superadmin@trimurya.com / password123');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
