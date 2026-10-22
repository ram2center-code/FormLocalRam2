import React, { useState } from 'react';
import { Modal, Button, Typography, Checkbox, Drawer, Space } from 'antd';
import {
  SafetyCertificateOutlined,
  FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {
  DEFAULT_PDPA_HEADER_TITLE,
  DEFAULT_PDPA_HEADER_SUBTITLE,
  DEFAULT_PDPA_TITLE,
  DEFAULT_PDPA_SUBTITLE,
  DEFAULT_PDPA_SECTIONS,
  DEFAULT_PDPA_CHECKBOX_1,
  DEFAULT_PDPA_CHECKBOX_2,
  DEFAULT_PDPA_FOOTER_NOTE,
  FULL_PRIVACY_POLICY_TEXT,
} from '../constants/pdpa';

const { Title, Text, Paragraph } = Typography;

export interface PdpaConsentModalProps {
  open: boolean;
  onAccept: () => void;
  onDecline?: () => void;
  formTitle?: string | null;
  formDescription?: string | null;
  headerTitle?: string | null;
  headerSubtitle?: string | null;
  pdpaTitle?: string | null;
  pdpaContent?: string | null;
  isSimulatedPreview?: boolean;
}

export const PdpaConsentModal: React.FC<PdpaConsentModalProps> = ({
  open,
  onAccept,
  onDecline,
  formTitle,
  formDescription,
  headerTitle,
  headerSubtitle,
  pdpaTitle,
  pdpaContent,
  isSimulatedPreview = false,
}) => {
  const displayHeaderTitle = headerTitle || DEFAULT_PDPA_HEADER_TITLE;
  const displayHeaderSubtitle = headerSubtitle || DEFAULT_PDPA_HEADER_SUBTITLE;
  const displayPdpaTitle = pdpaTitle || DEFAULT_PDPA_TITLE;

  const [agreedAcknowledge, setAgreedAcknowledge] = useState(false);
  const [agreedConsent, setAgreedConsent] = useState(false);
  const [privacyPolicyDrawerOpen, setPrivacyPolicyDrawerOpen] = useState(false);

  const canSubmit = agreedAcknowledge && agreedConsent;

  // Custom sections if user customized pdpaContent, otherwise default 4 sections
  const hasCustomContent = Boolean(pdpaContent && pdpaContent.trim().length > 0);

  return (
    <>
      <Modal
        open={open}
        closable={isSimulatedPreview}
        maskClosable={false}
        onCancel={onDecline}
        footer={null}
        width={700}
        centered
        styles={{
          content: {
            padding: 0,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e2e8f0',
          },
          body: {
            padding: 0,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* 1. Header Bar: Royal Blue Banner */}
        <div
          style={{
            background: '#0047cc',
            padding: '14px 22px',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              <SafetyCertificateOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, letterSpacing: '0.2px' }}>
                {displayHeaderTitle}
              </div>
              <div style={{ fontSize: 12.5, color: '#e0e7ff', marginTop: 2 }}>
                {displayHeaderSubtitle}
              </div>
            </div>
          </div>
          <img
            src="/Ram2Logo.png"
            alt="RAM2"
            style={{
              height: 28,
              maxWidth: 90,
              objectFit: 'contain',
              background: '#ffffff',
              padding: '2px 6px',
              borderRadius: 6,
              flexShrink: 0,
            }}
          />
        </div>

        {/* 2. Scrollable Body Content */}
        <div
          style={{
            padding: '24px 28px',
            overflowY: 'auto',
            flex: 1,
            maxHeight: 'calc(85vh - 75px)',
            background: '#ffffff',
          }}
        >
          {/* Main Title & Subtitle */}
          <div style={{ marginBottom: 16 }}>
            <Title
              level={4}
              style={{
                margin: 0,
                fontSize: 19,
                fontWeight: 700,
                color: '#111827',
                lineHeight: 1.4,
              }}
            >
              {displayPdpaTitle}
            </Title>
            <Text type="secondary" style={{ fontSize: 13.5, display: 'block', marginTop: 4 }}>
              {DEFAULT_PDPA_SUBTITLE}
            </Text>
          </div>

          {/* Selected Assessment Box */}
          <div
            style={{
              marginBottom: 20,
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
            }}
          >
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
              หัวข้อแบบประเมินที่เลือก
            </Text>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {formTitle || 'แบบประเมินความเสี่ยงสุขภาพเบื้องต้น'}
            </div>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 2 }}>
              {formDescription || 'ตัวอย่าง: ระบบจะแสดงชื่อหัวข้อจริงที่ผู้ตอบเลือก'}
            </Text>
          </div>

          {/* 4 Standard Numbered Sections */}
          {!hasCustomContent ? (
            DEFAULT_PDPA_SECTIONS.map((sec) => (
              <div key={sec.number} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                  {sec.number}. {sec.title}
                </div>
                {sec.content && (
                  <Paragraph
                    style={{
                      margin: 0,
                      color: '#374151',
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      textAlign: 'justify',
                    }}
                  >
                    {sec.content}
                  </Paragraph>
                )}
                {sec.bullets && (
                  <ul style={{ margin: '4px 0 0', paddingLeft: 22, color: '#374151', fontSize: 13.5, lineHeight: 1.65 }}>
                    {sec.bullets.map((b, idx) => (
                      <li key={idx} style={{ marginBottom: 3 }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          ) : (
            <div
              style={{
                marginBottom: 18,
                whiteSpace: 'pre-line',
                color: '#374151',
                fontSize: 13.5,
                lineHeight: 1.7,
              }}
            >
              {pdpaContent}
            </div>
          )}

          {/* Link to Full Privacy Policy */}
          <div
            onClick={() => setPrivacyPolicyDrawerOpen(true)}
            style={{
              margin: '18px 0 20px',
              padding: '12px 14px',
              backgroundColor: '#f0f7ff',
              border: '1px solid #bae0ff',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
            }}
          >
            <Space>
              <FileTextOutlined style={{ color: '#0052cc', fontSize: 16 }} />
              <span style={{ color: '#0052cc', fontWeight: 600, fontSize: 13.5 }}>
                อ่านประกาศความเป็นส่วนตัวฉบับเต็ม
              </span>
            </Space>
            <RightOutlined style={{ color: '#0052cc', fontSize: 12 }} />
          </div>

          {/* Checkboxes for Consent (Both required) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                cursor: 'pointer',
              }}
              onClick={() => setAgreedAcknowledge((prev) => !prev)}
            >
              <Checkbox
                checked={agreedAcknowledge}
                onChange={(e) => setAgreedAcknowledge(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span
                style={{
                  fontSize: 13.5,
                  color: '#1f2937',
                  lineHeight: 1.5,
                  fontWeight: agreedAcknowledge ? 600 : 400,
                  userSelect: 'none',
                }}
              >
                {DEFAULT_PDPA_CHECKBOX_1}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                cursor: 'pointer',
              }}
              onClick={() => setAgreedConsent((prev) => !prev)}
            >
              <Checkbox
                checked={agreedConsent}
                onChange={(e) => setAgreedConsent(e.target.checked)}
                style={{ marginTop: 2 }}
              />
              <span
                style={{
                  fontSize: 13.5,
                  color: '#1f2937',
                  lineHeight: 1.5,
                  fontWeight: agreedConsent ? 600 : 400,
                  userSelect: 'none',
                }}
              >
                {DEFAULT_PDPA_CHECKBOX_2}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <Button
            type="primary"
            block
            disabled={!canSubmit}
            size="large"
            onClick={onAccept}
            style={{
              height: 46,
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              backgroundColor: canSubmit ? '#0047cc' : '#f3f4f6',
              borderColor: canSubmit ? '#0047cc' : '#e5e7eb',
              color: canSubmit ? '#ffffff' : '#9ca3af',
              boxShadow: canSubmit ? '0 4px 12px rgba(0, 71, 204, 0.25)' : 'none',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              padding: '20px'
            }}
          >
            ยินยอมและเริ่มทำแบบประเมิน
          </Button>

          {/* Footer Warning / Note */}
          <div
            style={{
              textAlign: 'center',
              marginTop: 10,
              fontSize: 12,
              color: '#6b7280',
            }}
          >
            {DEFAULT_PDPA_FOOTER_NOTE}
          </div>
        </div>
      </Modal>

      {/* Drawer: Full Privacy Policy */}
      <Drawer
        title="ประกาศความเป็นส่วนตัวฉบับเต็ม (Full Privacy Notice)"
        placement="right"
        width={typeof window !== 'undefined' && window.innerWidth < 640 ? '92%' : 560}
        zIndex={1150}
        open={privacyPolicyDrawerOpen}
        onClose={() => setPrivacyPolicyDrawerOpen(false)}
      >
        <div style={{ whiteSpace: 'pre-line', lineHeight: 1.8, fontSize: 13.5, color: '#334155' }}>
          {FULL_PRIVACY_POLICY_TEXT}
        </div>
      </Drawer>
    </>
  );
};

export default PdpaConsentModal;
