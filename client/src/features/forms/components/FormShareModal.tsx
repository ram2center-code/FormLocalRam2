import React, { useState, useEffect } from 'react';
import {
  Modal,
  Typography,
  Radio,
  Select,
  Button,
  Input,
  Space,
  Alert,
  Divider,
  App,
  Spin,
  QRCode,
  Segmented,
  Card,
  Tag,
  Switch,
} from 'antd';
import {
  ShareAltOutlined,
  CopyOutlined,
  GlobalOutlined,
  ApartmentOutlined,
  LockOutlined,
  UserOutlined,
  CheckOutlined,
  ExportOutlined,
  DownloadOutlined,
  MobileOutlined,
  LaptopOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/axios';
import {
  FormVisibility,
  updateFormSettingsApi,
  shareFormApi,
  getFormByIdApi,
} from '../api/formApi';
import { lookupUsersApi, UserLookupItem } from '../../users/api/userApi';
import { downloadFormHtml } from '../utils/exportHtml';

const { Text, Paragraph } = Typography;

interface FormShareModalProps {
  formId: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FormShareModal: React.FC<FormShareModalProps> = ({
  formId,
  open,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const [visibility, setVisibility] = useState<FormVisibility>('PRIVATE');
  const [requireLogin, setRequireLogin] = useState<boolean>(true);
  const [pdpaEnabled, setPdpaEnabled] = useState<boolean>(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchUserText, setSearchUserText] = useState('');
  const [shareTarget, setShareTarget] = useState<'IPAD' | 'LOCAL'>('IPAD');

  // 1. ดึงข้อมูล IP เครื่องเพื่อสร้างลิงก์สำหรับ iPad / โทรศัพท์มือถือในวง Wi-Fi
  const { data: netInfo } = useQuery({
    queryKey: ['network-info'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/network-info');
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: open,
  });

  const lanIp =
    netInfo?.primaryIp ||
    (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
      ? window.location.hostname
      : '172.18.124.75');
  const port = window.location.port ? `:${window.location.port}` : '';
  const lanShareUrl = formId ? `http://${lanIp}${port}/forms/${formId}/view` : '';
  const localShareUrl = formId ? `${window.location.origin}/forms/${formId}/view` : '';

  // 2. ดึงรายละเอียดฟอร์มเพื่อดูการตั้งค่าและรายชื่อที่แชร์อยู่เดิม
  const { data: formDetail, isLoading: isLoadingForm } = useQuery({
    queryKey: ['form-share-detail', formId],
    queryFn: () => getFormByIdApi(formId!, true),
    enabled: !!formId && open,
  });

  // 3. ดึงรายชื่อผู้ใช้ที่สามารถแชร์ให้ได้ (Lookup)
  const { data: availableUsers = [], isLoading: isLoadingUsers } = useQuery<UserLookupItem[]>({
    queryKey: ['users-lookup', searchUserText],
    queryFn: () => lookupUsersApi(searchUserText),
    enabled: open && visibility === 'PRIVATE',
  });

  useEffect(() => {
    if (formDetail) {
      setVisibility(formDetail.visibility);
      setRequireLogin(formDetail.requireLogin !== false);
      setPdpaEnabled(Boolean(formDetail.pdpaEnabled));
      const sharedIds = (formDetail.shares || []).map((s) => s.userId);
      setSelectedUserIds(sharedIds);
    }
  }, [formDetail]);

  const handleCopyLink = (url: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      message.success('คัดลอกลิงก์แบบฟอร์มไปยังคลิปบอร์ดแล้ว!');
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const downloadQRCode = () => {
    const canvas = document.getElementById('form-share-qrcode')?.querySelector<HTMLCanvasElement>('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.download = `QRCode-${formDetail?.title || 'Form'}.png`;
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      message.success('ดาวน์โหลดรูปภาพ QR Code เรียบร้อยแล้ว');
    }
  };

  // Mutation บันทึกการแชร์
  const saveShareMutation = useMutation({
    mutationFn: async () => {
      if (!formId) return;

      // 1. อัปเดต Visibility, requireLogin และ pdpaEnabled ถ้ามีการเปลี่ยนแปลง
      if (
        formDetail &&
        (formDetail.visibility !== visibility ||
          formDetail.requireLogin !== requireLogin ||
          formDetail.pdpaEnabled !== pdpaEnabled)
      ) {
        await updateFormSettingsApi(formId, { visibility, requireLogin, pdpaEnabled });
      }

      // 2. ถ้าเป็น PRIVATE บันทึกรายชื่อผู้ใช้ที่แชร์ให้
      if (visibility === 'PRIVATE') {
        await shareFormApi(formId, selectedUserIds);
      }
    },
    onSuccess: () => {
      message.success('บันทึกการตั้งค่าการแชร์เรียบร้อยแล้ว');
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['form', formId] });
      queryClient.invalidateQueries({ queryKey: ['form-share-detail', formId] });
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'บันทึกการแชร์ไม่สำเร็จ');
    },
  });

  return (
    <Modal
      title={
        <Space size="middle">
          <ShareAltOutlined style={{ color: '#1677ff', fontSize: 20 }} />
          <span>แชร์แบบฟอร์ม: {formDetail?.title || 'กำลังโหลด...'}</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={640}
      footer={[
        <Button key="cancel" onClick={onClose}>
          ปิด
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saveShareMutation.isPending}
          onClick={() => saveShareMutation.mutate()}
        >
          บันทึกการตั้งค่า
        </Button>,
      ]}
    >
      {isLoadingForm ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin tip="กำลังโหลดข้อมูล..." />
        </div>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 8 }}>
          {/* แจ้งเตือนกรณีฟอร์มยังไม่ได้ Publish */}
          {formDetail?.status === 'DRAFT' && (
            <Alert
              type="warning"
              showIcon
              message="แบบฟอร์มนี้ยังมีสถานะเป็น 'แบบร่าง (Draft)'"
              description="ผู้ใช้อื่นจะยังไม่สามารถตอบแบบฟอร์มได้ กรุณากด 'เผยแพร่ฟอร์ม (Publish)' ในหน้า Form Studio เมื่อคุณสร้างเสร็จสมบูรณ์"
            />
          )}

          {/* ลิงก์สำหรับแชร์ และ QR Code สำหรับ iPad */}
          <Card
            size="small"
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text strong style={{ fontSize: 14 }}>
                🔗 ช่องทางการแชร์แบบฟอร์ม
              </Text>
              <Segmented
                value={shareTarget}
                onChange={(val) => setShareTarget(val as 'IPAD' | 'LOCAL')}
                options={[
                  {
                    label: (
                      <Space size={4}>
                        <MobileOutlined />
                        <span>iPad / มือถือ (Wi-Fi)</span>
                      </Space>
                    ),
                    value: 'IPAD',
                  },
                  {
                    label: (
                      <Space size={4}>
                        <LaptopOutlined />
                        <span>เครื่องนี้ (Localhost)</span>
                      </Space>
                    ),
                    value: 'LOCAL',
                  },
                ]}
              />
            </div>

            {shareTarget === 'IPAD' ? (
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  id="form-share-qrcode"
                  style={{
                    background: '#fff',
                    padding: 8,
                    borderRadius: 8,
                    border: '1px solid #d9d9d9',
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <QRCode
                    value={lanShareUrl || 'https://formlocal.internal'}
                    size={130}
                    bordered={false}
                  />
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={downloadQRCode}
                    style={{ fontSize: 11, padding: 0, height: 22, marginTop: 4 }}
                  >
                    บันทึกภาพ QR
                  </Button>
                </div>

                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Tag color="cyan" icon={<WifiOutlined />}>
                      เปิดใช้งานบน iPad ผ่าน Wi-Fi เดียวกัน
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                    หยิบกล้อง iPad หรือ iPhone ส่อง QR Code หรือคัดลอกลิงก์ด้านล่างไปเปิดบน Safari/Chrome:
                  </Text>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Input value={lanShareUrl} readOnly style={{ backgroundColor: '#fff', fontSize: 12 }} />
                    <Button
                      type="primary"
                      icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                      onClick={() => handleCopyLink(lanShareUrl)}
                    >
                      {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                    </Button>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #e2e8f0' }}>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => formDetail && downloadFormHtml(formDetail)}
                      style={{ borderRadius: 8, fontSize: 13, color: '#0958d9', borderColor: '#91caff' }}
                      block
                    >
                      📥 ดาวน์โหลดไฟล์ HTML สแตนด์อโลน (เปิดออฟไลน์บน iPad ได้ทันที)
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Input value={localShareUrl} readOnly style={{ backgroundColor: '#fff', fontSize: 13 }} />
                  <Button
                    type="primary"
                    icon={copied ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() => handleCopyLink(localShareUrl)}
                  >
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
                  </Button>
                  <Button
                    icon={<ExportOutlined />}
                    title="เปิดดูหน้าแบบฟอร์ม"
                    onClick={() => window.open(localShareUrl, '_blank')}
                  />
                </div>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
                  * ลิงก์ localhost สำหรับเปิดใช้งานทดสอบบนเครื่องคอมพิวเตอร์นี้โดยตรง
                </Text>
              </div>
            )}
          </Card>

          <Divider style={{ margin: '4px 0' }} />

          {/* สิทธิ์การเข้าถึงโดยไม่ต้องล็อกอิน (Public / Guest Access) */}
          <div
            style={{
              padding: '12px 16px',
              background: !requireLogin ? '#f6ffed' : '#fafafa',
              border: `1px solid ${!requireLogin ? '#b7eb8f' : '#e2e8f0'}`,
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ paddingRight: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text strong style={{ fontSize: 13 }}>
                  🔓 อนุญาตให้ทำฟอร์มได้โดยไม่ต้องล็อกอิน (Guest / Public Access)
                </Text>
                {!requireLogin && <Tag color="green">เปิดใช้งานอยู่</Tag>}
              </div>
              <Paragraph type="secondary" style={{ margin: '2px 0 0 0', fontSize: 12 }}>
                ผู้ตอบที่มีลิงก์หรือสแกน QR Code (เช่น บน iPad, คนไข้ หรือบุคคลภายนอก) สามารถเปิดทำแบบฟอร์มได้ทันทีโดยไม่ต้องมีบัญชีผู้ใช้
              </Paragraph>
            </div>
            <Switch
              checked={!requireLogin}
              onChange={(checked) => setRequireLogin(!checked)}
              checkedChildren="เปิด"
              unCheckedChildren="ปิด"
            />
          </div>

          {/* สิทธิ์ข้อตกลงความยินยอม PDPA */}
          <div
            style={{
              padding: '12px 16px',
              background: pdpaEnabled ? '#f6ffed' : '#fafafa',
              border: `1px solid ${pdpaEnabled ? '#b7eb8f' : '#e2e8f0'}`,
              borderRadius: 10,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ paddingRight: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text strong style={{ fontSize: 13 }}>
                  🛡️ ข้อตกลงความยินยอมข้อมูลส่วนบุคคล (PDPA Consent)
                </Text>
                {pdpaEnabled && <Tag color="green">เปิดใช้งานอยู่</Tag>}
              </div>
              <Paragraph type="secondary" style={{ margin: '2px 0 0 0', fontSize: 12 }}>
                แสดงหน้าต่างแจ้งข้อตกลงและขอความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล ก่อนเริ่มทำแบบฟอร์ม (ปรับแต่งข้อความได้ในหน้า Studio)
              </Paragraph>
            </div>
            <Switch
              checked={pdpaEnabled}
              onChange={(checked) => setPdpaEnabled(checked)}
              checkedChildren="เปิด"
              unCheckedChildren="ปิด"
            />
          </div>

          {/* สิทธิ์การมองเห็น (Visibility) */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 10 }}>
              🛡️ กำหนดสิทธิ์ว่าใครสามารถเห็นและกรอกฟอร์มนี้ได้:
            </Text>

            <Radio.Group
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%' }}
            >
              <Radio value="PUBLIC">
                <Space align="start">
                  <GlobalOutlined style={{ fontSize: 18, color: '#52c41a', marginTop: 2 }} />
                  <div>
                    <Text strong>สาธารณะทุกคนในองค์กร (PUBLIC)</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                      ผู้ใช้ทุกคนที่ล็อกอินในระบบจะมองเห็นฟอร์มนี้ในหน้ารายการ และเปิดเข้าตอบได้ทันที
                    </Paragraph>
                  </div>
                </Space>
              </Radio>

              <Radio value="DEPARTMENT">
                <Space align="start">
                  <ApartmentOutlined style={{ fontSize: 18, color: '#1677ff', marginTop: 2 }} />
                  <div>
                    <Text strong>เฉพาะคนในแผนกเดียวกัน (DEPARTMENT)</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                      จำกัดให้เฉพาะสมาชิกในแผนก {formDetail?.department?.name ? `"${formDetail.department.name}"` : 'เดียวกัน'} เท่านั้นที่เห็นและกรอกได้
                    </Paragraph>
                  </div>
                </Space>
              </Radio>

              <Radio value="PRIVATE">
                <Space align="start">
                  <LockOutlined style={{ fontSize: 18, color: '#fa8c16', marginTop: 2 }} />
                  <div>
                    <Text strong>เฉพาะบุคคลที่ระบุ (PRIVATE)</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                      เฉพาะตัวคุณ (เจ้าของฟอร์ม) และเพื่อนร่วมงานที่เลือกรายชื่อไว้ด้านล่างนี้เท่านั้น
                    </Paragraph>
                  </div>
                </Space>
              </Radio>
            </Radio.Group>
          </div>

          {/* เลือกผู้ใช้กรณี PRIVATE */}
          {visibility === 'PRIVATE' && (
            <div
              style={{
                marginTop: 8,
                padding: 16,
                backgroundColor: '#fafafa',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
              }}
            >
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                <UserOutlined style={{ marginRight: 6 }} />
                เลือกรายชื่อผู้ใช้ที่ต้องการแชร์ให้:
              </Text>

              <Select
                mode="multiple"
                allowClear
                showSearch
                style={{ width: '100%' }}
                placeholder="พิมพ์ชื่อ หรือ Username เพื่อค้นหาเพื่อนร่วมงาน..."
                value={selectedUserIds}
                onChange={setSelectedUserIds}
                onSearch={setSearchUserText}
                loading={isLoadingUsers}
                filterOption={(input, option) =>
                  (option?.label as unknown as string || '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={availableUsers.map((u) => ({
                  value: u.id,
                  label: `${u.fullName} (@${u.username}) ${u.department ? ` - ${u.department.name}` : ''}`,
                }))}
              />

              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  เลือกแล้ว: <strong>{selectedUserIds.length}</strong> คน
                </Text>
              </div>
            </div>
          )}
        </Space>
      )}
    </Modal>
  );
};

export default FormShareModal;
