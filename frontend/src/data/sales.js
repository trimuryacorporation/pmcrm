import { BarChart3, Building2, FileText, Mail, Settings, Target } from 'lucide-react';
import { navigation, resources, pageResources, salesAccessModules, salesAccessActions } from '../../../backend/src/sales/config.js';
export { resources, pageResources, salesAccessModules, salesAccessActions };
export const salesRoles = ['super_admin', 'admin', 'employee'];
const icons=[BarChart3,Building2,Mail,FileText,Target,Settings];
export const salesSections=navigation.map(([label,items],index)=>({label,items,icon:icons[index]}));
export const salesPageResource=(page)=>pageResources[page] || (['dashboard','analytics','reports','team-performance'].includes(page)?'leads':page==='revenue'?'deals':page);