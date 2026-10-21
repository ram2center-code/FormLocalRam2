import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Tooltip,
  Breadcrumb,
  message,
  Spin,
  Tabs,
  Table,
  Tag,
  Input,
  Modal,
  Popconfirm,
  Descriptions,
  DatePicker,
  Select,
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  FullscreenExitOutlined,
  ExportOutlined,
  ReloadOutlined,
  SmileOutlined,
  SaveOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  AlertOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  HistoryOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  createScreeningRecordApi,
  getScreeningRecordsApi,
  deleteScreeningRecordApi,
  ChildScreeningRecordItem,
} from '../api/screeningApi';
import { PdpaConsentModal } from '../../forms/components/PdpaConsentModal';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// ข้อมูลเครื่องมือแบบคัดกรองทั้ง 6 ชุด
const TOOL_CONFIG: Record<string, { name: string; color: string; badge: string }> = {
  mchat: { name: 'M-CHAT-R (ออทิซึม)', color: '#3b82c4', badge: 'M-CHAT-R' },
  pddsq: { name: 'PDDSQ (พัฒนาการ)', color: '#1f8a84', badge: 'PDDSQ' },
  sdq: { name: 'SDQ (พฤติกรรม/อารมณ์)', color: '#cc4f70', badge: 'SDQ' },
  snap: { name: 'SNAP-IV (สมาธิสั้น)', color: '#5a63c9', badge: 'SNAP-IV' },
  gad7: { name: 'GAD-7 (วิตกกังวล)', color: '#8a5cc2', badge: 'GAD-7' },
  phqa: { name: 'PHQ-A (ซึมเศร้า)', color: '#2c7aa0', badge: 'PHQ-A' },
};

// ฟังก์ชันแปลงวันที่แบบ พ.ศ. ภาษาไทย
const formatThaiDate = (val?: string | null, includeTime = false) => {
  if (!val) return '-';
  const d = dayjs(val);
  if (!d.isValid()) return '-';
  const thaiYear = d.year() + 543;
  return includeTime
    ? `${d.format('DD/MM')}/${thaiYear} ${d.format('HH:mm น.')}`
    : `${d.format('DD/MM')}/${thaiYear}`;
};

export const ChildScreeningPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const initialTab = searchParams.get('tab') === 'history' ? 'history' : 'screening';
  const [activeTab, setActiveTab] = useState<'screening' | 'history'>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'history') {
      setActiveTab('history');
    } else if (tabParam === 'screening') {
      setActiveTab('screening');
    }
  }, [searchParams]);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

  // States สำหรับความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
  // ในหน้าจัดการหลักของเจ้าหน้าที่ จะไม่แสดง Modal อัตโนมัติ (จะแสดงเมื่อกดเปิดแท็บใหม่)
  const [pdpaConsentAccepted, setPdpaConsentAccepted] = useState(true);
  const [pdpaModalOpen, setPdpaModalOpen] = useState(false);

  // ข้อมูลผลการประเมินปัจจุบันที่ส่งมาจาก iframe
  const [currentScreening, setCurrentScreening] = useState<{
    hn?: string;
    patientName?: string;
    birthDate?: string;
    assessmentDate?: string;
    ageYears?: number | null;
    ageMonths?: number | null;
    totalAgeMonths?: number | null;
    screenings?: Record<string, any>;
    hasAlert?: boolean;
    hasSuicideRisk?: boolean;
    completedCount?: number;
  } | null>(null);

  // States สำหรับแท็บประวัติ
  const [searchText, setSearchText] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'ALERT' | 'SUICIDE' | 'NORMAL'>('ALL');
  const [toolFilter, setToolFilter] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<ChildScreeningRecordItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // ดึงรายการประวัติการคัดกรองจากฐานข้อมูล
  const { data: records = [], isLoading: isRecordsLoading, refetch: refetchRecords } = useQuery({
    queryKey: ['child-screenings'],
    queryFn: () => getScreeningRecordsApi(),
  });

  // กรองข้อมูลบน Table ตามเงื่อนไขการค้นหา
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // ค้นหาตาม HN หรือชื่อ-นามสกุล
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const matchHn = (r.hn || '').toLowerCase().includes(q);
        const matchName = (r.patientName || '').toLowerCase().includes(q);
        if (!matchHn && !matchName) return false;
      }

      // กรองสถานะความเสี่ยง
      if (riskFilter === 'ALERT' && !r.hasAlert) return false;
      if (riskFilter === 'SUICIDE' && !r.hasSuicideRisk) return false;
      if (riskFilter === 'NORMAL' && (r.hasAlert || r.hasSuicideRisk)) return false;

      // กรองตามเครื่องมือแบบคัดกรอง
      if (toolFilter !== 'ALL') {
        if (!r.screenings || !r.screenings[toolFilter]) return false;
      }

      // กรองตามช่วงวันที่ประเมิน
      if (dateRange && dateRange[0] && dateRange[1]) {
        const d = dayjs(r.assessmentDate);
        if (d.isBefore(dateRange[0].startOf('day')) || d.isAfter(dateRange[1].endOf('day'))) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchText, riskFilter, toolFilter, dateRange]);

  // สถิติภาพรวมสำหรับแถบสรุปข้อมูล
  const stats = useMemo(() => {
    const total = records.length;
    const alertCount = records.filter((r) => r.hasAlert).length;
    const suicideCount = records.filter((r) => r.hasSuicideRisk).length;
    const normalCount = records.filter((r) => !r.hasAlert && !r.hasSuicideRisk).length;
    const todayCount = records.filter((r) => dayjs(r.assessmentDate).isSame(dayjs(), 'day')).length;
    return { total, alertCount, suicideCount, normalCount, todayCount };
  }, [records]);

  // ฟังก์ชันส่งออกข้อมูลเป็น CSV / Excel
  const handleExportCsv = () => {
    if (!filteredRecords || filteredRecords.length === 0) {
      message.warning('ไม่มีข้อมูลสำหรับส่งออกตามเงื่อนไขที่เลือก');
      return;
    }

    const headers = [
      'ลำดับ',
      'วันที่ประเมิน',
      'HN',
      'ชื่อผู้ป่วย',
      'วันเกิด',
      'อายุ (ปี)',
      'อายุ (เดือน)',
      'ผลการคัดกรองทั้งหมด',
      'สถานะ HIGH ALERT',
      'ความเสี่ยงทำร้ายตนเอง',
      'ผู้ประเมิน',
      'หมายเหตุ',
    ];

    const rows = filteredRecords.map((r, index) => {
      const summaryList = Object.entries(r.screenings || {})
        .map(([k, v]: any) => `${k.toUpperCase()}: ${v?.text || ''}`)
        .join(' | ');

      return [
        index + 1,
        `"${formatThaiDate(r.assessmentDate, true)}"`,
        `"${r.hn || ''}"`,
        `"${r.patientName || ''}"`,
        `"${r.birthDate ? formatThaiDate(r.birthDate) : ''}"`,
        r.ageYears ?? '',
        r.ageMonths ?? '',
        `"${summaryList.replace(/"/g, '""')}"`,
        r.hasAlert ? 'HIGH ALERT' : 'ปกติ',
        r.hasSuicideRisk ? 'มีความเสี่ยง' : 'ไม่มีความเสี่ยง',
        `"${r.examinerName || ''}"`,
        `"${(r.notes || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ประวัติการคัดกรองเด็ก_${dayjs().format('YYYYMMDD_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success(`ส่งออกข้อมูลเรียบร้อยแล้ว (${filteredRecords.length} รายการ)`);
  };

  // Mutation: บันทึกลงฐานข้อมูล
  const saveMutation = useMutation({
    mutationFn: createScreeningRecordApi,
    onSuccess: () => {
      message.success('บันทึกผลการคัดกรองลงฐานข้อมูลเรียบร้อยแล้ว!');
      queryClient.invalidateQueries({ queryKey: ['child-screenings'] });

      // ส่งข้อความยืนยันไปยัง iframe เพื่อเปลี่ยนสถานะปุ่ม
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'child_screening_save_success' },
          '*'
        );
      }
    },
    onError: (err: any) => {
      message.error(err.message || 'บันทึกข้อมูลไม่สำเร็จ');
    },
  });

  // Mutation: ลบประวัติ
  const deleteMutation = useMutation({
    mutationFn: deleteScreeningRecordApi,
    onSuccess: () => {
      message.success('ลบประวัติเรียบร้อยแล้ว');
      queryClient.invalidateQueries({ queryKey: ['child-screenings'] });
      setDetailModalOpen(false);
    },
    onError: (err: any) => {
      message.error(err.message || 'ลบข้อมูลไม่สำเร็จ');
    },
  });

  // ฟัง event postMessage จากชุดคัดกรอง iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;

      if (d.type === 'child_screening_update') {
        setCurrentScreening(d);
      } else if (d.type === 'navigate_back') {
        navigate('/department-forms');
      } else if (d.type === 'pdpa_request_modal') {
        setPdpaModalOpen(true);
      } else if (d.type === 'pdpa_accepted_from_child') {
        setPdpaConsentAccepted(true);
        setPdpaModalOpen(false);
      } else if (d.type === 'child_screening_request_save') {
        setCurrentScreening(d);
        if (!d.screenings || Object.keys(d.screenings).length === 0) {
          message.warning('ยังไม่มีผลการคัดกรองอย่างน้อย 1 ชุด กรุณาทำแบบประเมินก่อนบันทึก');
          return;
        }
        saveMutation.mutate({
          hn: d.hn,
          patientName: d.patientName,
          birthDate: d.birthDate,
          assessmentDate: d.assessmentDate,
          ageYears: d.ageYears,
          ageMonths: d.ageMonths,
          totalAgeMonths: d.totalAgeMonths,
          screenings: d.screenings,
          hasAlert: d.hasAlert,
          hasSuicideRisk: d.hasSuicideRisk,
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [saveMutation]);

  // สั่งบันทึกจากปุ่มใน Tool Bar ฝั่ง React
  const handleSaveFromToolbar = () => {
    if (!currentScreening?.screenings || Object.keys(currentScreening.screenings).length === 0) {
      message.warning('ยังไม่มีผลการประเมินที่ทำเสร็จ กรุณาเลือกทำแบบคัดกรองอย่างน้อย 1 รายการ');
      return;
    }
    saveMutation.mutate({
      hn: currentScreening.hn,
      patientName: currentScreening.patientName,
      birthDate: currentScreening.birthDate,
      assessmentDate: currentScreening.assessmentDate,
      ageYears: currentScreening.ageYears,
      ageMonths: currentScreening.ageMonths,
      totalAgeMonths: currentScreening.totalAgeMonths,
      screenings: currentScreening.screenings,
      hasAlert: currentScreening.hasAlert,
      hasSuicideRisk: currentScreening.hasSuicideRisk,
    });
  };

  // สั่งพิมพ์รายงานผลจาก iframe
  const handlePrint = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        window.print();
      }
    } catch {
      window.open('/tools/child-screening-suite.html', '_blank');
    }
  };

  // จัดการเมื่อผู้ป่วย/ผู้ปกครองยินยอมข้อตกลง PDPA
  const handleAcceptPdpa = () => {
    setPdpaConsentAccepted(true);
    setPdpaModalOpen(false);
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'pdpa_accepted' }, '*');
    }
    message.success('ยินยอมข้อตกลง PDPA เรียบร้อยแล้ว สามารถเริ่มทำแบบคัดกรองได้');
  };

  // จัดการเมื่อปฏิเสธหรือไม่ยินยอม PDPA
  const handleDeclinePdpa = () => {
    setPdpaModalOpen(false);
    message.info('ท่านยังไม่ได้ให้ความยินยอม PDPA จึงยังไม่สามารถเริ่มทำแบบคัดกรองได้');
  };

  // รีเซ็ตแบบประเมินทั้งหมดสำหรับเริ่มผู้ป่วยรายใหม่
  const handleReload = () => {
    if (iframeRef.current) {
      setIframeLoading(true);
      setCurrentScreening(null);
      setPdpaConsentAccepted(true);
      setPdpaModalOpen(false);
      iframeRef.current.src = '/tools/child-screening-suite.html';
      message.success('รีเซ็ตแบบประเมินเรียบร้อยแล้ว');
    }
  };

  // เปิดแท็บใหม่
  const handleOpenNewTab = () => {
    window.open('/tools/child-screening-suite.html', '_blank');
  };

  // จำนวนแบบคัดกรองที่ประเมินเสร็จแล้ว
  const completedCount = currentScreening?.screenings
    ? Object.keys(currentScreening.screenings).length
    : 0;

  // คอลัมน์สำหรับตารางประวัติในฐานข้อมูล
  // คอลัมน์สำหรับตารางประวัติในฐานข้อมูล
  const historyColumns = [
    {
      title: 'วันที่ประเมิน',
      dataIndex: 'assessmentDate',
      key: 'assessmentDate',
      width: 170,
      sorter: (a: ChildScreeningRecordItem, b: ChildScreeningRecordItem) =>
        dayjs(a.assessmentDate).unix() - dayjs(b.assessmentDate).unix(),
      defaultSortOrder: 'descend' as const,
      render: (val: string) => (
        <span style={{ fontWeight: 500, color: '#334155' }}>
          {formatThaiDate(val, true)}
        </span>
      ),
    },
    {
      title: 'HN / ข้อมูลผู้ป่วย',
      key: 'patient',
      width: 220,
      sorter: (a: ChildScreeningRecordItem, b: ChildScreeningRecordItem) =>
        (a.patientName || '').localeCompare(b.patientName || ''),
      render: (_: any, record: ChildScreeningRecordItem) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
            {record.patientName || 'ไม่ระบุชื่อ'}
          </div>
          <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Tag color="cyan" style={{ borderRadius: 6, margin: 0, fontSize: 11, fontWeight: 600 }}>
              HN: {record.hn || 'ไม่มี HN'}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              อายุ:{' '}
              {record.ageYears !== null && record.ageYears !== undefined
                ? `${record.ageYears} ปี ${record.ageMonths || 0} เดือน`
                : '-'}
            </Text>
          </div>
          {record.birthDate && (
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              วันเกิด: {formatThaiDate(record.birthDate)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'แบบคัดกรองที่ประเมิน',
      key: 'screenings',
      minWidth: 280,
      render: (_: any, record: ChildScreeningRecordItem) => {
        const sc = record.screenings || {};
        const keys = Object.keys(sc);
        if (!keys.length) return <Text type="secondary">-</Text>;

        return (
          <Space wrap size={[6, 6]}>
            {keys.map((k) => {
              const item = sc[k];
              const isAlert = item?.alert;
              const isSui = item?.sui;
              const conf = TOOL_CONFIG[k] || { badge: k.toUpperCase(), color: '#2c7aa0' };

              return (
                <Tooltip
                  key={k}
                  title={
                    <div>
                      <div style={{ fontWeight: 700 }}>{conf.badge}</div>
                      <div>{item?.text || 'ไม่มีรายละเอียดสรุปผล'}</div>
                    </div>
                  }
                >
                  <Tag
                    color={isSui ? 'purple' : isAlert ? 'red' : 'blue'}
                    style={{
                      borderRadius: 8,
                      fontWeight: 600,
                      fontSize: 12,
                      padding: '2px 8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      cursor: 'help',
                    }}
                  >
                    <span>{conf.badge}</span>
                    {isSui && <span>⚠️</span>}
                    {isAlert && !isSui && <span>🚨</span>}
                  </Tag>
                </Tooltip>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: 'ระดับความเสี่ยง',
      key: 'status',
      width: 170,
      sorter: (a: ChildScreeningRecordItem, b: ChildScreeningRecordItem) => {
        const score = (r: ChildScreeningRecordItem) => (r.hasSuicideRisk ? 3 : r.hasAlert ? 2 : 1);
        return score(b) - score(a);
      },
      render: (_: any, record: ChildScreeningRecordItem) => (
        <Space direction="vertical" size={4}>
          {record.hasSuicideRisk && (
            <Tag color="purple" style={{ borderRadius: 99, fontWeight: 700, margin: 0 }}>
              ⚠️ เสี่ยงทำร้ายตนเอง
            </Tag>
          )}
          {record.hasAlert && (
            <Tag color="red" style={{ borderRadius: 99, fontWeight: 700, margin: 0 }}>
              🚨 HIGH ALERT
            </Tag>
          )}
          {!record.hasAlert && !record.hasSuicideRisk && (
            <Tag color="green" style={{ borderRadius: 99, fontWeight: 600, margin: 0 }}>
              ✓ ปกติ / ความเสี่ยงต่ำ
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'ผู้ประเมิน',
      dataIndex: 'examinerName',
      key: 'examinerName',
      width: 140,
      render: (val: string) =>
        val ? (
          <span style={{ fontSize: 13, color: '#475569' }}>{val}</span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: ChildScreeningRecordItem) => (
        <Space size={4}>
          <Tooltip title="ดูผลประเมินละเอียดและพิมพ์รายงาน">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedRecord(record);
                setDetailModalOpen(true);
              }}
              style={{
                borderRadius: 6,
                background: '#2c7aa0',
                borderColor: '#2c7aa0',
              }}
            >
              ดูผล
            </Button>
          </Tooltip>
          <Popconfirm
            title="ลบประวัติการคัดกรอง"
            description="คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากฐานข้อมูล?"
            okText="ลบ"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Tooltip title="ลบข้อมูล">
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: isFullscreen ? 0 : '16px 24px 32px',
        maxWidth: isFullscreen ? '100%' : 1400,
        margin: '0 auto',
        minHeight: '100%',
        height: isFullscreen ? '100vh' : 'auto',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 1000 : 1,
        background: isFullscreen ? '#f7f5f1' : 'transparent',
        display: isFullscreen ? 'flex' : 'block',
        flexDirection: isFullscreen ? 'column' : undefined,
        overflow: isFullscreen ? 'hidden' : 'visible',
      }}
    >
      {/* ส่วนหัวแสดงผลเฉพาะเมื่อไม่ได้อยู่ในโหมดเต็มหน้าจอ */}
      {!isFullscreen && (
        <div style={{ marginBottom: 16 }}>
          <Breadcrumb
            items={[
              {
                title: <a onClick={() => navigate('/department-forms')}>คลังฟอร์มตามแผนก</a>,
              },
              {
                title: 'ชุดคัดกรองเด็กและวัยรุ่น',
              },
            ]}
            style={{ marginBottom: 12 }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <Space align="center" style={{ marginBottom: 4 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #dcecfb 0%, #fbe7ed 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2c7aa0',
                    fontSize: 22,
                  }}
                >
                  <SmileOutlined />
                </div>
                <div>
                  <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
                    ชุดแบบคัดกรองพัฒนาการ พฤติกรรม และอารมณ์เด็กและวัยรุ่น
                  </Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Child & Adolescent Screening Suite (M-CHAT-R, PDDSQ 4-18, SDQ, SNAP-IV, GAD-7, PHQ-A)
                  </Text>
                </div>
              </Space>
            </div>

            {/* แถบปุ่ม Action เครื่องมือ */}
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/department-forms')}>
                กลับคลังฟอร์ม
              </Button>

              {activeTab === 'screening' && (
                <>
                  <Tooltip title="หนังสือให้ความยินยอมการเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคล (PDPA)">
                    {pdpaConsentAccepted ? (
                      <Tag
                        color="success"
                        icon={<SafetyCertificateOutlined />}
                        style={{
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                        onClick={() => setPdpaModalOpen(true)}
                      >
                        ✓ ยินยอม PDPA แล้ว
                      </Tag>
                    ) : (
                      <Button
                        icon={<SafetyCertificateOutlined />}
                        onClick={() => setPdpaModalOpen(true)}
                        style={{
                          borderColor: '#f59e0b',
                          color: '#b45309',
                          background: '#fffbeb',
                          fontWeight: 600,
                        }}
                      >
                        ยินยอม PDPA
                      </Button>
                    )}
                  </Tooltip>
                  <Tooltip title="บันทึกผลการคัดกรองคนไข้รายนี้ลงฐานข้อมูล FormLocal">
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={saveMutation.isPending}
                      onClick={handleSaveFromToolbar}
                      style={{
                        background: completedCount > 0 ? '#16a34a' : '#2c7aa0',
                        borderColor: completedCount > 0 ? '#16a34a' : '#2c7aa0',
                        fontWeight: 600,
                      }}
                    >
                      💾 บันทึกลงฐานข้อมูล {completedCount > 0 && `(${completedCount} ชุด)`}
                    </Button>
                  </Tooltip>
                  <Tooltip title="รีโหลดหรือเริ่มทำแบบประเมินสำหรับคนไข้คนใหม่">
                    <Button icon={<ReloadOutlined />} onClick={handleReload}>
                      เริ่มผู้ป่วยใหม่
                    </Button>
                  </Tooltip>
                  <Tooltip title="เปิดในแท็บใหม่แยกต่างหาก สะดวกเมื่อต้องการให้คนไข้ทำบนอุปกรณ์อื่น">
                    <Button icon={<ExportOutlined />} onClick={handleOpenNewTab}>
                      เปิดแท็บใหม่
                    </Button>
                  </Tooltip>
                  <Tooltip title="พิมพ์แบบสรุปผลการคัดกรองสำหรับแนบแฟ้มเวชระเบียน">
                    <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                      พิมพ์สรุปผล
                    </Button>
                  </Tooltip>
                  {/* <Button
                    type="primary"
                    icon={<FullscreenOutlined />}
                    onClick={() => setIsFullscreen(true)}
                    style={{
                      background: '#2c7aa0',
                      borderColor: '#2c7aa0',
                    }}
                  >
                    โหมดเต็มจอ (Kiosk)
                  </Button> */}
                </>
              )}
            </Space>
          </div>

          {/* แถบแท็บสลับระหว่าง: ทำแบบประเมิน / ประวัติในฐานข้อมูล */}
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as any)}
            style={{ marginTop: 12 }}
            items={[
              {
                key: 'screening',
                label: (
                  <span>
                    <SmileOutlined /> ทำแบบคัดกรอง (Screening Suite)
                  </span>
                ),
              },
              {
                key: 'history',
                label: (
                  <span>
                    <HistoryOutlined /> ประวัติการคัดกรองในฐานข้อมูล ({records.length})
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* แถบหัวด้านบนแบบตายตัว (Fixed Top Header Bar) เมื่ออยู่ในโหมด Fullscreen - ไม่ลอยทับ UI ของ Form */}
      {isFullscreen && (
        <div
          style={{
            flex: '0 0 auto',
            minHeight: 56,
            background: '#ffffff',
            borderBottom: '1.5px solid #ebe7e1',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(60, 50, 40, 0.05)',
            zIndex: 10,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #dcecfb 0%, #fbe7ed 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2c7aa0',
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              <SmileOutlined />
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>
                ชุดแบบคัดกรองเด็กและวัยรุ่น
              </span>
              {currentScreening?.patientName ? (
                <span style={{ color: '#64748b', fontSize: 13, marginLeft: 8 }}>
                  • {currentScreening.patientName} {currentScreening.hn ? `(HN: ${currentScreening.hn})` : ''}
                </span>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>
                  (โหมดเต็มหน้าจอ / Kiosk)
                </span>
              )}
            </div>
          </div>

          <Space size={8} wrap style={{ flexShrink: 0 }}>
            {pdpaConsentAccepted ? (
              <Tag
                color="success"
                icon={<SafetyCertificateOutlined />}
                style={{
                  borderRadius: 99,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
                onClick={() => setPdpaModalOpen(true)}
              >
                PDPA ยินยอมแล้ว
              </Tag>
            ) : (
              <Button
                shape="round"
                icon={<SafetyCertificateOutlined />}
                onClick={() => setPdpaModalOpen(true)}
                style={{
                  borderColor: '#f59e0b',
                  color: '#b45309',
                  background: '#fffbeb',
                  fontWeight: 600,
                }}
              >
                ยินยอม PDPA
              </Button>
            )}
            <Button
              type="primary"
              shape="round"
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
              onClick={handleSaveFromToolbar}
              style={{
                background: completedCount > 0 ? '#16a34a' : '#2c7aa0',
                borderColor: completedCount > 0 ? '#16a34a' : '#2c7aa0',
                fontWeight: 600,
              }}
            >
              บันทึกลง Database {completedCount > 0 && `(${completedCount})`}
            </Button>
            <Button
              shape="round"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
            >
              พิมพ์สรุปผล
            </Button>
            <Button
              type="primary"
              danger
              shape="round"
              icon={<FullscreenExitOutlined />}
              onClick={() => setIsFullscreen(false)}
            >
              ออกจากเต็มจอ
            </Button>
          </Space>
        </div>
      )}

      {/* เนื้อหาแท็บที่ 1: Iframe ทำแบบประเมิน */}
      {activeTab === 'screening' && (
        <Card
          styles={{ body: { padding: 0, height: '100%', position: 'relative' } }}
          style={{
            flex: isFullscreen ? '1 1 auto' : undefined,
            borderRadius: isFullscreen ? 0 : 20,
            border: isFullscreen ? 'none' : '1px solid #ebe7e1',
            overflow: 'hidden',
            boxShadow: isFullscreen ? 'none' : '0 6px 24px rgba(60, 50, 40, 0.06)',
            height: isFullscreen ? 'calc(100vh - 56px)' : 'calc(100vh - 210px)',
            minHeight: isFullscreen ? 'calc(100vh - 56px)' : 650,
            background: '#f7f5f1',
            position: 'relative',
          }}
        >
          {/* แผ่นล็อกเมื่อยังไม่ยินยอม PDPA */}
          {!pdpaConsentAccepted && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                background: 'rgba(247, 245, 241, 0.82)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: 20,
                  padding: '36px 32px',
                  maxWidth: 480,
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.1)',
                  border: '1.5px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: '50%',
                    background: '#eff6ff',
                    color: '#0047cc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    margin: '0 auto 16px',
                  }}
                >
                  <SafetyCertificateOutlined />
                </div>
                <Title level={4} style={{ margin: '0 0 8px', color: '#1e293b' }}>
                  ความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
                </Title>
                <Paragraph type="secondary" style={{ fontSize: 14, margin: '0 0 22px', lineHeight: 1.6 }}>
                  โรงพยาบาลรามคำแหง 2 ให้ความสำคัญกับการคุ้มครองข้อมูลสุขภาพของผู้ป่วย
                  กรุณาอ่านและให้ความยินยอมก่อนเริ่มทำแบบคัดกรองเด็กและวัยรุ่น
                </Paragraph>
                <Button
                  type="primary"
                  size="large"
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => setPdpaModalOpen(true)}
                  style={{
                    background: '#0047cc',
                    borderColor: '#0047cc',
                    borderRadius: 12,
                    height: 48,
                    padding: '0 32px',
                    fontWeight: 600,
                    fontSize: 16,
                  }}
                >
                  อ่านและให้ความยินยอม PDPA
                </Button>
              </div>
            </div>
          )}

          <Spin spinning={iframeLoading} tip="กำลังโหลดชุดคัดกรองเด็กและวัยรุ่น..." style={{ height: '100%' }}>
            <iframe
              ref={iframeRef}
              src="/tools/child-screening-suite.html"
              title="ชุดแบบคัดกรองพัฒนาการ พฤติกรรม และอารมณ์เด็กและวัยรุ่น"
              style={{
                width: '100%',
                height: isFullscreen ? 'calc(100vh - 56px)' : 'calc(100vh - 210px)',
                minHeight: isFullscreen ? 'calc(100vh - 56px)' : 650,
                border: 'none',
                display: 'block',
              }}
              onLoad={() => {
                setIframeLoading(false);
                if (iframeRef.current && iframeRef.current.contentWindow) {
                  iframeRef.current.contentWindow.postMessage({ type: 'pdpa_accepted' }, '*');
                }
              }}
            />
          </Spin>
        </Card>
      )}

      {/* เนื้อหาแท็บที่ 2: ประวัติการคัดกรองในฐานข้อมูล */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* แถบการ์ดสถิติภาพรวม 4 กล่อง */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <Card
              size="small"
              style={{
                borderRadius: 14,
                border: '1px solid #e2e8f0',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                📋 ประวัติการคัดกรองทั้งหมด
              </Text>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginTop: 4 }}>
                {stats.total}{' '}
                <span style={{ fontSize: 13, fontWeight: 400, color: '#64748b' }}>รายการ</span>
              </div>
            </Card>

            <Card
              size="small"
              style={{
                borderRadius: 14,
                border: '1px solid #dcfce7',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircleOutlined style={{ color: '#16a34a' }} />
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#15803d' }}>
                  ปกติ / ความเสี่ยงต่ำ
                </Text>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#15803d', marginTop: 4 }}>
                {stats.normalCount}{' '}
                <span style={{ fontSize: 13, fontWeight: 400, color: '#86efac' }}>รายการ</span>
              </div>
            </Card>

            <Card
              size="small"
              style={{
                borderRadius: 14,
                border: '1px solid #fee2e2',
                background: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertOutlined style={{ color: '#dc2626' }} />
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#b91c1c' }}>
                  กลุ่มเสี่ยง HIGH ALERT
                </Text>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#b91c1c', marginTop: 4 }}>
                {stats.alertCount}{' '}
                <span style={{ fontSize: 13, fontWeight: 400, color: '#fca5a5' }}>รายการ</span>
              </div>
            </Card>

            <Card
              size="small"
              style={{
                borderRadius: 14,
                border: '1px solid #f3e8ff',
                background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <WarningOutlined style={{ color: '#7e22ce' }} />
                <Text style={{ fontSize: 13, fontWeight: 500, color: '#7e22ce' }}>
                  เสี่ยงทำร้ายตนเอง (Suicide)
                </Text>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#7e22ce', marginTop: 4 }}>
                {stats.suicideCount}{' '}
                <span style={{ fontSize: 13, fontWeight: 400, color: '#d8b4fe' }}>รายการ</span>
              </div>
            </Card>
          </div>

          <Card
            style={{
              borderRadius: 16,
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            }}
          >
            {/* แถบเครื่องมือค้นหาและฟิลเตอร์หลายมิติ */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: 16,
              }}
            >
              <Space wrap size={10}>
                <Input
                  placeholder="ค้นหา HN หรือ ชื่อผู้ป่วย..."
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 240, borderRadius: 8 }}
                  allowClear
                />

                <Select
                  value={riskFilter}
                  onChange={(v) => setRiskFilter(v)}
                  style={{ width: 180 }}
                  options={[
                    { value: 'ALL', label: 'ระดับความเสี่ยง: ทั้งหมด' },
                    { value: 'NORMAL', label: '🟢 เฉพาะ ปกติ/เสี่ยงต่ำ' },
                    { value: 'ALERT', label: '🚨 เฉพาะ HIGH ALERT' },
                    { value: 'SUICIDE', label: '💜 เฉพาะ เสี่ยงทำร้ายตนเอง' },
                  ]}
                />

                <Select
                  value={toolFilter}
                  onChange={(v) => setToolFilter(v)}
                  style={{ width: 190 }}
                  options={[
                    { value: 'ALL', label: 'แบบคัดกรอง: ทั้งหมด' },
                    { value: 'mchat', label: 'M-CHAT-R (ออทิซึม)' },
                    { value: 'pddsq', label: 'PDDSQ (พัฒนาการ)' },
                    { value: 'sdq', label: 'SDQ (พฤติกรรม/อารมณ์)' },
                    { value: 'snap', label: 'SNAP-IV (สมาธิสั้น)' },
                    { value: 'gad7', label: 'GAD-7 (วิตกกังวล)' },
                    { value: 'phqa', label: 'PHQ-A (ซึมเศร้า)' },
                  ]}
                />

                <RangePicker
                  placeholder={['วันเริ่มต้น', 'วันสิ้นสุด']}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as any)}
                  style={{ borderRadius: 8 }}
                  format="DD/MM/YYYY"
                />

                {(searchText || riskFilter !== 'ALL' || toolFilter !== 'ALL' || dateRange) && (
                  <Button
                    onClick={() => {
                      setSearchText('');
                      setRiskFilter('ALL');
                      setToolFilter('ALL');
                      setDateRange(null);
                    }}
                    style={{ borderRadius: 8 }}
                  >
                    ล้างตัวกรอง
                  </Button>
                )}
              </Space>

              <Space wrap size={8}>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => refetchRecords()}
                  loading={isRecordsLoading}
                  style={{ borderRadius: 8 }}
                >
                  รีเฟรช
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={handleExportCsv}
                  style={{
                    borderRadius: 8,
                    background: '#16a34a',
                    borderColor: '#16a34a',
                    fontWeight: 600,
                  }}
                >
                  ส่งออก CSV / Excel
                </Button>
              </Space>
            </div>

            {/* ตารางแสดงข้อมูลประวัติการคัดกรอง */}
            <Table
              columns={historyColumns}
              dataSource={filteredRecords}
              rowKey="id"
              loading={isRecordsLoading}
              scroll={{ x: 1100 }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                pageSizeOptions: ['10', '15', '30', '50'],
                showTotal: (total, range) =>
                  `แสดงรายการที่ ${range[0]}-${range[1]} จากทั้งหมด ${total} รายการ`,
              }}
              locale={{
                emptyText: (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <SmileOutlined style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 8 }} />
                    <div style={{ color: '#64748b', fontSize: 15, fontWeight: 500 }}>
                      ยังไม่มีประวัติการคัดกรอง หรือไม่พบข้อมูลตามเงื่อนไขที่ค้นหา
                    </div>
                  </div>
                ),
              }}
            />
          </Card>
        </div>
      )}

      {/* Modal ดูรายละเอียดผลการคัดกรองย้อนหลัง */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#e3effa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2c7aa0',
                fontSize: 20,
              }}
            >
              <SmileOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                ผลการคัดกรอง: {selectedRecord?.patientName || 'ไม่ระบุชื่อ'}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                HN: {selectedRecord?.hn || 'ไม่มี HN'} • วันที่ประเมิน:{' '}
                {selectedRecord ? formatThaiDate(selectedRecord.assessmentDate, true) : '-'}
              </Text>
            </div>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={760}
        footer={[
          <Button key="close" onClick={() => setDetailModalOpen(false)}>
            ปิดหน้าต่าง
          </Button>,
          <Button
            key="print"
            type="primary"
            icon={<PrinterOutlined />}
            onClick={() => window.print()}
            style={{ background: '#2c7aa0', borderColor: '#2c7aa0' }}
          >
            พิมพ์รายงาน
          </Button>,
        ]}
      >
        {selectedRecord && (
          <div style={{ padding: '10px 0' }}>
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="ชื่อผู้ป่วย">
                <strong>{selectedRecord.patientName || '-'}</strong>
              </Descriptions.Item>
              <Descriptions.Item label="HN">
                <Tag color="cyan">{selectedRecord.hn || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="วันเกิด">
                {selectedRecord.birthDate ? formatThaiDate(selectedRecord.birthDate) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="อายุ ณ วันคัดกรอง">
                {selectedRecord.ageYears !== null && selectedRecord.ageYears !== undefined
                  ? `${selectedRecord.ageYears} ปี ${selectedRecord.ageMonths || 0} เดือน (${selectedRecord.totalAgeMonths || 0} เดือน)`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="วันที่ประเมิน">
                {formatThaiDate(selectedRecord.assessmentDate, true)}
              </Descriptions.Item>
              <Descriptions.Item label="ผู้ตรวจประเมิน">
                {selectedRecord.examinerName || '-'}
              </Descriptions.Item>
              {selectedRecord.notes && (
                <Descriptions.Item label="หมายเหตุ" span={2}>
                  {selectedRecord.notes}
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 20 }}>
              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                📋 ผลการคัดกรองแต่ละแบบประเมิน:
              </Text>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedRecord.screenings &&
                  Object.entries(selectedRecord.screenings).map(([key, item]: any) => {
                    const conf = TOOL_CONFIG[key] || { name: key.toUpperCase(), color: '#2c7aa0', badge: key.toUpperCase() };
                    return (
                      <Card
                        key={key}
                        size="small"
                        style={{
                          borderRadius: 12,
                          border: item?.sui
                            ? '1.5px solid #d3adf7'
                            : item?.alert
                            ? '1.5px solid #ffa39e'
                            : '1px solid #e2e8f0',
                          background: item?.sui ? '#f9f0ff' : item?.alert ? '#fff1f0' : '#ffffff',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <div>
                            <Tag color="blue" style={{ fontWeight: 700, borderRadius: 6 }}>
                              {conf.badge}
                            </Tag>
                            <span style={{ fontWeight: 600, fontSize: 14 }}>{conf.name}</span>
                            <div style={{ fontSize: 13, marginTop: 4, color: '#334155' }}>
                              ผล: <strong>{item?.text}</strong>
                            </div>
                          </div>
                          <Space>
                            {item?.sui && (
                              <Tag color="purple" style={{ borderRadius: 99, fontWeight: 700 }}>
                                ⚠️ เสี่ยงทำร้ายตนเอง
                              </Tag>
                            )}
                            {item?.alert && (
                              <Tag color="red" style={{ borderRadius: 99, fontWeight: 700 }}>
                                🚨 HIGH ALERT
                              </Tag>
                            )}
                            {!item?.alert && !item?.sui && (
                              <Tag color="green" style={{ borderRadius: 99, fontWeight: 600 }}>
                                ✓ ปกติ / ความเสี่ยงต่ำ
                              </Tag>
                            )}
                          </Space>
                        </div>
                      </Card>
                    );
                  })}
              </div>
            </div>

            <div
              style={{
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px dashed #cbd5e1',
                textAlign: 'right',
                color: '#64748b',
                fontSize: 13,
              }}
            >
              ลงชื่อแพทย์/ผู้ประเมิน: .............................................................. วันที่: ....../....../..........
            </div>
          </div>
        )}
      </Modal>

      {/* หน้าต่างขอความยินยอม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA Consent Modal) */}
      <PdpaConsentModal
        open={pdpaModalOpen}
        onAccept={handleAcceptPdpa}
        onDecline={handleDeclinePdpa}
        headerTitle="RAM2 Preliminary Assessment"
        headerSubtitle="โรงพยาบาลรามคำแหง 2"
        pdpaTitle="หนังสือให้ความยินยอมในการเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคล"
        formTitle="ชุดแบบคัดกรองพัฒนาการ พฤติกรรม และอารมณ์เด็กและวัยรุ่น"
        formDescription="Child & Adolescent Screening Suite (M-CHAT-R, PDDSQ 4-18, SDQ, SNAP-IV, GAD-7, PHQ-A)"
      />
    </div>
  );
};

export default ChildScreeningPage;
