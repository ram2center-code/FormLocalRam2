import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Select,
  Switch,
  Popconfirm,
  App,
  Tag,
  Typography,
  Tooltip,
  Row,
  Col,
  Segmented,
  Badge,
  Tabs,
  Empty,
  Dropdown,
} from 'antd';
import {
  FormOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  AppstoreOutlined,
  BarsOutlined,
  TrophyOutlined,
  ApartmentOutlined,
  GlobalOutlined,
  LockOutlined,
  UnlockOutlined,
  ShareAltOutlined,
  EyeOutlined,
  RestOutlined,
  UndoOutlined,
  ClearOutlined,
  MoreOutlined,
  CheckOutlined,
  BarChartOutlined,
  SmileOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAuthStore } from '../../store/authStore';
import { FormShareModal } from './components/FormShareModal';
import {
  getFormsApi,
  getTrashFormsApi,
  updateFormSettingsApi,
  deleteFormApi,
  restoreFormApi,
  deletePermanentlyApi,
  emptyTrashApi,
  FormItem,
  FormVisibility,
  FormStatus,
} from './api/formApi';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export const FormsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  // States
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [search, setSearch] = useState('');
  const [trashSearch, setTrashSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [shareModalFormId, setShareModalFormId] = useState<string | null>(null);

  // 1. ดึงรายการแบบฟอร์มที่ใช้งานอยู่
  const { data: forms = [], isLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: getFormsApi,
  });

  // 2. ดึงรายการแบบฟอร์มในถังขยะ
  const { data: trashForms = [], isLoading: isTrashLoading } = useQuery({
    queryKey: ['forms', 'trash'],
    queryFn: getTrashFormsApi,
  });

  // เข้าสู่ Studio สร้างฟอร์มใหม่ (ยังไม่บันทึกลงฐานข้อมูลจนกว่าจะกด Save ใน Studio)
  const handleCreateNewForm = () => {
    navigate('/forms/new');
  };

  // 5. Mutation: สลับเปิด-ปิดรับคำตอบ
  const toggleAcceptingMutation = useMutation({
    mutationFn: ({ id, isAccepting }: { id: string; isAccepting: boolean }) =>
      updateFormSettingsApi(id, { isAcceptingResponses: isAccepting }),
    onSuccess: (res) => {
      message.success(
        res.isAcceptingResponses ? 'เปิดรับคำตอบเรียบร้อยแล้ว' : 'ปิดรับคำตอบเรียบร้อยแล้ว'
      );
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'ไม่สามารถเปลี่ยนสถานะรับคำตอบได้');
    },
  });

  // 5.1 Mutation: สลับสิทธิ์การเข้าถึง / ความเป็นส่วนตัว (Visibility)
  const updateVisibilityMutation = useMutation({
    mutationFn: ({ id, visibility }: { id: string; visibility: FormVisibility }) =>
      updateFormSettingsApi(id, {
        visibility,
        departmentId: visibility === 'DEPARTMENT' ? (currentUser?.departmentId || undefined) : undefined,
      }),
    onSuccess: (res) => {
      const label =
        res.visibility === 'PUBLIC'
          ? 'ทุกคนในองค์กร (Public)'
          : res.visibility === 'DEPARTMENT'
          ? 'เฉพาะแผนก (Department)'
          : 'ส่วนบุคคล (Private)';
      message.success(`เปลี่ยนสิทธิ์การเข้าถึงเป็น "${label}" เรียบร้อยแล้ว`);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'ไม่สามารถเปลี่ยนการตั้งค่าสิทธิ์การเข้าถึงได้');
    },
  });

  // 5.2 Mutation: สลับการตั้งค่า requireLogin (ต้อง Login / ไม่ต้อง Login)
  const toggleRequireLoginMutation = useMutation({
    mutationFn: ({ id, requireLogin }: { id: string; requireLogin: boolean }) =>
      updateFormSettingsApi(id, { requireLogin }),
    onSuccess: (res) => {
      message.success(
        res.requireLogin
          ? 'ตั้งค่าแบบฟอร์ม: ผู้ตอบต้องเข้าสู่ระบบก่อนตอบ'
          : 'ตั้งค่าแบบฟอร์ม: อนุญาตให้ตอบได้โดยไม่ต้องเข้าสู่ระบบ (สาธารณะ)'
      );
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'ไม่สามารถเปลี่ยนการตั้งค่าได้');
    },
  });

  // 6. Mutation: ย้ายไปถังขยะ (Soft Delete)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFormApi(id),
    onSuccess: (res) => {
      message.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['forms', 'trash'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'ไม่สามารถย้ายแบบฟอร์มไปถังขยะได้');
    },
  });

  // 7. Mutation: กู้คืนจากถังขยะ (Restore)
  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreFormApi(id),
    onSuccess: (res) => {
      message.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['forms', 'trash'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'ไม่สามารถกู้คืนแบบฟอร์มได้');
    },
  });

  // 8. Mutation: ลบถาวร (Delete Permanently)
  const deletePermanentlyMutation = useMutation({
    mutationFn: (id: string) => deletePermanentlyApi(id),
    onSuccess: (res) => {
      message.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['forms', 'trash'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'ไม่สามารถลบแบบฟอร์มอย่างถาวรได้');
    },
  });

  // 9. Mutation: ล้างถังขยะ (Empty Trash)
  const emptyTrashMutation = useMutation({
    mutationFn: emptyTrashApi,
    onSuccess: (res) => {
      message.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['forms', 'trash'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || 'ไม่สามารถล้างถังขยะได้');
    },
  });

  // กรองข้อมูล
  const filteredForms = forms.filter((f) => {
    const matchSearch =
      f.title.toLowerCase().includes(search.toLowerCase().trim()) ||
      (f.description && f.description.toLowerCase().includes(search.toLowerCase().trim()));
    const matchType = typeFilter === 'ALL' || f.type === typeFilter;
    return matchSearch && matchType;
  });

  // กรองข้อมูลถังขยะ
  const filteredTrashForms = trashForms.filter((f) => {
    return (
      f.title.toLowerCase().includes(trashSearch.toLowerCase().trim()) ||
      (f.description && f.description.toLowerCase().includes(trashSearch.toLowerCase().trim()))
    );
  });

  const getVisibilityBadge = (v: FormVisibility, deptName?: string | null, form?: FormItem) => {
    let tag = null;
    switch (v) {
      case 'PUBLIC':
        tag = (
          <Tag
            icon={<GlobalOutlined />}
            color="green"
            style={{ borderRadius: 6, cursor: form?.isOwner ? 'pointer' : 'default', userSelect: 'none' }}
          >
            ทุกคน (Public){form?.isOwner ? ' ▾' : ''}
          </Tag>
        );
        break;
      case 'DEPARTMENT':
        tag = (
          <Tag
            icon={<ApartmentOutlined />}
            color="purple"
            style={{ borderRadius: 6, cursor: form?.isOwner ? 'pointer' : 'default', userSelect: 'none' }}
          >
            {deptName || 'เฉพาะแผนก'}{form?.isOwner ? ' ▾' : ''}
          </Tag>
        );
        break;
      case 'PRIVATE':
        tag = (
          <Tag
            icon={<LockOutlined />}
            color="orange"
            style={{ borderRadius: 6, cursor: form?.isOwner ? 'pointer' : 'default', userSelect: 'none' }}
          >
            ส่วนบุคคล (Private){form?.isOwner ? ' ▾' : ''}
          </Tag>
        );
        break;
      default:
        return null;
    }

    if (!form || !form.isOwner) {
      return tag;
    }

    return (
      <Dropdown
        menu={{
          items: [
            {
              key: 'vis_private',
              icon: <LockOutlined style={{ color: '#fa8c16' }} />,
              label: (
                <Space>
                  <span>ส่วนบุคคล (Private)</span>
                  {v === 'PRIVATE' && <CheckOutlined style={{ color: '#1677ff', fontWeight: 'bold' }} />}
                </Space>
              ),
              disabled: v === 'PRIVATE',
              onClick: () => updateVisibilityMutation.mutate({ id: form.id, visibility: 'PRIVATE' }),
            },
            {
              key: 'vis_dept',
              icon: <ApartmentOutlined style={{ color: '#722ed1' }} />,
              label: (
                <Space>
                  <span>เฉพาะแผนก (Department)</span>
                  {v === 'DEPARTMENT' && <CheckOutlined style={{ color: '#1677ff', fontWeight: 'bold' }} />}
                </Space>
              ),
              disabled: v === 'DEPARTMENT',
              onClick: () => {
                if (!form.departmentId && !currentUser?.departmentId) {
                  message.warning('คุณยังไม่ได้สังกัดแผนก จึงไม่สามารถตั้งค่าแบบฟอร์มเฉพาะแผนกได้');
                  return;
                }
                updateVisibilityMutation.mutate({ id: form.id, visibility: 'DEPARTMENT' });
              },
            },
            {
              key: 'vis_public',
              icon: <GlobalOutlined style={{ color: '#52c41a' }} />,
              label: (
                <Space>
                  <span>ทุกคนในองค์กร (Public)</span>
                  {v === 'PUBLIC' && <CheckOutlined style={{ color: '#1677ff', fontWeight: 'bold' }} />}
                </Space>
              ),
              disabled: v === 'PUBLIC',
              onClick: () => updateVisibilityMutation.mutate({ id: form.id, visibility: 'PUBLIC' }),
            },
          ],
        }}
        trigger={['click']}
      >
        <Tooltip title="คลิกเพื่อเปลี่ยนสิทธิ์การเข้าถึง (ความเป็นส่วนตัว)">
          {tag}
        </Tooltip>
      </Dropdown>
    );
  };

  const getStatusBadge = (s: FormStatus) => {
    switch (s) {
      case 'PUBLISHED':
        return <Badge status="success" text={<Text strong style={{ color: '#52c41a', whiteSpace: 'nowrap' }}>เผยแพร่แล้ว</Text>} />;
      case 'DRAFT':
        return <Badge status="default" text={<Text type="secondary" style={{ whiteSpace: 'nowrap' }}>ร่าง (Draft)</Text>} />;
      case 'ARCHIVED':
        return <Badge status="error" text={<Text type="danger" style={{ whiteSpace: 'nowrap' }}>จัดเก็บ (Archived)</Text>} />;
    }
  };

  // เมนู 3 จุด (...) รวบรวมคำสั่งจัดการแบบฟอร์ม
  const getActionMenuItems = (item: FormItem) => {
    const isSpecialSuite = item.id === 'form_child_screening_suite';
    if (isSpecialSuite) {
      return [
        {
          key: 'open_suite',
          icon: <SmileOutlined style={{ fontSize: 16, color: '#2c7aa0' }} />,
          label: 'เปิดทำแบบคัดกรองเด็ก',
          onClick: () => navigate('/child-screening'),
        },
        {
          key: 'history_suite',
          icon: <HistoryOutlined style={{ fontSize: 16, color: '#1677ff' }} />,
          label: `ประวัติการคัดกรองในฐานข้อมูล (${item.submissionsCount || 0} ครั้ง)`,
          onClick: () => navigate('/child-screening?tab=history'),
        },
        {
          key: 'share',
          icon: <ShareAltOutlined style={{ fontSize: 16 }} />,
          label: 'แชร์ฟอร์ม / คัดลอกลิงก์',
          onClick: () => setShareModalFormId(item.id),
        },
      ];
    }

    return [
    {
      key: 'view',
      icon: <EyeOutlined style={{ fontSize: 16 }} />,
      label: 'เปิดดูฟอร์ม (Runner)',
      onClick: () => navigate(`/forms/${item.id}/view`),
    },
    {
      key: 'submissions',
      icon: <BarChartOutlined style={{ fontSize: 16, color: '#1677ff' }} />,
      label: `วิเคราะห์ข้อมูล / ผลตอบกลับ (${item.submissionsCount || 0} ครั้ง)`,
      onClick: () => navigate(`/forms/${item.id}/submissions`),
    },
    {
      key: 'share',
      icon: <ShareAltOutlined style={{ fontSize: 16 }} />,
      label: 'แชร์ฟอร์ม / คัดลอกลิงก์',
      onClick: () => setShareModalFormId(item.id),
    },
    ...(item.isOwner
      ? [
          {
            key: 'visibility_group',
            icon:
              item.visibility === 'PUBLIC' ? (
                <GlobalOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              ) : item.visibility === 'DEPARTMENT' ? (
                <ApartmentOutlined style={{ color: '#722ed1', fontSize: 16 }} />
              ) : (
                <LockOutlined style={{ color: '#fa8c16', fontSize: 16 }} />
              ),
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 170 }}>
                <span>สิทธิ์เข้าถึง (Visibility)</span>
                <Tag
                  color={
                    item.visibility === 'PUBLIC'
                      ? 'green'
                      : item.visibility === 'DEPARTMENT'
                      ? 'purple'
                      : 'orange'
                  }
                  style={{ margin: 0, fontSize: 11, borderRadius: 4, lineHeight: '18px' }}
                >
                  {item.visibility === 'PUBLIC'
                    ? 'Public'
                    : item.visibility === 'DEPARTMENT'
                    ? 'แผนก'
                    : 'Private'}
                </Tag>
              </div>
            ),
            children: [
              {
                key: 'vis_private',
                icon: <LockOutlined style={{ color: '#fa8c16' }} />,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 200 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>🔒 ส่วนบุคคล (Private)</div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>เฉพาะคุณและผู้ที่แชร์ให้</div>
                    </div>
                    {item.visibility === 'PRIVATE' && (
                      <CheckOutlined style={{ color: '#1677ff', fontWeight: 'bold', marginLeft: 8 }} />
                    )}
                  </div>
                ),
                disabled: item.visibility === 'PRIVATE',
                onClick: () => updateVisibilityMutation.mutate({ id: item.id, visibility: 'PRIVATE' }),
              },
              {
                key: 'vis_department',
                icon: <ApartmentOutlined style={{ color: '#722ed1' }} />,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 200 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>🏢 เฉพาะแผนก (Department)</div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                        {item.department?.name || currentUser?.department?.name || 'สมาชิกในแผนก'}
                      </div>
                    </div>
                    {item.visibility === 'DEPARTMENT' && (
                      <CheckOutlined style={{ color: '#1677ff', fontWeight: 'bold', marginLeft: 8 }} />
                    )}
                  </div>
                ),
                disabled: item.visibility === 'DEPARTMENT',
                onClick: () => {
                  if (!item.departmentId && !currentUser?.departmentId) {
                    message.warning('คุณยังไม่ได้สังกัดแผนก จึงไม่สามารถตั้งค่าแบบฟอร์มเฉพาะแผนกได้');
                    return;
                  }
                  updateVisibilityMutation.mutate({ id: item.id, visibility: 'DEPARTMENT' });
                },
              },
              {
                key: 'vis_public',
                icon: <GlobalOutlined style={{ color: '#52c41a' }} />,
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 200 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>🌐 ทุกคนในองค์กร (Public)</div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>บุคลากรทุกคนเข้าถึงได้</div>
                    </div>
                    {item.visibility === 'PUBLIC' && (
                      <CheckOutlined style={{ color: '#1677ff', fontWeight: 'bold', marginLeft: 8 }} />
                    )}
                  </div>
                ),
                disabled: item.visibility === 'PUBLIC',
                onClick: () => updateVisibilityMutation.mutate({ id: item.id, visibility: 'PUBLIC' }),
              },
            ],
          },
          {
            key: 'toggle_require_login',
            icon: item.requireLogin ? <UnlockOutlined style={{ color: '#52c41a' }} /> : <LockOutlined style={{ color: '#fa8c16' }} />,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 200 }}>
                <span>{item.requireLogin ? 'สิทธิ์: เปลี่ยนเป็นไม่ต้อง Login (Guest)' : 'สิทธิ์: บังคับต้อง Login'}</span>
              </div>
            ),
            onClick: () =>
              toggleRequireLoginMutation.mutate({
                id: item.id,
                requireLogin: !item.requireLogin,
              }),
          },
        ]
      : []),
    {
      key: 'toggle',
      icon: item.isAcceptingResponses ? (
        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
      ) : (
        <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
      ),
      label: item.isAcceptingResponses ? 'กำลังเปิดรับคำตอบ (คลิกเพื่อปิด)' : 'ปิดรับคำตอบอยู่ (คลิกเพื่อเปิด)',
      onClick: () =>
        toggleAcceptingMutation.mutate({
          id: item.id,
          isAccepting: !item.isAcceptingResponses,
        }),
    },
    ...(item.isOwner
      ? [
          { type: 'divider' as const },
          {
            key: 'trash',
            icon: <DeleteOutlined style={{ fontSize: 16 }} />,
            label: 'ย้ายไปถังขยะ',
            danger: true,
            onClick: () => {
              modal.confirm({
                title: 'ย้ายแบบฟอร์มไปที่ถังขยะ?',
                content:
                  'แบบฟอร์มจะถูกปิดรับคำตอบและย้ายไปอยู่ในถังขยะ คุณสามารถกู้คืนได้ทุกเมื่อจากแท็บถังขยะ',
                okText: 'ย้ายไปถังขยะ',
                okType: 'danger',
                cancelText: 'ยกเลิก',
                onOk: () => deleteMutation.mutate(item.id),
              });
            },
          },
        ]
      : []),
  ];
};

  const columns = [
    {
      title: 'ชื่อแบบฟอร์ม',
      key: 'title',
      render: (_: any, record: FormItem) => (
        <Space size="middle">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: record.type === 'SCORE_TEST' ? '#fff7e6' : '#e6f7ff',
              color: record.type === 'SCORE_TEST' ? '#fa8c16' : '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {record.type === 'SCORE_TEST' ? <TrophyOutlined /> : <FormOutlined />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              <a onClick={() => navigate(`/forms/${record.id}/builder`)}>{record.title}</a>
            </div>
            {record.description && (
              <Text type="secondary" ellipsis style={{ maxWidth: 280, fontSize: 13 }}>
                {record.description}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'ประเภท / สิทธิ์เข้าถึง',
      key: 'type_visibility',
      width: 220,
      render: (_: any, record: FormItem) => (
        <Space direction="vertical" size={4}>
          {record.id === 'form_child_screening_suite' ? (
            <Tag style={{ borderRadius: 6, fontWeight: 700, background: 'linear-gradient(135deg, #722ed1 0%, #2c7aa0 100%)', color: '#fff', border: 0 }}>
              ✨ ฟอร์มพิเศษ (Clinical Suite)
            </Tag>
          ) : (
            <Tag color={record.type === 'SCORE_TEST' ? 'gold' : 'blue'} style={{ borderRadius: 6 }}>
              {record.type === 'SCORE_TEST' ? 'แบบทดสอบมีคะแนน' : 'แบบฟอร์มทั่วไป'}
            </Tag>
          )}
          <Space wrap size={[4, 4]}>
            {getVisibilityBadge(record.visibility, record.department?.name, record)}
            {record.requireLogin === false ? (
              <Tag color="cyan" style={{ borderRadius: 6, margin: 0 }}>
                🔓 ไม่ต้อง Login
              </Tag>
            ) : (
              <Tag color="default" style={{ borderRadius: 6, margin: 0 }}>
                🔒 ต้อง Login
              </Tag>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: 'สถานะ',
      key: 'version_status',
      width: 150,
      render: (_: any, record: FormItem) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          <div>{getStatusBadge(record.status)}</div>
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 3 }}>
            เวอร์ชัน {record.latestVersionNumber}
            {record.submissionsCount > 0 && ` (ตอบ ${record.submissionsCount})`}
          </Text>
        </div>
      ),
    },
    {
      title: 'เปิดรับคำตอบ',
      key: 'isAccepting',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: FormItem) => (
        <Tooltip title={!record.isOwner ? 'เฉพาะเจ้าของหรือ Admin' : undefined}>
          <Switch
            checked={record.isAcceptingResponses}
            disabled={!record.isOwner || toggleAcceptingMutation.isPending}
            checkedChildren="เปิดรับ"
            unCheckedChildren="ปิดรับ"
            onChange={(checked) =>
              toggleAcceptingMutation.mutate({ id: record.id, isAccepting: checked })
            }
          />
        </Tooltip>
      ),
    },
    {
      title: 'เจ้าของฟอร์ม',
      key: 'owner',
      width: 160,
      render: (_: any, record: FormItem) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 500 }}>{record.owner?.fullName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>@{record.owner?.username}</Text>
        </div>
      ),
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 130,
      align: 'center' as const,
      render: (_: any, record: FormItem) => (
        <Space size="middle">
          {record.id === 'form_child_screening_suite' ? (
            <Button
              type="primary"
              size="middle"
              icon={<SmileOutlined />}
              onClick={() => navigate('/child-screening')}
              style={{ height: 34, borderRadius: 6, background: '#2c7aa0', borderColor: '#2c7aa0' }}
            >
              เข้าสู่ระบบ
            </Button>
          ) : (
            <Button
              type="primary"
              size="middle"
              icon={<EditOutlined />}
              onClick={() => navigate(`/forms/${record.id}/builder`)}
              style={{ height: 34, borderRadius: 6 }}
            >
              แก้ไข
            </Button>
          )}

          <Dropdown
            menu={{ items: getActionMenuItems(record) }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<MoreOutlined style={{ fontSize: 18 }} />}
              style={{ height: 34, width: 34, borderRadius: 6 }}
              title="เมนูเพิ่มเติม"
            />
          </Dropdown>
        </Space>
      ),
    },
  ];

  // คอลัมน์สำหรับตารางถังขยะ (Trash)
  const trashColumns = [
    {
      title: 'ชื่อแบบฟอร์ม',
      key: 'title',
      render: (_: any, record: FormItem) => (
        <Space size="middle">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              backgroundColor: record.type === 'SCORE_TEST' ? '#fff7e6' : '#f5f5f5',
              color: record.type === 'SCORE_TEST' ? '#fa8c16' : '#8c8c8c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {record.type === 'SCORE_TEST' ? <TrophyOutlined /> : <FormOutlined />}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#595959' }}>{record.title}</div>
            {record.description && (
              <Text type="secondary" ellipsis style={{ maxWidth: 280, fontSize: 13 }}>
                {record.description}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'ประเภท / สิทธิ์',
      key: 'type_visibility',
      width: 180,
      render: (_: any, record: FormItem) => (
        <Space direction="vertical" size={4}>
          <Tag color={record.type === 'SCORE_TEST' ? 'gold' : 'blue'} style={{ borderRadius: 6 }}>
            {record.type === 'SCORE_TEST' ? 'แบบทดสอบมีคะแนน' : 'แบบฟอร์มทั่วไป'}
          </Tag>
          {getVisibilityBadge(record.visibility, record.department?.name)}
        </Space>
      ),
    },
    {
      title: 'วันที่ย้ายลงถังขยะ',
      key: 'deletedAt',
      width: 190,
      render: (_: any, record: FormItem) => (
        <Space direction="vertical" size={2}>
          <Text style={{ fontSize: 13, fontWeight: 500 }}>
            {record.deletedAt ? dayjs(record.deletedAt).format('DD/MM/YYYY HH:mm น.') : '-'}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            เวอร์ชัน {record.latestVersionNumber}
          </Text>
        </Space>
      ),
    },
    {
      title: 'ผลตอบกลับเดิม',
      key: 'submissions',
      width: 130,
      render: (_: any, record: FormItem) => (
        <Tag color={record.submissionsCount > 0 ? 'purple' : 'default'} style={{ borderRadius: 6 }}>
          {record.submissionsCount} ครั้ง
        </Tag>
      ),
    },
    {
      title: 'เจ้าของฟอร์ม',
      key: 'owner',
      width: 160,
      render: (_: any, record: FormItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.owner?.fullName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>@{record.owner?.username}</Text>
        </div>
      ),
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 200,
      render: (_: any, record: FormItem) => (
        <Space size="middle">
          <Tooltip title="กู้คืนแบบฟอร์มกลับมาใช้งาน">
            <Button
              type="primary"
              ghost
              icon={<UndoOutlined />}
              onClick={() => restoreMutation.mutate(record.id)}
              loading={restoreMutation.isPending}
              style={{ borderRadius: 6 }}
            >
              กู้คืน
            </Button>
          </Tooltip>

          <Popconfirm
            title="ยืนยันการลบแบบฟอร์มอย่างถาวร"
            description="ข้อมูลแบบฟอร์ม คำถาม และประวัติการตอบทั้งหมดจะถูกลบออกจากฐานข้อมูลอย่างถาวร ไม่สามารถกู้คืนได้"
            okText="ลบถาวร"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true, loading: deletePermanentlyMutation.isPending }}
            onConfirm={() => deletePermanentlyMutation.mutate(record.id)}
          >
            <Button
              danger
              type="text"
              icon={<DeleteOutlined />}
              style={{ borderRadius: 6, fontWeight: 500 }}
            >
              ลบถาวร
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* Header */}
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
            จัดการแบบฟอร์ม (Form Management)
          </Title>
          <Text type="secondary">
            สร้าง ออกแบบ และควบคุมการเปิด-ปิดรับคำตอบของแบบฟอร์มภายในองค์กร
          </Text>
        </div>

        <Space wrap size="small">
          <Button
            icon={<ApartmentOutlined style={{ color: '#722ed1' }} />}
            onClick={() => navigate('/department-forms')}
            size="large"
            style={{
              height: 44,
              fontWeight: 500,
              borderRadius: 8,
              borderColor: '#d3adf7',
              color: '#722ed1',
              backgroundColor: '#f9f0ff',
            }}
          >
            คลังฟอร์มตามแผนก
          </Button>
          {activeTab === 'active' && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateNewForm}
              size="large"
              style={{ height: 44, fontWeight: 600, borderRadius: 8 }}
            >
              สร้างแบบฟอร์มใหม่
            </Button>
          )}
        </Space>
      </div>

      {/* Tabs: แบบฟอร์มทั้งหมด vs ถังขยะ */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as 'active' | 'trash')}
        size="large"
        items={[
          {
            key: 'active',
            label: (
              <Space>
                <FormOutlined />
                <span>แบบฟอร์มทั้งหมด</span>
                <Badge
                  count={forms.length}
                  overflowCount={999}
                  style={{ backgroundColor: '#1677ff' }}
                />
              </Space>
            ),
          },
          {
            key: 'trash',
            label: (
              <Space>
                <RestOutlined />
                <span>ถังขยะ (Trash)</span>
                {trashForms.length > 0 && (
                  <Badge
                    count={trashForms.length}
                    overflowCount={999}
                    style={{ backgroundColor: '#ff4d4f' }}
                  />
                )}
              </Space>
            ),
          },
        ]}
      />

      {/* TAB 1: รายการแบบฟอร์มที่ใช้งานอยู่ */}
      {activeTab === 'active' && (
        <>
          {/* Toolbar & Filters */}
          <Card
            style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <Space wrap size="middle">
                <Input
                  placeholder="ค้นหาชื่อแบบฟอร์ม หรือคำอธิบาย..."
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  allowClear
                  style={{ width: 280, height: 40 }}
                />

                <Select
                  value={typeFilter}
                  onChange={(val) => setTypeFilter(val)}
                  style={{ width: 200, height: 40 }}
                >
                  <Option value="ALL">ประเภท: ทั้งหมด</Option>
                  <Option value="GENERAL">ฟอร์มทั่วไป (General)</Option>
                  <Option value="SCORE_TEST">แบบทดสอบมีคะแนน (Test)</Option>
                </Select>
              </Space>

              <Segmented
                value={viewMode}
                onChange={(val) => setViewMode(val as 'grid' | 'table')}
                options={[
                  { value: 'grid', icon: <AppstoreOutlined /> },
                  { value: 'table', icon: <BarsOutlined /> },
                ]}
                style={{ height: 38, padding: 3 }}
              />
            </div>
          </Card>

          {/* Content: Grid View or Table View */}
          {viewMode === 'table' ? (
            <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 20 }}>
              <Table
                columns={columns}
                dataSource={filteredForms}
                rowKey="id"
                loading={isLoading}
                pagination={{ pageSize: 8, showSizeChanger: true }}
                scroll={{ x: 1050 }}
              />
            </Card>
          ) : (
            <Row gutter={[16, 16]}>
              {filteredForms.map((item) => (
                <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
                  <Card
                    hoverable
                    style={{
                      borderRadius: 12,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: item.id === 'form_child_screening_suite' ? '1.5px solid #bce1f3' : '1px solid #f0f0f0',
                      background: item.id === 'form_child_screening_suite' ? 'linear-gradient(145deg, #ffffff 0%, #f6fafd 100%)' : '#ffffff',
                    }}
                    bodyStyle={{
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      flex: 1,
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      {/* Card Header: Type Badge & Status */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 12,
                        }}
                      >
                        {item.id === 'form_child_screening_suite' ? (
                          <Tag style={{ borderRadius: 6, fontWeight: 700, background: 'linear-gradient(135deg, #722ed1 0%, #2c7aa0 100%)', color: '#fff', border: 0 }}>
                            ✨ ฟอร์มพิเศษ (Clinical Suite)
                          </Tag>
                        ) : (
                          <Tag
                            color={item.type === 'SCORE_TEST' ? 'gold' : 'blue'}
                            icon={item.type === 'SCORE_TEST' ? <TrophyOutlined /> : <FormOutlined />}
                            style={{ borderRadius: 6, fontWeight: 500 }}
                          >
                            {item.type === 'SCORE_TEST' ? 'แบบทดสอบ' : 'แบบฟอร์ม'}
                          </Tag>
                        )}
                        {getStatusBadge(item.status)}
                      </div>

                      {/* Title & Description */}
                      <Title
                        level={5}
                        ellipsis={{ rows: 2 }}
                        style={{ margin: '0 0 8px 0', fontSize: 16, cursor: 'pointer' }}
                        onClick={() => navigate(item.id === 'form_child_screening_suite' ? '/child-screening' : `/forms/${item.id}/builder`)}
                      >
                        {item.title}
                      </Title>
                      <Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2 }}
                        style={{ fontSize: 13, minHeight: 38, marginBottom: 12 }}
                      >
                        {item.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
                      </Paragraph>

                      {/* Meta Tags */}
                      <Space wrap size={[6, 6]} style={{ marginBottom: 16 }}>
                        {getVisibilityBadge(item.visibility, item.department?.name, item)}
                        {item.requireLogin === false ? (
                          <Tag color="cyan" style={{ borderRadius: 6, margin: 0 }}>
                            🔓 ไม่ต้อง Login
                          </Tag>
                        ) : (
                          <Tag color="default" style={{ borderRadius: 6, margin: 0 }}>
                            🔒 ต้อง Login
                          </Tag>
                        )}
                        {item.id === 'form_child_screening_suite' && (
                          <Tag color="cyan" style={{ borderRadius: 6, margin: 0, fontWeight: 600 }}>
                            👶 6 เครื่องมือมาตรฐาน
                          </Tag>
                        )}
                      </Space>
                    </div>

                    {/* Card Footer */}
                    <div style={{ borderTop: '1px solid #f5f5f5', paddingTop: 14 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 12,
                          fontSize: 12,
                          color: '#8c8c8c',
                        }}
                      >
                        <span>เวอร์ชัน {item.latestVersionNumber}</span>
                        <a
                          onClick={() => navigate(item.id === 'form_child_screening_suite' ? '/child-screening?tab=history' : `/forms/${item.id}/submissions`)}
                          style={{ color: '#1677ff', fontWeight: 500 }}
                          title="คลิกเพื่อดูสถิติและวิเคราะห์ผลตอบกลับ"
                        >
                          {item.id === 'form_child_screening_suite' ? `📊 ประเมินแล้ว: ${item.submissionsCount} ครั้ง` : `📊 วิเคราะห์ข้อมูล: ${item.submissionsCount} ครั้ง`}
                        </a>
                      </div>

                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Button
                          type="primary"
                          icon={item.id === 'form_child_screening_suite' ? <SmileOutlined /> : <EditOutlined />}
                          onClick={() => navigate(item.id === 'form_child_screening_suite' ? '/child-screening' : `/forms/${item.id}/builder`)}
                          style={{
                            flex: 1,
                            height: 38,
                            borderRadius: 8,
                            fontWeight: 500,
                            backgroundColor: item.id === 'form_child_screening_suite' ? '#2c7aa0' : undefined,
                            borderColor: item.id === 'form_child_screening_suite' ? '#2c7aa0' : undefined,
                          }}
                        >
                          {item.id === 'form_child_screening_suite' ? 'เข้าสู่ระบบคัดกรอง' : 'ออกแบบฟอร์ม'}
                        </Button>

                        <Dropdown
                          menu={{ items: getActionMenuItems(item) }}
                          trigger={['click']}
                          placement="bottomRight"
                        >
                          <Button
                            icon={<MoreOutlined style={{ fontSize: 20 }} />}
                            style={{
                              height: 38,
                              width: 38,
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="เมนูเพิ่มเติม"
                          />
                        </Dropdown>
                      </div>
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </>
      )}

      {/* TAB 2: ถังขยะ (Trash) */}
      {activeTab === 'trash' && (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Card
            style={{ borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <Space wrap size="middle">
                <Input
                  placeholder="ค้นหาในถังขยะ..."
                  prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                  value={trashSearch}
                  onChange={(e) => setTrashSearch(e.target.value)}
                  allowClear
                  style={{ width: 280, height: 40 }}
                />
                <Text type="secondary">
                  แบบฟอร์มในถังขยะจะไม่เปิดรับคำตอบ สามารถกู้คืนหรือลบถาวรได้
                </Text>
              </Space>

              {trashForms.length > 0 && (
                <Popconfirm
                  title="ยืนยันการล้างถังขยะทั้งหมด?"
                  description="แบบฟอร์มทั้งหมดในถังขยะจะถูกลบออกจากฐานข้อมูลอย่างถาวร ไม่สามารถกู้คืนได้อีก ยืนยันหรือไม่?"
                  okText="ล้างถังขยะ"
                  cancelText="ยกเลิก"
                  okButtonProps={{ danger: true, loading: emptyTrashMutation.isPending }}
                  onConfirm={() => emptyTrashMutation.mutate()}
                >
                  <Button
                    danger
                    icon={<ClearOutlined />}
                    style={{ height: 40, borderRadius: 8, fontWeight: 500 }}
                  >
                    ล้างถังขยะทั้งหมด ({trashForms.length})
                  </Button>
                </Popconfirm>
              )}
            </div>
          </Card>

          <Card style={{ borderRadius: 12 }} bodyStyle={{ padding: 20 }}>
            {filteredTrashForms.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  trashSearch
                    ? 'ไม่พบแบบฟอร์มในถังขยะตามคำค้นหา'
                    : 'ถังขยะว่างเปล่า ไม่มีแบบฟอร์มที่ถูกลบ'
                }
              />
            ) : (
              <Table
                columns={trashColumns}
                dataSource={filteredTrashForms}
                rowKey="id"
                loading={isTrashLoading}
                pagination={{ pageSize: 8, showSizeChanger: true }}
                scroll={{ x: 1050 }}
              />
            )}
          </Card>
        </Space>
      )}

      {/* Modal: แชร์แบบฟอร์มและคัดลอกลิงก์ */}
      <FormShareModal
        formId={shareModalFormId}
        open={!!shareModalFormId}
        onClose={() => setShareModalFormId(null)}
      />
    </Space>
  );
};

export default FormsPage;
