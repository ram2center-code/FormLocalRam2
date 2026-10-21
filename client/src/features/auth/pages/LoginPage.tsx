import React, { useState } from 'react';
import { Card, Form, Input, Button, Typography, Alert, Space, theme } from 'antd';
import { UserOutlined, LockOutlined, FormOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../../store/authStore';
import { LoginPayload } from '../../../types/auth';

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, setError } = useAuthStore();
  const [form] = Form.useForm<LoginPayload>();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: LoginPayload) => {
    try {
      setSubmitting(true);
      const loggedUser = await login(values);
      // สำหรับ User ทั่วไป (Staff/บุคลากร) จะเปิดเป็นหน้ารวมฟอร์มตามแผนกทันที เพื่อให้คนไข้เลือกฟอร์มที่ต้องการประเมิน
      const fromPath = (location.state as any)?.from?.pathname;
      const defaultDest = loggedUser?.role === 'ADMIN' ? '/dashboard' : '/department-forms';
      const target = fromPath && fromPath !== '/' && fromPath !== '/login' ? fromPath : defaultDest;
      navigate(target, { replace: true });
    } catch {
      // error ถูกบันทึกใน Zustand แล้ว
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f2f5',
        padding: '24px 16px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 440,
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
        styles={{ body: { padding: '36px 32px' } }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          {/* Logo / Brand Header */}
          <div>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                backgroundColor: token.colorPrimary,
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                marginBottom: 16,
                boxShadow: `0 4px 12px ${token.colorPrimary}40`,
              }}
            >
              <FormOutlined />
            </div>
            <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
              FormLocal
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              ระบบสร้างและจัดการแบบฟอร์มภายในองค์กร
            </Text>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ textAlign: 'left', borderRadius: 8 }}
            />
          )}

          {/* Login Form */}
          <Form
            form={form}
            name="login_form"
            layout="vertical"
            size="large"
            onFinish={onFinish}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'กรุณากรอกชื่อผู้ใช้งาน' },
                { min: 3, message: 'ชื่อผู้ใช้งานต้องมีอย่างน้อย 3 ตัวอักษร' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: token.colorTextTertiary }} />}
                placeholder="ชื่อผู้ใช้งาน (Username)"
                disabled={isLoading || submitting}
                style={{ height: 46, fontSize: 16 }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'กรุณากรอกรหัสผ่าน' },
                { min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: token.colorTextTertiary }} />}
                placeholder="รหัสผ่าน (Password)"
                disabled={isLoading || submitting}
                style={{ height: 46, fontSize: 16 }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                loading={isLoading || submitting}
                style={{
                  height: 48,
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 8,
                }}
              >
                เข้าสู่ระบบ
              </Button>
            </Form.Item>
          </Form>

          {/* Quick Account Hint for Dev/Testing */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#fafafa',
              border: '1px dashed #d9d9d9',
              borderRadius: 8,
              fontSize: 13,
              textAlign: 'left',
              color: token.colorTextSecondary,
            }}
          >
            <Text strong style={{ display: 'block', marginBottom: 4 }}>
              💡 บัญชีทดสอบเริ่มต้น:
            </Text>
            <div>• <b>Admin:</b> admin / ChangeMe123!</div>
            <div>• <b>User:</b> user1 / ChangeMe123!</div>
          </div>
        </Space>
      </Card>

      {/* Footer */}
      <div
        style={{
          marginTop: 24,
          textAlign: 'center',
          color: token.colorTextTertiary,
          fontSize: 13,
          letterSpacing: '0.2px',
        }}
      >
        FormLocal ©{new Date().getFullYear()} — Powered By: <strong>Pantamit.Y</strong>
      </div>
    </div>
  );
};

export default LoginPage;
