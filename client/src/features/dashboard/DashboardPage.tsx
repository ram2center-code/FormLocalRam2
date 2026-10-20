import React from 'react';
import { Card, Typography, Row, Col, Statistic, Space, Tag } from 'antd';
import { FormOutlined, CheckCircleOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Title, Text, Paragraph } = Typography;

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ margin: 0 }}>
          ยินดีต้อนรับ, {user?.fullName} 👋
        </Title>
        <Text type="secondary">
          เข้าสู่ระบบในฐานะ <Tag color={user?.role === 'ADMIN' ? 'volcano' : 'blue'}>{user?.role}</Tag> แผนก {user?.department?.name || 'ทั่วไป'}
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ backgroundColor: '#e6f7ff', borderRadius: 12 }}>
            <Statistic
              title="งานที่ต้องกรอก (Pending)"
              value={3}
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ backgroundColor: '#f6ffed', borderRadius: 12 }}>
            <Statistic
              title="ส่งคำตอบแล้ว (Completed)"
              value={12}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ backgroundColor: '#fff7e6', borderRadius: 12 }}>
            <Statistic
              title="แบบฟอร์มที่สร้าง (Forms)"
              value={4}
              prefix={<FormOutlined style={{ color: '#fa8c16' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ backgroundColor: '#f9f0ff', borderRadius: 12 }}>
            <Statistic
              title="สถานะระบบ (Auth Status)"
              value="ปกติ"
              prefix={<UserOutlined style={{ color: '#722ed1' }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="ข้อมูลการยืนยันตัวตน (Authentication Info)" style={{ borderRadius: 12 }}>
        <Paragraph>
          • <b>User ID:</b> <code>{user?.id}</code>
        </Paragraph>
        <Paragraph>
          • <b>Username:</b> <code>{user?.username}</code>
        </Paragraph>
        <Paragraph>
          • <b>Role:</b> <code>{user?.role}</code>
        </Paragraph>
        <Paragraph>
          • <b>Department:</b> <code>{user?.department?.name || 'N/A'}</code>
        </Paragraph>
      </Card>
    </Space>
  );
};

export default DashboardPage;
