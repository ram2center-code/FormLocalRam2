import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleGuard } from './RoleGuard';
import { MainLayout } from '../layouts/MainLayout';

import DashboardPage from '../features/dashboard/DashboardPage';
import TasksPage from '../features/tasks/TasksPage';
import FormsPage from '../features/forms/FormsPage';
import FormBuilderPage from '../features/forms/pages/FormBuilderPage';
import FormViewPage from '../features/forms/pages/FormViewPage';
import FormSubmissionsPage from '../features/forms/pages/FormSubmissionsPage';
import UsersPage from '../features/users/UsersPage';
import DepartmentsPage from '../features/departments/DepartmentsPage';
import AuditLogsPage from '../features/auditLog/AuditLogsPage';
import SettingsPage from '../features/settings/SettingsPage';
import DocumentationPage from '../features/docs/DocumentationPage';

import { Result, Button } from 'antd';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forms/:id/view',
    element: <FormViewPage />,
  },
  {
    path: '/forms/:id/fill',
    element: <FormViewPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'tasks',
            element: <TasksPage />,
          },
          {
            path: 'forms',
            element: <FormsPage />,
          },
          {
            path: 'forms/new',
            element: <FormBuilderPage />,
          },
          {
            path: 'forms/:id/builder',
            element: <FormBuilderPage />,
          },
          {
            path: 'forms/:id/submissions',
            element: <FormSubmissionsPage />,
          },
          {
            path: 'docs',
            element: <DocumentationPage />,
          },
          // เส้นทางสำหรับ ADMIN เท่านั้น (ครอบด้วย RoleGuard)
          {
            element: <RoleGuard allowedRoles={['ADMIN']} />,
            children: [
              {
                path: 'users',
                element: <UsersPage />,
              },
              {
                path: 'departments',
                element: <DepartmentsPage />,
              },
              {
                path: 'audit-logs',
                element: <AuditLogsPage />,
              },
              {
                path: 'settings',
                element: <SettingsPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f7',
        }}
      >
        <Result
          status="404"
          title="404"
          subTitle="ขออภัย ไม่พบหน้าที่คุณต้องการ"
          extra={
            <Button type="primary" href="/">
              กลับสู่หน้าหลัก
            </Button>
          }
        />
      </div>
    ),
  },
]);
