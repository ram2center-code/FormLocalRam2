import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useAuthStore } from '../store/authStore';
import { Role } from '../types/auth';

interface RoleGuardProps {
  allowedRoles: Role[];
  children?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div
        style={{
          padding: '48px 24px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Result
          status="403"
          title="403 - ไม่มีสิทธิ์เข้าถึง"
          subTitle={`หน้านี้สงวนสิทธิ์เฉพาะผู้ใช้กลุ่ม (${allowedRoles.join(', ')}) เท่านั้น`}
          extra={
            <Button type="primary" onClick={() => navigate('/dashboard')}>
              กลับสู่หน้าหลัก
            </Button>
          }
        />
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleGuard;
