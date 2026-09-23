import { Allocation } from '../models/Work.js';
import { Employee } from '../models/People.js';

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
    res.status(201).json(await allocation.populate('project employee vendor freelancer candidate'));
  } catch (error) {
    next(error);
  }
}
