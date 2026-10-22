import React, { useState, useEffect, useRef } from 'react';
import { Modal } from 'antd';
import dayjs from 'dayjs';
import { ChildScreeningRecordItem } from '../api/screeningApi';
import { TOOL_QUESTIONS_CATALOG } from '../constants/screeningQuestions';

export interface ChildScreeningResultViewModalProps {
  open: boolean;
  onClose: () => void;
  record: ChildScreeningRecordItem | null;
  initialToolId?: string;
  initialViewMode?: 'summary' | 'detailed';
}

// ข้อมูลและการตั้งค่าของแต่ละเครื่องมือ
const TOOL_META: Record<
  string,
  {
    short: string;
    name: string;
    fullName: string;
    subTitle: string;
    maxScore: number;
    color: string;
    colorSoft: string;
    citation: string;
  }
> = {
  mchat: {
    short: 'M-CHAT-R',
    name: 'คัดกรองกลุ่มอาการออทิซึม',
    fullName: 'แบบสอบถาม M-CHAT-R ฉบับภาษาไทย',
    subTitle: 'แบบคัดกรองภาวะออทิซึมสเปกตรัมในเด็กเล็ก (อายุ 16–30 เดือน) สำหรับผู้ปกครอง',
    maxScore: 20,
    color: '#3b82c4',
    colorSoft: '#e3effa',
    citation:
      'M-CHAT-R/F™ © 2009 Diana Robins, Deborah Fein, & Marianne Barton. ฉบับภาษาไทยแปลโดยโครงการวิจัย “การเพิ่มความสามารถของผู้ปกครองในการคัดกรองบุตรที่มีภาวะออทิซึมสเปกตรัมโดยใช้เทคโนโลยี” (ผศ.พญ.กุศลาภรณ์ ชัยอุดมสม และคณะ)',
  },
  pddsq: {
    short: 'PDDSQ 4-18',
    name: 'คัดกรองออทิซึม / PDDs',
    fullName: 'แบบคัดกรอง PDDSQ 4–18',
    subTitle: 'แบบคัดกรองกลุ่มอาการออทิซึมและ PDDs ในเด็กและวัยรุ่น (อายุ 4–18 ปี)',
    maxScore: 40,
    color: '#1f8a84',
    colorSoft: '#e0f3f1',
    citation:
      'PDDSQ 4–18 พัฒนาโดย โรงพยาบาลยุวประสาทไวทโยปถัมภ์ กรมสุขภาพจิต ร่วมกับ ศ.นพ.ชาญวิทย์ พรนภดล ภาควิชาจิตเวชศาสตร์ คณะแพทยศาสตร์ศิริราชพยาบาล',
  },
  sdq: {
    short: 'SDQ',
    name: 'แบบสอบถามพฤติกรรมและอารมณ์',
    fullName: 'แบบประเมินจุดเด่นและจุดด้อย (SDQ)',
    subTitle: 'Strengths and Difficulties Questionnaire ฉบับภาษาไทย (อายุ 4–18 ปี)',
    maxScore: 40,
    color: '#cc4f70',
    colorSoft: '#fbe7ed',
    citation:
      'SDQ © Robert Goodman (www.sdqinfo.org) ฉบับภาษาไทย กรมสุขภาพจิต กระทรวงสาธารณสุข เกณฑ์แปลผลมาตรฐานไทย (Woerner et al., 2011)',
  },
  snap: {
    short: 'SNAP-IV',
    name: 'เฝ้าระวังโรคสมาธิสั้น',
    fullName: 'แบบประเมิน SNAP-IV ฉบับภาษาไทย (Short Form)',
    subTitle: 'แบบประเมินพฤติกรรมสมาธิสั้น (ADHD) สำหรับผู้ปกครองและครู (อายุ 5–18 ปี)',
    maxScore: 54,
    color: '#5a63c9',
    colorSoft: '#e9ebfb',
    citation:
      'SNAP-IV Questionnaire (Swanson, Nolan, and Pelham, 1983) ฉบับภาษาไทย คณะแพทยศาสตร์ศิริราชพยาบาล',
  },
  gad7: {
    short: 'GAD-7',
    name: 'คัดกรองภาวะวิตกกังวล',
    fullName: 'แบบคัดกรองโรควิตกกังวลทั่วไป (GAD-7)',
    subTitle: 'Generalized Anxiety Disorder 7-item ฉบับภาษาไทย (อายุ 12–18 ปี)',
    maxScore: 21,
    color: '#8a5cc2',
    colorSoft: '#f1e9fa',
    citation:
      'Spitzer RL, Kroenke K, Williams JB, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092-1097.',
  },
  phqa: {
    short: 'PHQ-A',
    name: 'คัดกรองภาวะซึมเศร้าในวัยรุ่น',
    fullName: 'แบบประเมินภาวะซึมเศร้าในเด็กและวัยรุ่น (PHQ-A)',
    subTitle: 'PHQ-9 modified for Adolescents ฉบับภาษาไทย (อายุ 11–18 ปี)',
    maxScore: 27,
    color: '#2c7aa0',
    colorSoft: '#e3effa',
    citation:
      'Johnson JG, Harris ES, Spitzer RL, Williams JB. The patient health questionnaire for adolescents: validation of an instrument for the assessment of mental disorders among pediatric patients in primary care. J Adolesc Health 2002.',
  },
};

// SVG Mascot แท้จากระบบคัดกรอง
const MASCOTS: Record<string, { svg: string; c: string; cs: string }> = {
  mchat: {
    svg: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#dcecfb"/>
<rect x="10" y="64" width="20" height="20" rx="4" fill="#f6b73c"/><text x="20" y="79" font-size="13" text-anchor="middle" fill="#fff" font-weight="700" font-family="sans-serif">A</text>
<rect x="70" y="66" width="18" height="18" rx="4" fill="#ef6f6c"/><text x="79" y="80" font-size="12" text-anchor="middle" fill="#fff" font-weight="700" font-family="sans-serif">B</text>
<rect x="73" y="50" width="13" height="13" rx="3" fill="#6cc3a0"/>
<circle cx="27" cy="50" r="5.5" fill="#ffd2ad"/><circle cx="73" cy="44" r="5.5" fill="#ffd2ad"/>
<circle cx="50" cy="48" r="24" fill="#ffdcbc"/>
<path d="M41 27 q9 -12 16 -1" stroke="#8a5a36" stroke-width="4.5" fill="none" stroke-linecap="round"/>
<circle cx="41" cy="47" r="3.2" fill="#3a2e2a"/><circle cx="59" cy="47" r="3.2" fill="#3a2e2a"/>
<circle cx="42.2" cy="45.8" r="1" fill="#fff"/><circle cx="60.2" cy="45.8" r="1" fill="#fff"/>
<circle cx="35" cy="56" r="4.5" fill="#f7a1a1" opacity=".75"/><circle cx="65" cy="56" r="4.5" fill="#f7a1a1" opacity=".75"/>
<path d="M44 57 q6 7 12 0" stroke="#3a2e2a" stroke-width="2.6" fill="none" stroke-linecap="round"/></svg>`,
    c: '#3b82c4',
    cs: '#e3effa',
  },
  pddsq: {
    svg: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#dcf2ef"/>
<path d="M60 18 h10 a5 5 0 1 1 10 0 h8 v20 h-28z" fill="#f6b73c" opacity=".9"/>
<path d="M24 34 h13 a7 7 0 1 1 14 0 h13 v13 a7 7 0 1 1 0 14 v13 h-13 a7 7 0 1 0 -14 0 h-13 z" fill="#2aa198"/>
<circle cx="37" cy="52" r="3.2" fill="#fff"/><circle cx="53" cy="52" r="3.2" fill="#fff"/>
<circle cx="37.6" cy="52.6" r="1.6" fill="#3a2e2a"/><circle cx="53.6" cy="52.6" r="1.6" fill="#3a2e2a"/>
<circle cx="32" cy="60" r="3.6" fill="#f7a1a1" opacity=".8"/><circle cx="58" cy="60" r="3.6" fill="#f7a1a1" opacity=".8"/>
<path d="M40 60 q5 6 10 0" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M14 80 l3 -6 l3 6 l-6 -3 h6z" fill="#f6b73c"/></svg>`,
    c: '#1f8a84',
    cs: '#e0f3f1',
  },
  sdq: {
    svg: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#fce4ec"/>
<path d="M50 82 C20 62 16 36 33 30 C43 27 50 35 50 39 C50 35 57 27 67 30 C84 36 80 62 50 82Z" fill="#e2637f"/>
<path d="M30 38 q4 -6 10 -5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>
<path d="M39 49 q4 -4 8 0" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round"/>
<path d="M53 49 q4 -4 8 0" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round"/>
<circle cx="37" cy="58" r="4" fill="#ffb3c1"/><circle cx="63" cy="58" r="4" fill="#ffb3c1"/>
<path d="M43 58 q7 8 14 0" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round"/>
<path d="M80 16 l3 7 l7 1 l-5 5 l1.5 7 l-6.5 -3.5 l-6.5 3.5 l1.5 -7 l-5 -5 l7 -1z" fill="#f6b73c"/>
<circle cx="18" cy="26" r="3" fill="#f6b73c"/></svg>`,
    c: '#cc4f70',
    cs: '#fbe7ed',
  },
  snap: {
    svg: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#e6e8fb"/>
<circle cx="20" cy="24" r="2.5" fill="#f6b73c"/><circle cx="80" cy="78" r="2" fill="#f6b73c"/><circle cx="84" cy="22" r="3" fill="#fff"/>
<g transform="rotate(35 50 50)">
<path d="M44 70 Q50 92 56 70Z" fill="#f6b73c"/><path d="M46.5 70 Q50 83 53.5 70Z" fill="#ef6f6c"/>
<path d="M41 54 L30 70 L42 67Z" fill="#ef6f6c"/><path d="M59 54 L70 70 L58 67Z" fill="#ef6f6c"/>
<path d="M50 14 C64 28 64 58 59 70 H41 C36 58 36 28 50 14Z" fill="#fff" stroke="#5a63c9" stroke-width="3"/>
<circle cx="50" cy="40" r="10" fill="#a9b4f5" stroke="#5a63c9" stroke-width="3"/>
<circle cx="46.5" cy="39" r="1.8" fill="#3a2e2a"/><circle cx="53.5" cy="39" r="1.8" fill="#3a2e2a"/>
<path d="M46.5 43.5 q3.5 3 7 0" stroke="#3a2e2a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
</g></svg>`,
    c: '#5a63c9',
    cs: '#e9ebfb',
  },
  gad7: {
    svg: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#efe6fa"/>
<g fill="#fff"><circle cx="34" cy="56" r="15"/><circle cx="52" cy="45" r="19"/><circle cx="69" cy="56" r="14"/><rect x="20" y="56" width="63" height="15" rx="7.5"/></g>
<path d="M39 54 q4 4 8 0" stroke="#3a2e2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M56 54 q4 4 8 0" stroke="#3a2e2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<circle cx="37" cy="61" r="3.6" fill="#f7a1a1" opacity=".8"/><circle cx="66" cy="61" r="3.6" fill="#f7a1a1" opacity=".8"/>
<path d="M48 61 q3.5 3 7 0" stroke="#3a2e2a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<path d="M16 34 q6 -4 12 0" stroke="#8a5cc2" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
<path d="M74 28 q6 -4 12 0" stroke="#8a5cc2" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>
<path d="M50 84 c-4 -4 -9 -8 -4.5 -11 c2 -1.3 4 0 4.5 1.5 c0.5 -1.5 2.5 -2.8 4.5 -1.5 c4.5 3 -0.5 7 -4.5 11z" fill="#c9a6ef"/></svg>`,
    c: '#8a5cc2',
    cs: '#f1e9fa',
  },
  phqa: {
    svg: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" fill="#e3f0f6"/>
<circle cx="78" cy="24" r="9" fill="#f6c84c"/>
<g stroke="#f6c84c" stroke-width="2.4" stroke-linecap="round"><path d="M78 9 v3"/><path d="M93 24 h-3"/><path d="M88.6 13.4 l-2 2"/><path d="M88.6 34.6 l-2 -2"/></g>
<path d="M50 62 V36" stroke="#3f9a5b" stroke-width="3.5" stroke-linecap="round"/>
<path d="M50 46 C38 46 32 38 32 30 C42 30 50 36 50 46Z" fill="#6cc38a"/>
<path d="M50 40 C60 40 68 32 68 24 C58 24 50 30 50 40Z" fill="#4fb174"/>
<path d="M31 60 H69 L65 86 H35Z" fill="#e8915b"/><rect x="28" y="56" width="44" height="9" rx="3" fill="#d97a43"/>
<circle cx="43" cy="72" r="2.4" fill="#3a2e2a"/><circle cx="57" cy="72" r="2.4" fill="#3a2e2a"/>
<circle cx="39" cy="77" r="3" fill="#f7b0a0" opacity=".9"/><circle cx="61" cy="77" r="3" fill="#f7b0a0" opacity=".9"/>
<path d="M46 77 q4 4 8 0" stroke="#3a2e2a" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`,
    c: '#2c7aa0',
    cs: '#e3effa',
  },
};

// ฟังก์ชันดึงคะแนนตัวเลขจากข้อมูล ไม่ว่าจะเก็บใน item.score หรือแทรกอยู่ในข้อความ item.text
function extractScoreFromItem(item: any, maxScore: number): number | null {
  if (item && item.score !== undefined && item.score !== null && item.score !== '') {
    const num = Number(item.score);
    if (!isNaN(num)) return num;
  }
  if (item && item.text && typeof item.text === 'string') {
    const slashExact = item.text.match(new RegExp(`(\\d+)\\s*\\/\\s*${maxScore}`));
    if (slashExact) return parseInt(slashExact[1], 10);

    const slashGeneral = item.text.match(/(\d+)\s*\/\s*\d+/);
    if (slashGeneral) return parseInt(slashGeneral[1], 10);

    const scoreWord = item.text.match(/(\d+)\s*คะแนน/);
    if (scoreWord) return parseInt(scoreWord[1], 10);

    const totalWord = item.text.match(/คะแนน(?:รวม)?\s*[:=]?\s*(\d+)/);
    if (totalWord) return parseInt(totalWord[1], 10);
  }
  return null;
}

// ฟังก์ชันดึงระดับความเสี่ยง / Tag จากข้อมูล
function extractTagFromItem(item: any): string | null {
  if (item && item.tag && typeof item.tag === 'string' && item.tag.trim()) {
    return item.tag.trim();
  }
  if (item && item.text && typeof item.text === 'string') {
    if (item.text.includes('ความเสี่ยงสูง') || item.text.includes('เสี่ยงสูง')) return 'ความเสี่ยงสูง';
    if (item.text.includes('ความเสี่ยงปานกลาง') || item.text.includes('เสี่ยงปานกลาง')) return 'ความเสี่ยงปานกลาง';
    if (item.text.includes('ความเสี่ยงต่ำ') || item.text.includes('เสี่ยงต่ำ')) return 'ความเสี่ยงต่ำ';
    if (item.text.includes('เสี่ยงทำร้ายตนเอง') || item.sui) return '⚠️ เสี่ยงทำร้ายตนเอง';
    if (item.text.includes('HIGH ALERT') || item.text.includes('เสี่ยงต่อ PDDs')) return 'HIGH ALERT';
    if (item.text.includes('ไม่ถึงเกณฑ์')) return 'ไม่ถึงเกณฑ์';
    if (item.text.includes('มีปัญหา')) return 'มีปัญหา';
    if (item.text.includes('เสี่ยง') && !item.text.includes('เสี่ยงต่ำ')) return 'กลุ่มเสี่ยง';
    if (item.text.includes('ปกติ')) return 'ปกติ';
  }
  return null;
}

// ฟังก์ชันแปลงวันที่แบบ พ.ศ. ภาษาไทย
const formatThaiDate = (val?: string | null, includeTime = false) => {
  if (!val) return '-';
  const d = dayjs(val);
  if (!d.isValid()) return '-';
  const thaiYear = d.year() + 543;
  return includeTime
    ? `${d.format('D MMMM')} ${thaiYear} เวลา ${d.format('HH:mm น.')}`
    : `${d.format('D MMMM')} ${thaiYear}`;
};

export const ChildScreeningResultViewModal: React.FC<ChildScreeningResultViewModalProps> = ({
  open,
  onClose,
  record,
  initialToolId,
  initialViewMode = 'summary',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // มุมมองที่เลือก: 'summary' (สรุปผลทางการแพทย์) หรือ 'detailed' (คำตอบแบบละเอียด)
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>(initialViewMode);

  // รายชื่อเครื่องมือที่มีผลประเมินในบันทึกนี้
  const availableTools = React.useMemo(() => {
    if (!record?.screenings) return [];
    return Object.keys(record.screenings);
  }, [record]);

  // เครื่องมือที่เลือกแสดงผลอยู่ในปัจจุบัน
  const [selectedTool, setSelectedTool] = useState<string>('mchat');

  useEffect(() => {
    if (initialToolId && availableTools.includes(initialToolId)) {
      setSelectedTool(initialToolId);
    } else if (availableTools.length > 0 && !availableTools.includes(selectedTool)) {
      setSelectedTool(availableTools[0]);
    }
  }, [initialToolId, availableTools]);

  useEffect(() => {
    if (initialViewMode) {
      setViewMode(initialViewMode);
    }
  }, [initialViewMode, open]);

  const currentToolMeta = TOOL_META[selectedTool] || {
    short: selectedTool.toUpperCase(),
    name: 'แบบคัดกรอง',
    fullName: `แบบประเมิน ${selectedTool.toUpperCase()}`,
    subTitle: 'รายงานผลการประเมินคัดกรอง',
    maxScore: 20,
    color: '#2c7aa0',
    colorSoft: '#e3effa',
    citation: 'โรงพยาบาลรามคำแหง 2 • FormLocal',
  };

  const currentMascot = MASCOTS[selectedTool] || {
    svg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#e3effa"/><text x="50" y="58" font-size="28" text-anchor="middle">📋</text></svg>',
    c: '#2c7aa0',
    cs: '#e3effa',
  };

  // สร้าง HTML ฉบับสมบูรณ์สำหรับแสดงผลใน Iframe ให้ตรงกับหน้าจอของจริง
  const reportHtml = React.useMemo(() => {
    if (!record) return '';
    const item: any = record.screenings?.[selectedTool] || {};

    const extractedScore = extractScoreFromItem(item, currentToolMeta.maxScore);
    const scoreVal = extractedScore !== null ? extractedScore : (item.score ?? '-');
    const s = extractedScore !== null ? extractedScore : 0;

    const extractedTag = extractTagFromItem(item);

    // คำนวณหมวดหมู่ / ระดับความเสี่ยง
    let catClass = 'low';
    let verdictTag = extractedTag || item.tag || 'ปกติ';
    let verdictTitle = item.title || item.text || 'ผลการคัดกรอง';
    let verdictText = '';
    let scaleHtml = '';

    if (selectedTool === 'mchat') {
      if (s <= 2 && (!extractedTag || extractedTag === 'ความเสี่ยงต่ำ' || extractedTag === 'ปกติ')) {
        catClass = 'low';
        verdictTag = 'ความเสี่ยงต่ำ';
        verdictTitle = 'คะแนน 0–2 : มีโอกาสเป็นออทิสติกต่ำ';
        verdictText =
          'ผลการคัดกรองเป็นลบ ไม่จำเป็นต้องติดตามผลเพิ่มเติม เว้นแต่การเฝ้าระวังพัฒนาการระบุความเสี่ยง';
      } else if (
        s >= 8 ||
        extractedTag === 'ความเสี่ยงสูง' ||
        (extractedTag && extractedTag.includes('เสี่ยงสูง'))
      ) {
        catClass = 'high';
        verdictTag = 'ความเสี่ยงสูง';
        verdictTitle = 'คะแนน 8–20 : มีความเป็นไปได้สูงที่จะเป็นออทิสติก';
        verdictText =
          'ผลการคัดกรองเป็นบวก แนะนำให้ส่งต่อทันทีเพื่อการช่วยเหลือระยะแรกเริ่มและการประเมินวินิจฉัย';
      } else {
        catClass = 'mid';
        verdictTag = 'ความเสี่ยงปานกลาง';
        verdictTitle = 'คะแนน 3–7 : มีความเป็นไปได้ปานกลางที่จะเป็นออทิสติก';
        verdictText =
          'ให้แพทย์ทำแบบประเมิน M-CHAT-R Follow-Up สัมภาษณ์เฉพาะข้อที่พบความเสี่ยง';
      }
      scaleHtml = `
        <div class="scale" style="grid-template-columns: 1fr 1fr 1fr;">
          <div class="s1 ${s <= 2 ? 'on' : ''}">0–2 ต่ำ</div>
          <div class="s2 ${s >= 3 && s <= 7 ? 'on' : ''}">3–7 ปานกลาง</div>
          <div class="s3 ${s >= 8 ? 'on' : ''}">8–20 สูง</div>
        </div>
      `;
    } else if (selectedTool === 'pddsq') {
      const isAlert = item.alert || extractedTag?.includes('HIGH ALERT') || s >= 13;
      catClass = isAlert ? 'high' : 'low';
      verdictTag = isAlert ? 'HIGH ALERT (เสี่ยงต่อ PDDs)' : (extractedTag || 'ไม่ถึงเกณฑ์ความเสี่ยง');
      verdictTitle = `คะแนน ${s}/40 – ${verdictTag}`;
      verdictText = isAlert
        ? 'คะแนนบ่งชี้ความเสี่ยงต่อกลุ่มอาการออทิสติก ควรส่งต่อจิตแพทย์เด็กหรือกุมารแพทย์พัฒนาการเพื่อตรวจประเมินอย่างละเอียด'
        : 'คะแนนยังไม่ถึงเกณฑ์ความเสี่ยง ควรส่งเสริมพัฒนาการตามวัยและติดตามเฝ้าระวังตามเกณฑ์ปกติ';
      scaleHtml = `
        <div class="scale" style="grid-template-columns: 1fr 1fr;">
          <div class="s1 ${!isAlert ? 'on' : ''}">0–12 ไม่ถึงเกณฑ์</div>
          <div class="s3 ${isAlert ? 'on' : ''}">13–40 HIGH ALERT</div>
        </div>
      `;
    } else if (selectedTool === 'sdq') {
      if (s >= 19 || extractedTag?.includes('มีปัญหา')) {
        catClass = 'high';
        verdictTag = 'มีปัญหา';
      } else if (s >= 16 || extractedTag?.includes('เสี่ยง')) {
        catClass = 'mid';
        verdictTag = 'กลุ่มเสี่ยง';
      } else {
        catClass = 'low';
        verdictTag = 'ปกติ';
      }
      verdictTitle = `คะแนนรวม ${s}/40 – ${verdictTag}`;
      verdictText =
        catClass === 'high'
          ? 'คะแนนรวมอยู่ในกลุ่มมีปัญหา ควรส่งต่อเพื่อประเมินโดยละเอียดจากกุมารแพทย์พัฒนาการและพฤติกรรม หรือจิตแพทย์เด็กและวัยรุ่น'
          : catClass === 'mid'
          ? 'คะแนนรวมอยู่ในกลุ่มเสี่ยง ควรให้คำปรึกษาแก่ผู้ปกครองในการปรับพฤติกรรม และติดตามประเมินซ้ำใน 3–6 เดือน'
          : 'คะแนนรวมอยู่ในเกณฑ์ปกติ มีจุดเด่นและพัฒนาการด้านพฤติกรรมอารมณ์ที่เหมาะสมตามวัย';
      scaleHtml = `
        <div class="scale" style="grid-template-columns: 1fr 1fr 1fr;">
          <div class="s1 ${s <= 15 ? 'on' : ''}">0–15 ปกติ</div>
          <div class="s2 ${s >= 16 && s <= 18 ? 'on' : ''}">16–18 เสี่ยง</div>
          <div class="s3 ${s >= 19 ? 'on' : ''}">19–40 มีปัญหา</div>
        </div>
      `;
    } else if (selectedTool === 'snap') {
      const isHigh = item.alert || extractedTag?.includes('ผ่านเกณฑ์') || s >= 20;
      catClass = isHigh ? 'high' : 'low';
      verdictTag = isHigh ? 'ผ่านเกณฑ์คัดกรอง ADHD' : (extractedTag || 'ไม่ผ่านเกณฑ์คัดกรอง');
      verdictTitle = item.text || `คะแนนรวม ${s}/54 – ${verdictTag}`;
      verdictText = isHigh
        ? 'พบอาการเข้าข่ายกลุ่มอาการสมาธิสั้น/พฤติกรรมดื้อต่อต้าน ควรปรึกษากุมารแพทย์พัฒนาการหรือจิตแพทย์เด็กเพื่อตรวจวินิจฉัยทางการแพทย์'
        : 'ระดับอาการยังไม่เข้าเกณฑ์คัดกรองความผิดปกติ แนะนำให้ส่งเสริมสมาธิและระเบียบวินัยเชิงบวกอย่างต่อเนื่อง';
      scaleHtml = `
        <div class="scale" style="grid-template-columns: 1fr 1fr;">
          <div class="s1 ${!isHigh ? 'on' : ''}">ไม่ผ่านเกณฑ์ปกติ</div>
          <div class="s3 ${isHigh ? 'on' : ''}">ผ่านเกณฑ์คัดกรอง ADHD</div>
        </div>
      `;
    } else if (selectedTool === 'gad7') {
      if (s >= 15 || extractedTag?.includes('รุนแรง')) {
        catClass = 'high';
        verdictTag = extractedTag || 'วิตกกังวลระดับรุนแรง';
        verdictTitle = `คะแนน ${s}/21 – ความวิตกกังวลระดับรุนแรง (Severe)`;
        verdictText = 'ควรได้รับการประเมินและการดูแลช่วยเหลือทางจิตวิทยาหรือจิตเวชอย่างใกล้ชิดทันที';
      } else if (s >= 10 || extractedTag?.includes('ปานกลาง')) {
        catClass = 'high';
        verdictTag = extractedTag || 'วิตกกังวลระดับปานกลาง';
        verdictTitle = `คะแนน ${s}/21 – ความวิตกกังวลระดับปานกลาง (Moderate)`;
        verdictText = 'มีความวิตกกังวลชัดเจน ควรให้คำปรึกษาและพิจารณาส่งต่อแพทย์ผู้เชี่ยวชาญ';
      } else if (s >= 5 || extractedTag?.includes('เล็กน้อย')) {
        catClass = 'mid';
        verdictTag = extractedTag || 'วิตกกังวลระดับเล็กน้อย';
        verdictTitle = `คะแนน ${s}/21 – ความวิตกกังวลระดับเล็กน้อย (Mild)`;
        verdictText = 'แนะนำการจัดการความเครียดเบื้องต้น และเฝ้าระวังอาการต่อเนื่อง';
      } else {
        catClass = 'low';
        verdictTag = extractedTag || 'ปกติ / เล็กน้อยมาก';
        verdictTitle = `คะแนน ${s}/21 – ไม่มีอาการวิตกกังวล (Minimal)`;
        verdictText = 'อาการอยู่ในเกณฑ์ปกติ ไม่พบความเสี่ยงด้านโรควิตกกังวล';
      }
      scaleHtml = `
        <div class="scale" style="grid-template-columns: 1fr 1fr 1fr 1fr;">
          <div class="s1 ${s <= 4 ? 'on' : ''}">0–4 ปกติ</div>
          <div class="s2 ${s >= 5 && s <= 9 ? 'on' : ''}">5–9 เล็กน้อย</div>
          <div class="s3 ${s >= 10 && s <= 14 ? 'on' : ''}">10–14 ปานกลาง</div>
          <div class="s3 ${s >= 15 ? 'on' : ''}">15–21 รุนแรง</div>
        </div>
      `;
    } else if (selectedTool === 'phqa') {
      if (item.sui || extractedTag?.includes('ทำร้ายตนเอง')) {
        catClass = 'purple';
        verdictTag = '⚠️ เสี่ยงทำร้ายตนเอง';
      } else if (s >= 15 || extractedTag?.includes('รุนแรง')) {
        catClass = 'high';
        verdictTag = s >= 20 ? 'ซึมเศร้ารุนแรง' : (extractedTag || 'ซึมเศร้าค่อนข้างรุนแรง');
      } else if (s >= 10 || extractedTag?.includes('ปานกลาง')) {
        catClass = 'high';
        verdictTag = extractedTag || 'ซึมเศร้าปานกลาง';
      } else if (s >= 5 || extractedTag?.includes('เล็กน้อย')) {
        catClass = 'mid';
        verdictTag = extractedTag || 'ซึมเศร้าเล็กน้อย';
      } else {
        catClass = 'low';
        verdictTag = extractedTag || 'ไม่มีภาวะซึมเศร้า';
      }
      verdictTitle = item.title || `${verdictTag} (คะแนนรวม ${s}/27)`;
      verdictText = item.sui || extractedTag?.includes('ทำร้ายตนเอง')
        ? '🚨 ผู้รับการประเมินระบุข้อความที่เสี่ยงต่อการทำร้ายตนเอง ต้องได้รับการประเมินความปลอดภัยและช่วยเหลือเร่งด่วน!'
        : s >= 10
        ? 'คะแนนบ่งชี้ภาวะซึมเศร้าที่รบกวนการดำเนินชีวิต ควรได้รับการตรวจวินิจฉัยและดูแลรักษาโดยจิตแพทย์เด็กและวัยรุ่น'
        : 'อาการอยู่ในเกณฑ์ที่ควรส่งเสริมกำลังใจและเฝ้าระวังความเครียดอย่างเหมาะสม';
      scaleHtml = `
        <div class="scale" style="grid-template-columns: 1fr 1fr 1fr 1fr 1fr;">
          <div class="s1 ${s <= 4 ? 'on' : ''}">0–4</div>
          <div class="s2 ${s >= 5 && s <= 9 ? 'on' : ''}">5–9</div>
          <div class="s3 ${s >= 10 && s <= 14 ? 'on' : ''}">10–14</div>
          <div class="s3 ${s >= 15 && s <= 19 ? 'on' : ''}">15–19</div>
          <div class="s3 ${s >= 20 ? 'on' : ''}">20–27</div>
        </div>
      `;
    }

    const patientName = record.patientName || 'ไม่ระบุชื่อ';
    const hnStr = record.hn ? `HN: ${record.hn}` : 'ไม่มี HN';
    const ageStr =
      record.ageYears !== null && record.ageYears !== undefined
        ? `อายุ: ${record.ageYears} ปี ${record.ageMonths || 0} เดือน`
        : record.totalAgeMonths
        ? `อายุ: ${record.totalAgeMonths} เดือน`
        : '';
    const dateStr = `วันที่: ${formatThaiDate(record.assessmentDate, false)}`;

    const infoBits = [
      `ชื่อ: <b>${patientName}</b>`,
      hnStr,
      ageStr,
      dateStr,
    ].filter(Boolean);

    // รายการข้อที่เสี่ยง (Flagged Items)
    const flaggedList: any[] =
      item.flaggedAnswers ||
      (Array.isArray(item.answers)
        ? item.answers.filter((a: any) => !a.isGroup && a.isFlag)
        : []);

    // คำตอบทั้งหมด (All Answers จากบันทึกในฐานข้อมูล)
    const allAnswers: any[] = Array.isArray(item.answers) ? item.answers : [];

    // ดึงชุดข้อคำถามมาตรฐานจาก Catalog สำหรับเครื่องมือนี้
    const catalog = TOOL_QUESTIONS_CATALOG[selectedTool];

    // สร้างตารางคำตอบอย่างละเอียด (Detailed Q&A Table HTML)
    let detailedRowsHtml = '';
    let totalQuestionsCount = 0;
    let totalFlaggedCount = 0;
    let isReconstructed = false;

    if (allAnswers.length > 0) {
      // กรณี 1: มีข้อมูลบันทึกคำตอบรายข้อจริงจากฐานข้อมูล
      totalQuestionsCount = allAnswers.filter((a: any) => !a.isGroup).length;
      totalFlaggedCount = allAnswers.filter((a: any) => !a.isGroup && a.isFlag).length;

      detailedRowsHtml = allAnswers
        .map((a: any, idx: number) => {
          if (a.isGroup) {
            return `<tr class="grp"><td colspan="6">${a.groupTitle || '-'}</td></tr>`;
          }
          const isFlag = Boolean(a.isFlag);
          const ansBadge = isFlag
            ? `<span class="badge-ans flag">${a.answer || '-'}</span>`
            : `<span class="badge-ans normal">${a.answer || '-'}</span>`;
          const statusBadge = isFlag
            ? `<span style="background:#fee2e2;color:#be123c;padding:3px 8px;border-radius:99px;font-size:11.5px;font-weight:700;white-space:nowrap;">⚠️ พบความเสี่ยง</span>`
            : `<span style="background:#f0fdf4;color:#15803d;padding:3px 8px;border-radius:99px;font-size:11.5px;font-weight:600;white-space:nowrap;">✓ ปกติ</span>`;
          return `
            <tr class="${isFlag ? 'flag-row' : ''}">
              <td style="text-align:center;font-weight:700;color:${isFlag ? '#be123c' : '#475569'};">${a.no || idx + 1}</td>
              <td><span class="badge-domain">${a.domain || currentToolMeta.short}</span></td>
              <td style="color:#1e293b;line-height:1.5;">${a.question || '-'}</td>
              <td style="text-align:center;">${ansBadge}</td>
              <td style="text-align:center;font-weight:${isFlag ? '700' : '400'};color:${isFlag ? '#be123c' : '#64748b'};">${a.score !== undefined && a.score !== '' ? a.score : '-'}</td>
              <td style="text-align:center;">${statusBadge}</td>
            </tr>
          `;
        })
        .join('');
    } else if (catalog && catalog.questions && catalog.questions.length > 0) {
      // กรณี 2: บันทึกเดิมที่ไม่ได้เก็บคำตอบรายข้อ นำชุดคำถามทางการจาก Catalog มาแสดง พร้อมจำแนกและไฮไลต์กลุ่มอาการที่พบความเสี่ยงจาก item.text
      isReconstructed = true;
      totalQuestionsCount = catalog.questions.length;
      const textToSearch = (item.text || '').toLowerCase();

      // ตรวจหาคำสำคัญของแต่ละด้านจากข้อความสรุปเดิม
      const hasConduct = textToSearch.includes('เกเร') || textToSearch.includes('conduct');
      const hasPeer = textToSearch.includes('เพื่อน') || textToSearch.includes('peer');
      const hasEmo = textToSearch.includes('อารมณ์') || textToSearch.includes('emotional');
      const hasHyper = textToSearch.includes('สมาธิสั้น') || textToSearch.includes('อยู่ไม่นิ่ง') || textToSearch.includes('hyper');
      const hasAutismRisk = textToSearch.includes('เสี่ยง') || textToSearch.includes('high alert');

      detailedRowsHtml = catalog.questions
        .map((q, idx) => {
          let isFlag = false;
          let riskLabel = '';

          if (selectedTool === 'sdq') {
            if (q.domainKey === 'conduct' && hasConduct) {
              isFlag = true;
              riskLabel = '⚠️ ในกลุ่มปัญหาเกเร';
            } else if (q.domainKey === 'peer' && hasPeer) {
              isFlag = true;
              riskLabel = '⚠️ ในกลุ่มเสี่ยงเพื่อน';
            } else if (q.domainKey === 'emo' && hasEmo) {
              isFlag = true;
              riskLabel = '⚠️ ในกลุ่มเสี่ยงอารมณ์';
            } else if (q.domainKey === 'hyper' && hasHyper) {
              isFlag = true;
              riskLabel = '⚠️ ในกลุ่มเสี่ยงสมาธิสั้น';
            }
          } else if (selectedTool === 'mchat' || selectedTool === 'pddsq') {
            if (hasAutismRisk && (q.reverse || idx < 3)) {
              isFlag = true;
              riskLabel = '⚠️ ข้อบ่งชี้หลัก';
            }
          }

          if (isFlag) totalFlaggedCount++;

          const domainText = q.domain || catalog.short;
          const statusBadge = isFlag
            ? `<span style="background:#fee2e2;color:#be123c;padding:3px 8px;border-radius:99px;font-size:11.5px;font-weight:700;white-space:nowrap;">${riskLabel || '⚠️ ในกลุ่มเสี่ยง'}</span>`
            : `<span style="background:#f1f5f9;color:#64748b;padding:3px 8px;border-radius:99px;font-size:11.5px;font-weight:500;white-space:nowrap;">ประเมินตามเกณฑ์</span>`;

          return `
            <tr class="${isFlag ? 'flag-row' : ''}">
              <td style="text-align:center;font-weight:700;color:${isFlag ? '#be123c' : '#475569'};">${q.no}</td>
              <td><span class="badge-domain">${domainText}</span></td>
              <td style="color:#1e293b;line-height:1.5;">
                ${q.text}
                ${q.example ? `<div style="font-size:12px;color:#64748b;margin-top:2px;">* ${q.example}</div>` : ''}
              </td>
              <td style="text-align:center;">
                <span class="badge-ans ${isFlag ? 'flag' : 'neutral'}">${isFlag ? 'พบลักษณะเสี่ยง' : 'เกณฑ์ปกติ'}</span>
              </td>
              <td style="text-align:center;color:#64748b;">${q.reverse ? 'กลับคะแนน' : '1'}</td>
              <td style="text-align:center;">${statusBadge}</td>
            </tr>
          `;
        })
        .join('');
    }

    // ส่วนข้อคำถามเพิ่มเติม / ผลกระทบ (Supplement Questions)
    let supplementHtml = '';
    if (catalog?.supplementQuestions && catalog.supplementQuestions.length > 0) {
      supplementHtml = `
        <div class="card" style="margin-top:16px;">
          <h3 style="font-size:1.1rem;margin-bottom:8px;">📌 ข้อคำถามประเมินผลกระทบต่อชีวิตประจำวัน / อาการร่วม</h3>
          <table class="qa-table">
            <thead>
              <tr>
                <th style="width:3em;text-align:center;">ข้อ</th>
                <th>ข้อคำถาม</th>
                <th style="width:14em;text-align:center;">ลักษณะการประเมิน</th>
              </tr>
            </thead>
            <tbody>
              ${catalog.supplementQuestions
                .map(
                  (sq) => `
                <tr>
                  <td style="text-align:center;font-weight:700;color:#64748b;">${sq.no}</td>
                  <td style="color:#1e293b;">${sq.text}</td>
                  <td style="text-align:center;color:#64748b;font-size:13px;">${sq.domain || 'ผลกระทบภาพรวม'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${currentToolMeta.fullName} — ${patientName} (${viewMode === 'summary' ? 'ใบสรุปผล' : 'คำตอบแบบละเอียด'})</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&family=Mitr:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root{
    --bg:#f6f7f9; --card:#ffffff; --ink:#1f2933; --muted:#616e7c; --line:#e4e7eb;
    --accent:${currentToolMeta.color}; --accent-soft:${currentToolMeta.colorSoft};
    --low:#2e7d4f; --low-bg:#e7f5ec;
    --mid:#b7791f; --mid-bg:#fdf4e1;
    --high:#c0392b; --high-bg:#fbe9e7;
    --purple:#7b1fa2; --purple-bg:#f3e5f5;
  }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:"Sarabun",system-ui,-apple-system,sans-serif;font-size:16px;line-height:1.6}
  .wrap{max-width:820px;margin:0 auto;padding:20px 16px 80px}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-top:16px;box-shadow:0 2px 6px rgba(0,0,0,0.02)}
  h1,h2,h3{font-family:"Mitr",sans-serif;margin:0 0 6px;color:#1e293b}
  .muted{color:var(--muted)}
  .hint{font-size:.9rem;color:var(--muted);line-height:1.5}
  
  /* Header Card */
  .tool-header{display:flex;align-items:center;gap:16px;padding:16px 20px}
  .tool-avatar{width:56px;height:56px;border-radius:14px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .tool-avatar svg{width:46px;height:46px;display:block}
  .tool-header h1{font-size:1.32rem;font-weight:600;margin:0 0 4px}
  .tool-header p{margin:0;color:var(--muted);font-size:0.92rem}
  
  /* Verdict Card */
  .verdict{border-radius:14px;padding:18px;border:2px solid;margin-top:10px}
  .verdict.low{background:var(--low-bg);border-color:var(--low)}
  .verdict.mid{background:var(--mid-bg);border-color:var(--mid)}
  .verdict.high{background:var(--high-bg);border-color:var(--high)}
  .verdict.purple{background:var(--purple-bg);border-color:var(--purple)}
  
  .verdict .tag{display:inline-block;color:#fff;font-weight:700;padding:3px 12px;border-radius:99px;font-size:.92rem;font-family:"Mitr",sans-serif}
  .low .tag{background:var(--low)}
  .mid .tag{background:var(--mid)}
  .high .tag{background:var(--high)}
  .purple .tag{background:var(--purple)}
  
  .score{font-size:2.6rem;font-weight:700;line-height:1;margin:10px 0 2px;font-family:"Mitr",sans-serif;color:#0f172a}
  .score small{font-size:1rem;color:var(--muted);font-weight:500;font-family:"Sarabun",sans-serif}
  
  .scale{display:grid;gap:4px;margin-top:14px;font-size:.82rem;text-align:center;font-weight:500}
  .scale div{padding:6px 2px;border-radius:6px;color:#fff;opacity:.38;transition:opacity .2s}
  .scale .on{opacity:1;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,0.15)}
  .s1{background:var(--low)} .s2{background:var(--mid)} .s3{background:var(--high)}
  
  /* Tables */
  table{width:100%;border-collapse:collapse;font-size:.95rem;margin-top:8px}
  th,td{text-align:left;padding:8px 8px;border-bottom:1px solid var(--line);vertical-align:top}
  th{color:var(--muted);font-weight:600;font-size:.9rem}
  .flag{color:var(--high);font-weight:700}
  .flagp{color:var(--purple);font-weight:700}
  tr.grp td{background:#f8fafc;font-weight:700;color:#0f172a;padding:10px 8px;border-top:1.5px solid #cbd5e1}

  /* QA Table Styles */
  .qa-table { width:100%; border-collapse:collapse; font-size:.92rem; margin-top:8px }
  .qa-table th, .qa-table td { padding:9px 10px; border-bottom:1px solid #e2e8f0; vertical-align:middle }
  .qa-table th { background:#f1f5f9; color:#475569; font-weight:700; font-size:.86rem; border-top:1px solid #cbd5e1 }
  .qa-table tr:hover td { background:#f8fafc }
  .qa-table tr.flag-row td { background:#fff1f2 }
  .qa-table tr.grp td { background:#f1f5f9; font-weight:700; color:#0f172a; padding:10px 10px; border-top:1.5px solid #cbd5e1 }
  .badge-ans { display:inline-block; padding:3px 9px; border-radius:6px; font-weight:600; font-size:12px; }
  .badge-ans.flag { background:#fee2e2; color:#be123c; border:1px solid #fecdd3 }
  .badge-ans.normal { background:#f0fdf4; color:#15803d; border:1px solid #bbf7d0 }
  .badge-ans.neutral { background:#f8fafc; color:#334155; border:1px solid #e2e8f0 }
  .badge-domain { display:inline-block; padding:2px 8px; border-radius:99px; font-size:11.5px; font-weight:600; background:#e0f2fe; color:#0369a1 }

  /* Signature */
  .sign-box{margin-top:20px;padding:20px;border:1.5px dashed #cbd5e1;border-radius:12px;background:#ffffff;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:20px}
  
  footer{margin-top:24px;font-size:.82rem;color:var(--muted);text-align:center;line-height:1.6}
  
  @media print{
    body{background:#fff;font-size:13px}
    .noprint{display:none!important}
    .card{border:1px solid #ccc;box-shadow:none;break-inside:avoid;margin-top:12px;padding:14px}
    .scale div{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .verdict,.tag{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .wrap{padding:0;max-width:100%}
  }
  @media (max-width: 600px){
    .wrap{padding:12px 10px 60px}
    .tool-header{flex-direction:row;padding:12px}
    .tool-avatar{width:46px;height:46px}
    .tool-header h1{font-size:1.15rem}
    .score{font-size:2.2rem}
    th,td{padding:6px 4px;font-size:.88rem}
  }
</style>
</head>
<body>
<div class="wrap">
  <!-- ส่วนหัวโรงพยาบาลสำหรับรายงานทางการ -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1.5px solid #e2e8f0;">
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="/Ram2Logo.png" alt="โรงพยาบาลรามคำแหง 2" style="height:36px;object-fit:contain;" />
      <div style="border-left:1.5px solid #cbd5e1;padding-left:10px;">
        <div style="font-weight:700;font-size:0.98rem;color:#0047cc;line-height:1.2;">โรงพยาบาลรามคำแหง 2</div>
        <div style="font-size:0.8rem;color:#64748b;">
          คลินิกกุมารเวชกรรมและพัฒนาการเด็ก • ${viewMode === 'summary' ? 'Pediatric Screening Report' : 'Detailed Q&A Answer Sheet'}
        </div>
      </div>
    </div>
    <div style="text-align:right;">
      <span style="font-size:0.75rem;background:#e0f2fe;color:#0369a1;padding:3px 8px;border-radius:6px;font-weight:600;">
        ${viewMode === 'summary' ? 'เอกสารทางการแพทย์' : 'กระดาษคำตอบทางคลินิก'}
      </span>
    </div>
  </div>

  <!-- ส่วนหัวชื่อแบบประเมินและ Mascot -->
  <div class="card tool-header">
    <div class="tool-avatar">
      ${currentMascot.svg}
    </div>
    <div>
      <h1>${currentToolMeta.fullName}</h1>
      <p>${currentToolMeta.subTitle}</p>
    </div>
  </div>

  <!-- ข้อมูลผู้ป่วย -->
  <div class="card" style="padding:12px 18px;margin-top:12px;">
    <div class="muted" style="font-size:0.95rem;line-height:1.7;">
      ${infoBits.join(' &nbsp;•&nbsp; ')}
    </div>
  </div>

  ${
    viewMode === 'summary'
      ? `
  <!-- ========== 1. มุมมองแบบสรุปผลการคัดกรอง (Summary Report) ========== -->
  <div class="card">
    <h2 style="font-size:1.25rem;">สรุปผลการคัดกรอง</h2>

    <div class="verdict ${catClass}">
      <span class="tag">${verdictTag}</span>
      <div class="score">
        ${scoreVal} <small>/ ${currentToolMeta.maxScore} คะแนน</small>
      </div>
      <div style="font-weight:700;font-size:1.12rem;margin-top:6px;line-height:1.4;">
        ${verdictTitle}
      </div>
      <div style="margin-top:6px;line-height:1.6;font-size:0.98rem;color:#1f2933;">
        ${verdictText}
      </div>
      ${scaleHtml}
    </div>

    <p class="hint" style="margin-top:14px;margin-bottom:0;">
      ผลนี้เป็นเพียงการ<b>คัดกรอง</b> ไม่ใช่การวินิจฉัย กรุณานำผลนี้ไปปรึกษาแพทย์ทุกครั้ง
    </p>
  </div>

  <!-- การ์ดข้อที่ตอบแล้วพบความเสี่ยง (ถ้ามี) -->
  ${
    flaggedList.length > 0
      ? `
    <div class="card">
      <h2 style="font-size:1.18rem;">
        ข้อที่ตอบแล้วมีความเสี่ยง <span class="muted" style="font-size:0.92rem;font-weight:400;">(${flaggedList.length} ข้อ)</span>
      </h2>
      <p class="hint" style="margin-top:0;">สำหรับแพทย์ใช้ทำ Follow-Up หรือประเมินเฉพาะข้อเหล่านี้</p>
      <table>
        <thead>
          <tr>
            <th style="width:2.6em;">ข้อ</th>
            <th>คำถาม</th>
            <th style="width:5.5em;">คำตอบ</th>
          </tr>
        </thead>
        <tbody>
          ${flaggedList
            .map(
              (f: any) => `
            <tr>
              <td><b>${f.no || '-'}</b></td>
              <td>${f.question || '-'}</td>
              <td class="${f.isFlag ? 'flag' : ''}">${f.answer || '-'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    `
      : ''
  }
  `
      : `
  <!-- ========== 2. มุมมองแบบละเอียด: ข้อคำถามและคำตอบทั้งหมด (Detailed Q&A Sheet) ========== -->
  <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:14px 18px;background:${currentToolMeta.colorSoft};border:1.5px solid ${currentToolMeta.color}40;">
    <div>
      <div style="font-weight:700;font-size:1.1rem;color:#0f172a;">${verdictTitle}</div>
      <div style="font-size:0.9rem;color:#475569;margin-top:2px;">${verdictText}</div>
    </div>
    <div style="text-align:right;">
      <span class="tag" style="background:${currentToolMeta.color};color:#fff;font-size:0.88rem;padding:4px 12px;border-radius:99px;font-weight:700;">${verdictTag}</span>
      <div style="font-size:1.35rem;font-weight:700;color:#0f172a;margin-top:2px;">${scoreVal} <small style="font-size:0.82rem;color:#64748b;">/ ${currentToolMeta.maxScore} คะแนน</small></div>
    </div>
  </div>

  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
      <div>
        <h2 style="font-size:1.22rem;margin:0 0 2px;">📋 รายการข้อคำถามและคำตอบทีละข้อ</h2>
        <p class="hint" style="margin:0;">รายละเอียดการตอบคำถามของผู้รับการตรวจ/ผู้ปกครอง สำหรับแพทย์และบุคลากรทางการแพทย์</p>
      </div>
      <div style="font-size:0.84rem;color:#475569;background:#f1f5f9;padding:4px 12px;border-radius:8px;font-weight:600;">
        จำนวนข้อคำถาม: <b>${totalQuestionsCount} ข้อ</b> ${
          totalFlaggedCount > 0
            ? `• <span style="color:#be123c;font-weight:700;">พบความเสี่ยง ${totalFlaggedCount} ข้อ</span>`
            : `• <span style="color:#15803d;font-weight:600;">ตอบครบถ้วน</span>`
        }
      </div>
    </div>

    ${
      isReconstructed
        ? `
      <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:8px 12px;font-size:12.5px;color:#92400e;margin-bottom:12px;line-height:1.5;">
        ℹ️ <b>บันทึกประวัติก่อนหน้า:</b> แสดงชุดข้อคำถามมาตรฐานของแบบประเมิน <b>${currentToolMeta.name}</b> โดยระบบได้จำแนกและไฮไลต์ข้อคำถามตามกลุ่มอาการที่ตรวจพบความเสี่ยงจากผลสรุป (สำหรับแบบประเมินที่ทำใหม่ในปัจจุบัน ระบบจะบันทึกคำตอบรายข้อที่เลือกจริงครบถ้วนทุกข้อ)
      </div>
      `
        : ''
    }

    <div style="overflow-x:auto;">
      <table class="qa-table">
        <thead>
          <tr>
            <th style="width:3em;text-align:center;">ข้อ</th>
            <th style="width:13em;">หมวด / ด้าน</th>
            <th>ข้อคำถาม</th>
            <th style="width:9.5em;text-align:center;">คำตอบที่เลือก</th>
            <th style="width:4.5em;text-align:center;">คะแนน</th>
            <th style="width:7.5em;text-align:center;">สถานะ</th>
          </tr>
        </thead>
        <tbody>
          ${detailedRowsHtml}
        </tbody>
      </table>
    </div>
  </div>

  ${supplementHtml}
  `
  }

  <!-- ช่องลงชื่อแพทย์สำหรับพิมพ์รายงานเวชระเบียน -->
  <div class="card sign-box">
    <div style="display:flex;align-items:center;gap:12px;">
      <img src="/Ram2Logo.png" alt="RAM2" style="height:30px;object-fit:contain;opacity:0.9;" />
      <div style="border-left:1px solid #cbd5e1;padding-left:10px;">
        <div style="font-weight:600;color:#334155;font-size:0.92rem;">
          ผู้บันทึกข้อมูล: ${record.examinerName || '-'}
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
          วันที่ประเมิน: ${formatThaiDate(record.assessmentDate, true)}
        </div>
      </div>
    </div>
    <div style="text-align:right;">
      <div style="margin-bottom:8px;font-size:0.95rem;">
        ลงชื่อแพทย์ ................................................................
      </div>
      <div style="color:#64748b;font-size:13px;">
        (................................................................) ว. ...............
      </div>
    </div>
  </div>

  <footer>
    ${currentToolMeta.citation}
    <div style="margin-top:4px;color:#94a3b8;font-size:11px;">
      ระบบบันทึกและประมวลผลข้อมูลการคัดกรองเด็กและวัยรุ่น • โรงพยาบาลรามคำแหง 2 • FormLocal
    </div>
  </footer>
</div>
</body>
</html>`;
  }, [record, selectedTool, currentToolMeta, currentMascot, viewMode]);

  // สั่งพิมพ์รายงานจาก iframe
  const handlePrint = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        window.print();
      }
    } catch (_) {
      window.print();
    }
  };

  if (!record) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="100%"
      style={{
        top: 0,
        paddingBottom: 0,
        maxWidth: '100vw',
        margin: 0,
      }}
      styles={{
        content: {
          padding: 0,
          borderRadius: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#f6f7f9',
          overflow: 'hidden',
        },
        body: {
          padding: 0,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
      closeIcon={null}
    >
      {/* แถบ Topbar ด้านบนสุด */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e4e7eb',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          minHeight: 56,
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        {/* ด้านซ้าย: ปุ่มย้อนกลับ + สลับมุมมอง (สรุป vs ละเอียด) + Mascot + ชื่อแบบคัดกรอง */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: '1 1 auto', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            title="กลับไปยังตารางประวัติการคัดกรอง"
            style={{
              background: '#e3effa',
              border: '1px solid #c2def3',
              color: '#2c7aa0',
              fontWeight: 600,
              padding: '7px 16px',
              borderRadius: 99,
              cursor: 'pointer',
              fontFamily: '"Mitr", sans-serif',
              fontSize: '0.94rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#d0e5f7')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#e3effa')}
          >
            ← กลับประวัติ
          </button>

          {/* ปุ่มสลับมุมมอง: 📄 สรุปผลคัดกรอง vs 📋 คำตอบแบบละเอียด */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: 3,
              borderRadius: 10,
              gap: 4,
              border: '1px solid #e2e8f0',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('summary')}
              title="แสดงหน้ารายงานสรุปผลการคัดกรองทางการแพทย์"
              style={{
                border: 0,
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: '12.5px',
                fontFamily: '"Mitr", sans-serif',
                fontWeight: viewMode === 'summary' ? 700 : 500,
                background: viewMode === 'summary' ? '#ffffff' : 'transparent',
                color: viewMode === 'summary' ? '#0f172a' : '#64748b',
                boxShadow: viewMode === 'summary' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              📄 สรุปผลคัดกรอง
            </button>
            <button
              type="button"
              onClick={() => setViewMode('detailed')}
              title="แสดงรายการคำถามและคำตอบอย่างละเอียดทุกข้อ"
              style={{
                border: 0,
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: '12.5px',
                fontFamily: '"Mitr", sans-serif',
                fontWeight: viewMode === 'detailed' ? 700 : 500,
                background: viewMode === 'detailed' ? '#ffffff' : 'transparent',
                color: viewMode === 'detailed' ? '#0047cc' : '#64748b',
                boxShadow: viewMode === 'detailed' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              📋 คำตอบแบบละเอียด
            </button>
          </div>

          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: currentMascot.cs,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
            dangerouslySetInnerHTML={{ __html: currentMascot.svg }}
          />

          <div
            style={{
              fontFamily: '"Mitr", sans-serif',
              fontWeight: 600,
              fontSize: '1rem',
              color: '#0f172a',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {currentToolMeta.short} — {currentToolMeta.name}
          </div>

          {/* ถ้าผู้ป่วยมีหลายแบบประเมินในครั้งนี้ ให้มีแถบสลับแบบประเมิน */}
          {availableTools.length > 1 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginLeft: 4,
                background: '#f1f5f9',
                padding: '3px 4px',
                borderRadius: 10,
                flexWrap: 'wrap',
              }}
            >
              {availableTools.map((tId) => {
                const conf = TOOL_META[tId] || { short: tId.toUpperCase(), color: '#2c7aa0' };
                const isActive = selectedTool === tId;
                return (
                  <button
                    key={tId}
                    type="button"
                    onClick={() => setSelectedTool(tId)}
                    style={{
                      border: 0,
                      borderRadius: 8,
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontFamily: '"Mitr", sans-serif',
                      fontWeight: isActive ? 700 : 500,
                      background: isActive ? '#ffffff' : 'transparent',
                      color: isActive ? conf.color : '#64748b',
                      boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {conf.short}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ด้านขวา: โลโก้ รพ. + ปุ่มพิมพ์รายงาน + ปุ่มปิด */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <img
            src="/Ram2Logo.png"
            alt="โรงพยาบาลรามคำแหง 2"
            style={{
              height: 28,
              maxWidth: 90,
              objectFit: 'contain',
              marginRight: 4,
            }}
          />
          <button
            type="button"
            onClick={handlePrint}
            style={{
              background: '#2c7aa0',
              color: '#ffffff',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 0,
              borderRadius: 12,
              padding: '8px 18px',
              cursor: 'pointer',
              fontFamily: '"Mitr", sans-serif',
              fontSize: '0.92rem',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(44, 122, 160, 0.25)',
              transition: 'background 0.2s, transform 0.15s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#256585')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#2c7aa0')}
          >
            🖨️ พิมพ์{viewMode === 'summary' ? 'ใบสรุปผล' : 'ใบคำตอบละเอียด'}
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="ปิด"
            title="ปิดหน้าต่างรายงาน"
            style={{
              border: 0,
              background: '#f1f5f9',
              width: 36,
              height: 36,
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              fontSize: '18px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#e2e8f0';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* เนื้อหาหน้าจอแสดงรายงานผลผ่าน Iframe เพื่อความเสถียรและความแม่นยำทางคลินิก */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          srcDoc={reportHtml}
          title="Screening Report Preview"
          style={{
            width: '100%',
            height: '100%',
            border: 0,
            display: 'block',
            background: '#f6f7f9',
          }}
        />
      </div>
    </Modal>
  );
};
