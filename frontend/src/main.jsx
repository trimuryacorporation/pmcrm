import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';
import Allocation from './pages/Allocation.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DetailPage from './pages/DetailPage.jsx';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import SetPassword from './pages/SetPassword.jsx';
import ModulePage from './pages/ModulePage.jsx';
import Payments from './pages/Payments.jsx';
import Profile from './pages/Profile.jsx';
import Portal from './pages/Portal.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Tasks from './pages/Tasks.jsx';
import Activity from './pages/Activity.jsx';
import Administrators from './pages/Administrators.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<ModulePage module="projects" />} />
              <Route path="/projects/:id" element={<DetailPage module="projects" />} />
              <Route path="/clients" element={<ModulePage module="clients" />} />
              <Route path="/clients/:id" element={<DetailPage module="clients" />} />
              <Route path="/candidates" element={<ModulePage module="candidates" />} />
              <Route path="/candidates/:id" element={<DetailPage module="candidates" />} />
              <Route path="/vendors" element={<ModulePage module="vendors" />} />
              <Route path="/vendors/:id" element={<DetailPage module="vendors" />} />
              <Route path="/freelancers" element={<ModulePage module="freelancers" />} />
              <Route path="/freelancers/:id" element={<DetailPage module="freelancers" />} />
              <Route path="/employees" element={<ModulePage module="employees" />} />
              <Route path="/employees/:id" element={<DetailPage module="employees" />} />
              <Route path="/allocation" element={<Allocation />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/payments/payment/:id" element={<DetailPage module="financePayments" />} />
              <Route path="/payments/invoice/:id" element={<DetailPage module="financeInvoices" />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/activity" element={<Activity />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/portal" element={<Portal />} />
              <Route element={<ProtectedRoute roles={['super_admin']} />}>
                <Route path="/administrators" element={<Administrators />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </AuthProvider>
  </React.StrictMode>
);
