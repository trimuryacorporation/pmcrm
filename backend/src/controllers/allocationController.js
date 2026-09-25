import { Allocation } from '../models/Work.js';
import { Employee } from '../models/People.js';
import { notifyAdmins } from '../services/adminNotificationService.js';
import { notifyAllocationCreated } from '../services/allocationNotificationService.js';

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
    const populated = await allocation.populate('project employee vendor freelancer candidate');
    const emailDelivery = await notifyAllocationCreated(populated);
    res.status(201).json({ ...populated.toObject(), emailDelivery });
  } catch (error) {
    next(error);
  }
}

export async function sendAllocationEmail(req, res, next) {
  try {
    const allocation = await Allocation.findById(req.params.id).populate('project employee vendor freelancer candidate');
    if (!allocation) {
      res.status(404);
      throw new Error('Allocation not found');
    }
    const emailDelivery = await notifyAllocationCreated(allocation);
    res.json({
      emailDelivery,
      message: emailDelivery.status === 'sent' ? 'Allocation email sent successfully' : `Allocation email was not sent: ${emailDelivery.reason || emailDelivery.status}`
    });
  } catch (error) {
    next(error);
  }
}
