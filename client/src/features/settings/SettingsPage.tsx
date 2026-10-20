import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Radio,
  Button,
  Tag,
  Space,
  Divider,
  Alert,
  App,
  Descriptions,
  Badge,
  Input,
  Modal,
} from 'antd';
import {
  SettingOutlined,
  FontSizeOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  CheckOutlined,
  ReloadOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  SwapOutlined,
  ApiOutlined,
  DesktopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore, AVAILABLE_FONTS, SystemFontType } from '../../store/settingsStore';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export const SettingsPage: React.FC = () => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const {
    systemFont,
    setSystemFont,
    isSaving,
    updatedAt,
    updatedBy,
    fetchSettings,
  } = useSettingsStore();

  // Local selection state for previewing before saving or immediate save
  const [selectedFont, setSelectedFont] = useState<SystemFontType>(systemFont);
  const [previewText, setPreviewText] = useState(
    'ระบบจัดเก็บและประเมินแบบสอบถามผู้รับบริการทางการแพทย์ FormLocal 2026'
  );

  // ==========================================
  // Database Switcher State & Queries
  // ==========================================
  const [selectedDbTarget, setSelectedDbTarget] = useState<'LOCAL' | 'SUPABASE'>('LOCAL');
  const [supabaseUrlInput, setSupabaseUrlInput] = useState('');
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latency?: number } | null>(null);

  const { data: dbData, isLoading: isLoadingDb, refetch: refetchDb } = useQuery({
    queryKey: ['database-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings/database');
      return res.data.data;
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (dbData?.activeDb) {
      setSelectedDbTarget(dbData.activeDb);
    }
  }, [dbData]);

  // Mutation ทดสอบการเชื่อมต่อ
  const testConnMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiClient.post('/settings/database/test', { url });
      return res.data;
    },
    onSuccess: (data) => {
      setTestResult({ ok: true, message: data.message, latency: data.latencyMs });
      message.success(`เชื่อมต่อฐานข้อมูลสำเร็จ! (Latency: ${data.latencyMs} ms)`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'เชื่อมต่อไม่สำเร็จ';
      setTestResult({ ok: false, message: msg });
      message.error(msg);
    },
  });

  // Mutation สลับฐานข้อมูล
  const switchDbMutation = useMutation({
    mutationFn: async ({ target, supabaseUrl }: { target: 'LOCAL' | 'SUPABASE'; supabaseUrl?: string }) => {
      const res = await apiClient.post('/settings/database/switch', { target, supabaseUrl });
      return res.data;
    },
    onSuccess: (data) => {
      message.success(data.message || 'สลับฐานข้อมูลสำเร็จเรียบร้อยแล้ว!');
      queryClient.invalidateQueries({ queryKey: ['database-settings'] });
      setTestResult(null);
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'สลับฐานข้อมูลไม่สำเร็จ');
    },
  });

  const handleTestConnection = () => {
    if (selectedDbTarget === 'SUPABASE') {
      const urlToTest = supabaseUrlInput.trim();
      if (!urlToTest) {
        message.warning('กรุณากรอก Supabase Connection String ก่อนกดทดสอบ');
        return;
      }
      testConnMutation.mutate(urlToTest);
    } else {
      // ทดสอบ Local
      testConnMutation.mutate('postgresql://postgres:ram2%231234@localhost:5432/formlocal_db?schema=public');
    }
  };

  const handleSwitchDatabase = () => {
    if (selectedDbTarget === 'SUPABASE' && !dbData?.isSupabaseConfigured && !supabaseUrlInput.trim()) {
      message.warning('กรุณาระบุ Supabase Connection String ก่อนทำการสลับการเชื่อมต่อ');
      return;
    }

    Modal.confirm({
      title: `ยืนยันการสลับไปยัง ${selectedDbTarget === 'LOCAL' ? 'Local PostgreSQL (เครื่อง Dev)' : 'Supabase Cloud'}?`,
      icon: <SwapOutlined style={{ color: '#1677ff' }} />,
      content: (
        <div>
          <Paragraph style={{ margin: '8px 0' }}>
            ระบบจะทำการเปลี่ยนค่า Connection String ในไฟล์ <code>server/.env</code> และรีโหลดการเชื่อมต่อของเซิร์ฟเวอร์ไปยังฐานข้อมูลปลายทางทันที
          </Paragraph>
          {selectedDbTarget === 'SUPABASE' && (
            <Alert
              type="info"
              showIcon
              message="คำแนะนำสำหรับ Supabase"
              description="หากเป็นฐานข้อมูลใหม่บน Supabase กรุณารันคำสั่ง npx prisma db push เพื่อสร้างโครงสร้างตารางด้วยครับ"
              style={{ marginTop: 8 }}
            />
          )}
        </div>
      ),
      okText: 'ยืนยันการสลับ',
      cancelText: 'ยกเลิก',
      onOk: () => {
        switchDbMutation.mutate({
          target: selectedDbTarget,
          supabaseUrl: supabaseUrlInput.trim() || undefined,
        });
      },
    });
  };

  const handleSave = async () => {
    try {
      await setSystemFont(selectedFont);
      message.success(`บันทึกแบบอักษรระบบเป็น "${AVAILABLE_FONTS[selectedFont].name}" สำเร็จแล้ว`);
    } catch (err: any) {
      message.error(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const handleFontSelect = (key: SystemFontType) => {
    setSelectedFont(key);
  };

  const currentPreviewFont = AVAILABLE_FONTS[selectedFont]?.fontFamily;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space align="center" size="middle">
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#e6f4ff',
              color: '#1677ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}
          >
            <SettingOutlined />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              ตั้งค่าระบบ (System Settings)
            </Title>
            <Text type="secondary">
              จัดการแบบอักษรหลัก (System Typography), การแสดงผล และค่าเริ่มต้นของระบบ FormLocal
            </Text>
          </div>
        </Space>
      </div>

      {/* Main Settings Card */}
      <Card
        bordered={false}
        style={{
          borderRadius: 14,
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Space>
            <FontSizeOutlined style={{ fontSize: 20, color: '#1677ff' }} />
            <Title level={4} style={{ margin: 0 }}>
              แบบอักษรหลักของระบบ (System Font)
            </Title>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            size="small"
            onClick={() => fetchSettings()}
          >
            รีเฟรชค่า
          </Button>
        </div>

        <Alert
          message="คำแนะนำการเลือกใช้แบบอักษร"
          description="การเปลี่ยนแบบอักษรจะมีผลทันทีต่อผู้ใช้งานทุกคนในระบบ ทั้งหน้าแดชบอร์ด รายการแบบฟอร์ม หน้ากรอกแบบฟอร์ม (Runner) และรายงานสรุปผล โดยฟอนต์ทั้งหมดถูกติดตั้งแบบ Local พร้อมใช้งานแม้อยู่ในโครงข่ายปิด (Intranet / Offline)"
          type="info"
          showIcon
          style={{ marginBottom: 24, borderRadius: 10 }}
        />

        {/* Font Selection Cards */}
        <Row gutter={[20, 20]}>
          {(Object.keys(AVAILABLE_FONTS) as SystemFontType[]).map((key) => {
            const font = AVAILABLE_FONTS[key];
            const isSelected = selectedFont === key;
            const isCurrentlyActive = systemFont === key;

            return (
              <Col xs={24} md={12} key={key}>
                <div
                  onClick={() => handleFontSelect(key)}
                  style={{
                    border: `2px solid ${isSelected ? '#1677ff' : '#e5e7eb'}`,
                    backgroundColor: isSelected ? '#f0f7ff' : '#ffffff',
                    borderRadius: 14,
                    padding: 20,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isSelected ? '0 4px 14px rgba(22,119,255,0.12)' : 'none',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <Tag color={font.tagColor} style={{ borderRadius: 6, fontWeight: 600 }}>
                          {font.badge}
                        </Tag>
                        {isCurrentlyActive && (
                          <Tag color="green" style={{ borderRadius: 6, fontWeight: 600 }}>
                            <CheckOutlined /> ใช้งานอยู่ในปัจจุบัน
                          </Tag>
                        )}
                      </div>
                      <Radio checked={isSelected} onChange={() => handleFontSelect(key)} />
                    </div>

                    <Title
                      level={4}
                      style={{
                        margin: '8px 0 2px 0',
                        fontFamily: font.fontFamily,
                        fontWeight: 700,
                        color: isSelected ? '#1677ff' : '#1f2937',
                      }}
                    >
                      {font.name}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>
                      {font.englishName}
                    </Text>

                    <Paragraph type="secondary" style={{ fontSize: 14, lineHeight: 1.5, margin: 0 }}>
                      {font.description}
                    </Paragraph>
                  </div>

                  {/* Micro Preview inside card */}
                  <div
                    style={{
                      marginTop: 16,
                      padding: '12px 14px',
                      backgroundColor: isSelected ? '#ffffff' : '#f9fafb',
                      borderRadius: 10,
                      border: '1px solid #e5e7eb',
                      fontFamily: font.fontFamily,
                    }}
                  >
                    <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 2 }}>
                      กขคง ABC 12345
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280' }}>
                      แบบสอบถามคัดกรอง M-CHAT-R ฉบับภาษาไทย
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>

        <Divider />

        {/* Live Typography Preview Section */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Title level={5} style={{ margin: 0 }}>
              ตัวอย่างการแสดงผลแบบอักษรจริง (Live Typography Preview)
            </Title>
            <Tag color="blue" style={{ borderRadius: 6 }}>
              ฟอนต์ที่เลือก: {AVAILABLE_FONTS[selectedFont].name}
            </Tag>
          </div>

          <div
            style={{
              padding: 24,
              backgroundColor: '#fafafa',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              fontFamily: currentPreviewFont,
            }}
          >
            {/* Custom Preview Text Input */}
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                ทดลองพิมพ์ข้อความทดสอบ:
              </Text>
              <Input
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="พิมพ์ข้อความภาษาไทยเพื่อทดสอบการแสดงผล..."
                style={{ fontFamily: currentPreviewFont, fontSize: 15 }}
              />
            </div>

            {/* Simulated UI showcase */}
            <Card
              size="small"
              bordered
              style={{
                borderRadius: 10,
                backgroundColor: '#ffffff',
                fontFamily: currentPreviewFont,
              }}
            >
              <div style={{ marginBottom: 14 }}>
                <h2 style={{ fontSize: 20, margin: '0 0 6px 0', fontFamily: currentPreviewFont, fontWeight: 700 }}>
                  {previewText}
                </h2>
                <p style={{ margin: 0, color: '#4b5563', fontSize: 15, fontFamily: currentPreviewFont }}>
                  แบบสอบถามสำหรับผู้ปกครองเด็กเล็กอายุ 16–30 เดือน รหัสผู้ป่วย (HN): 68-009823 / แผนก: กุมารเวชกรรม
                </p>
              </div>

              <Space wrap size="middle" style={{ marginTop: 10 }}>
                <Button type="primary" style={{ fontFamily: currentPreviewFont }}>
                  บันทึกแบบฟอร์ม
                </Button>
                <Button style={{ fontFamily: currentPreviewFont }}>
                  ดูผลการประเมิน
                </Button>
                <Tag color="cyan" style={{ padding: '3px 10px', fontSize: 13, fontFamily: currentPreviewFont }}>
                  เสร็จสิ้นแล้ว
                </Tag>
                <Tag color="orange" style={{ padding: '3px 10px', fontSize: 13, fontFamily: currentPreviewFont }}>
                  มีความเสี่ยงปานกลาง
                </Tag>
              </Space>
            </Card>
          </div>
        </div>

        {/* Action Controls */}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            {updatedAt ? (
              <Text type="secondary" style={{ fontSize: 13 }}>
                <InfoCircleOutlined style={{ marginRight: 4 }} />
                อัปเดตล่าสุด: {dayjs(updatedAt).format('D MMMM YYYY HH:mm น.')}
                {updatedBy && ` โดย ${updatedBy}`}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 13 }}>
                ฟอนต์ปัจจุบัน: <strong>{AVAILABLE_FONTS[systemFont].name}</strong>
              </Text>
            )}
          </div>

          <Space>
            <Button
              onClick={() => setSelectedFont(systemFont)}
              disabled={selectedFont === systemFont || isSaving}
            >
              คืนค่าเดิม
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={isSaving}
              style={{ minWidth: 160 }}
            >
              บันทึกการตั้งค่าฟอนต์
            </Button>
          </Space>
        </div>
      </Card>

      {/* Database Connection Switcher Card */}
      {isAdmin && (
        <Card
          bordered={false}
          style={{
            borderRadius: 14,
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            marginBottom: 24,
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Space>
              <DatabaseOutlined style={{ fontSize: 22, color: '#1677ff' }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  สลับการเชื่อมต่อฐานข้อมูล (Database Connection Switcher)
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  เลือกสลับระหว่าง Local PostgreSQL บนเครื่องคอมพิวเตอร์นี้ กับ Supabase Cloud Database ได้ทันที
                </Text>
              </div>
            </Space>
            <Button
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => refetchDb()}
              loading={isLoadingDb}
            >
              รีเฟรชสถานะ
            </Button>
          </div>

          {/* Current Active Status Banner */}
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: dbData?.activeDb === 'SUPABASE' ? '#f0f5ff' : '#f6ffed',
              borderRadius: 12,
              border: `1.5px solid ${dbData?.activeDb === 'SUPABASE' ? '#adc6ff' : '#b7eb8f'}`,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <Space size="small">
                {dbData?.activeDb === 'SUPABASE' ? (
                  <CloudServerOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                ) : (
                  <DesktopOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                )}
                <Text strong style={{ fontSize: 15 }}>
                  กำลังเชื่อมต่อกับ:{' '}
                  <span style={{ color: dbData?.activeDb === 'SUPABASE' ? '#1677ff' : '#389e0d' }}>
                    {dbData?.activeDb === 'SUPABASE' ? '☁️ Supabase Cloud PostgreSQL' : '🟢 Local PostgreSQL (เครื่องนี้)'}
                  </span>
                </Text>
              </Space>
              <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
                Host: <code>{dbData?.currentHost || 'กำลังตรวจสอบ...'}</code>
              </div>
            </div>

            <Space wrap>
              {dbData?.isConnected ? (
                <Tag color="success" icon={<CheckCircleOutlined />} style={{ padding: '4px 10px', fontSize: 13, borderRadius: 6 }}>
                  เชื่อมต่อสำเร็จ ({dbData.latencyMs !== null ? `${dbData.latencyMs} ms` : 'Active'})
                </Tag>
              ) : (
                <Tag color="error" icon={<ExclamationCircleOutlined />} style={{ padding: '4px 10px', fontSize: 13, borderRadius: 6 }}>
                  การเชื่อมต่อขัดข้อง
                </Tag>
              )}
            </Space>
          </div>

          {/* Selection Cards */}
          <Row gutter={[16, 16]}>
            {/* Option 1: Local Postgres */}
            <Col xs={24} md={12}>
              <div
                onClick={() => setSelectedDbTarget('LOCAL')}
                style={{
                  border: `2px solid ${selectedDbTarget === 'LOCAL' ? '#52c41a' : '#e5e7eb'}`,
                  backgroundColor: selectedDbTarget === 'LOCAL' ? '#f6ffed' : '#ffffff',
                  borderRadius: 12,
                  padding: 18,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Space>
                    <DesktopOutlined style={{ fontSize: 22, color: '#52c41a' }} />
                    <Text strong style={{ fontSize: 16 }}>Local PostgreSQL</Text>
                  </Space>
                  <Radio checked={selectedDbTarget === 'LOCAL'} onChange={() => setSelectedDbTarget('LOCAL')} />
                </div>
                <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
                  ฐานข้อมูล PostgreSQL ที่ติดตั้งบนเครื่องคอมพิวเตอร์ของคุณโดยตรง เหมาะสำหรับพัฒนา ทดสอบฟังก์ชันใหม่ๆ แบบออฟไลน์
                </Paragraph>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  Connection: <code>localhost:5432 / formlocal_db</code>
                </div>
              </div>
            </Col>

            {/* Option 2: Supabase Cloud */}
            <Col xs={24} md={12}>
              <div
                onClick={() => setSelectedDbTarget('SUPABASE')}
                style={{
                  border: `2px solid ${selectedDbTarget === 'SUPABASE' ? '#1677ff' : '#e5e7eb'}`,
                  backgroundColor: selectedDbTarget === 'SUPABASE' ? '#f0f5ff' : '#ffffff',
                  borderRadius: 12,
                  padding: 18,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  height: '100%',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <Space>
                    <CloudServerOutlined style={{ fontSize: 22, color: '#1677ff' }} />
                    <Text strong style={{ fontSize: 16 }}>Supabase Cloud Database</Text>
                  </Space>
                  <Radio checked={selectedDbTarget === 'SUPABASE'} onChange={() => setSelectedDbTarget('SUPABASE')} />
                </div>
                <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 8 }}>
                  ฐานข้อมูล Managed PostgreSQL บนคลาวด์ พร้อม Dashboard, Table Editor และระบบสำรองข้อมูลอัตโนมัติ เข้าถึงได้จากทุกที่
                </Paragraph>
                <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                  {dbData?.isSupabaseConfigured ? (
                    <span>URL ปัจจุบัน: <code>{dbData.maskedSupabaseUrl}</code></span>
                  ) : (
                    <Tag color="orange">ยังไม่ได้ระบุ Supabase URL</Tag>
                  )}
                </div>
              </div>
            </Col>
          </Row>

          {/* Supabase URL Input Box (Shown if Supabase is selected) */}
          {selectedDbTarget === 'SUPABASE' && (
            <div
              style={{
                marginTop: 18,
                padding: '16px 20px',
                backgroundColor: '#fafafa',
                borderRadius: 10,
                border: '1px solid #f0f0f0',
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                🔗 Supabase Connection String (URI):
              </Text>
              <Input.Password
                placeholder="postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
                value={supabaseUrlInput}
                onChange={(e) => setSupabaseUrlInput(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: 13, marginBottom: 8 }}
              />
              <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                * หาได้จาก Supabase Dashboard ➔ Project Settings ➔ Database ➔ Connection string (เลือก URI / Mode: Transaction Pooler พอร์ต 6543)
              </Text>
            </div>
          )}

          {/* Test connection result banner */}
          {testResult && (
            <Alert
              style={{ marginTop: 16, borderRadius: 8 }}
              type={testResult.ok ? 'success' : 'error'}
              showIcon
              message={testResult.ok ? `เชื่อมต่อสำเร็จ! (Latency: ${testResult.latency} ms)` : 'เชื่อมต่อไม่สำเร็จ'}
              description={testResult.message}
            />
          )}

          {/* Action Footer */}
          <Divider style={{ margin: '18px 0 14px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ fontSize: 13, color: '#8c8c8c' }}>
              💡 สามารถสั่งสลับผ่าน Terminal ได้ด้วย: <code>npm run db:local</code> หรือ <code>npm run db:supabase</code>
            </div>

            <Space>
              <Button
                icon={<ApiOutlined />}
                onClick={handleTestConnection}
                loading={testConnMutation.isPending}
              >
                ทดสอบการเชื่อมต่อ (Ping Test)
              </Button>
              <Button
                type="primary"
                icon={<SwapOutlined />}
                onClick={handleSwitchDatabase}
                loading={switchDbMutation.isPending}
                disabled={selectedDbTarget === dbData?.activeDb && !supabaseUrlInput.trim()}
                style={{
                  minWidth: 160,
                  backgroundColor: selectedDbTarget === 'SUPABASE' ? '#1677ff' : '#52c41a',
                  borderColor: selectedDbTarget === 'SUPABASE' ? '#1677ff' : '#52c41a',
                }}
              >
                กดสลับไปใช้ {selectedDbTarget === 'SUPABASE' ? 'Supabase' : 'Local Postgres'}
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* System Information Card */}
      <Card
        title="ข้อมูลและสถานะระบบ (System Information)"
        bordered={false}
        style={{ borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}
      >
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
          <Descriptions.Item label="แอปพลิเคชัน">FormLocal Builder</Descriptions.Item>
          <Descriptions.Item label="เวอร์ชันระบบ">v1.2.0 (Clinical Ed.)</Descriptions.Item>
          <Descriptions.Item label="สถานะเซิร์ฟเวอร์">
            <Badge status="processing" text="Online (Port 4000)" />
          </Descriptions.Item>
          <Descriptions.Item label="ฟอนต์ที่เปิดใช้งาน">
            <Tag color={AVAILABLE_FONTS[systemFont].tagColor}>
              {AVAILABLE_FONTS[systemFont].name}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="พื้นที่จัดเก็บฟอนต์">
            <code>/fonts/Sarabun</code> & <code>/fonts/IBM_Plex_Sans</code>
          </Descriptions.Item>
          <Descriptions.Item label="การทำงานแบบออฟไลน์">
            <Tag color="success">พร้อมใช้งาน (Offline Ready)</Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default SettingsPage;
