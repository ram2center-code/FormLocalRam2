import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Typography,
  Space,
  Tag,
  Button,
  Input,
  Row,
  Col,
  Statistic,
  Drawer,
  Spin,
  Empty,
  App,
  Tabs,
  Progress,
  Select,
  Rate,
  Modal,
  Divider,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  DownloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  BarChartOutlined,
  TableOutlined,
  PrinterOutlined,
  FileTextOutlined,
  TrophyOutlined,
  ApartmentOutlined,
  RiseOutlined,
  FallOutlined,
  ReloadOutlined,
  FileDoneOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getFormSubmissionsApi,
  SubmissionItem,
  FormField,
} from '../api/formApi';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export const FormSubmissionsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();

  // Tab & Filter States
  const [activeTab, setActiveTab] = useState<'analytics' | 'submissions'>('analytics');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionItem | null>(null);
  const [textAnswersModal, setTextAnswersModal] = useState<{ field: FormField; answers: Array<{ text: string; user: string; date: string }> } | null>(null);

  // ดึงข้อมูลผลคำตอบของฟอร์ม
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['form-submissions', id],
    queryFn: () => getFormSubmissionsApi(id!),
    enabled: !!id,
  });

  const form = data?.form;
  const submissions = data?.submissions || [];
  const isScoreTest = form?.type === 'SCORE_TEST';

  // รายชื่อแผนกทั้งหมดที่มีการส่งคำตอบเข้ามา
  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    submissions.forEach((s) => {
      if (s.departmentName) depts.add(s.departmentName);
    });
    return Array.from(depts);
  }, [submissions]);

  // กรองข้อมูล submissions ตามเงื่อนไขการค้นหา, แผนก, และสถานะ
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      const matchSearch =
        search.trim() === '' ||
        s.userFullName.toLowerCase().includes(search.toLowerCase().trim()) ||
        s.username.toLowerCase().includes(search.toLowerCase().trim()) ||
        s.departmentName.toLowerCase().includes(search.toLowerCase().trim());

      const matchDept = deptFilter === 'ALL' || s.departmentName === deptFilter;

      let matchStatus = true;
      if (statusFilter === 'PASSED') matchStatus = s.passed === true;
      if (statusFilter === 'FAILED') matchStatus = s.passed === false;

      return matchSearch && matchDept && matchStatus;
    });
  }, [submissions, search, deptFilter, statusFilter]);

  // คำนวณสถิติภาพรวมจากข้อมูลที่ผ่านการกรอง (Dynamic Summary Stats)
  const dynamicStats = useMemo(() => {
    const total = filteredSubmissions.length;
    let passedCount = 0;
    let scoreSum = 0;
    let maxScoreFound = 0;
    let minScoreFound = total > 0 ? 999999 : 0;
    let scoredCount = 0;

    filteredSubmissions.forEach((s) => {
      if (s.passed) passedCount++;
      if (s.score !== null && s.score !== undefined) {
        scoreSum += s.score;
        scoredCount++;
        if (s.score > maxScoreFound) maxScoreFound = s.score;
        if (s.score < minScoreFound) minScoreFound = s.score;
      }
    });

    const avgScore = scoredCount > 0 ? Number((scoreSum / scoredCount).toFixed(1)) : 0;
    const passRate = total > 0 ? Number(((passedCount / total) * 100).toFixed(1)) : 0;

    return {
      total,
      passedCount,
      failedCount: total - passedCount,
      passRate,
      avgScore,
      maxScore: scoredCount > 0 ? maxScoreFound : 0,
      minScore: scoredCount > 0 ? minScoreFound : 0,
    };
  }, [filteredSubmissions]);

  // สถิติแยกตามแผนก (Department Analysis)
  const departmentStats = useMemo(() => {
    const map: Record<string, { count: number; totalScore: number; passedCount: number }> = {};
    filteredSubmissions.forEach((s) => {
      const d = s.departmentName || 'ไม่ระบุแผนก';
      if (!map[d]) {
        map[d] = { count: 0, totalScore: 0, passedCount: 0 };
      }
      map[d].count++;
      if (s.score !== null) map[d].totalScore += s.score;
      if (s.passed) map[d].passedCount++;
    });

    return Object.entries(map)
      .map(([name, stat]) => ({
        name,
        count: stat.count,
        percent: filteredSubmissions.length > 0 ? Number(((stat.count / filteredSubmissions.length) * 100).toFixed(1)) : 0,
        avgScore: stat.count > 0 ? Number((stat.totalScore / stat.count).toFixed(1)) : 0,
        passRate: stat.count > 0 ? Number(((stat.passedCount / stat.count) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSubmissions]);

  // สถิติช่วงคะแนน (Score Bands Distribution)
  const scoreDistribution = useMemo(() => {
    if (!isScoreTest) return [];
    const bands = [
      { label: '0 - 49% (ต้องปรับปรุง)', min: 0, max: 49.99, count: 0, color: '#ff4d4f' },
      { label: '50 - 69% (พอใช้)', min: 50, max: 69.99, count: 0, color: '#faad14' },
      { label: '70 - 84% (ดี)', min: 70, max: 84.99, count: 0, color: '#1677ff' },
      { label: '85 - 100% (ดีเยี่ยม)', min: 85, max: 100, count: 0, color: '#52c41a' },
    ];

    filteredSubmissions.forEach((s) => {
      if (s.maxScore && s.maxScore > 0) {
        const pct = (s.score! / s.maxScore) * 100;
        const b = bands.find((item) => pct >= item.min && pct <= item.max);
        if (b) b.count++;
      }
    });

    return bands.map((b) => ({
      ...b,
      percent: filteredSubmissions.length > 0 ? Number(((b.count / filteredSubmissions.length) * 100).toFixed(1)) : 0,
    }));
  }, [filteredSubmissions, isScoreTest]);

  // วิเคราะห์คำถามรายข้อ (Question-by-Question Analytics)
  const questionAnalytics = useMemo(() => {
    if (!form?.schema) return [];
    const questions = form.schema.filter((q) => q.type !== 'layer_box');

    return questions.map((q) => {
      const answersForQ: any[] = [];
      filteredSubmissions.forEach((s) => {
        const a = s.answers[q.id];
        if (a !== undefined && a !== null && a !== '') {
          answersForQ.push({ value: a, user: s.userFullName, date: s.submittedAt });
        }
      });

      const answeredCount = answersForQ.length;
      const responseRate = filteredSubmissions.length > 0 ? Number(((answeredCount / filteredSubmissions.length) * 100).toFixed(1)) : 0;

      // กรณีช้อยส์เดี่ยว หรือ Dropdown
      if (q.type === 'single_choice' || q.type === 'dropdown') {
        const optionCounts: Record<string, number> = {};
        (q.options || []).forEach((opt) => {
          optionCounts[opt.id] = 0;
        });

        answersForQ.forEach((item) => {
          if (optionCounts[item.value] !== undefined) {
            optionCounts[item.value]++;
          }
        });

        const optionsStats = (q.options || []).map((opt) => {
          const count = optionCounts[opt.id] || 0;
          const pct = answeredCount > 0 ? Number(((count / answeredCount) * 100).toFixed(1)) : 0;
          const isCorrect = q.correctAnswer === opt.id;
          return { id: opt.id, label: opt.label, count, pct, isCorrect };
        });

        const correctCount = q.correctAnswer ? (optionCounts[String(q.correctAnswer)] || 0) : null;
        const accuracyRate = correctCount !== null && answeredCount > 0 ? Number(((correctCount / answeredCount) * 100).toFixed(1)) : null;

        return {
          question: q,
          answeredCount,
          responseRate,
          optionsStats,
          accuracyRate,
        };
      }

      // กรณีหลายตัวเลือก (Checkbox)
      if (q.type === 'multi_choice') {
        const optionCounts: Record<string, number> = {};
        (q.options || []).forEach((opt) => {
          optionCounts[opt.id] = 0;
        });

        answersForQ.forEach((item) => {
          if (Array.isArray(item.value)) {
            item.value.forEach((optId: string) => {
              if (optionCounts[optId] !== undefined) optionCounts[optId]++;
            });
          }
        });

        const optionsStats = (q.options || []).map((opt) => {
          const count = optionCounts[opt.id] || 0;
          const pct = answeredCount > 0 ? Number(((count / answeredCount) * 100).toFixed(1)) : 0;
          const isCorrect = Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt.id);
          return { id: opt.id, label: opt.label, count, pct, isCorrect };
        });

        return {
          question: q,
          answeredCount,
          responseRate,
          optionsStats,
        };
      }

      // กรณี Rating (ดาว)
      if (q.type === 'rating') {
        const starCounts = [0, 0, 0, 0, 0]; // 1, 2, 3, 4, 5 stars
        let starSum = 0;

        answersForQ.forEach((item) => {
          const num = Number(item.value);
          if (num >= 1 && num <= 5) {
            starCounts[num - 1]++;
            starSum += num;
          }
        });

        const avgRating = answeredCount > 0 ? Number((starSum / answeredCount).toFixed(2)) : 0;
        const starStats = [5, 4, 3, 2, 1].map((star) => {
          const count = starCounts[star - 1];
          const pct = answeredCount > 0 ? Number(((count / answeredCount) * 100).toFixed(1)) : 0;
          return { star, count, pct };
        });

        return {
          question: q,
          answeredCount,
          responseRate,
          avgRating,
          starStats,
        };
      }

      // กรณีตัวเลข (Number)
      if (q.type === 'number') {
        const nums = answersForQ.map((a) => Number(a.value)).filter((n) => !isNaN(n));
        const numCount = nums.length;
        const sum = nums.reduce((a, b) => a + b, 0);
        const avg = numCount > 0 ? Number((sum / numCount).toFixed(2)) : 0;
        const min = numCount > 0 ? Math.min(...nums) : 0;
        const max = numCount > 0 ? Math.max(...nums) : 0;

        return {
          question: q,
          answeredCount,
          responseRate,
          numberStats: { avg, min, max, sum },
        };
      }

      // กรณีข้อความสั้น หรือยาว (Text / Textarea)
      return {
        question: q,
        answeredCount,
        responseRate,
        rawAnswers: answersForQ.map((a) => ({ text: String(a.value), user: a.user, date: a.date })),
      };
    });
  }, [form, filteredSubmissions]);

  // คำนวณข้อที่ผู้ตอบตอบถูกมากที่สุดและน้อยที่สุด (Item Analysis)
  const itemAnalysisSummary = useMemo(() => {
    if (!isScoreTest) return null;
    const questionsWithAccuracy = questionAnalytics.filter((qa) => qa.accuracyRate !== null && qa.accuracyRate !== undefined);
    if (questionsWithAccuracy.length === 0) return null;

    const sorted = [...questionsWithAccuracy].sort((a, b) => (b.accuracyRate ?? 0) - (a.accuracyRate ?? 0));
    const easiest = sorted[0];
    const hardest = sorted[sorted.length - 1];

    return { easiest, hardest };
  }, [questionAnalytics, isScoreTest]);

  // ส่งออกข้อมูลเป็นไฟล์ CSV (UTF-8 BOM ภาษาไทยเปิดใน Excel ได้ทันที)
  const handleExportCSV = () => {
    if (!form || submissions.length === 0) {
      message.warning('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const exportableQuestions = form.schema.filter((q) => q.type !== 'layer_box');
    const headers = [
      'ลำดับ',
      'วันที่ส่งคำตอบ',
      'ชื่อ-นามสกุล',
      'Username',
      'แผนก',
      ...(isScoreTest ? ['คะแนน', 'คะแนนเต็ม', 'ร้อยละ', 'สถานะ', 'ระดับ/เกรด'] : []),
      ...exportableQuestions.map((q) => q.label.replace(/"/g, '""')),
    ];

    const rows = filteredSubmissions.map((s, index) => {
      const percentage = s.maxScore && s.maxScore > 0 ? ((s.score! / s.maxScore) * 100).toFixed(1) : '-';
      const answersList = exportableQuestions.map((q) => {
        const ans = s.answers[q.id];
        if (ans === undefined || ans === null) return '';
        if (q.type === 'single_choice' || q.type === 'dropdown') {
          const opt = q.options?.find((o) => o.id === ans);
          return opt ? opt.label : ans;
        }
        if (q.type === 'multi_choice' && Array.isArray(ans)) {
          return ans.map((id) => q.options?.find((o) => o.id === id)?.label || id).join('; ');
        }
        return String(ans);
      });

      return [
        index + 1,
        dayjs(s.submittedAt).format('YYYY-MM-DD HH:mm:ss'),
        `"${s.userFullName.replace(/"/g, '""')}"`,
        s.username,
        `"${s.departmentName.replace(/"/g, '""')}"`,
        ...(isScoreTest
          ? [
              s.score ?? 0,
              s.maxScore ?? 0,
              percentage,
              s.passed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์',
              `"${(s.grade || '').replace(/"/g, '""')}"`,
            ]
          : []),
        ...answersList.map((a) => `"${String(a).replace(/"/g, '""')}"`),
      ];
    });

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${form.title}_data_analysis_${dayjs().format('YYYYMMDD_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('ส่งออกไฟล์ Excel (CSV ภาษาไทย) เรียบร้อยแล้ว');
  };

  // ส่งออกรายงานวิเคราะห์เป็น JSON Data
  const handleExportJSON = () => {
    if (!form || submissions.length === 0) {
      message.warning('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const report = {
      formTitle: form.title,
      formType: form.type,
      exportedAt: dayjs().toISOString(),
      summary: dynamicStats,
      departmentStats,
      questionAnalytics: questionAnalytics.map((qa) => ({
        questionId: qa.question.id,
        label: qa.question.label,
        type: qa.question.type,
        answeredCount: qa.answeredCount,
        responseRate: qa.responseRate,
        accuracyRate: qa.accuracyRate,
        optionsStats: qa.optionsStats,
        numberStats: qa.numberStats,
        avgRating: qa.avgRating,
      })),
      submissionsCount: filteredSubmissions.length,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${form.title}_report_${dayjs().format('YYYYMMDD_HHmm')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('ส่งออกรายงานสรุป JSON สำเร็จแล้ว');
  };

  // สั่งพิมพ์รายงานผลการวิเคราะห์
  const handlePrint = () => {
    window.print();
  };

  const columns = [
    {
      title: 'ผู้ส่งคำตอบ',
      key: 'user',
      render: (_: any, record: SubmissionItem) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.userFullName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            @{record.username} • {record.departmentName}
          </Text>
        </div>
      ),
    },
    {
      title: 'วันที่ส่งคำตอบ',
      key: 'submittedAt',
      width: 180,
      render: (_: any, record: SubmissionItem) => (
        <span>{dayjs(record.submittedAt).format('DD/MM/YYYY HH:mm น.')}</span>
      ),
    },
    ...(isScoreTest
      ? [
          {
            title: 'คะแนน',
            key: 'score',
            width: 140,
            render: (_: any, record: SubmissionItem) => (
              <div>
                <Text strong style={{ fontSize: 15 }}>
                  {record.score} / {record.maxScore}
                </Text>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                  ({record.maxScore ? ((record.score! / record.maxScore) * 100).toFixed(0) : 0}%)
                </div>
              </div>
            ),
          },
          {
            title: 'ผลการประเมิน',
            key: 'passed',
            width: 150,
            render: (_: any, record: SubmissionItem) => (
              <Space direction="vertical" size={2}>
                <Tag
                  color={record.passed ? 'green' : 'orange'}
                  icon={record.passed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                  style={{ borderRadius: 4 }}
                >
                  {record.passed ? 'ผ่านเกณฑ์' : 'ไม่ผ่านเกณฑ์'}
                </Tag>
                {record.grade && (
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    เกรด: {record.grade}
                  </Text>
                )}
              </Space>
            ),
          },
        ]
      : []),
    {
      title: 'จัดการ',
      key: 'actions',
      width: 120,
      render: (_: any, record: SubmissionItem) => (
        <Button
          icon={<EyeOutlined />}
          onClick={() => setSelectedSubmission(record)}
          style={{ borderRadius: 6 }}
        >
          ดูคำตอบ
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <Spin size="large" tip="กำลังโหลดข้อมูลและประมวลผลการวิเคราะห์..." />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Header Card */}
      <Card
        style={{ marginBottom: 16, borderRadius: 12 }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Space size="middle" align="center">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/forms')}
              style={{ borderRadius: 8 }}
            >
              กลับหน้ารายการ
            </Button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={4} style={{ margin: 0 }}>
                  📊 ผลตอบกลับและการวิเคราะห์: {form?.title}
                </Title>
                <Tag color={isScoreTest ? 'gold' : 'blue'}>
                  {isScoreTest ? '🏆 ข้อสอบวัดผล' : '📝 ฟอร์มทั่วไป'}
                </Tag>
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                ระบบวิเคราะห์ข้อมูลทางสถิติ, แผนภูมิผลลัพธ์ และการส่งออกข้อมูลสำหรับนำไปใช้ต่อ
              </Text>
            </div>
          </Space>

          <Space size="small" wrap>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              title="รีเฟรชข้อมูลล่าสุด"
            />
            <Button
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              disabled={submissions.length === 0}
            >
              พิมพ์รายงานสรุป
            </Button>
            <Button
              icon={<FileDoneOutlined />}
              onClick={handleExportJSON}
              disabled={submissions.length === 0}
            >
              ส่งออก JSON
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
              disabled={submissions.length === 0}
              style={{ height: 40, fontWeight: 500 }}
            >
              ส่งออก Excel (CSV)
            </Button>
          </Space>
        </div>
      </Card>

      {/* Tabs Switcher: วิเคราะห์ข้อมูล vs รายการคำตอบ */}
      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as 'analytics' | 'submissions')}
        size="large"
        items={[
          {
            key: 'analytics',
            label: (
              <Space>
                <BarChartOutlined />
                <span>วิเคราะห์ข้อมูลและสถิติ (Data Analytics)</span>
              </Space>
            ),
          },
          {
            key: 'submissions',
            label: (
              <Space>
                <TableOutlined />
                <span>รายการคำตอบรายบุคคล ({filteredSubmissions.length})</span>
              </Space>
            ),
          },
        ]}
      />

      {/* Toolbar & Filter Bar สำหรับทั้งสองแท็บ */}
      <Card
        style={{ marginBottom: 16, borderRadius: 12 }}
        styles={{ body: { padding: '12px 20px' } }}
      >
        <Row gutter={[16, 12]} align="middle" justify="space-between">
          <Col xs={24} md={14}>
            <Space wrap size="middle">
              <Input
                placeholder="ค้นหาชื่อผู้ส่ง, username, แผนก..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 260 }}
                allowClear
              />

              <Select
                value={deptFilter}
                onChange={(val) => setDeptFilter(val)}
                style={{ width: 180 }}
                placeholder="กรองตามแผนก"
              >
                <Option value="ALL">ทุกแผนก (ทั้งหมด)</Option>
                {allDepartments.map((dept) => (
                  <Option key={dept} value={dept}>
                    {dept}
                  </Option>
                ))}
              </Select>

              {isScoreTest && (
                <Select
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  style={{ width: 160 }}
                  placeholder="กรองสถานะสอบ"
                >
                  <Option value="ALL">สถานะ: ทั้งหมด</Option>
                  <Option value="PASSED">✅ เฉพาะผ่านเกณฑ์</Option>
                  <Option value="FAILED">❌ เฉพาะไม่ผ่านเกณฑ์</Option>
                </Select>
              )}
            </Space>
          </Col>

          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              กำลังวิเคราะห์ข้อมูล: <strong>{filteredSubmissions.length}</strong> จากทั้งหมด {submissions.length} คน
            </Text>
          </Col>
        </Row>
      </Card>

      {/* ========================================================================= */}
      {/* VIEW 1: DATA ANALYTICS & CHARTS TAB */}
      {/* ========================================================================= */}
      {activeTab === 'analytics' && (
        <Space direction="vertical" size={20} style={{ width: '100%' }}>
          {/* 1. Executive KPI Summary Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <Card style={{ borderRadius: 12, textAlign: 'center', borderTop: '4px solid #1677ff' }} styles={{ body: { padding: 18 } }}>
                <Statistic
                  title="จำนวนผู้ตอบแบบสอบถาม"
                  value={dynamicStats.total}
                  suffix="คน"
                  valueStyle={{ fontWeight: 700 }}
                />
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                  จากทั้งหมด {submissions.length} คนในระบบ
                </Text>
              </Card>
            </Col>

            {isScoreTest ? (
              <>
                <Col xs={12} sm={6}>
                  <Card style={{ borderRadius: 12, textAlign: 'center', borderTop: '4px solid #722ed1' }} styles={{ body: { padding: 18 } }}>
                    <Statistic
                      title="คะแนนเฉลี่ย (Mean Score)"
                      value={dynamicStats.avgScore}
                      suffix="คะแนน"
                      valueStyle={{ fontWeight: 700, color: '#722ed1' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                      สูงสุด: {dynamicStats.maxScore} | ต่ำสุด: {dynamicStats.minScore}
                    </Text>
                  </Card>
                </Col>

                <Col xs={12} sm={6}>
                  <Card style={{ borderRadius: 12, textAlign: 'center', borderTop: '4px solid #52c41a' }} styles={{ body: { padding: 18 } }}>
                    <Statistic
                      title="ผู้สอบผ่านเกณฑ์"
                      value={dynamicStats.passedCount}
                      suffix={`/ ${dynamicStats.total} คน`}
                      valueStyle={{ fontWeight: 700, color: '#52c41a' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                      ไม่ผ่านเกณฑ์: {dynamicStats.failedCount} คน
                    </Text>
                  </Card>
                </Col>

                <Col xs={12} sm={6}>
                  <Card style={{ borderRadius: 12, textAlign: 'center', borderTop: `4px solid ${dynamicStats.passRate >= 60 ? '#52c41a' : '#fa8c16'}` }} styles={{ body: { padding: 18 } }}>
                    <Statistic
                      title="อัตราการสอบผ่าน (Pass Rate)"
                      value={dynamicStats.passRate}
                      suffix="%"
                      valueStyle={{ fontWeight: 700, color: dynamicStats.passRate >= 60 ? '#52c41a' : '#fa8c16' }}
                    />
                    <div style={{ marginTop: 6, padding: '0 20px' }}>
                      <Progress
                        percent={dynamicStats.passRate}
                        showInfo={false}
                        strokeColor={dynamicStats.passRate >= 60 ? '#52c41a' : '#fa8c16'}
                        size="small"
                      />
                    </div>
                  </Card>
                </Col>
              </>
            ) : (
              <>
                <Col xs={12} sm={6}>
                  <Card style={{ borderRadius: 12, textAlign: 'center', borderTop: '4px solid #52c41a' }} styles={{ body: { padding: 18 } }}>
                    <Statistic
                      title="จำนวนแผนกที่เข้าร่วม"
                      value={departmentStats.length}
                      suffix="แผนก"
                      valueStyle={{ fontWeight: 700, color: '#52c41a' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                      การกระจายตัวข้ามแผนก
                    </Text>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card style={{ borderRadius: 12, textAlign: 'center', borderTop: '4px solid #fa8c16' }} styles={{ body: { padding: 18 } }}>
                    <Statistic
                      title="แผนกที่มีผู้ตอบสูงสุด"
                      value={departmentStats[0]?.name || '-'}
                      valueStyle={{ fontWeight: 700, fontSize: 16, color: '#fa8c16' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                      {departmentStats[0] ? `${departmentStats[0].count} คน (${departmentStats[0].percent}%)` : 'ไม่มีข้อมูล'}
                    </Text>
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card style={{ borderRadius: 12, textAlign: 'center', borderTop: '4px solid #13c2c2' }} styles={{ body: { padding: 18 } }}>
                    <Statistic
                      title="จำนวนข้อคำถามทั้งหมด"
                      value={form?.schema.filter((q) => q.type !== 'layer_box').length || 0}
                      suffix="ข้อ"
                      valueStyle={{ fontWeight: 700, color: '#13c2c2' }}
                    />
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
                      พร้อมวิเคราะห์รายข้อ
                    </Text>
                  </Card>
                </Col>
              </>
            )}
          </Row>

          {/* 2. Item Difficulty & Actionable Insights (สำหรับ Score Test) */}
          {isScoreTest && itemAnalysisSummary && (
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card
                  style={{ borderRadius: 12, backgroundColor: '#f6ffed', border: '1px solid #b7eb8f' }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Space align="start">
                    <RiseOutlined style={{ fontSize: 24, color: '#52c41a', marginTop: 4 }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 15, color: '#237804' }}>
                          🌟 ข้อที่ผู้สอบทำได้ดีที่สุด (Highest Score Rate)
                        </Text>
                        <Tag color="success">ถูกต้อง {itemAnalysisSummary.easiest.accuracyRate}%</Tag>
                      </div>
                      <Paragraph style={{ margin: '4px 0 0 0', fontSize: 13, color: '#389e0d' }}>
                        {itemAnalysisSummary.easiest.question.label}
                      </Paragraph>
                    </div>
                  </Space>
                </Card>
              </Col>

              <Col xs={24} md={12}>
                <Card
                  style={{ borderRadius: 12, backgroundColor: '#fff2e8', border: '1px solid #ffbb96' }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Space align="start">
                    <FallOutlined style={{ fontSize: 24, color: '#fa541c', marginTop: 4 }} />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Text strong style={{ fontSize: 15, color: '#d4380d' }}>
                          ⚠️ ข้อที่ผู้สอบตอบผิดมากที่สุด (ควรทบทวนเนื้อหา)
                        </Text>
                        <Tag color="error">ถูกต้องเพียง {itemAnalysisSummary.hardest.accuracyRate}%</Tag>
                      </div>
                      <Paragraph style={{ margin: '4px 0 0 0', fontSize: 13, color: '#cf1322' }}>
                        {itemAnalysisSummary.hardest.question.label}
                      </Paragraph>
                    </div>
                  </Space>
                </Card>
              </Col>
            </Row>
          )}

          {/* 3. Section: การวิเคราะห์ระดับแผนก และช่วงคะแนน */}
          <Row gutter={[16, 16]}>
            {/* กราฟสถิติตามแผนก */}
            <Col xs={24} lg={isScoreTest ? 14 : 24}>
              <Card
                title={
                  <Space>
                    <ApartmentOutlined style={{ color: '#1677ff' }} />
                    <span>การมีส่วนร่วมและการตอบกลับแยกตามแผนก</span>
                  </Space>
                }
                style={{ borderRadius: 12, height: '100%' }}
                styles={{ body: { padding: 20 } }}
              >
                {departmentStats.length === 0 ? (
                  <Empty description="ยังไม่มีข้อมูลแผนก" />
                ) : (
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {departmentStats.map((item) => (
                      <div key={item.name} style={{ borderBottom: '1px solid #f5f5f5', paddingBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text strong style={{ fontSize: 14 }}>{item.name}</Text>
                          <Space size="middle">
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              {item.count} คน ({item.percent}%)
                            </Text>
                            {isScoreTest && (
                              <Tag color={item.passRate >= 60 ? 'green' : 'orange'} style={{ margin: 0 }}>
                                ผ่าน {item.passRate}% (เฉลี่ย {item.avgScore} คะแนน)
                              </Tag>
                            )}
                          </Space>
                        </div>
                        <Progress
                          percent={item.percent}
                          strokeColor="#1677ff"
                          showInfo={false}
                          size="small"
                        />
                      </div>
                    ))}
                  </Space>
                )}
              </Card>
            </Col>

            {/* กราฟแจกแจงเกรดและช่วงคะแนน (Score Test) */}
            {isScoreTest && (
              <Col xs={24} lg={10}>
                <Card
                  title={
                    <Space>
                      <TrophyOutlined style={{ color: '#fa8c16' }} />
                      <span>การกระจายตัวตามช่วงคะแนน (Score Bands)</span>
                    </Space>
                  }
                  style={{ borderRadius: 12, height: '100%' }}
                  styles={{ body: { padding: 20 } }}
                >
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {scoreDistribution.map((item) => (
                      <div key={item.label} style={{ borderBottom: '1px solid #f5f5f5', paddingBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</Text>
                          <Text strong style={{ color: item.color }}>
                            {item.count} คน ({item.percent}%)
                          </Text>
                        </div>
                        <Progress
                          percent={item.percent}
                          strokeColor={item.color}
                          showInfo={false}
                          size="small"
                        />
                      </div>
                    ))}
                  </Space>
                </Card>
              </Col>
            )}
          </Row>

          {/* 4. Section: การวิเคราะห์คำถามรายข้อ (Question-by-Question Deep Analytics) */}
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <FileTextOutlined style={{ color: '#1677ff' }} />
                  <span>การวิเคราะห์เจาะลึกคำถามรายข้อ ({questionAnalytics.length} ข้อ)</span>
                </Space>
                <Tag color="processing">อัปเดตแบบ Realtime ตามตัวกรอง</Tag>
              </div>
            }
            style={{ borderRadius: 12 }}
            styles={{ body: { padding: 24 } }}
          >
            {questionAnalytics.length === 0 ? (
              <Empty description="ไม่มีคำถามในแบบฟอร์มนี้" />
            ) : (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {questionAnalytics.map((qa, index) => {
                  const q = qa.question;

                  return (
                    <Card
                      key={q.id}
                      type="inner"
                      style={{
                        borderRadius: 10,
                        backgroundColor: '#fafafa',
                        border: '1px solid #ebebeb',
                      }}
                      styles={{ body: { padding: 18 } }}
                    >
                      {/* Question Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <Space size={8} align="center">
                            <Tag color="blue" style={{ fontWeight: 600, fontSize: 13, borderRadius: 4 }}>
                              ข้อที่ {index + 1}
                            </Tag>
                            <Tag style={{ borderRadius: 4 }}>
                              {q.type === 'single_choice' && 'ตัวเลือกเดียว (Radio)'}
                              {q.type === 'multi_choice' && 'หลายตัวเลือก (Checkbox)'}
                              {q.type === 'dropdown' && 'รายการเลือก (Dropdown)'}
                              {q.type === 'rating' && 'การให้คะแนน (Rating)'}
                              {q.type === 'number' && 'ตัวเลข (Number)'}
                              {q.type === 'text' && 'ข้อความสั้น (Text)'}
                              {q.type === 'textarea' && 'ข้อความยาว (Paragraph)'}
                              {q.type === 'date' && 'วันที่ (Date)'}
                              {q.type === 'file' && 'แนบไฟล์ (File)'}
                            </Tag>
                            {q.points !== undefined && q.points > 0 && (
                              <Tag color="gold" icon={<TrophyOutlined />}>
                                {q.points} คะแนน
                              </Tag>
                            )}
                          </Space>
                          <Title level={5} style={{ margin: '8px 0 2px 0', fontSize: 16 }}>
                            {q.label}
                          </Title>
                          {q.description && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {q.description}
                            </Text>
                          )}
                        </div>

                        {/* Summary Badges on Top Right of each question */}
                        <Space size="small">
                          <Tag color="default">
                            ตอบแล้ว: <strong>{qa.answeredCount}</strong> / {filteredSubmissions.length} ({qa.responseRate}%)
                          </Tag>
                          {qa.accuracyRate !== null && qa.accuracyRate !== undefined && (
                            <Tag color={qa.accuracyRate >= 60 ? 'green' : 'orange'} style={{ fontWeight: 600 }}>
                              ความถูกต้อง: {qa.accuracyRate}%
                            </Tag>
                          )}
                        </Space>
                      </div>

                      <Divider style={{ margin: '10px 0 14px 0' }} />

                      {/* Content by Question Type */}
                      {/* Type A: Single Choice & Dropdown */}
                      {(q.type === 'single_choice' || q.type === 'dropdown') && qa.optionsStats && (
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          {qa.optionsStats.map((opt) => (
                            <div
                              key={opt.id}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                backgroundColor: opt.isCorrect ? '#f6ffed' : '#ffffff',
                                border: opt.isCorrect ? '1.5px solid #b7eb8f' : '1px solid #f0f0f0',
                                marginBottom: 4,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Space>
                                  {opt.isCorrect && (
                                    <Tooltip title="เฉลยคำตอบที่ถูกต้อง">
                                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                                    </Tooltip>
                                  )}
                                  <Text strong={opt.isCorrect}>{opt.label}</Text>
                                  {opt.isCorrect && (
                                    <Tag color="success" style={{ fontSize: 11, padding: '0 6px', margin: 0 }}>
                                      เฉลยถูกต้อง
                                    </Tag>
                                  )}
                                </Space>
                                <Text strong style={{ color: opt.isCorrect ? '#52c41a' : undefined }}>
                                  {opt.count} คน ({opt.pct}%)
                                </Text>
                              </div>
                              <Progress
                                percent={opt.pct}
                                strokeColor={opt.isCorrect ? '#52c41a' : '#1677ff'}
                                showInfo={false}
                                size="small"
                              />
                            </div>
                          ))}
                        </Space>
                      )}

                      {/* Type B: Multiple Choice (Checkbox) */}
                      {q.type === 'multi_choice' && qa.optionsStats && (
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          {qa.optionsStats.map((opt) => (
                            <div
                              key={opt.id}
                              style={{
                                padding: '8px 12px',
                                borderRadius: 8,
                                backgroundColor: opt.isCorrect ? '#f6ffed' : '#ffffff',
                                border: opt.isCorrect ? '1.5px solid #b7eb8f' : '1px solid #f0f0f0',
                                marginBottom: 4,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <Space>
                                  {opt.isCorrect && <CheckOutlined style={{ color: '#52c41a' }} />}
                                  <Text strong={opt.isCorrect}>{opt.label}</Text>
                                  {opt.isCorrect && <Tag color="success">คำตอบในเฉลย</Tag>}
                                </Space>
                                <Text strong>{opt.count} ครั้ง ({opt.pct}%)</Text>
                              </div>
                              <Progress
                                percent={opt.pct}
                                strokeColor={opt.isCorrect ? '#52c41a' : '#1677ff'}
                                showInfo={false}
                                size="small"
                              />
                            </div>
                          ))}
                        </Space>
                      )}

                      {/* Type C: Rating (ดาว) */}
                      {q.type === 'rating' && qa.starStats && (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                            <div style={{ textAlign: 'center', padding: '10px 18px', backgroundColor: '#fffbe6', borderRadius: 10, border: '1px solid #ffe58f' }}>
                              <Text strong style={{ fontSize: 26, color: '#fa8c16', display: 'block', lineHeight: 1 }}>
                                {qa.avgRating}
                              </Text>
                              <Rate disabled allowHalf value={qa.avgRating} style={{ fontSize: 14 }} />
                              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 2 }}>
                                คะแนนเฉลี่ย (เต็ม 5)
                              </Text>
                            </div>
                            <div style={{ flex: 1 }}>
                              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                {qa.starStats.map((s) => (
                                  <div key={s.star} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ width: 45, fontSize: 12 }}>{s.star} ดาว</Text>
                                    <Progress
                                      percent={s.pct}
                                      strokeColor="#faad14"
                                      size="small"
                                      style={{ flex: 1 }}
                                    />
                                    <Text style={{ width: 70, textAlign: 'right', fontSize: 12 }}>
                                      {s.count} คน ({s.pct}%)
                                    </Text>
                                  </div>
                                ))}
                              </Space>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Type D: Number */}
                      {q.type === 'number' && qa.numberStats && (
                        <Row gutter={[16, 16]}>
                          <Col span={6}>
                            <Card size="small" style={{ textAlign: 'center', backgroundColor: '#ffffff', borderRadius: 8 }}>
                              <Statistic title="ค่าเฉลี่ย (Mean)" value={qa.numberStats.avg} valueStyle={{ color: '#1677ff', fontWeight: 600 }} />
                            </Card>
                          </Col>
                          <Col span={6}>
                            <Card size="small" style={{ textAlign: 'center', backgroundColor: '#ffffff', borderRadius: 8 }}>
                              <Statistic title="ต่ำสุด (Min)" value={qa.numberStats.min} />
                            </Card>
                          </Col>
                          <Col span={6}>
                            <Card size="small" style={{ textAlign: 'center', backgroundColor: '#ffffff', borderRadius: 8 }}>
                              <Statistic title="สูงสุด (Max)" value={qa.numberStats.max} />
                            </Card>
                          </Col>
                          <Col span={6}>
                            <Card size="small" style={{ textAlign: 'center', backgroundColor: '#ffffff', borderRadius: 8 }}>
                              <Statistic title="ผลรวมทั้งหมด (Sum)" value={qa.numberStats.sum} />
                            </Card>
                          </Col>
                        </Row>
                      )}

                      {/* Type E: Text / Textarea */}
                      {(q.type === 'text' || q.type === 'textarea') && qa.rawAnswers && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 13 }}>
                              ตัวอย่างคำตอบล่าสุด ({Math.min(qa.rawAnswers.length, 5)} จาก {qa.rawAnswers.length} ข้อความ):
                            </Text>
                            {qa.rawAnswers.length > 5 && (
                              <Button
                                size="small"
                                type="link"
                                onClick={() => setTextAnswersModal({ field: q, answers: qa.rawAnswers! })}
                              >
                                ดูข้อความทั้งหมด ({qa.rawAnswers.length} ข้อความ) →
                              </Button>
                            )}
                          </div>

                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {qa.rawAnswers.slice(0, 5).map((ans, aIdx) => (
                              <div
                                key={aIdx}
                                style={{
                                  padding: '8px 12px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #f0f0f0',
                                  borderRadius: 6,
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                }}
                              >
                                <Text style={{ fontSize: 13, color: '#262626' }}>"{ans.text}"</Text>
                                <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap', marginLeft: 12 }}>
                                  {ans.user} ({dayjs(ans.date).format('DD/MM HH:mm')})
                                </Text>
                              </div>
                            ))}
                          </Space>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </Space>
            )}
          </Card>
        </Space>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: INDIVIDUAL SUBMISSIONS TABLE TAB */}
      {/* ========================================================================= */}
      {activeTab === 'submissions' && (
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 20 } }}>
          <Table
            dataSource={filteredSubmissions}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 15, showTotal: (total) => `ทั้งหมด ${total} รายการ` }}
            locale={{ emptyText: <Empty description="ยังไม่มีผู้ส่งคำตอบตรงตามเงื่อนไขที่เลือก" /> }}
          />
        </Card>
      )}

      {/* Modal: ดูคำตอบแบบข้อความทั้งหมด (Text Answers Modal) */}
      <Modal
        title={
          <div>
            <span>รายการคำตอบทั้งหมด: {textAnswersModal?.field.label}</span>
            <div style={{ fontSize: 12, fontWeight: 'normal', color: '#8c8c8c' }}>
              มีผู้ตอบข้อนี้ทั้งหมด {textAnswersModal?.answers.length} รายการ
            </div>
          </div>
        }
        open={!!textAnswersModal}
        onCancel={() => setTextAnswersModal(null)}
        footer={[
          <Button key="close" type="primary" onClick={() => setTextAnswersModal(null)}>
            ปิดหน้าต่าง
          </Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 500, overflowY: 'auto', padding: '10px 0' }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {textAnswersModal?.answers.map((ans, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 14px',
                  backgroundColor: '#fafafa',
                  borderRadius: 8,
                  border: '1px solid #f0f0f0',
                }}
              >
                <Paragraph style={{ margin: '0 0 6px 0', fontSize: 14 }}>
                  "{ans.text}"
                </Paragraph>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8c8c8c' }}>
                  <span>โดย: {ans.user}</span>
                  <span>{dayjs(ans.date).format('DD/MM/YYYY HH:mm น.')}</span>
                </div>
              </div>
            ))}
          </Space>
        </div>
      </Modal>

      {/* Drawer: ดูคำตอบรายบุคคล */}
      <Drawer
        title={
          <div>
            <span>คำตอบของ: {selectedSubmission?.userFullName}</span>
            <div style={{ fontSize: 12, fontWeight: 'normal', color: '#8c8c8c' }}>
              @{selectedSubmission?.username} • แผนก {selectedSubmission?.departmentName} • ส่งเมื่อ {dayjs(selectedSubmission?.submittedAt).format('DD/MM/YYYY HH:mm น.')}
            </div>
          </div>
        }
        placement="right"
        width={680}
        open={!!selectedSubmission}
        onClose={() => setSelectedSubmission(null)}
      >
        {selectedSubmission && form && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {isScoreTest && (
              <Card
                style={{
                  backgroundColor: selectedSubmission.passed ? '#f6ffed' : '#fffbe6',
                  border: selectedSubmission.passed ? '1px solid #b7eb8f' : '1px solid #ffe58f',
                  borderRadius: 10,
                }}
                styles={{ body: { padding: 16 } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Text strong style={{ fontSize: 17 }}>
                      คะแนนที่ทำได้: {selectedSubmission.score} / {selectedSubmission.maxScore} คะแนน
                    </Text>
                    <div style={{ fontSize: 13, color: '#595959', marginTop: 2 }}>
                      ร้อยละ: {selectedSubmission.maxScore ? ((selectedSubmission.score! / selectedSubmission.maxScore) * 100).toFixed(1) : 0}% • ระดับ/เกรด: <strong>{selectedSubmission.grade || '-'}</strong>
                    </div>
                  </div>
                  <Tag
                    color={selectedSubmission.passed ? 'green' : 'orange'}
                    icon={selectedSubmission.passed ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    style={{ fontSize: 14, padding: '4px 12px', borderRadius: 6 }}
                  >
                    {selectedSubmission.passed ? 'ผ่านเกณฑ์การสอบ' : 'ไม่ผ่านเกณฑ์การสอบ'}
                  </Tag>
                </div>
              </Card>
            )}

            <Title level={5} style={{ margin: '8px 0 4px 0' }}>
              รายละเอียดคำตอบแต่ละข้อ:
            </Title>

            {form.schema
              .filter((q) => q.type !== 'layer_box')
              .map((q) => {
                const ans = selectedSubmission.answers[q.id];
                let displayAnswer = 'ไม่ได้ตอบ';
                let isAnswerCorrect: boolean | null = null;

                if (ans !== undefined && ans !== null && ans !== '') {
                  if (q.type === 'single_choice' || q.type === 'dropdown') {
                    const opt = q.options?.find((o) => o.id === ans);
                    displayAnswer = opt ? opt.label : String(ans);
                    if (q.correctAnswer) {
                      isAnswerCorrect = q.correctAnswer === ans;
                    }
                  } else if (q.type === 'multi_choice' && Array.isArray(ans)) {
                    displayAnswer = ans
                      .map((id) => q.options?.find((o) => o.id === id)?.label || id)
                      .join(', ');
                    if (Array.isArray(q.correctAnswer)) {
                      isAnswerCorrect =
                        ans.length === q.correctAnswer.length &&
                        ans.every((val) => (q.correctAnswer as string[]).includes(val));
                    }
                  } else if (q.type === 'rating') {
                    displayAnswer = `${ans} ดาว`;
                    if (q.correctAnswer !== undefined) {
                      isAnswerCorrect = Number(q.correctAnswer) === Number(ans);
                    }
                  } else {
                    displayAnswer = String(ans);
                    if (q.correctAnswer !== undefined && q.correctAnswer !== '') {
                      isAnswerCorrect = String(q.correctAnswer).trim().toLowerCase() === String(ans).trim().toLowerCase();
                    }
                  }
                }

                return (
                  <Card
                    key={q.id}
                    size="small"
                    style={{
                      borderRadius: 8,
                      backgroundColor: isAnswerCorrect === true ? '#f6ffed' : isAnswerCorrect === false ? '#fff1f0' : '#fafafa',
                      border: isAnswerCorrect === true ? '1px solid #b7eb8f' : isAnswerCorrect === false ? '1px solid #ffa39e' : '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text strong style={{ display: 'block', marginBottom: 4, flex: 1 }}>
                        {q.label}
                        {q.points ? ` (${q.points} คะแนน)` : ''}
                      </Text>
                      {isAnswerCorrect !== null && (
                        <Tag color={isAnswerCorrect ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                          {isAnswerCorrect ? '✓ ตอบถูก' : '✗ ตอบผิด'}
                        </Tag>
                      )}
                    </div>
                    <Paragraph style={{ margin: '4px 0 0 0', paddingLeft: 8, color: '#1677ff', fontWeight: 600 }}>
                      คำตอบของผู้สอบ: {displayAnswer}
                    </Paragraph>
                    {isAnswerCorrect === false && q.correctAnswer && (
                      <div style={{ paddingLeft: 8, marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          เฉลยที่ถูกต้อง:{' '}
                          <strong>
                            {q.type === 'single_choice' || q.type === 'dropdown'
                              ? q.options?.find((o) => o.id === q.correctAnswer)?.label || String(q.correctAnswer)
                              : String(q.correctAnswer)}
                          </strong>
                        </Text>
                      </div>
                    )}
                  </Card>
                );
              })}
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default FormSubmissionsPage;
