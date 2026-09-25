import { Allocation } from '../models/Work.js';
import { Employee } from '../models/People.js';
import { notifyAdmins } from '../services/adminNotificationService.js';

export async function createAllocation(req, res, next) {
  try {
    if (req.body.personType === 'Employee' && req.body.employee) {
      const employee = await Employee.findById(req.body.employee);
      if (!employee || employee.status !== 'Active') {
        res.status(422);
        throw new Error('Inactive employees cannot be assigned');
      }
    }
    const allocation = await Allocation.create(req.body);
    notifyAdmins(req, 'CREATE', 'Allocation', allocation).catch((error) => console.error(`Notification failed: ${error.message}`));
    res.status(201).json(await allocation.populate('project employee vendor freelancer candidate'));
  } catch (error) {
    next(error);
  }
}
