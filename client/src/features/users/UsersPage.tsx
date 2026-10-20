import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Select,
  Switch,
  Popconfirm,
  App,
  Tag,
  Avatar,
  Typography,
  Tooltip,
} from 'antd';
import {
  UserOutlined,
  PlusOutlined,
  EditOutlined,
  KeyOutlined,
  DeleteOutlined,
  SearchOutlined,
  LockOutlined,
  MailOutlined,
  IdcardOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { getDepartmentsApi } from '../departments/api/departmentApi';
import {
  getUsersApi,
  createUserApi,
  updateUserApi,
  toggleUserStatusApi,
  resetPasswordApi,
  deleteUserApi,
  UserItem,
  CreateUserPayload,
  UpdateUserPayload,
} from './api/userApi';
import { Role } from '../../types/auth';

const { Title, Text } = Typography;
const { Option } = Select;

export const UsersPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // Filter States
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [role, setRole] = useState<Role | undefined>(undefined);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Forms
  const [createForm] = Form.useForm<CreateUserPayload>();
  const [editForm] = Form.useForm<UpdateUserPayload>();
  const [resetPwdForm] = Form.useForm<{ newPassword: string }>();

  // 1. ดึงข้อมูลแผนกสำหรับใช้ใน Dropdown ตัวกรองและในแบบฟอร์ม
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartmentsApi,
  });

  // 2. ดึงข้อมูลรายชื่อผู้ใช้งานตามตัวกรอง
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', { search, departmentId, role }],
    queryFn: () => getUsersApi({ search: search.trim() || undefined, departmentId, role }),
  });

  // 3. Mutation: สร้างผู้ใช้
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => createUserApi(payload),
    onSuccess: (newUser) => {
      message.success(`สร้างผู้ใช้ "${newUser.username}" สำเร็จ`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsCreateModalOpen(false);
      createForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'สร้างผู้ใช้ไม่สำเร็จ');
    },
  });

  // 4. Mutation: แก้ไขผู้ใช้
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUserApi(id, payload),
    onSuccess: (updatedUser) => {
      message.success(`แก้ไขข้อมูลผู้ใช้ "${updatedUser.username}" สำเร็จ`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      editForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'แก้ไขผู้ใช้ไม่สำเร็จ');
    },
  });

  // 5. Mutation: สลับสถานะเปิด/ปิดการใช้งาน (Toggle Status)
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserStatusApi(id, isActive),
    onSuccess: (res) => {
      message.success(
        `เปลี่ยนสถานะผู้ใช้ "${res.username}" เป็น ${res.isActive ? 'เปิดใช้งาน' : 'ระงับการใช้งาน'} แล้ว`
      );
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'เปลี่ยนสถานะไม่สำเร็จ');
    },
  });

  // 6. Mutation: รีเซ็ตรหัสผ่าน
  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      resetPasswordApi(id, newPassword),
    onSuccess: () => {
      message.success(`รีเซ็ตรหัสผ่านสำหรับ "${selectedUser?.username}" เรียบร้อยแล้ว`);
      setIsResetPwdModalOpen(false);
      setSelectedUser(null);
      resetPwdForm.resetFields();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
    },
  });

  // 7. Mutation: ลบผู้ใช้ (หรือ Soft Deactivate หากมีข้อมูล)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUserApi(id),
    onSuccess: (res) => {
      message.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'ลบผู้ใช้ไม่สำเร็จ');
    },
  });

  // Handlers สำหรับเปิด Modals
  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    editForm.setFieldsValue({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId,
      isActive: user.isActive,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenResetPwd = (user: UserItem) => {
    setSelectedUser(user);
    resetPwdForm.resetFields();
    setIsResetPwdModalOpen(true);
  };

  const columns = [
    {
      title: 'ผู้ใช้งาน',
      key: 'user',
      render: (_: any, record: UserItem) => (
        <Space size="middle">
          <Avatar
            style={{
              backgroundColor: record.role === 'ADMIN' ? '#fa541c' : '#1677ff',
              verticalAlign: 'middle',
            }}
            size={40}
          >
            {record.fullName ? record.fullName[0].toUpperCase() : 'U'}
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {record.fullName}
              {record.id === currentUser?.id && (
                <Tag color="green" style={{ marginLeft: 8, fontSize: 11, borderRadius: 4 }}>
                  บัญชีของคุณ
                </Tag>
              )}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              @{record.username}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'อีเมล',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'สิทธิ์ (Role)',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (r: Role) => (
        <Tag color={r === 'ADMIN' ? 'volcano' : 'blue'} style={{ borderRadius: 6, fontWeight: 500, padding: '2px 8px' }}>
          {r}
        </Tag>
      ),
    },
    {
      title: 'แผนกสังกัด',
      key: 'department',
      render: (_: any, record: UserItem) => (
        record.department?.name ? (
          <Tag color="cyan" style={{ borderRadius: 6, padding: '2px 8px' }}>
            {record.department.name}
          </Tag>
        ) : (
          <Text type="secondary">- ไม่ได้ระบุ -</Text>
        )
      ),
    },
    {
      title: 'ประวัติฟอร์ม/คำตอบ',
      key: 'stats',
      width: 150,
      render: (_: any, record: UserItem) => (
        <Space size="small">
          <Tooltip title="จำนวนฟอร์มที่สร้าง">
            <Tag color="default">{record._count.forms} ฟอร์ม</Tag>
          </Tooltip>
          <Tooltip title="จำนวนครั้งที่ส่งคำตอบ">
            <Tag color="default">{record._count.submissions} ผลสอบ</Tag>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'สถานะ',
      key: 'isActive',
      width: 130,
      render: (_: any, record: UserItem) => {
        const isSelf = record.id === currentUser?.id;
        return (
          <Tooltip title={isSelf ? 'ไม่สามารถระงับบัญชีของตนเองได้' : undefined}>
            <Switch
              checked={record.isActive}
              disabled={isSelf || toggleStatusMutation.isPending}
              checkedChildren="เปิดใช้งาน"
              unCheckedChildren="ระงับ"
              onChange={(checked) =>
                toggleStatusMutation.mutate({ id: record.id, isActive: checked })
              }
            />
          </Tooltip>
        );
      },
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 180,
      render: (_: any, record: UserItem) => {
        const isSelf = record.id === currentUser?.id;

        return (
          <Space size="small">
            <Tooltip title="แก้ไขข้อมูล">
              <Button
                type="text"
                icon={<EditOutlined style={{ color: '#1677ff' }} />}
                onClick={() => handleOpenEdit(record)}
                style={{ height: 36 }}
              />
            </Tooltip>

            <Tooltip title="รีเซ็ตรหัสผ่าน">
              <Button
                type="text"
                icon={<KeyOutlined style={{ color: '#fa8c16' }} />}
                onClick={() => handleOpenResetPwd(record)}
                style={{ height: 36 }}
              />
            </Tooltip>

            {!isSelf && (
              <Popconfirm
                title="ยืนยันการลบหรือระงับผู้ใช้งาน"
                description={
                  record._count.forms > 0 || record._count.submissions > 0
                    ? `ผู้ใช้ "${record.username}" มีประวัติในระบบแล้ว ระบบจะเปลี่ยนเป็น "ระงับการใช้งาน" เพื่อคงข้อมูลประวัติไว้ ยืนยันหรือไม่?`
                    : `คุณต้องการลบผู้ใช้ "${record.username}" ออกจากระบบอย่างถาวรหรือไม่?`
                }
                okText="ยืนยัน"
                cancelText="ยกเลิก"
                okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Tooltip title="ลบผู้ใช้">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    style={{ height: 36 }}
                  />
                </Tooltip>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0 }}>
            จัดการผู้ใช้งาน (User Management)
          </Title>
          <Text type="secondary">
            จัดการบัญชีผู้ใช้งาน กำหนดสิทธิ์ (ADMIN / USER), แผนก และการเปิด-ปิดการเข้าถึงระบบ
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            createForm.resetFields();
            setIsCreateModalOpen(true);
          }}
          size="large"
          style={{ height: 42, fontWeight: 500 }}
        >
          เพิ่มผู้ใช้งานใหม่
        </Button>
      </div>

      {/* Main Content Card */}
      <Card
        style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: '20px' }}
      >
        {/* Filters Toolbar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 20,
            alignItems: 'center',
          }}
        >
          <Input
            placeholder="ค้นหาชื่อ, username หรือ อีเมล..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280, height: 40 }}
          />

          <Select
            placeholder="เลือกแผนก"
            allowClear
            value={departmentId}
            onChange={(val) => setDepartmentId(val)}
            style={{ width: 220, height: 40 }}
          >
            {departments.map((dept) => (
              <Option key={dept.id} value={dept.id}>
                {dept.name}
              </Option>
            ))}
          </Select>

          <Select
            placeholder="เลือกสิทธิ์ (Role)"
            allowClear
            value={role}
            onChange={(val) => setRole(val)}
            style={{ width: 160, height: 40 }}
          >
            <Option value="ADMIN">ADMIN</Option>
            <Option value="USER">USER</Option>
          </Select>
        </div>

        {/* Users Table */}
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 960 }}
        />
      </Card>

      {/* 1. Modal: เพิ่มผู้ใช้งานใหม่ */}
      <Modal
        title="เพิ่มผู้ใช้งานใหม่"
        open={isCreateModalOpen}
        onOk={async () => {
          try {
            const values = await createForm.validateFields();
            createMutation.mutate(values);
          } catch {
            // validation fail
          }
        }}
        onCancel={() => setIsCreateModalOpen(false)}
        confirmLoading={createMutation.isPending}
        okText="สร้างผู้ใช้งาน"
        cancelText="ยกเลิก"
        destroyOnClose
        width={560}
      >
        <Form form={createForm} layout="vertical" initialValues={{ role: 'USER', isActive: true }} style={{ marginTop: 16 }}>
          <Form.Item
            name="username"
            label="ชื่อผู้ใช้งาน (Username)"
            rules={[
              { required: true, message: 'กรุณากรอก Username' },
              { min: 3, message: 'Username ต้องมีอย่างน้อย 3 ตัวอักษร' },
              { pattern: /^[a-zA-Z0-9_.-]+$/, message: 'ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ ตัวเลข, จุด, ขีดล่าง หรือขีดกลาง' },
            ]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="ตัวอย่าง: somchai.j" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="รหัสผ่านเริ่มต้น (Password)"
            rules={[
              { required: true, message: 'กรุณากรอกรหัสผ่าน' },
              { min: 6, message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' },
            ]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="ความยาวอย่างน้อย 6 ตัวอักษร" size="large" />
          </Form.Item>

          <Form.Item
            name="fullName"
            label="ชื่อ-นามสกุล (Full Name)"
            rules={[
              { required: true, message: 'กรุณากรอกชื่อ-นามสกุล' },
              { min: 2, message: 'ชื่อ-นามสกุลต้องมีอย่างน้อย 2 ตัวอักษร' },
            ]}
          >
            <Input prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />} placeholder="ตัวอย่าง: สมชาย ใจดี" size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="อีเมล (Email)"
            rules={[
              { required: true, message: 'กรุณากรอกอีเมล' },
              { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' },
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} placeholder="ตัวอย่าง: somchai@hospital.internal" size="large" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="role" label="สิทธิ์การใช้งาน (Role)" rules={[{ required: true }]}>
              <Select size="large">
                <Option value="USER">USER (ผู้ใช้ทั่วไป)</Option>
                <Option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</Option>
              </Select>
            </Form.Item>

            <Form.Item name="departmentId" label="แผนกสังกัด (Department)">
              <Select placeholder="เลือกแผนก" allowClear size="large">
                {departments.map((dept) => (
                  <Option key={dept.id} value={dept.id}>
                    {dept.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>
        </Form>
      </Modal>

      {/* 2. Modal: แก้ไขข้อมูลผู้ใช้งาน */}
      <Modal
        title={`แก้ไขข้อมูลผู้ใช้งาน: @${selectedUser?.username}`}
        open={isEditModalOpen}
        onOk={async () => {
          try {
            const values = await editForm.validateFields();
            if (selectedUser) {
              updateMutation.mutate({ id: selectedUser.id, payload: values });
            }
          } catch {
            // validation fail
          }
        }}
        onCancel={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        confirmLoading={updateMutation.isPending}
        okText="บันทึกการแก้ไข"
        cancelText="ยกเลิก"
        destroyOnClose
        width={560}
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="fullName"
            label="ชื่อ-นามสกุล (Full Name)"
            rules={[{ required: true, message: 'กรุณากรอกชื่อ-นามสกุล' }]}
          >
            <Input prefix={<IdcardOutlined style={{ color: '#bfbfbf' }} />} size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="อีเมล (Email)"
            rules={[
              { required: true, message: 'กรุณากรอกอีเมล' },
              { type: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' },
            ]}
          >
            <Input prefix={<MailOutlined style={{ color: '#bfbfbf' }} />} size="large" />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="role" label="สิทธิ์การใช้งาน (Role)" rules={[{ required: true }]}>
              <Select size="large" disabled={selectedUser?.id === currentUser?.id}>
                <Option value="USER">USER (ผู้ใช้ทั่วไป)</Option>
                <Option value="ADMIN">ADMIN (ผู้ดูแลระบบ)</Option>
              </Select>
            </Form.Item>

            <Form.Item name="departmentId" label="แผนกสังกัด (Department)">
              <Select placeholder="เลือกแผนก" allowClear size="large">
                {departments.map((dept) => (
                  <Option key={dept.id} value={dept.id}>
                    {dept.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          <Form.Item name="isActive" label="สถานะบัญชี" valuePropName="checked">
            <Switch
              checkedChildren="เปิดใช้งาน"
              unCheckedChildren="ระงับการใช้งาน"
              disabled={selectedUser?.id === currentUser?.id}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* 3. Modal: รีเซ็ตรหัสผ่าน */}
      <Modal
        title={`รีเซ็ตรหัสผ่านสำหรับ: @${selectedUser?.username}`}
        open={isResetPwdModalOpen}
        onOk={async () => {
          try {
            const values = await resetPwdForm.validateFields();
            if (selectedUser) {
              resetPasswordMutation.mutate({
                id: selectedUser.id,
                newPassword: values.newPassword,
              });
            }
          } catch {
            // validation fail
          }
        }}
        onCancel={() => {
          setIsResetPwdModalOpen(false);
          setSelectedUser(null);
        }}
        confirmLoading={resetPasswordMutation.isPending}
        okText="ยืนยันเปลี่ยนรหัสผ่าน"
        cancelText="ยกเลิก"
        destroyOnClose
      >
        <Form form={resetPwdForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="newPassword"
            label="รหัสผ่านใหม่ (New Password)"
            rules={[
              { required: true, message: 'กรุณากรอกรหัสผ่านใหม่' },
              { min: 6, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="ความยาวอย่างน้อย 6 ตัวอักษร"
              size="large"
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default UsersPage;
