import React, { useState } from 'react';
import {
  Card,
  Typography,
  Space,
  Tag,
  Button,
  Input,
  InputNumber,
  Radio,
  Checkbox,
  Select,
  DatePicker,
  Rate,
  Upload,
  Alert,
  Result,
  Spin,
  App,
  Divider,
  Progress,
  Statistic,
  Row,
  Col,
} from 'antd';
import {
  TrophyOutlined,
  FormOutlined,
  UploadOutlined,
  ShareAltOutlined,
  EditOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  PrinterOutlined,
  DownloadOutlined,
  SafetyCertificateOutlined,
  LockOutlined,
  GlobalOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getFormByIdApi,
  submitFormApi,
  SubmissionResult,
  FormField,
} from '../api/formApi';
import { FormShareModal } from '../components/FormShareModal';
import { PdpaConsentModal } from '../components/PdpaConsentModal';
import { downloadFormHtml } from '../utils/exportHtml';
import { useAuthStore } from '../../../store/authStore';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export const FormViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  // PDPA States
  const [pdpaConsentAccepted, setPdpaConsentAccepted] = useState(false);
  const [pdpaModalOpen, setPdpaModalOpen] = useState(false);

  // ดึงข้อมูลแบบฟอร์ม (ซ่อนเฉลยอัตโนมัติที่ Backend สำหรับผู้ที่ไม่ได้เป็นเจ้าของ)
  const {
    data: form,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['form-view', id],
    queryFn: () => getFormByIdApi(id!, false),
    enabled: !!id,
    retry: false,
  });

  const isPdpaRequired = form ? form.pdpaEnabled !== false : false;

  // เมื่อแบบฟอร์มโหลดเสร็จและมีข้อตกลง PDPA ให้แสดง Modal ขอความยินยอมทันที
  React.useEffect(() => {
    if (form && isPdpaRequired && !pdpaConsentAccepted) {
      setPdpaModalOpen(true);
    }
  }, [form, isPdpaRequired, pdpaConsentAccepted]);

  // ตั้งค่าวันที่เริ่มต้นสำหรับวันที่ทำแบบสอบถามโดยอัตโนมัติ (เช่น วันที่ทำแบบสอบถาม)
  React.useEffect(() => {
    if (form?.schema) {
      const todayStr = dayjs().format('YYYY-MM-DD');
      setAnswers((prev) => {
        let updated = false;
        const initial = { ...prev };
        form.schema.forEach((f) => {
          if (
            f.type === 'date' &&
            (f.label.includes('วันที่ทำ') || f.label.includes('วันที่บันทึก')) &&
            !initial[f.id]
          ) {
            initial[f.id] = todayStr;
            updated = true;
          }
        });
        return updated ? initial : prev;
      });
    }
  }, [form]);

  // Mutation: ส่งคำตอบไปยังเซิร์ฟเวอร์
  const submitMutation = useMutation({
    mutationFn: () =>
      submitFormApi(id!, answers, Boolean(isPdpaRequired ? pdpaConsentAccepted : true)),
    onSuccess: (data) => {
      setSubmissionResult(data);
      message.success('ส่งคำตอบเรียบร้อยแล้ว!');
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: (err: any) => {
      message.error(err.response?.data?.message || err.message || 'ส่งคำตอบไม่สำเร็จ');
    },
  });

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers((prev) => {
      const next = { ...prev, [fieldId]: value };

      // Auto-calculate age in months if date changed and an age field exists
      const currentField = form?.schema.find((f) => f.id === fieldId);
      if (currentField && currentField.type === 'date' && currentField.label.includes('วันเกิด') && value) {
        const birthDate = dayjs(value);
        if (birthDate.isValid()) {
          const months = dayjs().diff(birthDate, 'month');
          const ageField = form?.schema.find(
            (f) =>
              f.id !== fieldId &&
              (f.label.includes('อายุ') || f.placeholder?.includes('คำนวณจากวันเกิด'))
          );
          if (ageField && months >= 0) {
            next[ageField.id] = months;
          }
        }
      }

      return next;
    });
  };

  const handleSubmit = () => {
    if (!form) return;

    // ตรวจสอบข้อตกลง PDPA หากเปิดใช้งาน
    if (isPdpaRequired && !pdpaConsentAccepted) {
      setPdpaModalOpen(true);
      message.warning('กรุณาอ่านและกดยินยอมข้อตกลง PDPA ก่อนส่งคำตอบ');
      return;
    }

    // ตรวจสอบข้อคำถามที่จำเป็น (Required) โดยข้าม layer_box
    const missingFields = form.schema.filter(
      (f) =>
        f.type !== 'layer_box' &&
        f.required &&
        (answers[f.id] === undefined ||
          answers[f.id] === null ||
          answers[f.id] === '' ||
          (Array.isArray(answers[f.id]) && answers[f.id].length === 0))
    );

    if (missingFields.length > 0) {
      message.error(`กรุณากรอกข้อมูลในข้อที่จำเป็น: "${missingFields[0].label}"`);
      return;
    }

    submitMutation.mutate();
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <Spin size="large" tip="กำลังโหลดแบบฟอร์ม..." />
      </div>
    );
  }

  // กรณีไม่มีสิทธิ์เข้าถึง หรือไม่พบแบบฟอร์ม
  if (error || !form) {
    const errorMsg =
      (error as any)?.response?.data?.message ||
      (error as any)?.message ||
      'คุณไม่มีสิทธิ์เข้าถึงแบบฟอร์มนี้ หรือไม่พบข้อมูล';

    const isAuthError =
      (error as any)?.response?.status === 401 ||
      (error as any)?.response?.status === 403;

    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <Card style={{ maxWidth: 540, width: '100%', borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
          <Result
            status={isAuthError ? '403' : '404'}
            title="ไม่สามารถเข้าถึงแบบฟอร์มได้"
            subTitle={errorMsg}
            extra={[
              !isAuthenticated ? (
                <Button
                  key="login"
                  type="primary"
                  onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
                >
                  เข้าสู่ระบบ (Login)
                </Button>
              ) : (
                <Button key="back" type="primary" onClick={() => navigate('/forms')}>
                  กลับหน้ารายการแบบฟอร์ม
                </Button>
              ),
            ]}
          />
        </Card>
      </div>
    );
  }

  // กรณีแบบฟอร์มกำหนดให้ต้องเข้าสู่ระบบ แต่ผู้ใช้ยังไม่ได้ล็อกอิน
  if (form.requireLogin && !isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
        }}
      >
        <Card
          style={{
            maxWidth: 520,
            width: '100%',
            borderRadius: 16,
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            textAlign: 'center',
          }}
          styles={{ body: { padding: '36px 28px' } }}
        >
          <Result
            icon={<LockOutlined style={{ color: '#1677ff', fontSize: 52 }} />}
            title={<Title level={3} style={{ margin: 0 }}>จำเป็นต้องเข้าสู่ระบบ</Title>}
            subTitle={
              <Space direction="vertical" size="small" style={{ width: '100%', marginTop: 8 }}>
                <Text style={{ fontSize: 15 }}>
                  แบบฟอร์ม <strong>&quot;{form.title}&quot;</strong> กำหนดให้ผู้ตอบต้องเข้าสู่ระบบก่อนทำแบบฟอร์ม
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  กรุณาเข้าสู่ระบบด้วยบัญชีผู้ใช้ของคุณเพื่อเปิดอ่านและส่งคำตอบ
                </Text>
              </Space>
            }
            extra={[
              <Button
                key="login"
                type="primary"
                size="large"
                icon={<LoginOutlined />}
                onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
                style={{ minWidth: 180, height: 46, borderRadius: 8, fontSize: 15, fontWeight: 500 }}
              >
                เข้าสู่ระบบ (Login)
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  // หน้าจอเมื่อส่งแบบฟอร์มสำเร็จ
  if (submissionResult) {
    const hasMchatQuestions = form.schema.filter(
      (f) => f.type === 'single_choice' && (f.id.startsWith('q_') || f.label.includes('ลูกของคุณ'))
    ).length >= 10;
    const isMchat = Boolean(
      hasMchatQuestions && (form.title.toLowerCase().includes('m-chat') || submissionResult.grade?.includes('ความเสี่ยง'))
    );
    const isScore = submissionResult.isScoreTest && submissionResult.showResult;

    // คำนวณข้อมูลเด็กสำหรับ M-CHAT-R
    const childName = answers['cname'] || answers[form.schema.find((f) => f.label.includes('ชื่อ'))?.id || ''] || '-';
    const childHn = answers['hn'] || answers[form.schema.find((f) => f.label.includes('HN'))?.id || ''] || '-';
    const childDob = answers['dob'] || answers[form.schema.find((f) => f.label.includes('วันเกิด'))?.id || ''] || '-';
    const childAge = answers['age'] !== undefined && answers['age'] !== null && answers['age'] !== ''
      ? `${answers['age']} เดือน`
      : answers[form.schema.find((f) => f.label.includes('อายุ'))?.id || '']
      ? `${answers[form.schema.find((f) => f.label.includes('อายุ'))?.id || '']} เดือน`
      : '-';
    const childAgeNum = answers['age'] !== undefined ? Number(answers['age']) : undefined;
    const respPerson = answers['resp'] || answers[form.schema.find((f) => f.label.includes('ผู้ตอบ'))?.id || ''] || '-';
    const testDate = answers['date'] || dayjs(submissionResult.submittedAt).format('DD/MM/YYYY');

    // คำนวณระดับความเสี่ยงของ M-CHAT-R
    const score = submissionResult.score ?? 0;
    let tier: 'low' | 'mid' | 'high' = 'low';
    let tierTag = 'ความเสี่ยงต่ำ';
    let tierTagBg = '#2e7d4f';
    let tierCardBg = '#e7f5ec';
    let tierBorder = '#2e7d4f';
    let tierTitle = 'คะแนนรวมอยู่ในเกณฑ์ความเสี่ยงต่ำ (0–2 คะแนน)';
    let tierDesc = childAgeNum && childAgeNum < 24
      ? 'หากเด็กอายุน้อยกว่า 24 เดือน แนะนำให้ตรวจคัดกรองซ้ำอีกครั้งเมื่ออายุครบ 24 เดือน (หรือตามที่กุมารแพทย์นัดหมาย)'
      : 'ในปัจจุบันยังไม่จำเป็นต้องทำการส่งต่อ เว้นแต่แพทย์หรือผู้ปกครองยังมีความกังวลเกี่ยวกับพัฒนาการด้านอื่นๆ';

    if (score >= 3 && score <= 7) {
      tier = 'mid';
      tierTag = 'ความเสี่ยงปานกลาง';
      tierTagBg = '#b7791f';
      tierCardBg = '#fdf4e1';
      tierBorder = '#b7791f';
      tierTitle = 'คะแนนรวมอยู่ในเกณฑ์ความเสี่ยงปานกลาง (3–7 คะแนน)';
      tierDesc = 'จำเป็นต้องทำแบบประเมินติดตามผล M-CHAT-R Follow-Up (M-CHAT-R/F) เพิ่มเติมในข้อที่มีความเสี่ยง โดยแพทย์หรือบุคลากรทางการแพทย์ หากคะแนน Follow-up ยังคงตั้งแต่ 2 ขึ้นไป ควรส่งต่อเพื่อรับการประเมินพัฒนาการอย่างละเอียด';
    } else if (score >= 8) {
      tier = 'high';
      tierTag = 'ความเสี่ยงสูง';
      tierTagBg = '#c0392b';
      tierCardBg = '#fbe9e7';
      tierBorder = '#c0392b';
      tierTitle = 'คะแนนรวมอยู่ในเกณฑ์ความเสี่ยงสูง (8–20 คะแนน)';
      tierDesc = 'มีข้อบ่งชี้ความเสี่ยงสูง ไม่จำเป็นต้องทำ M-CHAT-R Follow-Up แนะนำให้ส่งต่อไปพบกุมารแพทย์ผู้เชี่ยวชาญด้านพัฒนาการและพฤติกรรมเด็ก เพื่อรับการประเมินอย่างละเอียดและเริ่มการส่งเสริมพัฒนาการโดยเร็วที่สุด';
    }

    // ประมวลผลคำตอบรายข้อของ M-CHAT-R
    const questionFields = form.schema.filter((f) => f.type !== 'layer_box' && f.type === 'single_choice');
    const evaluatedQuestions = questionFields.map((q, idx) => {
      const qNum = idx + 1;
      const isReverse = [2, 5, 12].includes(qNum) || q.correctAnswer === 'ใช่' || q.correctAnswer === 'opt_yes';
      const userAnsVal = answers[q.id];
      const opt = q.options?.find((o) => o.id === userAnsVal || o.label === userAnsVal);
      const userAnsLabel = opt ? opt.label : userAnsVal ? String(userAnsVal) : '-';

      const isRisk = submissionResult.flaggedFieldIds
        ? submissionResult.flaggedFieldIds.includes(q.id)
        : isReverse
        ? userAnsLabel === 'ใช่' || userAnsVal === 'opt_yes'
        : userAnsLabel === 'ไม่ใช่' || userAnsVal === 'opt_no';

      return {
        q,
        qNum,
        isReverse,
        userAnsLabel,
        isRisk,
        points: isRisk ? 1 : 0,
      };
    });

    const flaggedQuestions = evaluatedQuestions.filter((item) => item.isRisk);

    if (isMchat) {
      return (
        <div style={{ maxWidth: 780, margin: '30px auto', padding: '0 16px' }} className="mchat-summary-wrap">
          <style>{`
            @media print {
              body, html {
                background: #ffffff !important;
                font-size: 13px !important;
              }
              .noprint, nav, header, .ant-layout-header, .ant-layout-sider, button {
                display: none !important;
              }
              .mchat-summary-wrap {
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .mchat-card {
                border: 1px solid #ccc !important;
                box-shadow: none !important;
                page-break-inside: avoid !important;
                margin-bottom: 14px !important;
              }
              .mchat-scale div {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .mchat-verdict {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          `}</style>

          {/* การ์ดที่ 1: ข้อมูลเด็กและสรุปผลคัดกรอง M-CHAT-R */}
          <Card style={{ borderRadius: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} className="mchat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <Title level={3} style={{ margin: 0, color: '#1f2933' }}>
                แบบสอบถาม M-CHAT-R ฉบับภาษาไทย
              </Title>
              <Tag color="cyan" style={{ fontSize: 13, padding: '3px 10px', borderRadius: 6 }}>
                คัดกรองภาวะออทิซึมสเปกตรัมในเด็กเล็ก
              </Tag>
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: 10, marginBottom: 16, border: '1px solid #e2e8f0' }}>
              <Row gutter={[12, 8]}>
                <Col xs={24} sm={12}>
                  <Text type="secondary">ชื่อ-นามสกุลเด็ก: </Text>
                  <Text strong>{childName}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary">HN: </Text>
                  <Text strong>{childHn}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary">วันเกิด: </Text>
                  <Text strong>{childDob}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary">อายุ: </Text>
                  <Text strong style={{ color: childAgeNum && (childAgeNum < 16 || childAgeNum > 30) ? '#d46b08' : '#1f2933' }}>
                    {childAge}
                  </Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary">ผู้ตอบแบบสอบถาม: </Text>
                  <Text strong>{respPerson}</Text>
                </Col>
                <Col xs={24} sm={12}>
                  <Text type="secondary">วันที่ทำแบบสอบถาม: </Text>
                  <Text strong>{testDate}</Text>
                </Col>
              </Row>
            </div>

            {/* กล่องสรุปผลความเสี่ยง (Verdict Box) */}
            <div
              className="mchat-verdict"
              style={{
                backgroundColor: tierCardBg,
                border: `2px solid ${tierBorder}`,
                borderRadius: 14,
                padding: '20px 24px',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'inline-block', backgroundColor: tierTagBg, color: '#ffffff', fontWeight: 700, padding: '4px 14px', borderRadius: 99, fontSize: 14 }}>
                {tierTag}
              </div>

              <div style={{ fontSize: '2.8rem', fontWeight: 800, lineHeight: 1.1, margin: '14px 0 6px', color: '#1f2933' }}>
                {score} <small style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 500 }}>/ 20 คะแนนความเสี่ยง</small>
              </div>

              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a', marginBottom: 6 }}>
                {tierTitle}
              </div>

              <div style={{ fontSize: '0.98rem', lineHeight: 1.6, color: '#334155' }}>
                {tierDesc}
              </div>

              {/* แถบระดับสเกล 3 ช่วง */}
              <div
                className="mchat-scale"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 5fr 13fr',
                  gap: 6,
                  marginTop: 16,
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    padding: '8px 4px',
                    borderRadius: 6,
                    backgroundColor: '#2e7d4f',
                    color: '#fff',
                    opacity: tier === 'low' ? 1 : 0.35,
                    fontWeight: tier === 'low' ? 700 : 500,
                    boxShadow: tier === 'low' ? '0 0 0 2px #fff, 0 0 0 4px #2e7d4f' : 'none',
                  }}
                >
                  0–2 ต่ำ
                </div>
                <div
                  style={{
                    padding: '8px 4px',
                    borderRadius: 6,
                    backgroundColor: '#b7791f',
                    color: '#fff',
                    opacity: tier === 'mid' ? 1 : 0.35,
                    fontWeight: tier === 'mid' ? 700 : 500,
                    boxShadow: tier === 'mid' ? '0 0 0 2px #fff, 0 0 0 4px #b7791f' : 'none',
                  }}
                >
                  3–7 ปานกลาง
                </div>
                <div
                  style={{
                    padding: '8px 4px',
                    borderRadius: 6,
                    backgroundColor: '#c0392b',
                    color: '#fff',
                    opacity: tier === 'high' ? 1 : 0.35,
                    fontWeight: tier === 'high' ? 700 : 500,
                    boxShadow: tier === 'high' ? '0 0 0 2px #fff, 0 0 0 4px #c0392b' : 'none',
                  }}
                >
                  8–20 สูง
                </div>
              </div>
            </div>

            <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 14, marginBottom: 0 }}>
              ⚠️ หมายเหตุ: ผลการคัดกรองนี้เป็นเพียงข้อมูลเบื้องต้น ไม่ใช่การวินิจฉัยทางการแพทย์ หากผลการคัดกรองมีความเสี่ยง หรือผู้ปกครองมีความกังวลเกี่ยวกับพัฒนาการ กรุณานำผลนี้ไปปรึกษากุมารแพทย์ทุกครั้ง
            </Paragraph>
          </Card>

          {/* การ์ดที่ 2: ข้อที่ตอบแล้วมีความเสี่ยง (Flagged Questions) */}
          <Card style={{ borderRadius: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} className="mchat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Title level={4} style={{ margin: 0 }}>
                ข้อที่ตอบแล้วมีความเสี่ยง
              </Title>
              <Tag color={flaggedQuestions.length > 0 ? 'red' : 'green'} style={{ fontSize: 13, padding: '2px 10px' }}>
                พบ {flaggedQuestions.length} ข้อ
              </Tag>
            </div>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 14 }}>
              สำหรับแพทย์หรือบุคลากรทางการแพทย์ใช้ทำแบบประเมินติดตามผล M-CHAT-R Follow-Up เฉพาะข้อเหล่านี้
            </Text>

            {flaggedQuestions.length === 0 ? (
              <Alert
                type="success"
                showIcon
                message="ไม่พบข้อที่เข้าเกณฑ์ความเสี่ยง (ตอบในเกณฑ์พัฒนาการปกติครบทุกข้อ)"
                style={{ borderRadius: 8 }}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {flaggedQuestions.map((item) => (
                  <div
                    key={item.q.id}
                    style={{
                      backgroundColor: '#fff1f0',
                      border: '1px solid #ffa39e',
                      borderRadius: 10,
                      padding: '12px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Text strong style={{ fontSize: 15, color: '#cf1322' }}>
                          {item.q.label.startsWith('ข้อ') || /^\d+[\.\:]/.test(item.q.label)
                            ? item.q.label
                            : `ข้อ ${item.qNum}. ${item.q.label}`}
                        </Text>
                        {item.q.description && (
                          <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 3, color: '#8c8c8c' }}>
                            {item.q.description}
                          </Text>
                        )}
                      </div>
                      <Tag color="red" style={{ fontWeight: 700, fontSize: 13, padding: '3px 10px', borderRadius: 6, margin: 0 }}>
                        ตอบ: {item.userAnsLabel} (+1 เสี่ยง)
                      </Tag>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* การ์ดที่ 3: คำตอบทั้งหมด (20 ข้อ) */}
          <Card style={{ borderRadius: 16, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }} className="mchat-card">
            <Title level={4} style={{ marginTop: 0, marginBottom: 12 }}>
              คำตอบทั้งหมด (20 ข้อ)
            </Title>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '8px 6px', width: '3.5em' }}>ข้อ</th>
                    <th style={{ padding: '8px 6px' }}>คำถาม</th>
                    <th style={{ padding: '8px 6px', width: '5.5em', textAlign: 'center' }}>คำตอบ</th>
                    <th style={{ padding: '8px 6px', width: '5.5em', textAlign: 'center' }}>คะแนนเสี่ยง</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluatedQuestions.map((item) => (
                    <tr key={item.q.id} style={{ borderBottom: '1px solid #f5f5f5', backgroundColor: item.isRisk ? '#fff6f5' : 'transparent' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 600, color: item.isRisk ? '#cf1322' : '#64748b' }}>
                        {item.qNum}
                      </td>
                      <td style={{ padding: '10px 6px' }}>
                        <div style={{ fontWeight: item.isRisk ? 600 : 400 }}>{item.q.label}</div>
                        {item.isReverse && (
                          <span style={{ fontSize: 11, color: '#fa8c16' }}>* ข้อนี้ให้คะแนนแบบย้อนกลับ (ตอบ &quot;ใช่&quot; = 1 คะแนนเสี่ยง)</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                        <Tag color={item.isRisk ? 'red' : 'blue'} style={{ margin: 0, fontWeight: 600 }}>
                          {item.userAnsLabel}
                        </Tag>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: item.isRisk ? '#cf1322' : '#8c8c8c' }}>
                        {item.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 10 }}>
              * ข้อ 2, 5, 12 ให้คะแนนแบบย้อนกลับ (ตอบ &quot;ใช่&quot; ได้คะแนนความเสี่ยง) ส่วนข้ออื่นๆ ตอบ &quot;ไม่ใช่&quot; ได้คะแนนความเสี่ยง
            </Text>
          </Card>

          {/* ปุ่มควบคุม (ไม่แสดงเวลาพิมพ์) */}
          <div className="noprint" style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24, marginBottom: 40 }}>
            <Button
              type="primary"
              size="large"
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
              style={{ minWidth: 200, height: 48, fontSize: 16, fontWeight: 600, borderRadius: 10 }}
            >
              พิมพ์ / บันทึกผลเป็น PDF
            </Button>
            <Button
              size="large"
              icon={<ReloadOutlined />}
              onClick={() => {
                setSubmissionResult(null);
                setAnswers({});
              }}
              style={{ minWidth: 150, height: 48, borderRadius: 10 }}
            >
              ทำแบบสอบถามใหม่
            </Button>
            {isAuthenticated ? (
              <Button
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(user?.role === 'ADMIN' ? '/forms' : '/department-forms')}
                style={{ minWidth: 150, height: 48, borderRadius: 10 }}
              >
                กลับหน้ารายการฟอร์ม
              </Button>
            ) : null}
          </div>
        </div>
      );
    }

    // กรณีแบบฟอร์มทั่วไป หรือแบบทดสอบข้อสอบมาตรฐาน (Standard Form / Standard Exam)
    return (
      <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 16px' }}>
        <Card
          style={{
            borderRadius: 16,
            textAlign: 'center',
            padding: '30px 20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          {isScore ? (
            <div>
              <Result
                status={submissionResult.passed ? 'success' : 'warning'}
                title={
                  <span style={{ fontSize: 24, fontWeight: 700 }}>
                    {submissionResult.passed ? '🎉 ยินดีด้วย คุณผ่านการทดสอบ!' : '⚠️ ผลการทดสอบยังไม่ผ่านเกณฑ์'}
                  </span>
                }
                subTitle={`ส่งคำตอบเมื่อ ${dayjs(submissionResult.submittedAt).format('DD/MM/YYYY เวลา HH:mm น.')}`}
              />

              {/* สรุปคะแนนการสอบ */}
              <div
                style={{
                  backgroundColor: submissionResult.passed ? '#f6ffed' : '#fffbe6',
                  border: submissionResult.passed ? '1px solid #b7eb8f' : '1px solid #ffe58f',
                  borderRadius: 12,
                  padding: '24px 20px',
                  margin: '16px 0 24px 0',
                }}
              >
                <Row gutter={16} justify="center" align="middle">
                  <Col span={12}>
                    <Statistic
                      title="คะแนนที่ได้"
                      value={submissionResult.score || 0}
                      suffix={`/ ${submissionResult.maxScore} คะแนน`}
                      valueStyle={{
                        color: submissionResult.passed ? '#52c41a' : '#fa8c16',
                        fontSize: 32,
                        fontWeight: 'bold',
                      }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="คิดเป็นร้อยละ"
                      value={submissionResult.percentage || 0}
                      suffix="%"
                      valueStyle={{ fontSize: 32, fontWeight: 'bold' }}
                    />
                  </Col>
                </Row>

                <Divider style={{ margin: '16px 0' }} />

                <Space size="middle" wrap>
                  <Tag
                    color={submissionResult.passed ? 'green' : 'orange'}
                    icon={submissionResult.passed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    style={{ fontSize: 14, padding: '4px 12px', borderRadius: 6 }}
                  >
                    สถานะ: {submissionResult.passed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'}
                  </Tag>
                  {submissionResult.grade && (
                    <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 6 }}>
                      ระดับผลสอบ: {submissionResult.grade}
                    </Tag>
                  )}
                </Space>
              </div>
            </div>
          ) : (
            <Result
              status="success"
              title="ส่งคำตอบเรียบร้อยแล้ว"
              subTitle="ระบบได้รับคำตอบของคุณเข้าสู่ฐานข้อมูลแล้ว ขอขอบคุณสำหรับการให้ข้อมูล"
            />
          )}

          <Space size="middle" style={{ marginTop: 12 }}>
            {isAuthenticated && (
              <Button
                size="large"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(user?.role === 'ADMIN' ? '/forms' : '/department-forms')}
                style={{ minWidth: 140 }}
              >
                กลับหน้ารายการฟอร์ม
              </Button>
            )}
            {form.allowMultiple && (
              <Button
                type="primary"
                size="large"
                icon={<ReloadOutlined />}
                onClick={() => {
                  setSubmissionResult(null);
                  setAnswers({});
                }}
                style={{ minWidth: 140 }}
              >
                ทำอีกครั้ง
              </Button>
            )}
          </Space>
        </Card>
      </div>
    );
  }

  // ฟิลด์ที่มีการเก็บคะแนนจริง (ต้องไม่ใช่กล่องข้อมูล และมีคะแนน > 0 และมีเฉลยคำตอบ)
  const isScoredField = (f: FormField): boolean => {
    if (f.type === 'layer_box' || f.layerId) return false;
    const pts = Number(f.points || 0);
    if (pts <= 0) return false;
    if (f.correctAnswer === undefined || f.correctAnswer === null || f.correctAnswer === '') return false;
    if (Array.isArray(f.correctAnswer) && f.correctAnswer.length === 0) return false;
    return true;
  };

  const isScoreTest = form.type === 'SCORE_TEST';
  // คำนวณคะแนนเต็มเฉพาะข้อสอบที่มีคะแนนและเฉลยคำตอบจริงเท่านั้น ไม่นับการถามชื่อหรือข้อมูลทั่วไป
  const totalPoints = form.schema.reduce((sum, f) => sum + (isScoredField(f) ? Number(f.points || 0) : 0), 0);
  const isAccepting = form.status === 'PUBLISHED' && form.isAcceptingResponses;

  // คำนวณคำถามจริงที่จะนำมาแสดงแถบความคืบหน้า (Progress)
  // - ข้อความทั่วไป (text, textarea, date, file, number) และฟิลด์ในกล่องข้อมูล จะไม่นำมานับความคืบหน้า
  // - นับเฉพาะคำถามจริง (single_choice, multi_choice, dropdown, rating) หรือข้อสอบที่มีการเก็บคะแนนและเฉลยคำตอบเท่านั้น
  const progressQuestions = form.schema.filter((f) => {
    if (f.type === 'layer_box' || f.layerId) return false;
    if (isScoreTest) {
      return isScoredField(f);
    }
    return ['single_choice', 'multi_choice', 'dropdown', 'rating'].includes(f.type) || isScoredField(f);
  });

  const showProgressBar = progressQuestions.length > 1;

  const answeredProgressCount = progressQuestions.filter(
    (f) =>
      answers[f.id] !== undefined &&
      answers[f.id] !== null &&
      answers[f.id] !== '' &&
      (Array.isArray(answers[f.id]) ? answers[f.id].length > 0 : true)
  ).length;

  const progressPercent =
    progressQuestions.length > 0
      ? Math.round((answeredProgressCount / progressQuestions.length) * 100)
      : 0;

  // ฟังก์ชันเรนเดอร์ช่อง Input ตามประเภทคำถาม
  const renderFieldInput = (field: FormField) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            size="large"
            placeholder={field.placeholder || 'กรอกคำตอบของคุณ...'}
            value={answers[field.id] || ''}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            style={{ borderRadius: 8, height: 44 }}
            disabled={!isAccepting}
          />
        );
      case 'textarea':
        return (
          <Input.TextArea
            rows={3}
            placeholder={field.placeholder || 'กรอกคำตอบอย่างละเอียด...'}
            value={answers[field.id] || ''}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            style={{ borderRadius: 8 }}
            disabled={!isAccepting}
          />
        );
      case 'number':
        return (
          <InputNumber
            size="large"
            placeholder={field.placeholder || 'ระบุตัวเลข'}
            value={answers[field.id]}
            onChange={(val) => handleAnswerChange(field.id, val)}
            style={{ width: '100%', borderRadius: 8, height: 44 }}
            disabled={!isAccepting}
          />
        );
      case 'single_choice':
        return (
          <Radio.Group
            value={answers[field.id]}
            onChange={(e) => handleAnswerChange(field.id, e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}
            disabled={!isAccepting}
          >
            {(field.options || []).map((opt: any) => (
              <Radio
                key={opt.id}
                value={opt.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                  fontSize: 15,
                  margin: 0,
                  backgroundColor: answers[field.id] === opt.id ? '#e6f7ff' : '#fff',
                  borderColor: answers[field.id] === opt.id ? '#1677ff' : '#f0f0f0',
                }}
              >
                {opt.label}
              </Radio>
            ))}
          </Radio.Group>
        );
      case 'multi_choice':
        return (
          <Checkbox.Group
            value={answers[field.id] || []}
            onChange={(vals) => handleAnswerChange(field.id, vals)}
            style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}
            disabled={!isAccepting}
          >
            {(field.options || []).map((opt: any) => (
              <Checkbox
                key={opt.id}
                value={opt.id}
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                  fontSize: 15,
                  margin: 0,
                  backgroundColor: (answers[field.id] || []).includes(opt.id) ? '#e6f7ff' : '#fff',
                  borderColor: (answers[field.id] || []).includes(opt.id) ? '#1677ff' : '#f0f0f0',
                }}
              >
                {opt.label}
              </Checkbox>
            ))}
          </Checkbox.Group>
        );
      case 'dropdown':
        return (
          <Select
            size="large"
            placeholder={field.placeholder || 'คลิกเพื่อเลือกคำตอบ'}
            value={answers[field.id]}
            onChange={(val) => handleAnswerChange(field.id, val)}
            style={{ width: '100%', borderRadius: 8 }}
            disabled={!isAccepting}
          >
            {(field.options || []).map((opt: any) => (
              <Option key={opt.id} value={opt.id}>
                {opt.label}
              </Option>
            ))}
          </Select>
        );
      case 'date':
        return (
          <DatePicker
            size="large"
            style={{ width: '100%', height: 44, borderRadius: 8 }}
            placeholder={field.placeholder || 'เลือกวันที่'}
            value={answers[field.id] ? dayjs(answers[field.id]) : null}
            onChange={(_, dStr) => handleAnswerChange(field.id, dStr)}
            disabled={!isAccepting}
          />
        );
      case 'rating':
        return (
          <div style={{ padding: '8px 0' }}>
            <Rate
              value={answers[field.id] || 0}
              onChange={(val) => handleAnswerChange(field.id, val)}
              style={{ fontSize: 32 }}
              disabled={!isAccepting}
            />
            {answers[field.id] && (
              <span style={{ marginLeft: 16, fontSize: 15, fontWeight: 500 }}>
                {answers[field.id]} ดาว
              </span>
            )}
          </div>
        );
      case 'file':
        return (
          <Upload
            beforeUpload={() => false}
            onChange={(info) => handleAnswerChange(field.id, info.fileList)}
            disabled={!isAccepting}
          >
            <Button icon={<UploadOutlined />} size="large" style={{ borderRadius: 8, height: 44 }}>
              เลือกไฟล์เพื่ออัปโหลด (PDF, เอกสาร หรือรูปภาพ)
            </Button>
          </Upload>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '24px 16px 60px',
      }}
    >
      <div style={{ maxWidth: 780, margin: '0 auto' }}>
        {/* Top Header Bar for Form View */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
            padding: '10px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <Space align="center" style={{ cursor: 'pointer' }} onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: '#1677ff',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              <FormOutlined />
            </div>
            <div>
              <Text strong style={{ fontSize: 15, display: 'block', lineHeight: 1.2 }}>
                FormLocal
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                ระบบแบบฟอร์มออนไลน์
              </Text>
            </div>
          </Space>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!form.requireLogin && (
              <Tag color="green" icon={<GlobalOutlined />} style={{ borderRadius: 6, margin: 0 }}>
                แบบฟอร์มทั่วไป (ไม่ต้องเข้าสู่ระบบ)
              </Tag>
            )}
            {isAuthenticated ? (
              <Space>
                <Tag color="blue">{user?.fullName || 'ผู้ใช้งาน'}</Tag>
                <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/forms')}>
                  กลับหน้ารายการ
                </Button>
              </Space>
            ) : (
              <Button
                size="small"
                type="primary"
                ghost
                icon={<LoginOutlined />}
                onClick={() => navigate('/login', { state: { from: window.location.pathname } })}
              >
                เข้าสู่ระบบ (Login)
              </Button>
            )}
          </div>
        </div>

        {/* Top Banner สำหรับเจ้าของฟอร์ม */}
        {form.isOwner && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16, borderRadius: 10 }}
          message={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span>คุณกำลังดูแบบฟอร์มนี้ในฐานะ <b>เจ้าของฟอร์ม (Form Owner)</b></span>
              <Space>
                <Button
                  size="small"
                  icon={<ShareAltOutlined />}
                  onClick={() => setShareModalOpen(true)}
                >
                  แชร์ฟอร์ม
                </Button>
                <Button
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => downloadFormHtml(form)}
                  title="ดาวน์โหลดไฟล์ HTML เพื่อเปิดทดสอบบน iPad แบบออฟไลน์"
                >
                  Export เป็น HTML
                </Button>
                <Button
                  type="primary"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/forms/${form.id}/builder`)}
                >
                  แก้ไขใน Studio
                </Button>
              </Space>
            </div>
          }
        />
      )}

        {/* แจ้งเตือนกรณีฟอร์มปิดรับคำตอบ หรือยังไม่ได้ Publish */}
        {!isAccepting && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16, borderRadius: 10 }}
            message={
              form.status === 'DRAFT'
                ? 'แบบฟอร์มนี้ยังไม่ได้เผยแพร่ (สถานะ DRAFT) เฉพาะเจ้าของเท่านั้นที่มองเห็น'
                : 'แบบฟอร์มนี้ปิดรับคำตอบแล้วในขณะนี้'
            }
          />
        )}

        {/* แจ้งเตือนสถานะข้อตกลง PDPA */}
        {isPdpaRequired && (
          <Alert
            type={pdpaConsentAccepted ? 'success' : 'warning'}
            showIcon
            icon={<SafetyCertificateOutlined style={{ fontSize: 16 }} />}
            style={{ marginBottom: 16, borderRadius: 10 }}
            message={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <span>
                  {pdpaConsentAccepted
                    ? '✅ คุณได้ยินยอมตามข้อตกลงคุ้มครองข้อมูลส่วนบุคคล (PDPA) สำหรับแบบฟอร์มนี้แล้ว'
                    : '⚠️ แบบฟอร์มนี้มีข้อตกลงตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA) ที่ต้องยินยอมก่อนเริ่มทำฟอร์ม'}
                </span>
                <Button
                  size="small"
                  type={pdpaConsentAccepted ? 'default' : 'primary'}
                  onClick={() => setPdpaModalOpen(true)}
                >
                  {pdpaConsentAccepted ? 'ดูข้อตกลง PDPA อีกครั้ง' : 'อ่านและยินยอมข้อตกลง'}
                </Button>
              </div>
            }
          />
        )}

      {/* Card หัวข้อฟอร์ม */}
      <Card
        style={{
          borderRadius: 16,
          marginBottom: 16,
          borderTop: '6px solid #1677ff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}
        styles={{ body: { padding: '24px 28px' } }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <Title level={2} style={{ margin: 0 }}>
              {form.title}
            </Title>
            <Space wrap>
              <Tag color={isScoreTest ? 'gold' : 'blue'} icon={isScoreTest ? <TrophyOutlined /> : <FormOutlined />}>
                {isScoreTest ? 'แบบทดสอบวัดผล' : 'แบบฟอร์มทั่วไป'}
              </Tag>
              {isScoreTest && totalPoints > 0 && (
                <Tag color="volcano">คะแนนเต็ม: {totalPoints} คะแนน</Tag>
              )}
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={() => downloadFormHtml(form)}
                style={{ borderRadius: 6, fontSize: 12 }}
              >
                📥 โหลดไฟล์ HTML สแตนด์อโลน
              </Button>
            </Space>
          </div>

          {form.description && (
            <Paragraph
              type="secondary"
              style={{ fontSize: 15, marginTop: 8, whiteSpace: 'pre-line', lineHeight: 1.6 }}
            >
              {form.description}
            </Paragraph>
          )}

          <Divider style={{ margin: '12px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8c8c8c' }}>
            <span>สร้างโดย: {form.owner?.fullName || 'ไม่ระบุ'}</span>
            {form.department && <span>แผนก: {form.department.name}</span>}
          </div>
        </Space>
      </Card>

      {/* แถบแสดงความคืบหน้า (Progress Counter) - แสดงเฉพาะเมื่อมีคำถามวัดผล/ตัวเลือกมากกว่า 1 ข้อ */}
      {showProgressBar && (
        <Card
          style={{ borderRadius: 12, marginBottom: 16 }}
          styles={{ body: { padding: '12px 20px' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text strong style={{ fontSize: 13 }}>
              ความคืบหน้าในการตอบ:
            </Text>
            <Text type="secondary" style={{ fontSize: 13 }}>
              ตอบแล้ว <strong>{answeredProgressCount}</strong> / {progressQuestions.length} ข้อ ({progressPercent}%)
            </Text>
          </div>
          <Progress percent={progressPercent} strokeColor="#1677ff" showInfo={false} />
        </Card>
      )}

      {/* แจ้งเตือนและปุ่มเปิดข้อตกลงหากยังไม่ได้ยอมรับ PDPA */}
      {isPdpaRequired && !pdpaConsentAccepted && (
        <Card
          style={{
            borderRadius: 14,
            border: '2px dashed #faad14',
            backgroundColor: '#fffbe6',
            marginBottom: 20,
            textAlign: 'center',
          }}
          styles={{ body: { padding: '24px 20px' } }}
        >
          <Space direction="vertical" size="middle" align="center" style={{ width: '100%' }}>
            <SafetyCertificateOutlined style={{ fontSize: 44, color: '#faad14' }} />
            <div>
              <Title level={4} style={{ margin: '0 0 6px 0', color: '#d46b08' }}>
                จำเป็นต้องยอมรับข้อตกลง PDPA ก่อนเริ่มทำแบบฟอร์ม
              </Title>
              <Text type="secondary" style={{ fontSize: 14 }}>
                แบบฟอร์มนี้อยู่ภายใต้ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 กรุณากดปุ่มด้านล่างเพื่อเปิดอ่านและกดยอมรับข้อตกลง (Accept)
              </Text>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<SafetyCertificateOutlined />}
              onClick={() => setPdpaModalOpen(true)}
              style={{
                borderRadius: 8,
                height: 44,
                padding: '0 28px',
                fontSize: 15,
                fontWeight: 600,
                backgroundColor: '#1677ff',
              }}
            >
              เปิดหน้าต่างข้อตกลง PDPA เพื่อกดยอมรับ (Accept)
            </Button>
          </Space>
        </Card>
      )}

      {/* รายการคำถามในแบบฟอร์ม (ถูกล็อคจนกว่าจะกดกดยอมรับ PDPA) */}
      <div
        style={{
          width: '100%',
          ...(isPdpaRequired && !pdpaConsentAccepted
            ? {
                pointerEvents: 'none',
                userSelect: 'none',
                filter: 'grayscale(20%) opacity(0.55)',
                transition: 'all 0.3s ease',
              }
            : { transition: 'all 0.3s ease' }),
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {(() => {
          const topLevelFields = form.schema.filter((f) => !f.layerId || f.type === 'layer_box');

          return topLevelFields.map((field) => {
            if (field.type === 'layer_box') {
              const childFields = form.schema.filter((f) => f.layerId === field.id);
              const cleanTitle = (field.label || '')
                .replace(/\s*\(Layer Box\)/i, '')
                .replace(/^กล่องที่\s*\d+[:\s]*/i, '')
                .trim();

              return (
                <Card
                  key={field.id}
                  style={{
                    borderRadius: 14,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    border: '1px solid #e8e8e8',
                    backgroundColor: '#ffffff',
                  }}
                  styles={{ body: { padding: '22px 24px' } }}
                >
                  {(cleanTitle || field.description) && (
                    <div style={{ marginBottom: 18 }}>
                      {cleanTitle && (
                        <Text strong style={{ fontSize: 17, color: '#1f1f1f' }}>
                          {cleanTitle}
                        </Text>
                      )}
                      {field.description && (
                        <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                          {field.description}
                        </Text>
                      )}
                    </div>
                  )}

                  <Row gutter={[16, 18]}>
                    {childFields.map((child) => (
                      <Col key={child.id} xs={24} sm={child.colSpan || (field.columns === 1 ? 24 : 12)}>
                        <div>
                          <div style={{ marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 14 }}>
                              {child.label}
                              {child.required && (
                                <span style={{ color: '#ff4d4f', marginLeft: 4, fontWeight: 'bold' }}>*</span>
                              )}
                            </Text>
                            {child.description && (
                              <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                                {child.description}
                              </Text>
                            )}
                          </div>
                          {renderFieldInput(child)}
                        </div>
                      </Col>
                    ))}
                  </Row>

                  {/* คำเตือนเรื่องช่วงอายุเด็กสำหรับ M-CHAT-R */}
                  {(() => {
                    const ageField = childFields.find((c) => c.label.includes('อายุ') || c.id === 'age');
                    const ageVal =
                      ageField && answers[ageField.id] !== undefined && answers[ageField.id] !== null && answers[ageField.id] !== ''
                        ? Number(answers[ageField.id])
                        : undefined;
                    const isAgeInvalid = ageVal !== undefined && !isNaN(ageVal) && (ageVal < 16 || ageVal > 30);
                    if (!isAgeInvalid) return null;

                    return (
                      <Alert
                        type="warning"
                        showIcon
                        style={{
                          marginTop: 16,
                          borderRadius: 10,
                          border: '1px solid #ffd591',
                          backgroundColor: '#fffbe6',
                        }}
                        message={
                          <div>
                            <span style={{ fontWeight: 700, color: '#d46b08' }}>คำเตือนเรื่องช่วงอายุ: </span>
                            อายุเด็ก ({ageVal} เดือน) อยู่นอกช่วงที่แบบคัดกรอง M-CHAT-R ออกแบบไว้ (16–30 เดือน){' '}
                            {ageVal < 16
                              ? 'หากอายุน้อยกว่า 16 เดือน ผลการคัดกรองอาจคลาดเคลื่อน แนะนำตรวจซ้ำเมื่ออายุถึงเกณฑ์'
                              : 'หากอายุเกิน 30 เดือน แนะนำปรึกษากุมารแพทย์เพื่อเลือกแบบประเมินที่เหมาะสมกับวัย'}
                          </div>
                        }
                      />
                    );
                  })()}
                </Card>
              );
            }

            // Standalone Question
            return (
              <Card
                key={field.id}
                style={{
                  borderRadius: 14,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  border: answers[field.id] !== undefined ? '1px solid #91caff' : '1px solid #f0f0f0',
                  transition: 'all 0.2s',
                }}
                styles={{ body: { padding: 22 } }}
              >
                {/* Field Header */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text strong style={{ fontSize: 16, lineHeight: 1.5 }}>
                      {field.label}
                      {field.required && (
                        <span style={{ color: '#ff4d4f', marginLeft: 4, fontWeight: 'bold' }}>*</span>
                      )}
                    </Text>
                    {isScoredField(field) && (
                      <Tag color="gold" icon={<TrophyOutlined />}>
                        {field.points} คะแนน
                      </Tag>
                    )}
                  </div>
                  {field.description && (
                    <Text type="secondary" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                      {field.description}
                    </Text>
                  )}
                </div>

                {/* Input Component ตามประเภทคำถาม */}
                <div>{renderFieldInput(field)}</div>
              </Card>
            );
          });
        })()}

        {/* Action Button: ส่งคำตอบ */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Button
            type="primary"
            size="large"
            icon={<SendOutlined />}
            loading={submitMutation.isPending}
            onClick={handleSubmit}
            disabled={!isAccepting || (Boolean(isPdpaRequired) && !pdpaConsentAccepted)}
            style={{
              height: 52,
              minWidth: 220,
              fontSize: 17,
              fontWeight: 600,
              borderRadius: 12,
              boxShadow: '0 4px 14px rgba(22, 119, 255, 0.35)',
            }}
          >
            ส่งคำตอบ
          </Button>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 24,
            paddingBottom: 20,
            color: '#8c8c8c',
            fontSize: 13,
          }}
        >
          FormLocal ©{new Date().getFullYear()} — Powered By: <strong style={{ color: '#1677ff' }}>Pantamit.Y</strong>
        </div>
      </Space>
      </div>

      {/* Share Modal */}
      <FormShareModal
        formId={form.id}
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
      />

      {/* Modal ข้อตกลงความยินยอมข้อมูลส่วนบุคคล (PDPA Consent Modal - RAM2 Preliminary Assessment Standard) */}
      <PdpaConsentModal
        open={pdpaModalOpen}
        formTitle={form.title}
        formDescription={form.description}
        pdpaTitle={form.pdpaTitle}
        pdpaContent={form.pdpaContent}
        onAccept={() => {
          setPdpaConsentAccepted(true);
          setPdpaModalOpen(false);
          message.success('ยินยอมตามข้อตกลง PDPA เรียบร้อยแล้ว เริ่มทำแบบฟอร์มได้เลย');
        }}
        onDecline={() => {
          modal.confirm({
            title: 'ปฏิเสธข้อตกลง PDPA',
            content: 'หากท่านไม่ยินยอมตามข้อตกลงความยินยอม จะไม่สามารถกรอกและส่งแบบฟอร์มนี้ได้',
            okText: 'ออกจากหน้านี้',
            cancelText: 'กลับไปหน้าแบบฟอร์ม',
            onOk: () => navigate(isAuthenticated ? '/forms' : '/login'),
            onCancel: () => setPdpaModalOpen(false),
          });
        }}
      />
      </div>
    </div>
  );
};

export default FormViewPage;
