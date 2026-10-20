import React from 'react';
import { Card, Typography, Empty } from 'antd';

export const AuditLogsPage: React.FC = () => (
  <Card title={<Typography.Title level={4} style={{ margin: 0 }}>ประวัติการทำงาน (System Audit Logs - Admin)</Typography.Title>}>
    <Empty description="กำลังพัฒนา: ตารางแสดง AuditLog (LOGIN, LOGOUT, CRUD, FORM_SUBMIT ฯลฯ)" />
  </Card>
);

export default AuditLogsPage;
