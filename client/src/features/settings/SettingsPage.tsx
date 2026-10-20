import React, { useState } from 'react';
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
} from 'antd';
import {
  SettingOutlined,
  FontSizeOutlined,
  SaveOutlined,
  InfoCircleOutlined,
  CheckOutlined,
  ReloadOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import { useSettingsStore, AVAILABLE_FONTS, SystemFontType } from '../../store/settingsStore';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export const SettingsPage: React.FC = () => {
  const { message } = App.useApp();

  const {
    systemFont,
    setSystemFont,
    isSaving,
    updatedAt,
    updatedBy,
    fetchSettings,
  } = useSettingsStore();

  const [selectedFont, setSelectedFont] = useState<SystemFontType>(systemFont);
  const [previewText, setPreviewText] = useState(
    'ระบบจัดเก็บและประเมินแบบสอบถามผู้รับบริการทางการแพทย์ FormLocal 2026'
  );

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
              backgroundColor: '#1677ff15',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              color: '#1677ff',
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

      {/* System Information Card */}
      <Card
        title="ข้อมูลและสถานะระบบ (System Information)"
        bordered={false}
        style={{ borderRadius: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}
      >
        <Descriptions column={{ xs: 1, sm: 2, md: 3 }} bordered size="small">
          <Descriptions.Item label="แอปพลิเคชัน">FormLocal Builder</Descriptions.Item>
          <Descriptions.Item label="เวอร์ชันระบบ">v1.2.0 (Clinical Ed.)</Descriptions.Item>
          <Descriptions.Item label="สถานะการเชื่อมต่อ">
            <Badge status="success" text="Online (Supabase Cloud)" />
          </Descriptions.Item>
          <Descriptions.Item label="ฐานข้อมูลหลัก">
            <Tag color="blue" icon={<CloudServerOutlined />}>
              Supabase Managed PostgreSQL
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="ฟอนต์ที่เปิดใช้งาน">
            <Tag color={AVAILABLE_FONTS[systemFont].tagColor}>
              {AVAILABLE_FONTS[systemFont].name}
            </Tag>
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
