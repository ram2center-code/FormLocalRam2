import React, { useEffect, useState } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Button,
  Space,
  Typography,
  message,
  Popconfirm,
  Alert,
  Spin,
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  BookOutlined,
} from '@ant-design/icons';
import {
  PdpaSuiteConfig,
  DEFAULT_SUITE_PDPA_CONFIG,
  getPdpaConfigApi,
  updatePdpaConfigApi,
} from '../api/screeningApi';

const { TextArea } = Input;
const { Text } = Typography;

interface PdpaSuiteConfigModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (newConfig: PdpaSuiteConfig) => void;
}

export const PdpaSuiteConfigModal: React.FC<PdpaSuiteConfigModalProps> = ({
  open,
  onClose,
  onSaved,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Load config when opened
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getPdpaConfigApi()
      .then((cfg) => {
        form.setFieldsValue({
          ...cfg,
          sec2ItemsText: (cfg.sec2Items || []).join('\n'),
        });
      })
      .catch((err) => {
        console.error(err);
        message.error('ไม่สามารถโหลดข้อมูล PDPA ล่าสุดได้ ใช้ค่าเริ่มต้น');
        form.setFieldsValue({
          ...DEFAULT_SUITE_PDPA_CONFIG,
          sec2ItemsText: DEFAULT_SUITE_PDPA_CONFIG.sec2Items.join('\n'),
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const items = (values.sec2ItemsText || '')
        .split('\n')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      const payload: Partial<PdpaSuiteConfig> = {
        ...values,
        sec2Items: items.length > 0 ? items : DEFAULT_SUITE_PDPA_CONFIG.sec2Items,
      };
      delete (payload as any).sec2ItemsText;

      const updated = await updatePdpaConfigApi(payload);
      message.success('บันทึกการตั้งค่าข้อความ PDPA สำเร็จเรียบร้อย');
      if (onSaved) onSaved(updated);
      onClose();
    } catch (err: any) {
      if (err?.errorFields) {
        message.warning('กรุณากรอกข้อมูลให้ครบถ้วนในช่องที่จำเป็น');
      } else {
        message.error(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = () => {
    form.setFieldsValue({
      ...DEFAULT_SUITE_PDPA_CONFIG,
      sec2ItemsText: DEFAULT_SUITE_PDPA_CONFIG.sec2Items.join('\n'),
    });
    message.info('รีเซ็ตข้อความเป็นค่าเริ่มต้นของโรงพยาบาลแล้ว (อย่าลืมกดบันทึก)');
  };

  const tabItems = [
    {
      key: 'general',
      label: (
        <span>
          <SettingOutlined /> ส่วนหัว & ข้อมูลฟอร์ม
        </span>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Alert
            type="info"
            showIcon
            message="ปรับแต่งข้อความส่วนหัวและหัวเรื่องของหน้าต่างความยินยอม PDPA"
            description="ข้อความที่แก้ไขที่นี่จะถูกนำไปใช้ในทั้งหน้าเว็บสำหรับเจ้าหน้าที่ และหน้าเครื่องมือคัดกรองของผู้ป่วยภายนอก"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="headerTitle"
              label="หัวข้อแถบบนสุด (Header Title)"
              rules={[{ required: true, message: 'กรุณากรอกหัวข้อบนสุด' }]}
            >
              <Input placeholder="เช่น RAM2 Preliminary Assessment" />
            </Form.Item>
            <Form.Item
              name="headerSubtitle"
              label="คำอธิบายแถบบนสุด (Header Subtitle)"
              rules={[{ required: true, message: 'กรุณากรอกคำอธิบายบนสุด' }]}
            >
              <Input placeholder="เช่น โรงพยาบาลรามคำแหง 2" />
            </Form.Item>
          </div>

          <Form.Item
            name="mainTitle"
            label="หัวข้อเอกสารยินยอม (Main Document Title)"
            rules={[{ required: true, message: 'กรุณากรอกหัวข้อเอกสาร' }]}
          >
            <Input placeholder="หนังสือให้ความยินยอมในการเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคล" />
          </Form.Item>

          <Form.Item name="mainSubtitle" label="คำโปรยย่อย (Sub-headline)">
            <Input placeholder="โปรดอ่านรายละเอียดก่อนเริ่มทำแบบประเมิน" />
          </Form.Item>

          <div
            style={{
              padding: 14,
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}
          >
            <Text strong style={{ color: '#0369a1', display: 'block', marginBottom: 12 }}>
              🏥 ข้อมูลแบบคัดกรองที่แสดงในการ์ด
            </Text>
            <Form.Item
              name="formName"
              label="ชื่อชุดแบบคัดกรอง"
              rules={[{ required: true, message: 'กรุณาระบุชื่อชุดแบบคัดกรอง' }]}
            >
              <Input placeholder="ชุดแบบคัดกรองพัฒนาการ พฤติกรรม และอารมณ์เด็กและวัยรุ่น" />
            </Form.Item>
            <Form.Item name="formDesc" label="คำอธิบาย/รายชื่อเครื่องมือ" style={{ marginBottom: 0 }}>
              <Input placeholder="Child & Adolescent Screening Suite (M-CHAT-R, PDDSQ 4-18, SDQ, SNAP-IV, GAD-7, PHQ-A)" />
            </Form.Item>
          </div>
        </div>
      ),
    },
    {
      key: 'sections',
      label: (
        <span>
          <FileTextOutlined /> เนื้อหา 4 ข้อหลัก
        </span>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ข้อ 1 */}
          <div
            style={{
              padding: 14,
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}
          >
            <Form.Item
              name="sec1Title"
              label="หัวข้อข้อที่ 1"
              rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}
            >
              <Input placeholder="1. วัตถุประสงค์ในการเก็บข้อมูล" />
            </Form.Item>
            <Form.Item
              name="sec1Content"
              label="เนื้อหาข้อที่ 1 (วัตถุประสงค์)"
              rules={[{ required: true, message: 'กรุณาระบุเนื้อหา' }]}
              style={{ marginBottom: 0 }}
            >
              <TextArea rows={3} placeholder="ระบุวัตถุประสงค์การเก็บข้อมูล..." />
            </Form.Item>
          </div>

          {/* ข้อ 2 */}
          <div
            style={{
              padding: 14,
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}
          >
            <Form.Item
              name="sec2Title"
              label="หัวข้อข้อที่ 2"
              rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}
            >
              <Input placeholder="2. ประเภทข้อมูลที่อาจเก็บรวบรวม" />
            </Form.Item>
            <Form.Item
              name="sec2ItemsText"
              label="รายการประเภทข้อมูล (แยก 1 บรรทัดต่อ 1 ข้อความ)"
              style={{ marginBottom: 0 }}
            >
              <TextArea
                rows={5}
                placeholder="ข้อมูลทั่วไปที่จำเป็น&#10;คำตอบเกี่ยวกับอาการ...&#10;ผลการประเมิน..."
              />
            </Form.Item>
          </div>

          {/* ข้อ 3 */}
          <div
            style={{
              padding: 14,
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}
          >
            <Form.Item
              name="sec3Title"
              label="หัวข้อข้อที่ 3"
              rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}
            >
              <Input placeholder="3. ข้อจำกัดของบริการ" />
            </Form.Item>
            <Form.Item
              name="sec3Content"
              label="เนื้อหาข้อที่ 3 (ข้อจำกัดและการเตือน)"
              rules={[{ required: true, message: 'กรุณาระบุเนื้อหา' }]}
              style={{ marginBottom: 0 }}
            >
              <TextArea rows={3} placeholder="ระบุข้อจำกัดของบริการ..." />
            </Form.Item>
          </div>

          {/* ข้อ 4 */}
          <div
            style={{
              padding: 14,
              background: '#f8fafc',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
            }}
          >
            <Form.Item
              name="sec4Title"
              label="หัวข้อข้อที่ 4"
              rules={[{ required: true, message: 'กรุณาระบุหัวข้อ' }]}
            >
              <Input placeholder="4. การรักษาความลับและสิทธิของท่าน" />
            </Form.Item>
            <Form.Item
              name="sec4Content"
              label="เนื้อหาข้อที่ 4"
              rules={[{ required: true, message: 'กรุณาระบุเนื้อหา' }]}
            >
              <TextArea rows={3} placeholder="ระบุข้อความเกี่ยวกับสิทธิและการติดต่อ..." />
            </Form.Item>
            <Form.Item name="dpoEmail" label="อีเมลติดต่อเจ้าหน้าที่คุ้มครองข้อมูล (DPO)" style={{ marginBottom: 0 }}>
              <Input placeholder="PDPA@ram2-hosp.com" />
            </Form.Item>
          </div>
        </div>
      ),
    },
    {
      key: 'checkboxes',
      label: (
        <span>
          <CheckSquareOutlined /> กล่องยินยอม & ปุ่มกดยืนยัน
        </span>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Form.Item
            name="checkbox1"
            label="ข้อความช่องติ๊กที่ 1 (การรับทราบและเข้าใจ)"
            rules={[{ required: true, message: 'กรุณากรอกข้อความ' }]}
          >
            <TextArea rows={2} placeholder="ข้าพเจ้าได้อ่านและรับทราบ..." />
          </Form.Item>

          <Form.Item
            name="checkbox2"
            label="ข้อความช่องติ๊กที่ 2 (การยินยอมข้อมูลสุขภาพ - Sensitive Data)"
            rules={[{ required: true, message: 'กรุณากรอกข้อความ' }]}
          >
            <TextArea rows={2} placeholder="ข้าพเจ้ายินยอมโดยชัดแจ้งให้โรงพยาบาล..." />
          </Form.Item>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item
              name="submitBtnText"
              label="ข้อความบนปุ่มยืนยัน"
              rules={[{ required: true, message: 'กรุณากรอกข้อความปุ่ม' }]}
            >
              <Input placeholder="ยินยอมและเริ่มทำแบบประเมิน" />
            </Form.Item>
            <Form.Item name="footerNote" label="คำแนะนำด้านล่างสุด (Footer Note)">
              <Input placeholder="หากยังไม่ประสงค์ให้ความยินยอม สามารถย่อหน้าต่างนี้ไว้ก่อนได้..." />
            </Form.Item>
          </div>
        </div>
      ),
    },
    {
      key: 'drawer',
      label: (
        <span>
          <BookOutlined /> ประกาศความเป็นส่วนตัวฉบับเต็ม
        </span>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Alert
            type="info"
            showIcon
            message="เนื้อหาในแท็บนี้จะปรากฏเมื่อผู้ใช้กด 'อ่านประกาศความเป็นส่วนตัวฉบับเต็ม'"
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Form.Item name="drawerTitle" label="หัวเรื่องประกาศฉบับเต็ม">
              <Input placeholder="ประกาศความเป็นส่วนตัวฉบับเต็ม" />
            </Form.Item>
            <Form.Item name="drawerSubtitle" label="คำบรรยายย่อย">
              <Input placeholder="โรงพยาบาลรามคำแหง 2 • พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562" />
            </Form.Item>
          </div>

          <Form.Item name="drawerIntro" label="บทนำ (Introduction)">
            <TextArea rows={2} placeholder="โรงพยาบาลรามคำแหง 2 ให้ความสำคัญสูงสุดต่อการคุ้มครองข้อมูลส่วนบุคคล..." />
          </Form.Item>

          <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            <Form.Item name="drawerSec1Title" label="หัวข้อที่ 1">
              <Input placeholder="1. การเก็บรวบรวมข้อมูลส่วนบุคคล" />
            </Form.Item>
            <Form.Item name="drawerSec1Content" label="เนื้อหาที่ 1" style={{ marginBottom: 0 }}>
              <TextArea rows={2} />
            </Form.Item>
          </div>

          <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            <Form.Item name="drawerSec2Title" label="หัวข้อที่ 2">
              <Input placeholder="2. ฐานทางกฎหมายในการประมวลผล" />
            </Form.Item>
            <Form.Item name="drawerSec2Content" label="เนื้อหาที่ 2" style={{ marginBottom: 0 }}>
              <TextArea rows={3} />
            </Form.Item>
          </div>

          <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            <Form.Item name="drawerSec3Title" label="หัวข้อที่ 3">
              <Input placeholder="3. ระยะเวลาการเก็บรักษา" />
            </Form.Item>
            <Form.Item name="drawerSec3Content" label="เนื้อหาที่ 3" style={{ marginBottom: 0 }}>
              <TextArea rows={2} />
            </Form.Item>
          </div>

          <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
            <Form.Item name="drawerSec4Title" label="หัวข้อที่ 4">
              <Input placeholder="4. สิทธิของเจ้าของข้อมูลส่วนบุคคล" />
            </Form.Item>
            <Form.Item name="drawerSec4Content" label="เนื้อหาที่ 4" style={{ marginBottom: 0 }}>
              <TextArea rows={3} />
            </Form.Item>
          </div>
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SafetyCertificateOutlined style={{ color: '#0047cc', fontSize: 20 }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            จัดการและปรับแต่งข้อความ PDPA (Child Screening Suite)
          </span>
        </div>
      }
      width={820}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Popconfirm
            title="คืนค่าเริ่มต้น"
            description="ต้องการคืนค่าข้อความทั้งหมดกลับเป็นค่าเริ่มต้นมาตรฐานของโรงพยาบาลหรือไม่?"
            okText="คืนค่าเริ่มต้น"
            cancelText="ยกเลิก"
            onConfirm={handleResetToDefault}
          >
            <Button icon={<ReloadOutlined />} danger>
              คืนค่าเริ่มต้น
            </Button>
          </Popconfirm>

          <Space>
            <Button onClick={onClose}>ยกเลิก</Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
              style={{ background: '#0047cc', borderColor: '#0047cc', fontWeight: 600 }}
            >
              บันทึกการตั้งค่า
            </Button>
          </Space>
        </div>
      }
      styles={{
        body: { maxHeight: '72vh', overflowY: 'auto', paddingRight: 8 },
      }}
      destroyOnClose
    >
      <Spin spinning={loading}>
        <Form form={form} layout="vertical" requiredMark="optional">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            style={{ marginTop: 8 }}
          />
        </Form>
      </Spin>
    </Modal>
  );
};
