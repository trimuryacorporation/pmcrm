import Project from '../models/Project.js';
import { Candidate, Employee, Freelancer, Vendor } from '../models/People.js';
import { Task } from '../models/Work.js';
import { Payment } from '../models/Finance.js';
import User from '../models/User.js';
import ProjectApplication from '../models/ProjectApplication.js';

function aggregateLanguages(Model, field) {
  return Model.aggregate([
    {
      $project: {
        languages: {
          $cond: [
            { $isArray: `$${field}` },
            `$${field}`,
            [`$${field}`]
          ]
        }
      }
    },
    { $unwind: '$languages' },
    { $match: { languages: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$languages', count: { $sum: 1 } } }
  ]);
}

export async function dashboard(req, res, next) {
  try {
    const isAdmin = ['super_admin', 'admin'].includes(req.user.role);
    const dashboardPermission = req.user.accessPermissions?.get ? req.user.accessPermissions.get('dashboard-full') : req.user.accessPermissions?.['dashboard-full'];
    const hasDashboardFullAccess = isAdmin || Boolean(dashboardPermission?.view);
    const applicationPermission = req.user.accessPermissions?.get ? req.user.accessPermissions.get('project-applications') : req.user.accessPermissions?.['project-applications'];
    const canViewProjectApplications = hasDashboardFullAccess || Boolean(applicationPermission?.view);
    const passwordSetupPermission = req.user.accessPermissions?.get ? req.user.accessPermissions.get('password-setup-status') : req.user.accessPermissions?.['password-setup-status'];
    const canViewPasswordSetup = hasDashboardFullAccess || Boolean(passwordSetupPermission?.view);
    const projectFilter = hasDashboardFullAccess ? {} : req.user.role === 'employee'
      ? { employees: req.user.linkedEmployee }
      : req.user.role === 'vendor'
        ? { vendors: req.user.linkedVendor }
        : req.user.role === 'freelancer'
          ? { freelancers: req.user.linkedFreelancer }
          : { candidates: req.user.linkedCandidate };
    const taskFilter = hasDashboardFullAccess ? {} : req.user.role === 'employee'
      ? { employee: req.user.linkedEmployee }
      : req.user.role === 'vendor'
        ? { vendor: req.user.linkedVendor }
        : req.user.role === 'freelancer'
          ? { freelancer: req.user.linkedFreelancer }
          : { candidate: req.user.linkedCandidate };
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      pendingProjects,
      totalCandidates,
      totalVendors,
      totalFreelancers,
      totalEmployees,
      statusSummary,
      monthlyProjects,
      upcomingDeadlines,
      recentProjects,
      pendingPayments,
      paidPayments,
      tasks,
      languageGroups,
      passwordSetupUsers,
      projectApplications
    ] = await Promise.all([
      Project.countDocuments(projectFilter),
      Project.countDocuments({ ...projectFilter, status: { $in: ['Live', 'Active'] } }),
      Project.countDocuments({ ...projectFilter, status: 'Completed' }),
      Project.countDocuments({ ...projectFilter, status: { $in: ['Pre-Sale', 'Not Live', 'On Hold', 'Draft'] } }),
      hasDashboardFullAccess ? Candidate.countDocuments() : 0,
      hasDashboardFullAccess ? Vendor.countDocuments() : req.user.role === 'vendor' ? 1 : 0,
      hasDashboardFullAccess ? Freelancer.countDocuments() : req.user.role === 'freelancer' ? 1 : 0,
      hasDashboardFullAccess ? Employee.countDocuments() : req.user.role === 'employee' ? 1 : 0,
      Project.aggregate([{ $match: projectFilter }, { $group: { _id: '$status', count: { $sum: 1 }, avgProgress: { $avg: '$progress' } } }]),
      Project.aggregate([
        { $match: projectFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, projects: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } } } },
        { $sort: { _id: 1 } },
        { $limit: 12 }
      ]),
      Project.find({ ...projectFilter, endDate: { $gte: new Date() }, status: { $nin: ['Completed', 'Cancelled'] } }).sort({ endDate: 1 }).limit(8),
      Project.find(projectFilter).sort({ updatedAt: -1 }).limit(8).select('name code status priority progress updatedAt'),
      hasDashboardFullAccess ? Payment.aggregate([{ $match: { status: { $ne: 'Paid' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]) : [],
      hasDashboardFullAccess ? Payment.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]) : [],
      Task.find(taskFilter).populate('project', 'name code').sort({ dueDate: 1 }).limit(20),
      hasDashboardFullAccess
        ? Promise.all([
          aggregateLanguages(Candidate, 'language'),
          aggregateLanguages(Vendor, 'languagesAvailable'),
          aggregateLanguages(Freelancer, 'language')
        ])
        : Promise.resolve([[], [], []]),
      canViewPasswordSetup
      ? User.find({ role: { $in: ['employee', 'vendor', 'freelancer', 'candidate'] } })
          .select('name email role linkedEmployee linkedVendor linkedFreelancer linkedCandidate passwordSetAt +passwordSetupToken +passwordSetupExpires')
          .populate('linkedEmployee', 'name phone')
          .populate('linkedVendor', 'agencyName contactPerson phone')
          .populate('linkedFreelancer', 'name phone')
          .populate('linkedCandidate', 'fullName mobile')
          .lean()
        : Promise.resolve([]),
      canViewProjectApplications
        ? ProjectApplication.find()
          .populate('project', 'name code')
          .populate({
            path: 'applicant',
            select: 'name email role linkedEmployee linkedVendor linkedFreelancer',
            populate: [
              { path: 'linkedEmployee' },
              { path: 'linkedVendor' },
              { path: 'linkedFreelancer' }
            ]
          })
          .sort({ createdAt: -1 })
          .lean()
        : Promise.resolve([])
    ]);

    const languageSummaryMap = new Map();
    const addLanguageCounts = (items, key) => {
      items.forEach(({ _id, count }) => {
        const language = String(_id).trim();
        if (!language) return;
        const row = languageSummaryMap.get(language) || { language, candidates: 0, vendors: 0, freelancers: 0 };
        row[key] = count;
        languageSummaryMap.set(language, row);
      });
    };
    addLanguageCounts(languageGroups[0], 'candidates');
    addLanguageCounts(languageGroups[1], 'vendors');
    addLanguageCounts(languageGroups[2], 'freelancers');
    const languageSummary = [...languageSummaryMap.values()]
      .sort((a, b) => (b.candidates + b.vendors + b.freelancers) - (a.candidates + a.vendors + a.freelancers) || a.language.localeCompare(b.language));
    const passwordSetupRecords = passwordSetupUsers.map((account) => {
      const profile = account.linkedVendor || account.linkedFreelancer || account.linkedEmployee || account.linkedCandidate;
      const name = profile?.agencyName || profile?.contactPerson || profile?.name || profile?.fullName || account.name;
      const status = account.passwordSetAt
        ? 'Password set'
        : account.passwordSetupToken && account.passwordSetupExpires > new Date()
          ? 'Setup pending'
          : 'Not set';
      const resource = account.role === 'vendor' ? 'vendors' : account.role === 'freelancer' ? 'freelancers' : account.role === 'candidate' ? 'candidates' : 'employees';
      return { id: account._id, profileId: profile?._id, resource, name, email: account.email, mobile: profile?.mobile || profile?.phone || '', role: account.role, status };
    });
    const passwordSetupSummary = ['Password set', 'Setup pending', 'Not set'].map((status) => ({
      status,
      count: passwordSetupRecords.filter((item) => item.status === status).length
    }));

    res.json({
      cards: {
        totalProjects,
        activeProjects,
        completedProjects,
        pendingProjects,
        totalCandidates,
        totalVendors,
        totalFreelancers,
        totalEmployees,
        pendingPayments: pendingPayments[0]?.total || 0,
        paidPayments: paidPayments[0]?.total || 0
      },
      completionPercentage: totalProjects ? Math.round((completedProjects / totalProjects) * 100) : 0,
      statusSummary,
      monthlyProjects,
      languageSummary,
      passwordSetup: { summary: passwordSetupSummary, records: passwordSetupRecords },
      projectApplications,
      upcomingDeadlines,
      recentActivities: recentProjects.map((project) => ({
        title: `${project.name} updated`,
        meta: `${project.status} - ${project.priority}`,
        progress: project.progress,
        date: project.updatedAt
      })),
      tasks
    });
  } catch (error) {
    next(error);
  }
}
