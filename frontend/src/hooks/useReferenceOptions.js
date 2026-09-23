import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { endpoints } from '../utils/api.js';

const labels = {
  projects: (item) => `${item.code || 'Project'} - ${item.name}`,
  employees: (item) => `${item.employeeId || 'Employee'} - ${item.name}`,
  vendors: (item) => item.agencyName,
  freelancers: (item) => item.name,
  candidates: (item) => item.fullName
};

export default function useReferenceOptions(resources) {
  const [options, setOptions] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all(resources.map(async (resource) => {
      const data = await endpoints.list(resource);
      return [resource, (data.items || []).map((item) => ({ value: item._id, label: labels[resource](item) }))];
    }))
      .then((entries) => active && setOptions(Object.fromEntries(entries)))
      .catch((error) => toast.error(`Could not load form options: ${error.message}`));
    return () => { active = false; };
  }, []);

  return options;
}
