import Project from '../models/Project.js';
import { Candidate, Employee, Freelancer, Vendor } from '../models/People.js';
import { Task } from '../models/Work.js';
import { Payment } from '../models/Finance.js';

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
    const projectFilter = isAdmin ? {} : req.user.role === 'employee'
      ? { employees: req.user.linkedEmployee }
      : req.user.role === 'vendor'
        ? { vendors: req.user.linkedVendor }
        : { freelancers: req.user.linkedFreelancer };
    const taskFilter = isAdmin ? {} : req.user.role === 'employee'
      ? { employee: req.user.linkedEmployee }
      : req.user.role === 'vendor'
        ? { vendor: req.user.linkedVendor }
        : { freelancer: req.user.linkedFreelancer };
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
      languageGroups
    ] = await Promise.all([
      Project.countDocuments(projectFilter),
      Project.countDocuments({ ...projectFilter, status: { $in: ['Live', 'Active'] } }),
      Project.countDocuments({ ...projectFilter, status: 'Completed' }),
      Project.countDocuments({ ...projectFilter, status: { $in: ['Pre-Sale', 'Not Live', 'On Hold', 'Draft'] } }),
      isAdmin ? Candidate.countDocuments() : 0,
      isAdmin ? Vendor.countDocuments() : req.user.role === 'vendor' ? 1 : 0,
      isAdmin ? Freelancer.countDocuments() : req.user.role === 'freelancer' ? 1 : 0,
      isAdmin ? Employee.countDocuments() : req.user.role === 'employee' ? 1 : 0,
      Project.aggregate([{ $match: projectFilter }, { $group: { _id: '$status', count: { $sum: 1 }, avgProgress: { $avg: '$progress' } } }]),
      Project.aggregate([
        { $match: projectFilter },
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, projects: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } } } },
        { $sort: { _id: 1 } },
        { $limit: 12 }
      ]),
      Project.find({ ...projectFilter, endDate: { $gte: new Date() }, status: { $nin: ['Completed', 'Cancelled'] } }).sort({ endDate: 1 }).limit(8),
      Project.find(projectFilter).sort({ updatedAt: -1 }).limit(8).select('name code status priority progress updatedAt'),
      isAdmin ? Payment.aggregate([{ $match: { status: { $ne: 'Paid' } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]) : [],
      isAdmin ? Payment.aggregate([{ $match: { status: 'Paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]) : [],
      Task.find(taskFilter).populate('project', 'name code').sort({ dueDate: 1 }).limit(20),
      isAdmin
        ? Promise.all([
          aggregateLanguages(Candidate, 'language'),
          aggregateLanguages(Vendor, 'languagesAvailable'),
          aggregateLanguages(Freelancer, 'language')
        ])
        : Promise.resolve([[], [], []])
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
