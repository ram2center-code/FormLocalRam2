import React from 'react';
import { Card, Typography, Empty } from 'antd';

export const TasksPage: React.FC = () => (
  <Card title={<Typography.Title level={4} style={{ margin: 0 }}>งานของฉัน (My Tasks)</Typography.Title>}>
    <Empty description="กำลังพัฒนาใน Phase 4: รายการแบบฟอร์มที่ได้รับมอบหมาย (Assignments)" />
  </Card>
);

export default TasksPage;
