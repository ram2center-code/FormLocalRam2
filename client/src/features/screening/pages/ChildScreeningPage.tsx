import React, { useState, useRef, useEffect } from 'react';
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
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  ExportOutlined,
  ReloadOutlined,
  SmileOutlined,
  SaveOutlined,
  HistoryOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  AlertOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  createScreeningRecordApi,
  getScreeningRecordsApi,
  deleteScreeningRecordApi,
  ChildScreeningRecordItem,
} from '../api/screeningApi';

const { Title, Text } = Typography;

export const ChildScreeningPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [activeTab, setActiveTab] = useState<'screening' | 'history'>('screening');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);

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
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ChildScreeningRecordItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // ดึงรายการประวัติการคัดกรองจากฐานข้อมูล
  const { data: records = [], isLoading: isRecordsLoading } = useQuery({
    queryKey: ['child-screenings', searchText, filterAlertOnly],
    queryFn: () =>
      getScreeningRecordsApi({
        search: searchText || undefined,
        hasAlert: filterAlertOnly ? true : undefined,
      }),
  });

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

  // รีเซ็ตแบบประเมินทั้งหมด
  const handleReload = () => {
    if (iframeRef.current) {
      setIframeLoading(true);
      setCurrentScreening(null);
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
  const historyColumns = [
    {
      title: 'วันที่ประเมิน',
      dataIndex: 'assessmentDate',
      key: 'assessmentDate',
      width: 140,
      render: (val: string) => dayjs(val).format('DD/MM/BBBB HH:mm') || '-',
    },
    {
      title: 'HN / ข้อมูลผู้ป่วย',
      key: 'patient',
      render: (_: any, record: ChildScreeningRecordItem) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>
            {record.patientName || 'ไม่ระบุชื่อ'}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            HN: {record.hn || 'ไม่มี HN'} • อายุ:{' '}
            {record.ageYears !== null && record.ageYears !== undefined
              ? `${record.ageYears} ปี ${record.ageMonths || 0} เดือน`
              : '-'}
          </Text>
        </div>
      ),
    },
    {
      title: 'ผลการคัดกรองที่ทำ',
      key: 'screenings',
      render: (_: any, record: ChildScreeningRecordItem) => {
        const sc = record.screenings || {};
        const keys = Object.keys(sc);
        if (!keys.length) return <Text type="secondary">-</Text>;

        return (
          <Space wrap size={[4, 4]}>
            {keys.map((k) => {
              const item = sc[k];
              const isAlert = item?.alert;
              const isSui = item?.sui;
              return (
                <Tag
                  key={k}
                  color={isSui ? 'purple' : isAlert ? 'red' : 'blue'}
                  style={{ borderRadius: 99, fontWeight: 500, fontSize: 12 }}
                >
                  {k.toUpperCase()}: {item?.text}
                </Tag>
              );
            })}
          </Space>
        );
      },
    },
    {
      title: 'สถานะความเสี่ยง',
      key: 'status',
      width: 150,
      render: (_: any, record: ChildScreeningRecordItem) => (
        <Space direction="vertical" size={2}>
          {record.hasSuicideRisk && (
            <Tag color="purple" style={{ borderRadius: 99, fontWeight: 700 }}>
              ⚠️ เสี่ยงทำร้ายตนเอง
            </Tag>
          )}
          {record.hasAlert && (
            <Tag color="red" style={{ borderRadius: 99, fontWeight: 700 }}>
              ! HIGH ALERT
            </Tag>
          )}
          {!record.hasAlert && !record.hasSuicideRisk && (
            <Tag color="green" style={{ borderRadius: 99, fontWeight: 600 }}>
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
      width: 150,
      render: (val: string) => val || <Text type="secondary">-</Text>,
    },
    {
      title: 'จัดการ',
      key: 'actions',
      width: 130,
      render: (_: any, record: ChildScreeningRecordItem) => (
        <Space>
          <Tooltip title="ดูรายละเอียดและผลคะแนน">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedRecord(record);
                setDetailModalOpen(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="ลบประวัติการคัดกรอง"
            description="คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้ออกจากฐานข้อมูล?"
            okText="ลบ"
            cancelText="ยกเลิก"
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Tooltip title="ลบประวัติ">
              <Button type="text" danger icon={<DeleteOutlined />} />
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
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 1000 : 1,
        background: isFullscreen ? '#f7f5f1' : 'transparent',
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
                  <Button
                    type="primary"
                    icon={<FullscreenOutlined />}
                    onClick={() => setIsFullscreen(true)}
                    style={{
                      background: '#2c7aa0',
                      borderColor: '#2c7aa0',
                    }}
                  >
                    โหมดเต็มจอ (Kiosk)
                  </Button>
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

      {/* แถบเครื่องมือควบคุมแบบลอยตัวเมื่ออยู่ในโหมด Fullscreen */}
      {isFullscreen && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            zIndex: 100,
            display: 'flex',
            gap: 8,
          }}
        >
          <Button
            type="primary"
            shape="round"
            icon={<SaveOutlined />}
            loading={saveMutation.isPending}
            onClick={handleSaveFromToolbar}
            style={{
              background: '#16a34a',
              borderColor: '#16a34a',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            บันทึกลง Database
          </Button>
          <Button
            shape="round"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            พิมพ์สรุปผล
          </Button>
          <Button
            type="primary"
            shape="round"
            danger
            icon={<FullscreenExitOutlined />}
            onClick={() => setIsFullscreen(false)}
            style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
          >
            ออกจากโหมดเต็มจอ
          </Button>
        </div>
      )}

      {/* เนื้อหาแท็บที่ 1: Iframe ทำแบบประเมิน */}
      {activeTab === 'screening' && (
        <Card
          styles={{ body: { padding: 0, height: '100%' } }}
          style={{
            borderRadius: isFullscreen ? 0 : 20,
            border: isFullscreen ? 'none' : '1px solid #ebe7e1',
            overflow: 'hidden',
            boxShadow: isFullscreen ? 'none' : '0 6px 24px rgba(60, 50, 40, 0.06)',
            height: isFullscreen ? '100vh' : 'calc(100vh - 210px)',
            minHeight: 650,
            background: '#f7f5f1',
            position: 'relative',
          }}
        >
          <Spin spinning={iframeLoading} tip="กำลังโหลดชุดคัดกรองเด็กและวัยรุ่น..." style={{ height: '100%' }}>
            <iframe
              ref={iframeRef}
              src="/tools/child-screening-suite.html"
              title="ชุดแบบคัดกรองพัฒนาการ พฤติกรรม และอารมณ์เด็กและวัยรุ่น"
              style={{
                width: '100%',
                height: isFullscreen ? '100vh' : 'calc(100vh - 210px)',
                minHeight: 650,
                border: 'none',
                display: 'block',
              }}
              onLoad={() => setIframeLoading(false)}
            />
          </Spin>
        </Card>
      )}

      {/* เนื้อหาแท็บที่ 2: ประวัติการคัดกรองในฐานข้อมูล */}
      {activeTab === 'history' && (
        <Card
          style={{
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }}
        >
          {/* แถบค้นหาและตัวกรอง */}
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
            <Space wrap>
              <Input
                placeholder="ค้นหาตาม HN หรือชื่อคนไข้..."
                prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 280, borderRadius: 8 }}
                allowClear
              />
              <Button
                type={filterAlertOnly ? 'primary' : 'default'}
                danger={filterAlertOnly}
                icon={<AlertOutlined />}
                onClick={() => setFilterAlertOnly((prev) => !prev)}
                style={{ borderRadius: 8 }}
              >
                {filterAlertOnly ? 'แสดงเฉพาะเคส HIGH ALERT' : 'เคส HIGH ALERT ทั้งหมด'}
              </Button>
            </Space>

            <Text type="secondary" style={{ fontSize: 13 }}>
              พบประวัติการคัดกรองทั้งหมด <strong>{records.length}</strong> รายการ
            </Text>
          </div>

          <Table
            columns={historyColumns}
            dataSource={records}
            rowKey="id"
            loading={isRecordsLoading}
            pagination={{ pageSize: 15, showTotal: (t) => `รวม ${t} รายการ` }}
            locale={{ emptyText: 'ยังไม่มีประวัติการคัดกรองในระบบ' }}
          />
        </Card>
      )}

      {/* Modal ดูรายละเอียดผลการคัดกรองย้อนหลัง */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: '#e3effa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2c7aa0',
                fontSize: 18,
              }}
            >
              <SmileOutlined />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>
                รายละเอียดผลการคัดกรอง: {selectedRecord?.patientName || 'ไม่ระบุชื่อ'}
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                HN: {selectedRecord?.hn || 'ไม่มี HN'} • วันที่ประเมิน:{' '}
                {selectedRecord ? dayjs(selectedRecord.assessmentDate).format('DD/MM/BBBB HH:mm') : '-'}
              </Text>
            </div>
          </div>
        }
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        width={720}
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
                {selectedRecord.patientName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="HN">{selectedRecord.hn || '-'}</Descriptions.Item>
              <Descriptions.Item label="วันเกิด">
                {selectedRecord.birthDate
                  ? dayjs(selectedRecord.birthDate).format('DD/MM/BBBB')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="อายุ ณ วันคัดกรอง">
                {selectedRecord.ageYears !== null && selectedRecord.ageYears !== undefined
                  ? `${selectedRecord.ageYears} ปี ${selectedRecord.ageMonths || 0} เดือน (${selectedRecord.totalAgeMonths || 0} เดือน)`
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="วันที่ประเมิน">
                {dayjs(selectedRecord.assessmentDate).format('DD/MM/BBBB HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="เจ้าหน้าที่ผู้บันทึก">
                {selectedRecord.examinerName || '-'}
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 20 }}>
              <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
                📋 ผลการคัดกรองแต่ละแบบประเมิน:
              </Text>
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedRecord.screenings &&
                  Object.entries(selectedRecord.screenings).map(([key, item]: any) => (
                    <Card
                      key={key}
                      size="small"
                      style={{
                        borderRadius: 10,
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
                        }}
                      >
                        <div>
                          <Text strong style={{ fontSize: 14 }}>
                            {key.toUpperCase()}
                          </Text>
                          <div style={{ fontSize: 13, marginTop: 2, color: '#334155' }}>
                            ผล: <strong>{item?.text}</strong>
                          </div>
                        </div>
                        <Space>
                          {item?.sui && <Tag color="purple">เสี่ยงทำร้ายตนเอง</Tag>}
                          {item?.alert && <Tag color="red">HIGH ALERT</Tag>}
                          {!item?.alert && !item?.sui && <Tag color="green">ปกติ / ความเสี่ยงต่ำ</Tag>}
                        </Space>
                      </div>
                    </Card>
                  ))}
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
    </div>
  );
};

export default ChildScreeningPage;
