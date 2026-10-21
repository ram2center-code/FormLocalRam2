import React, { useState, useMemo } from 'react';
import {
  Card,
  Typography,
  Input,
  Tag,
  Space,
  Row,
  Col,
  Divider,
  Alert,
  Collapse,
  Steps,
  Button,
  Anchor,
  Breadcrumb,
  Tooltip,
  Grid,
} from 'antd';
import {
  BookOutlined,
  FormOutlined,
  TrophyOutlined,
  LockOutlined,
  GlobalOutlined,
  ApartmentOutlined,
  SearchOutlined,
  SaveOutlined,
  CopyOutlined,
  CheckOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

export const DocumentationPage: React.FC = () => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyLink = (anchorId: string) => {
    const url = `${window.location.origin}/docs#${anchorId}`;
    navigator.clipboard.writeText(url);
    setCopiedSection(anchorId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // หมวดหมู่และเนื้อหาสำหรับค้นหา
  const docsData = [
    {
      id: 'getting-started',
      title: '🚀 บทที่ 1: ภาพรวมระบบ FormLocal',
      description: 'แนะนำการใช้งานระบบเบื้องต้น บทบาทผู้ใช้ และหน้าแดชบอร์ด',
    },
    {
      id: 'form-management',
      title: '📝 บทที่ 2: การสร้างและจัดการแบบฟอร์ม',
      description: 'การสร้างฟอร์มใหม่, Save-First Workflow, สิทธิ์เข้าถึง Privacy, การแชร์ และถังขยะ',
    },
    {
      id: 'form-builder',
      title: '🎨 บทที่ 3: Studio ออกแบบแบบฟอร์ม',
      description: 'ชนิดของคำถาม 9 ประเภท, Layer Box 2 คอลัมน์, การจัดเรียง และแม่แบบสำเร็จรูป',
    },
    {
      id: 'scoring-answers',
      title: '🎯 บทที่ 4: การกำหนดเฉลยและเกณฑ์การสอบ',
      description: 'การกำหนดเฉลยคำตอบ (Answer Key), การคิดคะแนน, ข้อสอบวัดผล และเกณฑ์ผ่าน',
    },
    {
      id: 'runner-submissions',
      title: '📋 บทที่ 5: การตอบฟอร์มและดูผลลัพธ์',
      description: 'การทำแบบฟอร์ม (Runner), การตรวจสอบความถูกต้อง และการดูผลตอบกลับ',
    },
    {
      id: 'admin-guide',
      title: '⚙️ บทที่ 6: การตั้งค่าระบบสำหรับผู้ดูแล (Admin)',
      description: 'การจัดการผู้ใช้, แผนก, ตรวจสอบ Audit Log และการกำหนดฟอนต์ระบบ',
    },
    {
      id: 'faq',
      title: '❓ บทที่ 7: คำถามที่พบบ่อย (FAQ)',
      description: 'รวมข้อสงสัยและแนวทางการแก้ปัญหาที่พบบ่อย',
    },
  ];

  const filteredDocs = useMemo(() => {
    if (!searchTerm.trim()) return docsData;
    const term = searchTerm.toLowerCase();
    return docsData.filter(
      (d) => d.title.toLowerCase().includes(term) || d.description.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      {/* Header Banner */}
      <Card
        style={{
          borderRadius: screens.xs ? 12 : 16,
          background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
          color: '#ffffff',
          marginBottom: screens.xs ? 16 : 24,
          boxShadow: '0 4px 20px rgba(22, 119, 255, 0.15)',
        }}
        styles={{ body: { padding: screens.xs ? '20px 16px' : '32px 36px' } }}
      >
        <Row gutter={[screens.xs ? 16 : 24, screens.xs ? 16 : 24]} align="middle">
          <Col xs={24} md={15}>
            <Space direction="vertical" size={screens.xs ? 6 : 10} style={{ width: '100%' }}>
              <Breadcrumb
                items={[
                  { title: <span style={{ color: '#bae0ff' }}>หน้าหลัก</span> },
                  { title: <span style={{ color: '#ffffff' }}>คู่มือการใช้งาน</span> },
                ]}
              />
              <Title
                level={screens.xs ? 3 : 2}
                style={{
                  color: '#ffffff',
                  margin: 0,
                  fontWeight: 700,
                  fontSize: screens.xs ? 20 : 26,
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                }}
              >
                📖 ศูนย์ช่วยเหลือและคู่มือการใช้งานระบบ FormLocal
              </Title>
              <Paragraph style={{ color: '#e6f4ff', fontSize: screens.xs ? 13 : 15, margin: 0, lineHeight: 1.6 }}>
                คู่มือแนะนำฟังก์ชันการทำงานอย่างละเอียด สำหรับการสร้างแบบฟอร์ม การจัดชุดข้อสอบวัดผล
                การกำหนดเฉลย การตั้งค่าความเป็นส่วนตัว และการวิเคราะห์ผลตอบกลับ
              </Paragraph>
            </Space>
          </Col>

          <Col xs={24} md={9}>
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)', padding: screens.xs ? 12 : 16, borderRadius: 12 }}>
              <Text strong style={{ color: '#ffffff', display: 'block', marginBottom: 6, fontSize: screens.xs ? 13 : 14 }}>
                🔍 ค้นหาหัวข้อคู่มืออย่างรวดเร็ว
              </Text>
              <Input
                size={screens.xs ? 'middle' : 'large'}
                prefix={<SearchOutlined style={{ color: '#1677ff' }} />}
                placeholder="ค้นหา เช่น สิทธิ์เข้าถึง, เฉลยคำตอบ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                allowClear
                style={{ borderRadius: 8, height: screens.xs ? 40 : 44 }}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* Main Layout Grid */}
      <Row gutter={[screens.xs ? 16 : 24, screens.xs ? 16 : 24]}>
        {/* Left: Quick Table of Contents / Anchor Menu */}
        <Col xs={24} lg={6}>
          <Card
            style={{
              borderRadius: 12,
              position: screens.lg ? 'sticky' : 'static',
              top: 84,
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            }}
            styles={{ body: { padding: screens.xs ? 14 : 18 } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <BookOutlined style={{ color: '#1677ff', fontSize: 18 }} />
              <Text strong style={{ fontSize: 15 }}>สารบัญคู่มือ (Contents)</Text>
            </div>

            <Anchor
              affix={false}
              offsetTop={100}
              items={[
                { key: 'getting-started', href: '#getting-started', title: '1. ภาพรวมระบบ FormLocal' },
                { key: 'form-management', href: '#form-management', title: '2. การสร้างและจัดการแบบฟอร์ม' },
                { key: 'form-builder', href: '#form-builder', title: '3. Studio ออกแบบแบบฟอร์ม' },
                { key: 'scoring-answers', href: '#scoring-answers', title: '4. เฉลยคำตอบและข้อสอบวัดผล' },
                { key: 'runner-submissions', href: '#runner-submissions', title: '5. การตอบฟอร์มและผลลัพธ์' },
                { key: 'admin-guide', href: '#admin-guide', title: '6. การตั้งค่าระบบ (Admin)' },
                { key: 'faq', href: '#faq', title: '7. คำถามที่พบบ่อย (FAQ)' },
              ]}
            />

            <Divider style={{ margin: '16px 0' }} />

            <div style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                💡 ทางลัดด่วน (Quick Links)
              </Text>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Button type="link" size="small" onClick={() => navigate('/forms/new')} style={{ padding: 0 }}>
                  + สร้างแบบฟอร์มใหม่ทันที
                </Button>
                <Button type="link" size="small" onClick={() => navigate('/forms')} style={{ padding: 0 }}>
                  📄 ไปยังหน้ารายการแบบฟอร์ม
                </Button>
                <Button type="link" size="small" onClick={() => navigate('/dashboard')} style={{ padding: 0 }}>
                  📊 ดูแดชบอร์ดสรุปผล
                </Button>
              </Space>
            </div>
          </Card>
        </Col>

        {/* Right: Documentation Articles */}
        <Col xs={24} lg={18}>
          <Space direction="vertical" size={24} style={{ width: '100%' }}>
            {/* กล่องแสดงผลการค้นหาเมื่อผู้ใช้พิมพ์ค้นหา */}
            {searchTerm.trim() && (
              <Alert
                type="info"
                showIcon
                message={
                  <span>
                    พบหัวข้อที่ตรงกับการค้นหา "{searchTerm}" จำนวน <strong>{filteredDocs.length}</strong> หมวดหมู่
                  </span>
                }
                description={
                  filteredDocs.length > 0 ? (
                    <Space wrap style={{ marginTop: 8 }}>
                      {filteredDocs.map((item) => (
                        <Button
                          key={item.id}
                          size="small"
                          type="dashed"
                          onClick={() => {
                            const el = document.getElementById(item.id);
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          {item.title}
                        </Button>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      ไม่พบหัวข้อที่ตรงกับคำค้นหา กรุณาลองใช้คำค้นหาอื่น เช่น "สิทธิ์", "สร้าง", "เฉลย", "บันทึก"
                    </Text>
                  )
                }
              />
            )}
            {/* ------------------------------------------------------------- */}
            {/* 1. บทที่ 1: ภาพรวมระบบ FormLocal */}
            {/* ------------------------------------------------------------- */}
            <Card
              id="getting-started"
              style={{ borderRadius: 12, scrollMarginTop: 90 }}
              styles={{ body: { padding: screens.xs ? '18px 14px' : 28 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1677ff', fontSize: screens.xs ? 17 : 20, lineHeight: 1.35 }}>
                  🚀 บทที่ 1: ภาพรวมระบบ FormLocal
                </Title>
                <Tooltip title="คัดลอกลิงก์หัวข้อนี้">
                  <Button
                    type="text"
                    icon={copiedSection === 'getting-started' ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                    onClick={() => copyLink('getting-started')}
                  />
                </Tooltip>
              </div>
              <Divider style={{ margin: '14px 0 18px 0' }} />

              <Paragraph style={{ fontSize: 15, lineHeight: 1.8 }}>
                <strong>FormLocal</strong> เป็นแพลตฟอร์มบริหารจัดการแบบฟอร์มและข้อสอบวัดผลภายในองค์กร ออกแบบมาให้ทำงานได้รวดเร็ว ปลอดภัย และยืดหยุ่นสูง รองรับการทำงานทั้งบนคอมพิวเตอร์และแท็บเล็ต (iPad / Touch Screen)
              </Paragraph>

              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} sm={24} xl={8}>
                  <Card
                    style={{ backgroundColor: '#f0f5ff', border: '1px solid #d6e4ff', borderRadius: 8, height: '100%' }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space align="start">
                      <FormOutlined style={{ fontSize: 24, color: '#1677ff' }} />
                      <div>
                        <Text strong style={{ fontSize: 14, display: 'block' }}>สร้างฟอร์มได้อิสระ</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          มีคำถาม 9 ชนิด รองรับการจัดกลุ่ม 2 คอลัมน์คู่ขนานด้วย Layer Box
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={24} xl={8}>
                  <Card
                    style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, height: '100%' }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space align="start">
                      <TrophyOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                      <div>
                        <Text strong style={{ fontSize: 14, display: 'block' }}>ตรวจข้อสอบอัตโนมัติ</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          กำหนดเฉลยคำตอบ คิดคะแนน และตัดเกรดผ่าน/ไม่ผ่านได้ทันที
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} sm={24} xl={8}>
                  <Card
                    style={{ backgroundColor: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8, height: '100%' }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space align="start">
                      <LockOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
                      <div>
                        <Text strong style={{ fontSize: 14, display: 'block' }}>ความเป็นส่วนตัว 3 ระดับ</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          เลือกได้ระหว่าง ส่วนบุคคล (Private), แผนก (Department) หรือ Public
                        </Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              </Row>

              <div style={{ marginTop: 24 }}>
                <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>
                  สิทธิ์การใช้งานในระบบ (Roles):
                </Text>
                <ul>
                  <li>
                    <strong>ผู้ใช้ทั่วไป (USER):</strong> สามารถสร้างแบบฟอร์มของตนเอง, ตอบแบบฟอร์มที่ได้รับมอบหมาย, ดูผลการตอบของฟอร์มที่ตนเป็นเจ้าของ
                  </li>
                  <li>
                    <strong>ผู้ดูแลระบบ (ADMIN):</strong> เข้าถึงฟอร์มทั้งหมดในระบบ, จัดการข้อมูลผู้ใช้และแผนก, ตรวจสอบ Audit Logs, และกำหนดฟอนต์ระบบ
                  </li>
                </ul>
              </div>
            </Card>

            {/* ------------------------------------------------------------- */}
            {/* 2. บทที่ 2: การสร้างและจัดการแบบฟอร์ม */}
            {/* ------------------------------------------------------------- */}
            <Card
              id="form-management"
              style={{ borderRadius: 12, scrollMarginTop: 90 }}
              styles={{ body: { padding: screens.xs ? '18px 14px' : 28 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1677ff', fontSize: screens.xs ? 17 : 20, lineHeight: 1.35 }}>
                  📝 บทที่ 2: การสร้างและจัดการแบบฟอร์ม (Form Management)
                </Title>
                <Tooltip title="คัดลอกลิงก์หัวข้อนี้">
                  <Button
                    type="text"
                    icon={copiedSection === 'form-management' ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                    onClick={() => copyLink('form-management')}
                  />
                </Tooltip>
              </div>
              <Divider style={{ margin: '14px 0 18px 0' }} />

              <Title level={4}>2.1 ขั้นตอนการสร้างแบบฟอร์ม (Fast-Track Flow)</Title>
              <Paragraph style={{ lineHeight: 1.8 }}>
                ระบบใช้รูปแบบ <strong>Fast-Track</strong> เพื่อความคล่องตัวสูงสุด เมื่อคลิกปุ่ม <code>+ สร้างแบบฟอร์มใหม่</code> ระบบจะนำท่านเข้าสู่ Studio โดยตรงทันที โดยไม่ต้องผ่านหน้าต่าง Modal หลายขั้นตอน
              </Paragraph>

              <Alert
                type="success"
                showIcon
                icon={<SaveOutlined />}
                message="ระบบความปลอดภัย Save-First Workflow"
                description="เมื่อท่านคลิกสร้างแบบฟอร์มใหม่ ระบบยังไม่ได้บันทึกข้อมูลลงฐานข้อมูล จนกว่าท่านจะกดปุ่มสีเขียว 'บันทึก (Save)' ในหน้า Studio หากท่านกดยกเลิกหรือกดย้อนกลับ ระบบจะไม่สร้างฟอร์มเปล่าหรือฟอร์มขยะตกค้างในระบบอย่างแน่นอน"
                style={{ marginBottom: 20 }}
              />

              <Steps
                direction="vertical"
                size="small"
                current={-1}
                items={[
                  {
                    title: <Text strong>ขั้นตอนที่ 1: คลิกปุ่ม "+ สร้างแบบฟอร์มใหม่"</Text>,
                    description: 'กดจากหน้ารายการแบบฟอร์ม ระบบจะเปิด Studio ออกแบบฟอร์มขึ้นมาทันที',
                  },
                  {
                    title: <Text strong>ขั้นตอนที่ 2: ระบุชื่อแบบฟอร์ม (Form Title)</Text>,
                    description: 'กรอกชื่อแบบฟอร์มที่ช่องใส่ชื่อด้านบน (กรอบสีฟ้าเด่นชัด) เช่น "แบบประเมินความพึงพอใจประจำปี"',
                  },
                  {
                    title: <Text strong>ขั้นตอนที่ 3: เลือกคำถามหรือจัดกล่อง Layer Box</Text>,
                    description: 'คลิกหรือลากคำถามจากแถบเครื่องมือซ้ายมือลงบน Canvas',
                  },
                  {
                    title: <Text strong>ขั้นตอนที่ 4: กดปุ่มสีเขียว "บันทึก (Save)"</Text>,
                    description: 'เมื่อกด Save ระบบจะบันทึกแบบฟอร์มลงฐานข้อมูล และคงข้อมูลการแก้ไขทั้งหมดไว้อย่างปลอดภัย',
                  },
                ]}
              />

              <Divider style={{ margin: '24px 0 20px 0' }} />

              <Title level={4}>2.2 ระดับสิทธิ์การเข้าถึงและความเป็นส่วนตัว (Privacy & Visibility)</Title>
              <Paragraph style={{ lineHeight: 1.8 }}>
                ท่านสามารถกำหนดได้ว่าแบบฟอร์มนี้ใครสามารถมองเห็นและเข้าทำได้บ้าง โดยแบ่งเป็น 3 ระดับ:
              </Paragraph>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={24} xl={8}>
                  <Card
                    style={{
                      border: '1.5px solid #ffa940',
                      borderRadius: 10,
                      backgroundColor: '#fff7e6',
                      height: '100%',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(250, 140, 22, 0.06)',
                    }}
                    styles={{ body: { padding: '16px 18px', display: 'flex', flexDirection: 'column', height: '100%' } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                      <Tag
                        icon={<LockOutlined />}
                        color="orange"
                        style={{
                          margin: 0,
                          fontSize: 13,
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontWeight: 600,
                          whiteSpace: 'normal',
                          maxWidth: '100%',
                          height: 'auto',
                          lineHeight: 1.5,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ส่วนบุคคล (Private)
                      </Tag>
                    </div>
                    <Paragraph style={{ fontSize: 13, margin: 0, lineHeight: 1.7, color: '#595959', flex: 1 }}>
                      แบบฟอร์มนี้จะมีเพียง<strong>ตัวท่าน (เจ้าของฟอร์ม)</strong> และผู้ที่ท่านกดแชร์ให้โดยเฉพาะเท่านั้นที่สามารถเข้าถึงได้ คนอื่นในระบบจะไม่สามารถค้นพบได้
                    </Paragraph>
                  </Card>
                </Col>

                <Col xs={24} sm={24} xl={8}>
                  <Card
                    style={{
                      border: '1.5px solid #b37feb',
                      borderRadius: 10,
                      backgroundColor: '#f9f0ff',
                      height: '100%',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(114, 46, 209, 0.06)',
                    }}
                    styles={{ body: { padding: '16px 18px', display: 'flex', flexDirection: 'column', height: '100%' } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                      <Tag
                        icon={<ApartmentOutlined />}
                        color="purple"
                        style={{
                          margin: 0,
                          fontSize: 13,
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontWeight: 600,
                          whiteSpace: 'normal',
                          maxWidth: '100%',
                          height: 'auto',
                          lineHeight: 1.5,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        เฉพาะแผนก (Department)
                      </Tag>
                    </div>
                    <Paragraph style={{ fontSize: 13, margin: 0, lineHeight: 1.7, color: '#595959', flex: 1 }}>
                      แบบฟอร์มนี้เปิดให้<strong>บุคลากรทุกคนที่สังกัดในแผนกเดียวกัน</strong>สามารถมองเห็น ค้นพบ และเข้าทำแบบฟอร์มได้ เหมาะสำหรับแบบสำรวจภายในฝ่ายงาน
                    </Paragraph>
                  </Card>
                </Col>

                <Col xs={24} sm={24} xl={8}>
                  <Card
                    style={{
                      border: '1.5px solid #95de64',
                      borderRadius: 10,
                      backgroundColor: '#f6ffed',
                      height: '100%',
                      overflow: 'hidden',
                      boxShadow: '0 2px 6px rgba(82, 196, 26, 0.06)',
                    }}
                    styles={{ body: { padding: '16px 18px', display: 'flex', flexDirection: 'column', height: '100%' } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                      <Tag
                        icon={<GlobalOutlined />}
                        color="green"
                        style={{
                          margin: 0,
                          fontSize: 13,
                          padding: '3px 10px',
                          borderRadius: 6,
                          fontWeight: 600,
                          whiteSpace: 'normal',
                          maxWidth: '100%',
                          height: 'auto',
                          lineHeight: 1.5,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        ทุกคนในองค์กร (Public)
                      </Tag>
                    </div>
                    <Paragraph style={{ fontSize: 13, margin: 0, lineHeight: 1.7, color: '#595959', flex: 1 }}>
                      แบบฟอร์มสาธารณะภายในระบบ <strong>บุคลากรทุกคนที่ล็อกอิน</strong>เข้าสู่ระบบจะสามารถมองเห็นและเข้ามาตอบแบบฟอร์มนี้ได้อย่างอิสระ
                    </Paragraph>
                  </Card>
                </Col>
              </Row>

              <Alert
                type="info"
                showIcon
                style={{ marginTop: 16 }}
                message="วิธีการเปลี่ยนสิทธิ์เข้าถึง (เปลี่ยนได้ 3 วิธี สะดวก รวดเร็ว):"
                description={
                  <ol style={{ paddingLeft: 18, margin: 0 }}>
                    <li><strong>จากเมนู 3 จุด (...) บนการ์ดฟอร์ม:</strong> เลือกหัวข้อ "สิทธิ์เข้าถึง (Visibility)" แล้วคลิกเลือกระดับที่ต้องการ</li>
                    <li><strong>คลิกที่ตัวป้าย Tag บนการ์ด/ตาราง:</strong> คลิกที่ป้ายเช่น <code>ทุกคน (Public) ▾</code> เพื่อเปิดเมนูดรอปดาวน์เปลี่ยนสิทธิ์ในคลิกเดียว</li>
                    <li><strong>ในหน้า Studio ออกแบบฟอร์ม:</strong> คลิกที่ป้าย Tag บนแถบหัวด้านบน หรือไปที่แท็บ "ตั้งค่าฟอร์ม" ด้านขวามือ</li>
                  </ol>
                }
              />

              <Divider style={{ margin: '24px 0 20px 0' }} />

              <Title level={4}>2.3 การเปิด-ปิดรับคำตอบ และการย้ายไปถังขยะ</Title>
              <ul>
                <li>
                  <strong>การเปิด-ปิดรับคำตอบ:</strong> คลิกที่เมนู 3 จุด <code>...</code> เลือกคำสั่ง <code>เปิดรับคำตอบ / ปิดรับคำตอบ</code> เมื่อปิดรับคำตอบ ผู้ใช้จะไม่สามารถส่งคำตอบใหม่ได้
                </li>
                <li>
                  <strong>การย้ายไปถังขยะ (Soft Delete):</strong> เมื่อท่านลบฟอร์ม ฟอร์มจะถูกปิดรับคำตอบและย้ายไปพักไว้ที่แท็บ <strong>"ถังขยะ (Trash)"</strong> โดยยังไม่ถูกลบถาวร ท่านสามารถกด <code>กู้คืน (Restore)</code> ได้ทุกเมื่อ
                </li>
                <li>
                  <strong>การลบถาวร:</strong> ดำเนินการได้จากแท็บถังขยะ เมื่อกดลบถาวรแล้วข้อมูลจะถูกลบออกจากระบบอย่างสมบูรณ์
                </li>
              </ul>
            </Card>

            {/* ------------------------------------------------------------- */}
            {/* 3. บทที่ 3: Studio ออกแบบแบบฟอร์ม */}
            {/* ------------------------------------------------------------- */}
            <Card
              id="form-builder"
              style={{ borderRadius: 12, scrollMarginTop: 90 }}
              styles={{ body: { padding: screens.xs ? '18px 14px' : 28 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1677ff', fontSize: screens.xs ? 17 : 20, lineHeight: 1.35 }}>
                  🎨 บทที่ 3: Studio ออกแบบแบบฟอร์ม (Form Studio & Canvas)
                </Title>
                <Tooltip title="คัดลอกลิงก์หัวข้อนี้">
                  <Button
                    type="text"
                    icon={copiedSection === 'form-builder' ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                    onClick={() => copyLink('form-builder')}
                  />
                </Tooltip>
              </div>
              <Divider style={{ margin: '14px 0 18px 0' }} />

              <Title level={4}>3.1 เครื่องมือคำถาม 9 ชนิด (Question Palette)</Title>
              <Paragraph style={{ lineHeight: 1.8 }}>
                ในแถบเครื่องมือด้านซ้ายมือ ท่านสามารถคลิกเพื่อเพิ่มคำถามลงในฟอร์มได้ 9 ประเภท ดังนี้:
              </Paragraph>

              <Row gutter={[12, 12]}>
                {[
                  { name: 'ข้อความสั้น (Text)', desc: 'เหมาะสำหรับกรอกชื่อ, นามสกุล, หมายเลขประจำตัว' },
                  { name: 'ข้อความยาว (Paragraph)', desc: 'เหมาะสำหรับความคิดเห็น, ข้อเสนอแนะ, อาการ' },
                  { name: 'ตัวเลข (Number)', desc: 'สำหรับกรอกอายุ, น้ำหนัก, ส่วนสูง, ตัวเลขทางสถิติ' },
                  { name: 'ตัวเลือกเดียว (Radio)', desc: 'เลือกคำตอบที่ถูกต้องได้เพียง 1 ข้อ จากหลายตัวเลือก' },
                  { name: 'หลายตัวเลือก (Checkbox)', desc: 'สามารถติ๊กเลือกคำตอบได้มากกว่า 1 ข้อ' },
                  { name: 'รายการเลือก (Dropdown)', desc: 'เมนูดรอปดาวน์ เหมาะสำหรับตัวเลือกจำนวนมาก' },
                  { name: 'วันที่ (Date Picker)', desc: 'ปฏิทินเลือกวัน/เดือน/ปี ที่ต้องการ' },
                  { name: 'การให้คะแนน (Rating)', desc: 'ให้คะแนนแบบรูปดาว (1 ถึง 5 ดาว) สำหรับวัดความพึงพอใจ' },
                  { name: 'แนบไฟล์ (File Upload)', desc: 'อัปโหลดไฟล์เอกสาร PDF หรือรูปภาพประกอบ' },
                ].map((item, idx) => (
                  <Col xs={24} sm={12} md={8} key={idx}>
                    <div style={{ border: '1px solid #e8e8e8', padding: '12px 14px', borderRadius: 8, height: '100%' }}>
                      <Text strong style={{ color: '#1677ff' }}>{item.name}</Text>
                      <Paragraph type="secondary" style={{ fontSize: 12, margin: '4px 0 0 0' }}>
                        {item.desc}
                      </Paragraph>
                    </div>
                  </Col>
                ))}
              </Row>

              <Divider style={{ margin: '24px 0 20px 0' }} />

              <Title level={4}>3.2 กล่องจัดกลุ่มข้อมูล (Layer Box - จัดหน้า 2 คอลัมน์)</Title>
              <Paragraph style={{ lineHeight: 1.8 }}>
                ปุ่ม <strong>"+ เพิ่มกล่องจัดกลุ่มข้อมูล (Layer Box)"</strong> ด้านบนของพาเล็ตเครื่องมือ ใช้สำหรับรวมกลุ่มคำถามที่เกี่ยวข้องกันไว้ในกรอบเดียวกัน เช่น <em>"ข้อมูลส่วนตัว"</em> หรือ <em>"ข้อมูลการรักษา"</em>
              </Paragraph>
              <Alert
                type="info"
                showIcon
                icon={<AppstoreOutlined />}
                message="ความสามารถของ Layer Box:"
                description="ท่านสามารถกำหนดให้คำถามภายในกล่องจัดแสดงผลเป็น 2 คอลัมน์คู่ขนานในหน้าแบบฟอร์มจริงได้ ช่วยให้หน้าฟอร์มกะทัดรัด สบายตา และประหยัดพื้นที่บนหน้าจอ iPad ได้อย่างยอดเยี่ยม"
              />

              <Divider style={{ margin: '24px 0 20px 0' }} />

              <Title level={4}>3.3 การจัดเรียงและคลังแม่แบบ (Templates)</Title>
              <ul>
                <li>
                  <strong>การจัดเรียงคำถาม:</strong> ท่านสามารถจับที่ไอคอนด้ามจับเพื่อลากสลับตำแหน่ง (Drag & Drop) หรือคลิกปุ่มลูกศร <strong>ขึ้น (↑) / ลง (↓)</strong> ที่การ์ดคำถามเพื่อสลับตำแหน่งได้อย่างแม่นยำ
                </li>
                <li>
                  <strong>การดูตัวอย่าง (Preview):</strong> คลิกปุ่ม <code>ดูตัวอย่าง (Preview)</code> เพื่อทดสอบกรอกฟอร์มเสมือนจริงก่อนส่งให้ผู้อื่นทำ
                </li>
                <li>
                  <strong>คลังแม่แบบ (Templates):</strong> คลิกปุ่ม <code>แม่แบบ (Templates)</code> ในแถบหัวบน หากต้องการโหลดโครงสร้างฟอร์มมาตรฐาน เช่น <em>แบบประเมินพัฒนาการเด็ก M-CHAT-R</em> มาใช้งานได้ทันทีในคลิกเดียว
                </li>
              </ul>
            </Card>

            {/* ------------------------------------------------------------- */}
            {/* 4. บทที่ 4: การกำหนดเฉลยและเกณฑ์การสอบ */}
            {/* ------------------------------------------------------------- */}
            <Card
              id="scoring-answers"
              style={{ borderRadius: 12, scrollMarginTop: 90 }}
              styles={{ body: { padding: screens.xs ? '18px 14px' : 28 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1677ff', fontSize: screens.xs ? 17 : 20, lineHeight: 1.35 }}>
                  🎯 บทที่ 4: การกำหนดเฉลยและเกณฑ์การสอบ (Answer Key & Scoring)
                </Title>
                <Tooltip title="คัดลอกลิงก์หัวข้อนี้">
                  <Button
                    type="text"
                    icon={copiedSection === 'scoring-answers' ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                    onClick={() => copyLink('scoring-answers')}
                  />
                </Tooltip>
              </div>
              <Divider style={{ margin: '14px 0 18px 0' }} />

              <Paragraph style={{ lineHeight: 1.8 }}>
                ระบบ FormLocal สามารถเปลี่ยนแบบฟอร์มธรรมดาให้กลายเป็น <strong>"ข้อสอบวัดผล (Score Test)"</strong> ที่ตรวจคำตอบและคิดคะแนนอัตโนมัติได้อย่างสมบูรณ์แบบ
              </Paragraph>

              <Title level={4}>4.1 ขั้นตอนการกำหนดเฉลยคำตอบ (Answer Key)</Title>
              <Steps
                direction="vertical"
                size="small"
                current={-1}
                items={[
                  {
                    title: <Text strong>1. คลิกเลือกคำถามใน Canvas</Text>,
                    description: 'คลิกที่กล่องคำถามที่ต้องการเฉลย แถบด้านขวามือจะแสดง "ตั้งค่าคำถาม"',
                  },
                  {
                    title: <Text strong>2. เลื่อนลงมาที่กล่อง "🎯 เฉลยคำตอบและคะแนน"</Text>,
                    description: 'จะพบช่องสำหรับใส่คะแนนเต็มของข้อนี้ (Points) และส่วนกำหนดคำตอบที่ถูกต้อง',
                  },
                  {
                    title: <Text strong>3. กำหนดคำตอบตามประเภทคำถาม:</Text>,
                    description: (
                      <div style={{ marginTop: 6, lineHeight: 1.8 }}>
                        • <strong>ตัวเลือกเดียว (Radio) / รายการเลือก (Dropdown):</strong> คลิกเลือกตัวเลือกที่ถูกต้อง<br />
                        • <strong>หลายตัวเลือก (Checkbox):</strong> ติ๊กเลือกคำตอบที่ถูกต้องทั้งหมด (ผู้สอบต้องตอบถูกครบทุกข้อจึงจะได้คะแนน)<br />
                        • <strong>ข้อความสั้น (Text):</strong> พิมพ์คำตอบที่ถูก (ระบบเปรียบเทียบโดยตัดช่องว่างหน้า-หลัง และไม่สนตัวพิมพ์เล็ก-ใหญ่)<br />
                        • <strong>ตัวเลข (Number):</strong> ระบุตัวเลขคำตอบ (ระบบเปรียบเทียบค่าทางคณิตศาสตร์อย่างแม่นยำ)<br />
                        • <strong>การให้คะแนน (Rating):</strong> กำหนดจำนวนดาวที่ถูกต้อง
                      </div>
                    ),
                  },
                ]}
              />

              <Divider style={{ margin: '24px 0 20px 0' }} />

              <Title level={4}>4.2 การตั้งเกณฑ์คะแนนสอบผ่าน (Passing Score)</Title>
              <Paragraph style={{ lineHeight: 1.8 }}>
                ไปที่แท็บ <strong>"ตั้งค่าฟอร์ม"</strong> ในแถบขวามือ เลื่อนลงมาที่หัวข้อ <strong>🏆 เกณฑ์การสอบ (Passing Criteria)</strong>:
              </Paragraph>
              <ul>
                <li>
                  <strong>เกณฑ์คะแนนผ่าน (%):</strong> เช่น กำหนดที่ 60% หรือ 80% ระบบจะรวมคะแนนทุกข้อและคำนวณร้อยละทันทีเมื่อผู้สอบกดส่ง
                </li>
                <li>
                  <strong>การแสดงผลลัพธ์:</strong> เมื่อผู้สอบกดส่ง ระบบจะแสดงผลว่า <strong>"ผ่านเกณฑ์ (PASS)"</strong> หรือ <strong>"ไม่ผ่านเกณฑ์ (FAIL)"</strong> พร้อมสรุปคะแนนที่ทำได้และเฉลยคำตอบให้อย่างชัดเจน
                </li>
              </ul>
            </Card>

            {/* ------------------------------------------------------------- */}
            {/* 5. บทที่ 5: การตอบฟอร์มและดูผลลัพธ์ */}
            {/* ------------------------------------------------------------- */}
            <Card
              id="runner-submissions"
              style={{ borderRadius: 12, scrollMarginTop: 90 }}
              styles={{ body: { padding: screens.xs ? '18px 14px' : 28 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1677ff', fontSize: screens.xs ? 17 : 20, lineHeight: 1.35 }}>
                  📋 บทที่ 5: การตอบฟอร์มและดูผลลัพธ์ (Runner & Submissions)
                </Title>
                <Tooltip title="คัดลอกลิงก์หัวข้อนี้">
                  <Button
                    type="text"
                    icon={copiedSection === 'runner-submissions' ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                    onClick={() => copyLink('runner-submissions')}
                  />
                </Tooltip>
              </div>
              <Divider style={{ margin: '14px 0 18px 0' }} />

              <Title level={4}>5.1 การตอบแบบฟอร์ม (Form Runner)</Title>
              <Paragraph style={{ lineHeight: 1.8 }}>
                เมื่อผู้ใช้เปิดฟอร์มเพื่อทำแบบทดสอบหรือกรอกข้อมูล:
              </Paragraph>
              <ul>
                <li>ระบบจะตรวจสอบข้อที่ระบุว่า <strong>"จำเป็นต้องตอบ (Required)"</strong> หากยังตอบไม่ครบ จะมีข้อความแจ้งเตือนสีแดงชี้ตำแหน่งให้ทราบ</li>
                <li>รองรับการกรอกข้อมูลที่รวดเร็วบนหน้าจอสัมผัส (Touch Screen Friendly) ปรับขนาดปุ่มกดให้กว้าง สบายตา</li>
                <li>เมื่อกดยืนยันส่งคำตอบ ระบบจะบันทึกเวลาที่ส่ง บัญชีผู้ส่ง และคำนวณผลคะแนนทันที</li>
              </ul>

              <Divider style={{ margin: '24px 0 20px 0' }} />

              <Title level={4}>5.2 การดูผลตอบกลับ (Submissions Analytics)</Title>
              <Paragraph style={{ lineHeight: 1.8 }}>
                เจ้าของฟอร์มสามารถคลิกปุ่ม <strong>"ผลตอบกลับ"</strong> เพื่อตรวจสอบ:
              </Paragraph>
              <ul>
                <li>รายชื่อผู้ที่ส่งคำตอบ พร้อมวันเวลาที่ส่ง</li>
                <li>คะแนนที่ได้ และสถานะผ่าน/ไม่ผ่าน</li>
                <li>คลิกเปิดดูคำตอบรายบุคคล เพื่อดูรายละเอียดการตอบในแต่ละข้ออย่างครบถ้วน</li>
              </ul>
            </Card>

            {/* ------------------------------------------------------------- */}
            {/* 6. บทที่ 6: การตั้งค่าระบบสำหรับผู้ดูแล (Admin) */}
            {/* ------------------------------------------------------------- */}
            <Card
              id="admin-guide"
              style={{ borderRadius: 12, scrollMarginTop: 90 }}
              styles={{ body: { padding: screens.xs ? '18px 14px' : 28 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1677ff', fontSize: screens.xs ? 17 : 20, lineHeight: 1.35 }}>
                  ⚙️ บทที่ 6: การตั้งค่าระบบสำหรับผู้ดูแล (Admin Guide)
                </Title>
                <Tooltip title="คัดลอกลิงก์หัวข้อนี้">
                  <Button
                    type="text"
                    icon={copiedSection === 'admin-guide' ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                    onClick={() => copyLink('admin-guide')}
                  />
                </Tooltip>
              </div>
              <Divider style={{ margin: '14px 0 18px 0' }} />

              <Paragraph style={{ lineHeight: 1.8 }}>
                เมนูสำหรับบัญชีสิทธิ์ <strong>ADMIN</strong> เท่านั้น:
              </Paragraph>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <Card style={{ backgroundColor: '#fafafa', borderRadius: 8, height: '100%' }}>
                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>
                      👥 จัดการผู้ใช้งานและแผนก (Users & Departments)
                    </Text>
                    <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                      เพิ่ม แก้ไข หรือระงับบัญชีผู้ใช้ กำหนดบทบาท (ADMIN / USER) และจัดผู้ใช้เข้าสังกัดแผนกงาน เพื่อให้ระบบแชร์ฟอร์มเฉพาะแผนกทำงานได้ถูกต้อง
                    </Paragraph>
                  </Card>
                </Col>

                <Col xs={24} md={12}>
                  <Card style={{ backgroundColor: '#fafafa', borderRadius: 8, height: '100%' }}>
                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>
                      🔤 การกำหนดฟอนต์ระบบ (Font Customization)
                    </Text>
                    <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                      ที่หน้า <strong>ตั้งค่าระบบ (Settings)</strong> ผู้ดูแลระบบสามารถเลือกฟอนต์แสดงผลทั้งเว็บได้ เช่น <em>Sarabun</em> หรืออัปโหลดไฟล์ฟอนต์ <code>.ttf / .woff2</code> เข้าสู่ระบบได้ทันที
                    </Paragraph>
                  </Card>
                </Col>
              </Row>
            </Card>

            {/* ------------------------------------------------------------- */}
            {/* 7. บทที่ 7: คำถามที่พบบ่อย (FAQ) */}
            {/* ------------------------------------------------------------- */}
            <Card
              id="faq"
              style={{ borderRadius: 12, scrollMarginTop: 90 }}
              styles={{ body: { padding: screens.xs ? '18px 14px' : 28 } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1677ff', fontSize: screens.xs ? 17 : 20, lineHeight: 1.35 }}>
                  ❓ บทที่ 7: คำถามที่พบบ่อย (FAQ & Troubleshooting)
                </Title>
                <Tooltip title="คัดลอกลิงก์หัวข้อนี้">
                  <Button
                    type="text"
                    icon={copiedSection === 'faq' ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CopyOutlined />}
                    onClick={() => copyLink('faq')}
                  />
                </Tooltip>
              </div>
              <Divider style={{ margin: '14px 0 18px 0' }} />

              <Collapse
                defaultActiveKey={['1', '2']}
                items={[
                  {
                    key: '1',
                    label: <Text strong>ถาม: สร้างแบบฟอร์มแล้วทำไมเพื่อนร่วมงานมองไม่เห็น?</Text>,
                    children: (
                      <Paragraph style={{ margin: 0, lineHeight: 1.8 }}>
                        ตอบ: ให้ตรวจสอบการตั้งค่า <strong>ความเป็นส่วนตัว (Visibility)</strong> ของฟอร์มว่าตั้งเป็น <code>ส่วนบุคคล (Private)</code> อยู่หรือไม่ หากต้องการให้เพื่อนร่วมงานเห็น ให้ปรับเป็น <code>เฉพาะแผนก (Department)</code> หรือ <code>ทุกคนในองค์กร (Public)</code> จากเมนู 3 จุด <code>...</code> ครับ
                      </Paragraph>
                    ),
                  },
                  {
                    key: '2',
                    label: <Text strong>ถาม: ถ้ากดสร้างแบบฟอร์มแล้ว แต่ยังไม่ได้กดบันทึก จะเกิดอะไรขึ้น?</Text>,
                    children: (
                      <Paragraph style={{ margin: 0, lineHeight: 1.8 }}>
                        ตอบ: ระบบใช้ระบบ <strong>Save-First</strong> ครับ หากไม่ได้กดปุ่มสีเขียว "บันทึก (Save)" ระบบจะไม่สร้างเรคคอร์ดใดๆ ลงในฐานข้อมูล ทำให้ไม่มีฟอร์มขยะหรือฟอร์มว่างตกค้างในระบบอย่างแน่นอน
                      </Paragraph>
                    ),
                  },
                  {
                    key: '3',
                    label: <Text strong>ถาม: แก้ไขแบบฟอร์มที่มีคนส่งคำตอบไปแล้ว คำตอบเก่าจะหายไหม?</Text>,
                    children: (
                      <Paragraph style={{ margin: 0, lineHeight: 1.8 }}>
                        ตอบ: ไม่หายครับ! ระบบ FormLocal ใช้สถาปัตยกรรม <strong>Versioning</strong> เมื่อฟอร์มมีการส่งคำตอบแล้ว การแก้ไขในอนาคตจะถูกสร้างเป็นเวอร์ชันใหม่ (เช่น เวอร์ชัน 2) โดยคำตอบเดิมจะยังคงผูกกับโครงสร้างเวอร์ชันเก่าอย่างสมบูรณ์แบบ
                      </Paragraph>
                    ),
                  },
                  {
                    key: '4',
                    label: <Text strong>ถาม: หากเผลอลบแบบฟอร์ม สามารถกู้คืนได้ไหม?</Text>,
                    children: (
                      <Paragraph style={{ margin: 0, lineHeight: 1.8 }}>
                        ตอบ: ได้แน่นอนครับ แบบฟอร์มที่ถูกลบจะถูกย้ายไปอยู่ในแท็บ <strong>"ถังขยะ (Trash)"</strong> ท่านสามารถคลิกเข้าไปที่แท็บถังขยะและกด <code>กู้คืน (Restore)</code> เพื่อนำฟอร์มกลับมาใช้งานได้ทันที
                      </Paragraph>
                    ),
                  },
                ]}
              />
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default DocumentationPage;
