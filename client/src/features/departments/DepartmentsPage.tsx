import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Popconfirm,
  App,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  ApartmentOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  UserOutlined,
  FormOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getDepartmentsApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
  DepartmentItem,
} from './api/departmentApi';

const { Title, Text } = Typography;

export const DepartmentsPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<DepartmentItem | null>(null);
  const [form] = Form.useForm();

  // 1. ดึงข้อมูลแผนกทั้งหมด
  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartmentsApi,
  });

  // 2. Mutation สร้างแผนก
  const createMutation = useMutation({
    mutationFn: (name: string) => createDepartmentApi(name),
    onSuccess: (newDept) => {
      message.success(`สร้างแผนก "${newDept.name}" สำเร็จ`);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'สร้างแผนกไม่สำเร็จ');
    },
  });

  // 3. Mutation แก้ไขแผนก
  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      updateDepartmentApi(id, name),
    onSuccess: (updatedDept) => {
      message.success(`แก้ไขแผนก "${updatedDept.name}" สำเร็จ`);
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      handleCloseModal();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'แก้ไขแผนกไม่สำเร็จ');
    },
  });

  // 4. Mutation ลบแผนก
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartmentApi(id),
    onSuccess: () => {
      message.success('ลบแผนกเรียบร้อยแล้ว');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'ไม่สามารถลบแผนกได้');
    },
  });

  const handleOpenCreateModal = () => {
    setEditingDept(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept: DepartmentItem) => {
    setEditingDept(dept);
    form.setFieldsValue({ name: dept.name });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDept(null);
    form.resetFields();
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingDept) {
        updateMutation.mutate({ id: editingDept.id, name: values.name.trim() });
      } else {
        createMutation.mutate(values.name.trim());
      }
    } catch {
      // Form validation error
    }
  };

  // กรองแผนกตามคำค้นหา
  const filteredDepartments = departments.filter((dept) =>
    dept.name.toLowerCase().includes(searchText.toLowerCase().trim())
  );

  const columns = [
    {
      title: 'ชื่อแผนก',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space size="small">
          <ApartmentOutlined style={{ color: '#1677ff', fontSize: 16 }} />
          <Text strong style={{ fontSize: 15 }}>{name}</Text>
        </Space>
      ),
    },
    {
      title: 'จำนวนผู้ใช้งาน',
      key: 'usersCount',
      width: 160,
      render: (_: any, record: DepartmentItem) => (
        <Tag color="blue" icon={<UserOutlined />} style={{ padding: '2px 8px', fontSize: 13, borderRadius: 6 }}>
          {record._count.users} คน
        </Tag>
      ),
    },
    {
      title: 'จำนวนแบบฟอร์ม',
      key: 'formsCount',
      width: 160,
      render: (_: any, record: DepartmentItem) => (
        <Tag color="orange" icon={<FormOutlined />} style={{ padding: '2px 8px', fontSize: 13, borderRadius: 6 }}>
          {record._count.forms} ฟอร์ม
        </Tag>
      ),
    },
    {
      title: 'วันที่สร้าง',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm น.'),
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 160,
      render: (_: any, record: DepartmentItem) => {
        const hasMembers = record._count.users > 0;
        const hasForms = record._count.forms > 0;
        const cannotDelete = hasMembers || hasForms;

        return (
          <Space size="small">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#1677ff' }} />}
              onClick={() => handleOpenEditModal(record)}
              style={{ height: 36 }}
            >
              แก้ไข
            </Button>

            {cannotDelete ? (
              <Tooltip title={hasMembers ? 'ไม่สามารถลบได้เนื่องจากมีผู้ใช้สังกัดอยู่' : 'ไม่สามารถลบได้เนื่องจากมีฟอร์มสังกัดอยู่'}>
                <Button
                  type="text"
                  danger
                  disabled
                  icon={<DeleteOutlined />}
                  style={{ height: 36 }}
                >
                  ลบ
                </Button>
              </Tooltip>
            ) : (
              <Popconfirm
                title="ยืนยันการลบแผนก"
                description={`คุณแน่ใจหรือไม่ว่าต้องการลบแผนก "${record.name}"?`}
                okText="ลบแผนก"
                cancelText="ยกเลิก"
                okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
                onConfirm={() => deleteMutation.mutate(record.id)}
              >
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleteMutation.isPending}
                  style={{ height: 36 }}
                >
                  ลบ
                </Button>
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
            จัดการแผนก (Department Management)
          </Title>
          <Text type="secondary">
            จัดการข้อมูลแผนกและฝ่ายต่างๆ ภายในองค์กรสำหรับกำหนดสิทธิ์และมอบหมายแบบฟอร์ม
          </Text>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenCreateModal}
          size="large"
          style={{ height: 42, fontWeight: 500 }}
        >
          เพิ่มแผนกใหม่
        </Button>
      </div>

      {/* Main Content Card */}
      <Card
        style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: '20px' }}
      >
        {/* Search Bar */}
        <div style={{ marginBottom: 16, maxWidth: 360 }}>
          <Input
            placeholder="ค้นหาชื่อแผนก..."
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            size="large"
            style={{ height: 40 }}
          />
        </div>

        {/* Departments Table */}
        <Table
          columns={columns}
          dataSource={filteredDepartments}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 680 }}
        />
      </Card>

      {/* Create / Edit Department Modal */}
      <Modal
        title={editingDept ? 'แก้ไขชื่อแผนก' : 'เพิ่มแผนกใหม่'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        okText={editingDept ? 'บันทึกการแก้ไข' : 'สร้างแผนก'}
        cancelText="ยกเลิก"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="ชื่อแผนก"
            rules={[
              { required: true, message: 'กรุณากรอกชื่อแผนก' },
              { min: 2, message: 'ชื่อแผนกต้องมีความยาวอย่างน้อย 2 ตัวอักษร' },
              { max: 100, message: 'ชื่อแผนกต้องมีความยาวไม่เกิน 100 ตัวอักษร' },
            ]}
          >
            <Input
              placeholder="ตัวอย่าง: เทคโนโลยีสารสนเทศ (IT), บัญชีและการเงิน"
              size="large"
              autoFocus
              onPressEnter={handleSubmit}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default DepartmentsPage;
