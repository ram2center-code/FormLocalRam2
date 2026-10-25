import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Tag,
  Typography,
  Space,
  Empty,
  Spin,
  Tooltip,
  App,
  Drawer,
  Radio,
  Statistic,
  Divider,
  Grid,
} from 'antd';
import {
  ApartmentOutlined,
  SearchOutlined,
  FormOutlined,
  EyeOutlined,
  ShareAltOutlined,
  TabletOutlined,
  CopyOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  GlobalOutlined,
  AppstoreOutlined,
  BarsOutlined,
  BarChartOutlined,
  ClearOutlined,
  FolderOpenOutlined,
  UserOutlined,
  SmileOutlined,
  HistoryOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getFormsApi, FormItem, getFormByIdApi } from '../api/formApi';
import { getDepartmentsApi } from '../../departments/api/departmentApi';
import { FormShareModal } from '../components/FormShareModal';
import { useAuthStore } from '../../../store/authStore';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

export const DepartmentFormsPage: React.FC = () => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const currentUser = useAuthStore((state) => state.user);

  // Responsive flags
  const isMobile = !screens.sm; // < 576px

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grouped' | 'grid'>('grouped');
  const [isPatientMode, setIsPatientMode] = useState<boolean>(false);

  // Modal / Drawer states
  const [shareModalFormId, setShareModalFormId] = useState<string | null>(null);
  const [previewFormId, setPreviewFormId] = useState<string | null>(null);

  // 1. ดึงรายการแผนกทั้งหมด
  const { data: departments = [], isLoading: isDeptLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartmentsApi,
  });

  // 2. ดึงรายการแบบฟอร์มทั้งหมดที่ผู้ใช้มีสิทธิ์เข้าถึง
  const { data: forms = [], isLoading: isFormsLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: getFormsApi,
  });

  // 3. ดึงข้อมูลฟอร์มสำหรับ Preview Drawer
  const { data: previewFormDetail, isLoading: isPreviewLoading } = useQuery({
    queryKey: ['form-preview', previewFormId],
    queryFn: () => getFormByIdApi(previewFormId!),
    enabled: !!previewFormId,
  });

  // คัดกรองเฉพาะฟอร์มที่เปิดให้ใช้งาน (ไม่รวม Draft ที่ยังไม่พร้อม หรืออนุญาตให้เห็นทั้งหมด)
  // ปกติหน้าเลือกฟอร์มใช้งานจะเน้นฟอร์มที่สถานะ PUBLISHED หรือฟอร์มที่ตนเองเป็นเจ้าของ
  const activeForms = useMemo(() => {
    return forms.filter((f) => f.status === 'PUBLISHED' || f.isOwner || currentUser?.role === 'ADMIN');
  }, [forms, currentUser]);

  // เมื่อเข้าสู่หน้าเว็บ หากผู้ใช้สังกัดแผนก ให้แสดงฟอร์มของแผนกตนเองเป็นตัวเลือกเริ่มต้น
  useEffect(() => {
    if (currentUser?.departmentId && selectedDeptId === 'ALL' && forms.length > 0) {
      const hasDeptForms = forms.some((f) => f.departmentId === currentUser.departmentId);
      if (hasDeptForms) {
        setSelectedDeptId(currentUser.departmentId);
      }
    }
  }, [currentUser?.departmentId, forms]);

  // สถิติภาพรวม
  const stats = useMemo(() => {
    const totalForms = activeForms.length;
    const openForms = activeForms.filter((f) => f.isAcceptingResponses).length;
    const scoreTests = activeForms.filter((f) => f.type === 'SCORE_TEST').length;
    const generalForms = activeForms.filter((f) => f.type === 'GENERAL').length;
    const totalSubmissions = activeForms.reduce((acc, f) => acc + (f.submissionsCount || 0), 0);

    return { totalForms, openForms, scoreTests, generalForms, totalSubmissions };
  }, [activeForms]);

  // คัดกรองตาม Search, Type, Status, Dept
  const filteredForms = useMemo(() => {
    return activeForms.filter((f) => {
      // 1. Search text
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        const titleMatch = f.title.toLowerCase().includes(query);
        const descMatch = (f.description || '').toLowerCase().includes(query);
        const deptMatch = (f.department?.name || 'ส่วนกลาง / ทั่วไป').toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !deptMatch) return false;
      }

      // 2. Department filter
      if (selectedDeptId !== 'ALL') {
        if (selectedDeptId === 'GENERAL') {
          if (f.departmentId) return false;
        } else {
          if (f.departmentId !== selectedDeptId) return false;
        }
      }

      // 3. Type filter
      if (typeFilter !== 'ALL' && f.type !== typeFilter) return false;

      // 4. Status filter
      if (statusFilter === 'OPEN' && !f.isAcceptingResponses) return false;

      return true;
    });
  }, [activeForms, search, selectedDeptId, typeFilter, statusFilter]);

  // จัดกลุ่มฟอร์มตามแผนก
  const groupedByDepartment = useMemo(() => {
    const map = new Map<string, { id: string; name: string; forms: FormItem[] }>();

    // เริ่มต้นจากแผนกที่มีในระบบ
    departments.forEach((dept) => {
      map.set(dept.id, {
        id: dept.id,
        name: dept.name,
        forms: [],
      });
    });

    // เพิ่มกลุ่ม "ส่วนกลาง / ไม่ระบุแผนก"
    map.set('GENERAL', {
      id: 'GENERAL',
      name: 'แบบฟอร์มส่วนกลาง / ทั่วไป (General)',
      forms: [],
    });

    // เติมฟอร์มลงกลุ่ม
    filteredForms.forEach((f) => {
      const deptId = f.departmentId || 'GENERAL';
      if (!map.has(deptId)) {
        map.set(deptId, {
          id: deptId,
          name: f.department?.name || 'แผนกอื่นๆ',
          forms: [],
        });
      }
      map.get(deptId)!.forms.push(f);
    });

    // กรองเอาเฉพาะกลุ่มที่มีฟอร์มอยู่ (หรือถ้าเลือกแผนกเจาะจง ให้แสดงกลุ่มนั้น)
    const result: Array<{ id: string; name: string; forms: FormItem[] }> = [];
    map.forEach((group) => {
      if (selectedDeptId !== 'ALL') {
        if (group.id === selectedDeptId) {
          result.push(group);
        }
      } else if (group.forms.length > 0) {
        result.push(group);
      }
    });

    return result;
  }, [departments, filteredForms, selectedDeptId]);

  // จำนวนฟอร์มของแต่ละแผนก (สำหรับแสดงบนชิป Badge)
  const deptFormCountMap = useMemo(() => {
    const counts: Record<string, number> = { ALL: activeForms.length, GENERAL: 0 };
    activeForms.forEach((f) => {
      if (!f.departmentId) {
        counts.GENERAL = (counts.GENERAL || 0) + 1;
      } else {
        counts[f.departmentId] = (counts[f.departmentId] || 0) + 1;
      }
    });
    return counts;
  }, [activeForms]);

  // คัดลอกลิงก์ฟอร์ม
  const handleCopyLink = (formId: string, formTitle: string) => {
    const isSpecialSuite = formId === 'form_child_screening_suite' || formId.includes('screening_suite');
    const url = isSpecialSuite
      ? 'https://formlocalram2.vercel.app/tools/child-screening-suite.html'
      : `${window.location.origin}/forms/${formId}/fill`;
    navigator.clipboard.writeText(url);
    message.success(`คัดลอกลิงก์สำหรับ "${formTitle}" แล้ว`);
  };

  // เรนเดอร์การ์ดแบบฟอร์ม (Form Card) ที่รองรับ Responsive และ Touch Target บน iPad / มือถือ
  const renderFormCard = (form: FormItem) => {
    const isScore = form.type === 'SCORE_TEST';
    const isOwnerOrAdmin = form.isOwner || currentUser?.role === 'ADMIN';

    // กรณีอยู่ในโหมดคนไข้ (Patient Mode): แสดงการ์ดขนาดใหญ่ เรียบง่าย พร้อมปุ่มสัมผัสขนาดใหญ่พิเศษ
    if (isPatientMode) {
      return (
        <Col xs={24} sm={12} lg={8} xl={8} key={form.id}>
          <Card
            hoverable
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 16,
              border: '2px solid #cbd5e1',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              backgroundColor: '#fff',
              transition: 'all 0.25s ease',
            }}
            styles={{
              body: {
                padding: isMobile ? 18 : 24,
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              },
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Tag
                color={form.department ? 'purple' : 'blue'}
                icon={<ApartmentOutlined />}
                style={{ borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 600, margin: 0 }}
              >
                {form.department?.name || 'ส่วนกลาง / ทั่วไป'}
              </Tag>
              <Tag color={isScore ? 'gold' : 'cyan'} style={{ borderRadius: 6, padding: '4px 10px', fontSize: 13, fontWeight: 600, margin: 0 }}>
                {isScore ? '🏆 แบบประเมิน' : '📝 แบบสอบถาม'}
              </Tag>
            </div>

            <Title
              level={4}
              style={{
                margin: '0 0 10px 0',
                fontSize: isMobile ? 17 : 19,
                fontWeight: 700,
                color: '#0f172a',
                lineHeight: 1.4,
                minHeight: 52,
              }}
            >
              {form.title}
            </Title>

            <Paragraph
              type="secondary"
              style={{
                fontSize: 14,
                marginBottom: 16,
                flex: 1,
                lineHeight: 1.6,
                color: '#475569',
              }}
              ellipsis={{ rows: 2, tooltip: form.description || undefined }}
            >
              {form.description || 'แตะปุ่มด้านล่างเพื่อเริ่มทำแบบประเมินนี้'}
            </Paragraph>

            {form.pdpaEnabled && (
              <Tag
                color="green"
                icon={<SafetyCertificateOutlined />}
                style={{ borderRadius: 6, padding: '3px 8px', fontSize: 12, marginBottom: 16, alignSelf: 'flex-start' }}
              >
                มีระบบคุ้มครองข้อมูลส่วนบุคคล (PDPA)
              </Tag>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
              <Button
                type="primary"
                icon={<FormOutlined />}
                size="large"
                disabled={!form.isAcceptingResponses}
                onClick={() => navigate(`/forms/${form.id}/fill`)}
                style={{
                  height: 50,
                  fontSize: 16,
                  fontWeight: 700,
                  borderRadius: 12,
                  backgroundColor: '#16a34a',
                  borderColor: '#16a34a',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                }}
              >
                แตะที่นี่เพื่อเริ่มทำแบบประเมิน
              </Button>

              <Button
                icon={<ShareAltOutlined />}
                size="large"
                onClick={() => setShareModalFormId(form.id)}
                style={{
                  height: 42,
                  fontSize: 14,
                  borderRadius: 10,
                  fontWeight: 500,
                }}
              >
                สแกน QR Code ทำบนมือถือตนเอง
              </Button>
            </div>
          </Card>
        </Col>
      );
    }

    const isSpecialSuite = form.id === 'form_child_screening_suite' || form.id.includes('screening_suite');

    return (
      <Col xs={24} sm={12} lg={8} xl={8} key={form.id}>
        <Card
          hoverable
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 14,
            border: isSpecialSuite ? '1.5px solid #bce1f3' : '1px solid #e2e8f0',
            background: isSpecialSuite ? 'linear-gradient(145deg, #ffffff 0%, #f6fafd 100%)' : '#ffffff',
            overflow: 'hidden',
            boxShadow: isSpecialSuite ? '0 4px 14px rgba(44, 122, 160, 0.08)' : '0 2px 8px rgba(0,0,0,0.04)',
            transition: 'all 0.25s ease',
          }}
          styles={{
            body: {
              padding: isMobile ? 16 : 20,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            },
          }}
        >
          {/* Header แถบหัวการ์ด: ป้ายแผนก & ประเภทฟอร์ม */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Tag
              color={form.department ? 'purple' : 'blue'}
              icon={<ApartmentOutlined />}
              style={{
                borderRadius: 6,
                padding: '3px 8px',
                fontSize: 12,
                fontWeight: 500,
                margin: 0,
                maxWidth: '65%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={form.department?.name || 'ส่วนกลาง / ทั่วไป'}
            >
              {form.department?.name || 'ส่วนกลาง / ทั่วไป'}
            </Tag>

            {isSpecialSuite ? (
              <Tag
                style={{
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 12,
                  fontWeight: 700,
                  margin: 0,
                  background: 'linear-gradient(135deg, #722ed1 0%, #2c7aa0 100%)',
                  color: '#ffffff',
                  border: 0,
                }}
              >
                ✨ ฟอร์มพิเศษ (Clinical Suite)
              </Tag>
            ) : (
              <Tag
                color={isScore ? 'gold' : 'cyan'}
                icon={isScore ? <TrophyOutlined /> : <FormOutlined />}
                style={{
                  borderRadius: 6,
                  padding: '3px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                {isScore ? 'แบบประเมิน/ข้อสอบ' : 'แบบฟอร์ม'}
              </Tag>
            )}
          </div>

          {/* ชื่อแบบฟอร์ม */}
          <Title
            level={5}
            style={{
              margin: '0 0 8px 0',
              fontSize: isMobile ? 15 : 16,
              fontWeight: 700,
              color: '#0f172a',
              lineHeight: 1.4,
              minHeight: 44,
            }}
            ellipsis={{ rows: 2, tooltip: form.title }}
          >
            {form.title}
          </Title>

          {/* คำอธิบายแบบฟอร์ม */}
          <Paragraph
            type="secondary"
            style={{
              fontSize: 13,
              marginBottom: 14,
              flex: 1,
              lineHeight: 1.5,
              color: '#64748b',
            }}
            ellipsis={{ rows: 2, tooltip: form.description || undefined }}
          >
            {form.description || 'ไม่มีคำอธิบายสำหรับแบบฟอร์มนี้'}
          </Paragraph>

          {/* ป้ายแท็กคุณสมบัติ (PDPA, สถานะรับคำตอบ, สิทธิ์การเข้าถึง) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {/* สถานะเปิด/ปิดรับคำตอบ */}
            {form.isAcceptingResponses ? (
              <Tag color="success" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                🟢 เปิดรับคำตอบ
              </Tag>
            ) : (
              <Tag color="error" style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                🔴 ปิดรับคำตอบ
              </Tag>
            )}

            {/* PDPA Protection Tag */}
            {form.pdpaEnabled && (
              <Tag color="green" icon={<SafetyCertificateOutlined />} style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                PDPA
              </Tag>
            )}

            {/* Login Required Tag */}
            {form.requireLogin ? (
              <Tag color="default" icon={<LockOutlined />} style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                ต้องเข้าสู่ระบบ
              </Tag>
            ) : (
              <Tag color="blue" icon={<GlobalOutlined />} style={{ borderRadius: 4, margin: 0, fontSize: 11 }}>
                สาธารณะ
              </Tag>
            )}

            {isSpecialSuite && (
              <Tag color="cyan" style={{ borderRadius: 4, margin: 0, fontSize: 11, fontWeight: 600 }}>
                👶 6 เครื่องมือมาตรฐาน
              </Tag>
            )}

            {/* จำนวนผู้ตอบแบบสอบถาม */}
            <Tag color={isSpecialSuite ? "processing" : "default"} style={{ borderRadius: 4, margin: 0, fontSize: 11, fontWeight: isSpecialSuite ? 600 : 400 }}>
              📊 {isSpecialSuite ? `ประเมินแล้ว ${form.submissionsCount || 0} ครั้ง` : `ตอบแล้ว ${form.submissionsCount || 0} ครั้ง`}
            </Tag>
          </div>

          <Divider style={{ margin: '8px 0 14px 0' }} />

          {/* ปุ่มคำสั่งหลัก: เริ่มทำฟอร์ม & โหมด iPad คีออสก์ (Touch-friendly target 42-46px) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {/* 1. ปุ่มเริ่มทำแบบฟอร์ม (Primary Action) */}
              <Button
                type="primary"
                icon={isSpecialSuite ? <SmileOutlined /> : <FormOutlined />}
                size="large"
                disabled={!form.isAcceptingResponses}
                onClick={() => {
                  if (isSpecialSuite) {
                    navigate('/child-screening');
                  } else {
                    navigate(`/forms/${form.id}/fill`);
                  }
                }}
                style={{
                  flex: 1,
                  height: 44,
                  fontSize: 14,
                  fontWeight: 600,
                  borderRadius: 8,
                  backgroundColor: isSpecialSuite ? '#2c7aa0' : '#1677ff',
                  borderColor: isSpecialSuite ? '#2c7aa0' : '#1677ff',
                }}
              >
                {isSpecialSuite ? 'เริ่มทำชุดแบบคัดกรอง' : 'เริ่มทำแบบประเมิน'}
              </Button>

              {/* 2. ปุ่มโหมด iPad / คีออสก์ สำหรับส่งให้ผู้ป่วย/ผู้รับบริการทำแบบเต็มจอ */}
              {/* <Tooltip title="เปิดโหมดเต็มจอ เหมาะสำหรับเปิดบน iPad หรือตู้ Kiosk ยื่นให้คนไข้กรอก">
                <Button
                  icon={<TabletOutlined style={{ color: '#722ed1', fontSize: 16 }} />}
                  size="large"
                  disabled={!form.isAcceptingResponses}
                  onClick={() => navigate(`/forms/${form.id}/view`)}
                  style={{
                    height: 44,
                    minWidth: 44,
                    padding: '0 12px',
                    borderRadius: 8,
                    borderColor: '#d3adf7',
                    backgroundColor: '#f9f0ff',
                    color: '#722ed1',
                    fontWeight: 500,
                  }}
                >
                  {!isMobile && 'โหมด iPad'}
                </Button>
              </Tooltip> */}
            </div>

            {/* ปุ่มเสริม: ดูตัวอย่าง, แชร์, คัดลอกลิงก์, ผลวิเคราะห์ */}
            {isSpecialSuite ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
                <Tooltip title="ดูประวัติการคัดกรองทั้งหมดในฐานข้อมูล">
                  <Button
                    size="middle"
                    icon={<HistoryOutlined style={{ color: '#2c7aa0' }} />}
                    onClick={() => navigate('/child-screening?tab=history')}
                    style={{ flex: 1, borderRadius: 6, fontSize: 12, height: 34, fontWeight: 500 }}
                  >
                    ประวัติ ({form.submissionsCount || 0})
                  </Button>
                </Tooltip>

                <Tooltip title="เปิดทำแบบคัดกรองในแท็บใหม่แยกต่างหาก (สะดวกเมื่อต้องการส่งต่อ)">
                  <Button
                    size="middle"
                    icon={<ExportOutlined />}
                    onClick={() => window.open('/tools/child-screening-suite.html', '_blank')}
                    style={{ flex: 1, borderRadius: 6, fontSize: 12, height: 34 }}
                  >
                    แท็บใหม่
                  </Button>
                </Tooltip>

                <Tooltip title="แชร์ QR Code และลิงก์">
                  <Button
                    size="middle"
                    icon={<ShareAltOutlined />}
                    onClick={() => setShareModalFormId(form.id)}
                    style={{ borderRadius: 6, width: 36, height: 34, padding: 0 }}
                  />
                </Tooltip>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
                <Tooltip title="ดูตัวอย่างคำถามในฟอร์ม">
                  <Button
                    size="middle"
                    icon={<EyeOutlined />}
                    onClick={() => setPreviewFormId(form.id)}
                    style={{ flex: 1, borderRadius: 6, fontSize: 12, height: 34 }}
                  >
                    ตัวอย่าง
                  </Button>
                </Tooltip>

                <Tooltip title="แชร์ QR Code และลิงก์">
                  <Button
                    size="middle"
                    icon={<ShareAltOutlined />}
                    onClick={() => setShareModalFormId(form.id)}
                    style={{ flex: 1, borderRadius: 6, fontSize: 12, height: 34 }}
                  >
                    แชร์
                  </Button>
                </Tooltip>

                <Tooltip title="คัดลอกลิงก์กรอกฟอร์มด่วน">
                  <Button
                    size="middle"
                    icon={<CopyOutlined />}
                    onClick={() => handleCopyLink(form.id, form.title)}
                    style={{ borderRadius: 6, width: 36, height: 34, padding: 0 }}
                  />
                </Tooltip>

                {isOwnerOrAdmin && (
                  <Tooltip title="ดูผลตอบกลับ / สถิติ">
                    <Button
                      size="middle"
                      icon={<BarChartOutlined style={{ color: '#1677ff' }} />}
                      onClick={() => navigate(`/forms/${form.id}/submissions`)}
                      style={{ borderRadius: 6, width: 36, height: 34, padding: 0 }}
                    />
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </Card>
      </Col>
    );
  };

  const isLoading = isDeptLoading || isFormsLoading;

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 40 }}>
      {/* Patient Kiosk Mode Banner */}
      {isPatientMode ? (
        <Card
          style={{
            borderRadius: 16,
            background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 20px rgba(22, 119, 255, 0.25)',
            marginBottom: 20,
          }}
          styles={{ body: { padding: isMobile ? '20px 16px' : '28px 32px' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Tag color="cyan" style={{ borderRadius: 12, padding: '2px 10px', fontSize: 12, marginBottom: 8 }}>
                โหมดหน้าจอสำหรับคนไข้ / ผู้รับบริการ (Patient Kiosk Mode)
              </Tag>
              <Title level={isMobile ? 4 : 2} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
                กรุณาเลือกแบบประเมินที่ต้องการทำ
              </Title>
              <Paragraph style={{ color: 'rgba(255,255,255,0.9)', margin: '6px 0 0 0', fontSize: isMobile ? 13 : 15 }}>
                แตะที่แบบฟอร์มด้านล่างเพื่อเริ่มกรอกข้อมูลตามคำแนะนำของเจ้าหน้าที่
              </Paragraph>
            </div>

            <Button
              danger
              type="primary"
              onClick={() => {
                modal.confirm({
                  title: 'ออกจากโหมดคนไข้',
                  content: 'ต้องการออกจากโหมดคนไข้และกลับสู่หน้าจอการทำงานของเจ้าหน้าที่ใช่หรือไม่?',
                  okText: 'ออกจากโหมดคนไข้',
                  cancelText: 'อยู่โหมดนี้ต่อ',
                  onOk: () => setIsPatientMode(false),
                });
              }}
              style={{ borderRadius: 8, height: 42, fontWeight: 600 }}
            >
              🔒 ออกจากโหมดคนไข้ (สำหรับเจ้าหน้าที่)
            </Button>
          </div>
        </Card>
      ) : (
        /* Staff Hero Section */
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: isMobile ? '20px 16px' : '28px 32px',
            marginBottom: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 16,
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 10,
                    backgroundColor: '#e6f4ff',
                    color: '#1677ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22,
                  }}
                >
                  <ApartmentOutlined />
                </div>
                <div>
                  <Space size={6} wrap style={{ marginBottom: 2 }}>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                      แบบประเมินสำหรับคนไข้ / คลังฟอร์มแผนก
                    </Title>
                    <Tag color="blue" icon={<UserOutlined />} style={{ borderRadius: 6, margin: 0 }}>
                      {currentUser?.fullName || currentUser?.username}
                    </Tag>
                    {currentUser?.department?.name && (
                      <Tag color="purple" icon={<ApartmentOutlined />} style={{ borderRadius: 6, margin: 0 }}>
                        {currentUser.department.name}
                      </Tag>
                    )}
                  </Space>
                  <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14, display: 'block' }}>
                    เลือกแบบฟอร์มที่ต้องการให้คนไข้ทำ หรือเปิดโหมด iPad ยื่นให้คนไข้ทำแบบประเมิน
                  </Text>
                </div>
              </div>
            </div>

            <Space wrap size="small">
              <Button
                type="primary"
                icon={<TabletOutlined />}
                onClick={() => setIsPatientMode(true)}
                style={{
                  borderRadius: 8,
                  height: 40,
                  fontWeight: 600,
                  backgroundColor: '#722ed1',
                  borderColor: '#722ed1',
                  boxShadow: '0 2px 8px rgba(114, 46, 209, 0.25)',
                }}
              >
                📱 เปิดโหมดให้คนไข้ทำ (Kiosk)
              </Button>
              <Button
                icon={<FolderOpenOutlined />}
                onClick={() => navigate('/forms')}
                style={{ borderRadius: 8, height: 40, fontWeight: 500 }}
              >
                จัดการฟอร์ม (Studio)
              </Button>
              {currentUser?.role === 'ADMIN' && (
                <Button
                  type="primary"
                  icon={<ApartmentOutlined />}
                  onClick={() => navigate('/departments')}
                  style={{ borderRadius: 8, height: 40, fontWeight: 500 }}
                >
                  จัดการแผนก
                </Button>
              )}
            </Space>
          </div>

          {/* 2. Top Statistic Quick Overview Cards */}
          <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
            <Col xs={12} sm={6}>
              <Card
                size="small"
                style={{ backgroundColor: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}
                styles={{ body: { padding: '12px 14px' } }}
              >
                <Statistic
                  title={<span style={{ fontSize: 12, color: '#64748b' }}>🏢 แผนกทั้งหมด</span>}
                  value={departments.length}
                  suffix="แผนก"
                  valueStyle={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#0f172a' }}
                />
              </Card>
            </Col>

            <Col xs={12} sm={6}>
              <Card
                size="small"
                style={{ backgroundColor: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}
                styles={{ body: { padding: '12px 14px' } }}
              >
                <Statistic
                  title={<span style={{ fontSize: 12, color: '#166534' }}>📝 ฟอร์มพร้อมใช้งาน</span>}
                  value={stats.openForms}
                  suffix={`/ ${stats.totalForms}`}
                  valueStyle={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#16a34a' }}
                />
              </Card>
            </Col>

            <Col xs={12} sm={6}>
              <Card
                size="small"
                style={{ backgroundColor: '#fffbe6', borderRadius: 10, border: '1px solid #ffe58f' }}
                styles={{ body: { padding: '12px 14px' } }}
              >
                <Statistic
                  title={<span style={{ fontSize: 12, color: '#d48806' }}>🏆 แบบประเมิน/ข้อสอบ</span>}
                  value={stats.scoreTests}
                  suffix="ชุด"
                  valueStyle={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#d48806' }}
                />
              </Card>
            </Col>

            <Col xs={12} sm={6}>
              <Card
                size="small"
                style={{ backgroundColor: '#f0f5ff', borderRadius: 10, border: '1px solid #adc6ff' }}
                styles={{ body: { padding: '12px 14px' } }}
              >
                <Statistic
                  title={<span style={{ fontSize: 12, color: '#1d39c4' }}>📊 บันทึกข้อมูลแล้ว</span>}
                  value={stats.totalSubmissions}
                  suffix="ครั้ง"
                  valueStyle={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#2f54eb' }}
                />
              </Card>
            </Col>
          </Row>

          {/* 2.1 Child Screening Suite Highlight Card */}
          <Card
            style={{
              marginTop: 16,
              borderRadius: 14,
              background: 'linear-gradient(110deg, #dcecfb 0%, #ffffff 50%, #fbe7ed 100%)',
              border: '1.5px solid #cfe2f3',
              boxShadow: '0 4px 16px rgba(44, 122, 160, 0.08)',
            }}
            styles={{ body: { padding: '16px 20px' } }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <Space align="center" size={14}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                  }}
                >
                  👶
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text strong style={{ fontSize: 16, color: '#1e293b' }}>
                      ชุดแบบคัดกรองพัฒนาการ พฤติกรรม และอารมณ์เด็กและวัยรุ่น (Child Screening Suite)
                    </Text>
                    <Tag color="cyan" style={{ borderRadius: 99, fontWeight: 600 }}>
                      6 เครื่องมือมาตรฐาน
                    </Tag>
                    <Tag color="gold" style={{ borderRadius: 99, fontWeight: 600 }}>
                      Milestone Protocol
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 2 }}>
                    รวมแบบคัดกรอง M-CHAT-R, PDDSQ 4-18, SDQ, SNAP-IV, GAD-7, PHQ-A พร้อมระบบคำนวณอายุอัตโนมัติและใบสรุปผลทางการแพทย์
                  </Text>
                </div>
              </Space>

              <Space>
                <Button
                  type="primary"
                  size="large"
                  icon={<SmileOutlined />}
                  onClick={() => navigate('/child-screening')}
                  style={{
                    borderRadius: 10,
                    fontWeight: 600,
                    background: '#2c7aa0',
                    borderColor: '#2c7aa0',
                    boxShadow: '0 4px 12px rgba(44, 122, 160, 0.3)',
                  }}
                >
                  เข้าสู่ระบบคัดกรองเด็ก
                </Button>
              </Space>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Search & Filter Bar (Fully Responsive) */}
      <Card
        style={{
          borderRadius: 16,
          marginBottom: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        }}
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
      >
        <Row gutter={[12, 12]} align="middle">
          {/* กล่องค้นหา */}
          <Col xs={24} sm={24} md={9} lg={9} xl={9}>
            <Input
              size="large"
              placeholder="ค้นหาชื่อแบบฟอร์ม, คำอธิบาย หรือชื่อแผนก..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ borderRadius: 8 }}
            />
          </Col>

          {/* เลือกแผนก (บนมือถือหรือจอเล็ก) */}
          <Col xs={12} sm={8} md={5} lg={5} xl={5}>
            <Select
              size="large"
              style={{ width: '100%' }}
              value={selectedDeptId}
              onChange={setSelectedDeptId}
              placeholder="เลือกแผนก"
            >
              <Option value="ALL">🏢 ทุกแผนก ({activeForms.length})</Option>
              <Option value="GENERAL">🌐 ส่วนกลาง / ทั่วไป ({deptFormCountMap.GENERAL || 0})</Option>
              {departments.map((dept) => (
                <Option key={dept.id} value={dept.id}>
                  🏢 {dept.name} ({deptFormCountMap[dept.id] || 0})
                </Option>
              ))}
            </Select>
          </Col>

          {/* ประเภทฟอร์ม */}
          <Col xs={12} sm={8} md={5} lg={5} xl={5}>
            <Select
              size="large"
              style={{ width: '100%' }}
              value={typeFilter}
              onChange={setTypeFilter}
            >
              <Option value="ALL">ทุกประเภทฟอร์ม</Option>
              <Option value="GENERAL">📝 แบบฟอร์มทั่วไป</Option>
              <Option value="SCORE_TEST">🏆 แบบประเมิน/ข้อสอบ</Option>
            </Select>
          </Col>

          {/* รูปแบบการแสดงผล (จัดกลุ่มแผนก / การ์ดรวม) */}
          <Col xs={24} sm={8} md={5} lg={5} xl={5} style={{ display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
            <Radio.Group
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="large"
              style={{
                width: isMobile ? '100%' : 'auto',
                display: 'inline-flex',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <Radio.Button
                value="grouped"
                style={{
                  flex: isMobile ? 1 : 'none',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  padding: '0 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <BarsOutlined /> <span style={{ whiteSpace: 'nowrap' }}>ตามแผนก</span>
              </Radio.Button>
              <Radio.Button
                value="grid"
                style={{
                  flex: isMobile ? 1 : 'none',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  padding: '0 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <AppstoreOutlined /> <span style={{ whiteSpace: 'nowrap' }}>การ์ดรวม</span>
              </Radio.Button>
            </Radio.Group>
          </Col>
        </Row>

        {/* 4. Horizontal Scrollable Department Filter Pills (Quick-Select) */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingTop: 14,
            marginTop: 12,
            borderTop: '1px solid #f1f5f9',
            scrollbarWidth: 'thin',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* ปุ่มทุกแผนก */}
          <Button
            type={selectedDeptId === 'ALL' ? 'primary' : 'default'}
            onClick={() => setSelectedDeptId('ALL')}
            style={{
              borderRadius: 20,
              flexShrink: 0,
              fontWeight: selectedDeptId === 'ALL' ? 600 : 400,
            }}
          >
            🏢 ทุกแผนก ({activeForms.length})
          </Button>

          {/* ปุ่มแผนกต่างๆ */}
          {departments.map((dept) => {
            const count = deptFormCountMap[dept.id] || 0;
            const isSelected = selectedDeptId === dept.id;
            return (
              <Button
                key={dept.id}
                type={isSelected ? 'primary' : 'default'}
                onClick={() => setSelectedDeptId(dept.id)}
                style={{
                  borderRadius: 20,
                  flexShrink: 0,
                  fontWeight: isSelected ? 600 : 400,
                  borderColor: isSelected ? undefined : count > 0 ? '#b37feb' : undefined,
                  color: isSelected ? undefined : count > 0 ? '#722ed1' : undefined,
                  backgroundColor: !isSelected && count > 0 ? '#f9f0ff' : undefined,
                }}
              >
                🏢 {dept.name} ({count})
              </Button>
            );
          })}

          {/* ปุ่มส่วนกลาง */}
          <Button
            type={selectedDeptId === 'GENERAL' ? 'primary' : 'default'}
            onClick={() => setSelectedDeptId('GENERAL')}
            style={{
              borderRadius: 20,
              flexShrink: 0,
              fontWeight: selectedDeptId === 'GENERAL' ? 600 : 400,
            }}
          >
            🌐 ส่วนกลาง / ทั่วไป ({deptFormCountMap.GENERAL || 0})
          </Button>
        </div>
      </Card>

      {/* 5. Main Content: Form Catalog */}
      {isLoading ? (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16, color: '#64748b', fontSize: 14 }}>
            กำลังโหลดคลังแบบฟอร์ม...
          </div>
        </Card>
      ) : filteredForms.length === 0 ? (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: '60px 20px' }}>
          <Empty
            description={
              <div>
                <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                  ไม่พบแบบฟอร์มที่ตรงกับเงื่อนไขการค้นหา
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองแผนกอื่น
                </Text>
              </div>
            }
          >
            <Button
              type="primary"
              icon={<ClearOutlined />}
              onClick={() => {
                setSearch('');
                setSelectedDeptId('ALL');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
              }}
              style={{ marginTop: 12 }}
            >
              ล้างตัวกรองทั้งหมด
            </Button>
          </Empty>
        </Card>
      ) : viewMode === 'grouped' ? (
        // Mode A: จัดกลุ่มตามแผนก (Grouped View)
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {groupedByDepartment.map((group) => (
            <div key={group.id}>
              {/* แถบหัวข้อแผนก */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 14,
                  padding: '8px 12px',
                  backgroundColor: '#fff',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                }}
              >
                <Space size="middle">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: group.id === 'GENERAL' ? '#e6f4ff' : '#f9f0ff',
                      color: group.id === 'GENERAL' ? '#1677ff' : '#722ed1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                    }}
                  >
                    {group.id === 'GENERAL' ? <GlobalOutlined /> : <ApartmentOutlined />}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 16, color: '#0f172a' }}>
                      {group.name}
                    </Text>
                  </div>
                  <Tag color={group.id === 'GENERAL' ? 'blue' : 'purple'} style={{ borderRadius: 12 }}>
                    {group.forms.length} แบบฟอร์ม
                  </Tag>
                </Space>
              </div>

              {/* รายการการ์ดของแผนกนี้ */}
              <Row gutter={[16, 16]}>
                {group.forms.map((form) => renderFormCard(form))}
              </Row>
            </div>
          ))}
        </div>
      ) : (
        // Mode B: การ์ดตารางรวม (Grid View)
        <div>
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              พบแบบฟอร์มทั้งหมด <Text strong style={{ color: '#1677ff' }}>{filteredForms.length}</Text> รายการ
            </Text>
          </div>
          <Row gutter={[16, 16]}>
            {filteredForms.map((form) => renderFormCard(form))}
          </Row>
        </div>
      )}

      {/* 6. Form Quick Preview Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <EyeOutlined style={{ color: '#1677ff', fontSize: 20 }} />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                ตัวอย่างแบบฟอร์ม: {previewFormDetail?.title || 'แบบฟอร์ม'}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {previewFormDetail?.department?.name || 'ส่วนกลาง / ทั่วไป'} • {previewFormDetail?.type === 'SCORE_TEST' ? '🏆 แบบประเมินข้อสอบ' : '📝 แบบฟอร์มทั่วไป'}
              </Text>
            </div>
          </div>
        }
        placement="right"
        width={isMobile ? '100%' : 680}
        open={!!previewFormId}
        onClose={() => setPreviewFormId(null)}
        extra={
          previewFormDetail && (
            <Space>
              <Button
                type="primary"
                icon={<FormOutlined />}
                disabled={!previewFormDetail.isAcceptingResponses}
                onClick={() => {
                  setPreviewFormId(null);
                  navigate(`/forms/${previewFormDetail.id}/fill`);
                }}
              >
                เริ่มทำฟอร์มนี้
              </Button>
            </Space>
          )
        }
      >
        {isPreviewLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
          </div>
        ) : previewFormDetail ? (
          <div>
            {previewFormDetail.description && (
              <Paragraph style={{ fontSize: 14, color: '#475569', marginBottom: 20, whiteSpace: 'pre-line' }}>
                {previewFormDetail.description}
              </Paragraph>
            )}

            {/* PDPA Note */}
            {previewFormDetail.pdpaEnabled && (
              <Card
                size="small"
                style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 10, marginBottom: 20 }}
              >
                <Space align="start">
                  <SafetyCertificateOutlined style={{ color: '#52c41a', fontSize: 18, marginTop: 2 }} />
                  <div>
                    <Text strong style={{ color: '#274f13', fontSize: 13, display: 'block' }}>
                      แบบฟอร์มนี้มีระบบขอความยินยอมข้อมูลส่วนบุคคล (PDPA)
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ผู้ตอบแบบฟอร์มจะต้องอ่านและกดยินยอมในหน้าต่างป๊อปอัปก่อนเริ่มกรอกแบบฟอร์ม
                    </Text>
                  </div>
                </Space>
              </Card>
            )}

            <Title level={5} style={{ marginBottom: 12 }}>
              รายการข้อคำถาม ({previewFormDetail.schema?.length || 0} ข้อ)
            </Title>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(previewFormDetail.schema || []).map((field, idx) => {
                if (field.type === 'layer_box') {
                  return (
                    <Card
                      key={field.id}
                      size="small"
                      style={{ backgroundColor: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 10 }}
                    >
                      <Space>
                        <Tag color="blue">กล่องข้อมูล</Tag>
                        <Text strong>{field.label || 'กล่องจัดกลุ่มคำถาม'}</Text>
                      </Space>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={field.id}
                    size="small"
                    style={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text strong style={{ fontSize: 14 }}>
                        {idx + 1}. {field.label || 'คำถามไม่มีชื่อ'} {field.required && <span style={{ color: '#ff4d4f' }}>*</span>}
                      </Text>
                      <Space size="small">
                        <Tag color="default" style={{ fontSize: 11 }}>
                          {field.type}
                        </Tag>
                        {field.points !== undefined && field.points > 0 && (
                          <Tag color="volcano" style={{ fontSize: 11 }}>
                            {field.points} คะแนน
                          </Tag>
                        )}
                      </Space>
                    </div>

                    {field.description && (
                      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                        {field.description}
                      </Text>
                    )}

                    {field.options && field.options.length > 0 && (
                      <div style={{ marginTop: 8, paddingLeft: 12 }}>
                        {field.options.map((opt) => (
                          <div key={opt.id} style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
                            • {opt.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* 7. Share Modal */}
      <FormShareModal
        formId={shareModalFormId}
        open={!!shareModalFormId}
        onClose={() => setShareModalFormId(null)}
      />
    </div>
  );
};

export default DepartmentFormsPage;
