import { FormDetail } from '../api/formApi';

/**
 * สร้างไฟล์ HTML Standalone (เปิดออฟไลน์ได้ 100% บนทุกอุปกรณ์ รวมถึง iPad โดยไม่ต้องมี Server)
 */
export function generateStandaloneFormHtml(form: FormDetail): string {
  const isMchat =
    form.title.toLowerCase().includes('m-chat') ||
    form.title.includes('คัดกรอง') ||
    form.schema.some((f) => [2, 5, 12].includes(Number(f.id.replace('q_', ''))));

  const isScoreTest = form.type === 'SCORE_TEST';

  // แปลง schema และข้อมูลฟอร์มเป็น JSON เพื่อฝังใน Script
  const formDataJson = JSON.stringify({
    title: form.title,
    description: form.description || '',
    type: form.type,
    isMchat,
    isScoreTest,
    pdpaEnabled: form.pdpaEnabled !== false,
    pdpaTitle: form.pdpaTitle || '',
    pdpaContent: form.pdpaContent || '',
    schema: form.schema,
  });

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${escapeHtml(form.title)} - แบบฟอร์มออนไลน์</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1677ff;
      --primary-hover: #0958d9;
      --primary-bg: #e6f4ff;
      --success: #52c41a;
      --warning: #faad14;
      --danger: #ff4d4f;
      --border: #d9d9d9;
      --bg-page: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #1f2937;
      --text-muted: #64748b;
      --radius: 14px;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: var(--bg-page);
      color: var(--text-main);
      line-height: 1.6;
      padding: 16px 12px 60px;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    /* iPad & Mobile Friendly Card */
    .card {
      background: var(--card-bg);
      border-radius: var(--radius);
      padding: 24px 20px;
      margin-bottom: 20px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      border: 1px solid #eef2f6;
    }

    .card-header {
      border-top: 6px solid var(--primary);
    }

    h1.title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .desc {
      color: var(--text-muted);
      font-size: 15px;
      white-space: pre-line;
      margin-bottom: 12px;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      background: #f1f5f9;
      color: #475569;
    }
    .badge-primary { background: var(--primary-bg); color: var(--primary); }
    .badge-gold { background: #fffbe6; color: #d46b08; border: 1px solid #ffe58f; }

    /* Layer Box (กล่องรวมข้อมูล เช่น ข้อมูลเด็ก) */
    .layer-box {
      background: #fcfcfd;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 18px 16px;
      margin-bottom: 20px;
    }
    .layer-title {
      font-size: 17px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .layer-desc {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 16px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
    @media (min-width: 600px) {
      .grid-2 { grid-template-columns: 1fr 1fr; }
    }

    /* Form Fields */
    .field-group {
      margin-bottom: 22px;
    }
    .field-label {
      display: block;
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 8px;
    }
    .req-star {
      color: var(--danger);
      margin-left: 4px;
    }
    .field-desc {
      font-size: 13px;
      color: #64748b;
      margin-top: -4px;
      margin-bottom: 10px;
    }

    /* Touch-friendly inputs: 16px font to prevent iOS Safari auto-zoom */
    input[type="text"],
    input[type="number"],
    input[type="date"],
    select,
    textarea {
      width: 100%;
      min-height: 48px;
      padding: 10px 14px;
      font-size: 16px;
      font-family: inherit;
      color: var(--text-main);
      background-color: #ffffff;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      outline: none;
      transition: all 0.2s ease;
    }
    input:focus, select:focus, textarea:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.15);
    }
    textarea { min-height: 90px; resize: vertical; }

    /* Touch Choice Cards (Radio / Checkbox) */
    .choice-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    @media (min-width: 500px) {
      .choice-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
    }
    .choice-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      min-height: 52px;
      border: 1.5px solid var(--border);
      border-radius: 10px;
      cursor: pointer;
      background: #ffffff;
      transition: all 0.2s ease;
      user-select: none;
    }
    .choice-card:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .choice-card.selected {
      border-color: var(--primary);
      background: var(--primary-bg);
      font-weight: 600;
      color: var(--primary-hover);
    }
    .choice-card input {
      width: 20px;
      height: 20px;
      accent-color: var(--primary);
      pointer-events: none;
    }

    /* Rating Stars */
    .rating-group {
      display: flex;
      gap: 8px;
      font-size: 36px;
      cursor: pointer;
      user-select: none;
    }
    .star {
      color: #d1d5db;
      transition: color 0.15s ease;
    }
    .star.active {
      color: #f59e0b;
    }

    /* Floating / Sticky Submit bar for Tablet */
    .submit-bar {
      margin-top: 30px;
      text-align: center;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 220px;
      height: 52px;
      padding: 0 28px;
      font-size: 17px;
      font-weight: 700;
      font-family: inherit;
      color: #ffffff;
      background: var(--primary);
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(22, 119, 255, 0.28);
      transition: all 0.2s ease;
    }
    .btn:hover { background: var(--primary-hover); transform: translateY(-1px); }
    .btn:active { transform: translateY(1px); }
    .btn-secondary {
      background: #ffffff;
      color: #475569;
      border: 1.5px solid #cbd5e1;
      box-shadow: none;
    }

    /* Modal Result for M-CHAT / Exam */
    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-overlay.open { display: flex; }
    .modal-card {
      background: #ffffff;
      border-radius: 18px;
      max-width: 650px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 28px 22px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    }

    .result-badge {
      padding: 14px 20px;
      border-radius: 12px;
      margin-bottom: 20px;
      text-align: center;
    }
    .risk-low { background: #f6ffed; border: 2px solid #b7eb8f; color: #389e0d; }
    .risk-med { background: #fffbe6; border: 2px solid #ffe58f; color: #d46b08; }
    .risk-high { background: #fff2f0; border: 2px solid #ffccc7; color: #cf1322; }

    /* Footer */
    .footer {
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
      margin-top: 40px;
    }

    @media print {
      body { background: white; padding: 0; }
      .noprint, .submit-bar, .btn { display: none !important; }
      .modal-card { box-shadow: none; border: 1px solid #ccc; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Card -->
    <div class="card card-header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px;">
        <h1 class="title">${escapeHtml(form.title)}</h1>
        <span class="badge ${isScoreTest ? 'badge-gold' : 'badge-primary'}">
          ${isScoreTest ? '🏆 แบบทดสอบ/คัดกรอง' : '📋 แบบฟอร์ม'}
        </span>
      </div>
      ${form.description ? `<p class="desc">${escapeHtml(form.description)}</p>` : ''}
      <div style="font-size: 13px; color: #94a3b8; margin-top: 10px;">
        📱 โหมดสแตนด์อโลน (Offline iPad Mode) — กรอกและประเมินผลได้ทันที
      </div>
    </div>

    <!-- Form Container -->
    <form id="standaloneForm" onsubmit="handleFormSubmit(event)">
      <div id="formFieldsContainer"></div>

      <div class="submit-bar">
        <button type="submit" class="btn">
          <span>ส่งและประเมินผล</span> ➜
        </button>
      </div>
    </form>

    <div class="footer">
      FormLocal © 2026 — Powered By: Pantamit.Y
    </div>
  </div>

  ${form.pdpaEnabled !== false ? `
  <!-- Modal ข้อตกลง PDPA (RAM2 Preliminary Assessment Standard) -->
  <div id="pdpaModal" class="modal-overlay open" style="z-index: 10000;">
    <div class="modal-card" style="max-width: 680px; padding: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.18);">
      <!-- Header Banner: Royal Blue -->
      <div style="background: #0047cc; padding: 16px 24px; color: white; display: flex; align-items: center; gap: 12px;">
        <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;">
          🛡️
        </div>
        <div>
          <div style="font-size: 16px; font-weight: 700; line-height: 1.3;">RAM2 Preliminary Assessment</div>
          <div style="font-size: 12px; color: #e0e7ff; margin-top: 2px;">โรงพยาบาลรามคำแหง 2</div>
        </div>
      </div>

      <!-- Body Content -->
      <div style="padding: 24px 28px; max-height: calc(85vh - 75px); overflow-y: auto; background: #ffffff; text-align: left;">
        <h2 style="font-size: 19px; font-weight: 700; color: #111827; margin: 0 0 4px; line-height: 1.4;">
          ${escapeHtml(form.pdpaTitle || 'หนังสือให้ความยินยอมในการเก็บรวบรวมและประมวลผลข้อมูลส่วนบุคคล')}
        </h2>
        <p style="font-size: 13.5px; color: #6b7280; margin: 0 0 16px;">โปรดอ่านรายละเอียดก่อนเริ่มทำแบบประเมิน</p>

        <!-- Selected Form Box -->
        <div style="padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 20px;">
          <div style="font-size: 12px; color: #64748b;">หัวข้อแบบประเมินที่เลือก</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(form.title)}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${escapeHtml(form.description || 'แบบประเมินสุขภาพ')}</div>
        </div>

        <!-- 4 Sections -->
        <div style="font-size: 13.5px; line-height: 1.65; color: #374151;">
          <div style="margin-bottom: 16px;">
            <div style="font-weight: 700; color: #111827; margin-bottom: 4px;">1. วัตถุประสงค์ในการเก็บข้อมูล</div>
            <p style="margin: 0;">โรงพยาบาลรามคำแหง 2 ประสงค์จะเก็บรวบรวมและประมวลผลข้อมูลที่ท่านให้ผ่านแบบสอบถาม เพื่อคำนวณและแสดงผลการประเมินเบื้องต้นตามเกณฑ์ของแบบประเมินที่ท่านเลือก รวมถึงให้ข้อมูลประกอบการพิจารณาว่าควรได้รับการประเมินเพิ่มเติมหรือไม่</p>
          </div>

          <div style="margin-bottom: 16px;">
            <div style="font-weight: 700; color: #111827; margin-bottom: 4px;">2. ประเภทข้อมูลที่อาจเก็บรวบรวม</div>
            <ul style="margin: 4px 0 0; padding-left: 20px;">
              <li>ข้อมูลทั่วไปที่จำเป็น เช่น อายุหรือช่วงอายุ</li>
              <li>คำตอบเกี่ยวกับอาการ พฤติกรรม พัฒนาการ หรือสุขภาพ ตามหัวข้อที่เลือก</li>
              <li>ผลการประเมินที่คำนวณจากคำตอบ</li>
              <li>ข้อมูลติดต่อ เฉพาะกรณีที่มีการร้องขอและแจ้งวัตถุประสงค์ไว้โดยชัดเจน</li>
              <li>ข้อมูลทางเทคนิคที่จำเป็นต่อการรักษาความปลอดภัยของระบบ ตามที่ระบุในประกาศความเป็นส่วนตัว</li>
            </ul>
          </div>

          <div style="margin-bottom: 16px;">
            <div style="font-weight: 700; color: #111827; margin-bottom: 4px;">3. ข้อจำกัดของบริการ</div>
            <p style="margin: 0;">ระบบนี้เป็นเพียงเครื่องมือคัดกรองและประเมินเบื้องต้น ไม่ใช่การวินิจฉัยโรคหรือการรักษาพยาบาล ผลการประเมินไม่สามารถยืนยันว่าท่านมีหรือไม่มีโรคได้</p>
          </div>

          <div style="margin-bottom: 18px;">
            <div style="font-weight: 700; color: #111827; margin-bottom: 4px;">4. การรักษาความลับและสิทธิของท่าน</div>
            <p style="margin: 0;">โรงพยาบาลจะจำกัดการเข้าถึงข้อมูลตามสิทธิและหน้าที่ที่เกี่ยวข้อง และดำเนินการตามประกาศความเป็นส่วนตัว ท่านสามารถติดต่อ DPO ผ่าน PDPA@ram2-hosp.com เพื่อสอบถามหรือใช้สิทธิตามกฎหมาย รวมถึงถอนความยินยอมในกรณีที่การประมวลผลอาศัยความยินยอมเป็นฐานกฎหมาย</p>
          </div>
        </div>

        <!-- Checkbox 1 -->
        <div style="margin-bottom: 12px;">
          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 13.5px; color: #1f2937; line-height: 1.45;">
            <input type="checkbox" id="pdpaAgree1" onchange="checkPdpaReady()" style="margin-top: 3px; transform: scale(1.15);">
            <span>ข้าพเจ้าได้อ่านและรับทราบประกาศความเป็นส่วนตัว รวมถึงวัตถุประสงค์และข้อจำกัดของแบบประเมินแล้ว</span>
          </label>
        </div>

        <!-- Checkbox 2 -->
        <div style="margin-bottom: 20px;">
          <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer; font-size: 13.5px; color: #1f2937; line-height: 1.45;">
            <input type="checkbox" id="pdpaAgree2" onchange="checkPdpaReady()" style="margin-top: 3px; transform: scale(1.15);">
            <span>ข้าพเจ้ายินยอมโดยชัดแจ้งให้โรงพยาบาลรามคำแหง 2 เก็บรวบรวม ใช้ และประมวลผลข้อมูลสุขภาพที่ข้าพเจ้าให้ผ่านแบบประเมินนี้ เพื่อวัตถุประสงค์ที่ระบุไว้ข้างต้นและในประกาศความเป็นส่วนตัว</span>
          </label>
        </div>

        <!-- Submit Button -->
        <button type="button" id="pdpaAcceptBtn" disabled onclick="acceptPdpa()" style="width: 100%; height: 46px; border-radius: 10px; font-size: 15px; font-weight: 600; border: none; background: #f3f4f6; color: #9ca3af; cursor: not-allowed; transition: all 0.2s ease;">
          ยินยอมและเริ่มทำแบบประเมิน
        </button>

        <div style="text-align: center; font-size: 12px; color: #6b7280; margin-top: 10px;">
          หากไม่ประสงค์ให้ความยินยอมที่จำเป็น ระบบจะไม่เริ่มเก็บคำตอบสุขภาพสำหรับแบบประเมินนี้
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Modal แสดงผลลัพธ์ -->
  <div id="resultModal" class="modal-overlay">
    <div class="modal-card">
      <div id="modalContent"></div>
      <div style="display: flex; gap: 10px; justify-content: center; margin-top: 24px; flex-wrap: wrap;">
        <button type="button" class="btn btn-secondary" onclick="window.print()">
          🖨️ พิมพ์ / บันทึก PDF
        </button>
        <button type="button" class="btn" onclick="closeResultModal()">
          ปิดหน้าต่าง
        </button>
      </div>
    </div>
  </div>

  <script>
    const FORM_DATA = ${formDataJson};
    const answers = {};
    let pdpaAccepted = !FORM_DATA.pdpaEnabled;

    document.addEventListener('DOMContentLoaded', () => {
      renderFields();
    });

    function checkPdpaReady() {
      const c1 = document.getElementById('pdpaAgree1');
      const c2 = document.getElementById('pdpaAgree2');
      const btn = document.getElementById('pdpaAcceptBtn');
      const ready = c1 && c1.checked && c2 && c2.checked;
      if (btn) {
        btn.disabled = !ready;
        if (ready) {
          btn.style.background = '#0047cc';
          btn.style.color = '#ffffff';
          btn.style.cursor = 'pointer';
          btn.style.boxShadow = '0 4px 12px rgba(0, 71, 204, 0.25)';
        } else {
          btn.style.background = '#f3f4f6';
          btn.style.color = '#9ca3af';
          btn.style.cursor = 'not-allowed';
          btn.style.boxShadow = 'none';
        }
      }
    }

    function acceptPdpa() {
      pdpaAccepted = true;
      const modal = document.getElementById('pdpaModal');
      if (modal) modal.classList.remove('open');
    }

    function declinePdpa() {
      alert('หากท่านไม่ยินยอมตามข้อตกลง PDPA จะไม่สามารถกรอกข้อมูลในแบบฟอร์มนี้ได้');
    }


    function renderFields() {
      const container = document.getElementById('formFieldsContainer');
      const schema = FORM_DATA.schema || [];

      // แยก layer_box และ field ทั่วไป
      const layers = schema.filter(f => f.type === 'layer_box');
      const handledFieldIds = new Set();

      // เรนเดอร์กล่อง Layer Box ก่อน
      layers.forEach((layer, idx) => {
        const boxDiv = document.createElement('div');
        boxDiv.className = 'layer-box';
        const cleanTitle = (layer.label || '')
          .replace(/\\s*\\(Layer Box\\)/i, '')
          .replace(/^กล่องที่\\s*\\d+[:\\s]*/i, '')
          .trim();
        boxDiv.innerHTML = \`
          \${cleanTitle ? \`<div class="layer-title">\${escapeHtml(cleanTitle)}</div>\` : ''}
          \${layer.description ? \`<div class="layer-desc">\${escapeHtml(layer.description)}</div>\` : ''}
          <div class="grid grid-2" id="layer_\${layer.id}"></div>
        \`;
        container.appendChild(boxDiv);

        const childFields = schema.filter(f => f.layerId === layer.id);
        const gridContainer = boxDiv.querySelector('#layer_' + layer.id);
        childFields.forEach(f => {
          handledFieldIds.add(f.id);
          gridContainer.appendChild(createFieldElement(f));
        });
      });

      // เรนเดอร์คำถามทั่วไป
      const remainingQuestions = schema.filter(f => f.type !== 'layer_box' && !handledFieldIds.has(f.id));
      if (remainingQuestions.length > 0) {
        const questionsCard = document.createElement('div');
        questionsCard.className = 'card';
        remainingQuestions.forEach((f) => {
          questionsCard.appendChild(createFieldElement(f));
        });
        container.appendChild(questionsCard);
      }
    }

    function createFieldElement(field) {
      const wrap = document.createElement('div');
      wrap.className = 'field-group';
      wrap.id = 'group_' + field.id;
      const reqStar = field.required ? '<span class="req-star">*</span>' : '';
      const descHtml = field.description ? \`<div class="field-desc">\${escapeHtml(field.description)}</div>\` : '';

      let inputHtml = '';

      switch (field.type) {
        case 'text':
          inputHtml = \`<input type="text" id="\${field.id}" placeholder="\${escapeHtml(field.placeholder || '')}" oninput="onValueChange('\${field.id}', this.value)" \${field.required ? 'required' : ''}>\`;
          break;

        case 'number':
          inputHtml = \`<input type="number" id="\${field.id}" placeholder="\${escapeHtml(field.placeholder || '')}" oninput="onValueChange('\${field.id}', this.value)" \${field.required ? 'required' : ''}>\`;
          break;

        case 'date':
          inputHtml = \`<input type="date" id="\${field.id}" onchange="onDateChange('\${field.id}', this.value)" \${field.required ? 'required' : ''}>\`;
          break;

        case 'textarea':
          inputHtml = \`<textarea id="\${field.id}" placeholder="\${escapeHtml(field.placeholder || '')}" oninput="onValueChange('\${field.id}', this.value)" \${field.required ? 'required' : ''}></textarea>\`;
          break;

        case 'single_choice':
          const isTwoOptions = field.options && field.options.length === 2;
          const rowClass = isTwoOptions ? 'choice-row' : '';
          const optionsHtml = (field.options || []).map(opt => \`
            <label class="choice-card" onclick="selectRadio('\${field.id}', '\${opt.id}', this)">
              <input type="radio" name="\${field.id}" value="\${opt.id}">
              <span>\${escapeHtml(opt.label)}</span>
            </label>
          \`).join('');
          inputHtml = \`<div class="choice-group \${rowClass}">\${optionsHtml}</div>\`;
          break;

        case 'multiple_choice':
          const cbHtml = (field.options || []).map(opt => \`
            <label class="choice-card" onclick="toggleCheckbox('\${field.id}', '\${opt.id}', this)">
              <input type="checkbox" name="\${field.id}" value="\${opt.id}">
              <span>\${escapeHtml(opt.label)}</span>
            </label>
          \`).join('');
          inputHtml = \`<div class="choice-group">\${cbHtml}</div>\`;
          break;

        case 'dropdown':
          const opts = (field.options || []).map(o => \`<option value="\${o.id}">\${escapeHtml(o.label)}</option>\`).join('');
          inputHtml = \`
            <select id="\${field.id}" onchange="onValueChange('\${field.id}', this.value)" \${field.required ? 'required' : ''}>
              <option value="">-- กรุณาเลือก --</option>
              \${opts}
            </select>
          \`;
          break;

        case 'rating':
          inputHtml = \`
            <div class="rating-group" id="rating_\${field.id}">
              \${[1, 2, 3, 4, 5].map(star => \`<span class="star" onclick="setRating('\${field.id}', \${star})">★</span>\`).join('')}
              <span id="rating_text_\${field.id}" style="font-size: 16px; margin-left: 8px; color: #475569; align-self: center;"></span>
            </div>
          \`;
          break;

        default:
          inputHtml = \`<input type="text" id="\${field.id}" oninput="onValueChange('\${field.id}', this.value)">\`;
      }

      wrap.innerHTML = \`
        <label class="field-label" for="\${field.id}">
          \${escapeHtml(field.label)} \${reqStar}
        </label>
        \${descHtml}
        \${inputHtml}
      \`;

      return wrap;
    }

    function onValueChange(fieldId, val) {
      answers[fieldId] = val;
    }

    function onDateChange(fieldId, val) {
      answers[fieldId] = val;
      // คำนวณอายุอัตโนมัติหากเป็นวันเกิด
      if (val) {
        const birthDate = new Date(val);
        const today = new Date();
        let months = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
        if (today.getDate() < birthDate.getDate()) months--;

        const ageField = FORM_DATA.schema.find(f => f.id.includes('age') || f.label.includes('อายุ'));
        if (ageField && months >= 0) {
          const ageInput = document.getElementById(ageField.id);
          if (ageInput) {
            ageInput.value = months;
            answers[ageField.id] = months;
          }
        }
      }
    }

    function selectRadio(fieldId, val, labelEl) {
      answers[fieldId] = val;
      const group = labelEl.parentElement;
      group.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
      labelEl.classList.add('selected');
      const radio = labelEl.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    }

    function toggleCheckbox(fieldId, val, labelEl) {
      if (!Array.isArray(answers[fieldId])) answers[fieldId] = [];
      const cb = labelEl.querySelector('input[type="checkbox"]');
      const idx = answers[fieldId].indexOf(val);
      if (idx > -1) {
        answers[fieldId].splice(idx, 1);
        labelEl.classList.remove('selected');
        if (cb) cb.checked = false;
      } else {
        answers[fieldId].push(val);
        labelEl.classList.add('selected');
        if (cb) cb.checked = true;
      }
    }

    function setRating(fieldId, stars) {
      answers[fieldId] = stars;
      const group = document.getElementById('rating_' + fieldId);
      const starEls = group.querySelectorAll('.star');
      starEls.forEach((el, idx) => {
        if (idx < stars) el.classList.add('active');
        else el.classList.remove('active');
      });
      document.getElementById('rating_text_' + fieldId).innerText = stars + ' ดาว';
    }

    function handleFormSubmit(e) {
      e.preventDefault();

      // ตรวจสอบข้อตกลง PDPA
      if (FORM_DATA.pdpaEnabled && !pdpaAccepted) {
        alert('กรุณาอ่านและกดยินยอมข้อตกลง PDPA ก่อนส่งแบบฟอร์ม');
        const modal = document.getElementById('pdpaModal');
        if (modal) modal.classList.add('open');
        return;
      }

      // ตรวจสอบ required
      for (const f of FORM_DATA.schema) {
        if (f.type !== 'layer_box' && f.required) {
          const val = answers[f.id];
          if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
            alert('กรุณากรอกข้อมูลในข้อ: "' + f.label + '"');
            const el = document.getElementById('group_' + f.id);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
        }
      }

      // ประมวลผลคะแนน M-CHAT หรือ Exam
      if (FORM_DATA.isMchat) {
        evaluateMchat();
      } else if (FORM_DATA.isScoreTest) {
        evaluateScoreTest();
      } else {
        evaluateGeneral();
      }
    }

    function evaluateMchat() {
      const qFields = FORM_DATA.schema.filter(f => f.type === 'single_choice' && f.type !== 'layer_box');
      let riskScore = 0;
      const riskList = [];

      qFields.forEach((q, idx) => {
        const qNum = idx + 1;
        const isReverse = [2, 5, 12].includes(qNum) || q.correctAnswer === 'yes' || q.correctAnswer === 'ใช่';
        const userAns = answers[q.id];
        const isRisk = isReverse
          ? (userAns === 'yes' || userAns === 'opt_yes' || userAns === 'ใช่')
          : (userAns === 'no' || userAns === 'opt_no' || userAns === 'ไม่ใช่');

        if (isRisk) {
          riskScore++;
          riskList.push({ qNum, label: q.label });
        }
      });

      let badgeClass = 'risk-low';
      let title = 'ระดับความเสี่ยงต่ำ (Low Risk)';
      let advise = 'เด็กมีพัฒนาการตามวัยในเกณฑ์ปกติ หากเด็กอายุต่ำกว่า 24 เดือน แนะนำให้ตรวจคัดกรองซ้ำเมื่ออายุครบ 24 เดือน';

      if (riskScore >= 8) {
        badgeClass = 'risk-high';
        title = 'ระดับความเสี่ยงสูง (High Risk)';
        advise = 'มีความเสี่ยงสูงต่อภาวะออทิซึมสเปกตรัม ไม่จำเป็นต้องทำแบบสอบถามติดตามผล แนะนำให้ส่งต่อพบกุมารแพทย์ผู้เชี่ยวชาญด้านพัฒนาการเพื่อการวินิจฉัยอย่างละเอียดทันที';
      } else if (riskScore >= 3) {
        badgeClass = 'risk-med';
        title = 'ระดับความเสี่ยงปานกลาง (Medium Risk)';
        advise = 'แนะนำให้ทำแบบสอบถามติดตามผล (M-CHAT-R Follow-Up Interview) ในข้อที่ตอบผิด หากคะแนนยังคงตั้งแต่ 2 คะแนนขึ้นไป ควรส่งต่อเพื่อตรวจประเมินทางคลินิก';
      }

      const modalContent = document.getElementById('modalContent');
      modalContent.innerHTML = \`
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 22px; font-weight: 700; color: #1e293b;">ผลการคัดกรอง M-CHAT-R</h2>
          <p style="color: #64748b; font-size: 14px;">คะแนนความเสี่ยงสะสม: <strong style="font-size: 24px; color: #0f172a;">\${riskScore}</strong> / 20 คะแนน</p>
        </div>

        <div class="result-badge \${badgeClass}">
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 6px;">\${title}</h3>
          <p style="font-size: 14px; margin: 0;">\${advise}</p>
        </div>

        <div style="margin-top: 20px;">
          <h4 style="font-size: 15px; font-weight: 700; color: #334155; margin-bottom: 10px;">
            รายการข้อที่ให้คะแนนความเสี่ยง (\${riskList.length} ข้อ):
          </h4>
          \${riskList.length === 0 ? '<p style="color: #16a34a; font-size: 14px;">✨ ไม่พบข้อที่มีความเสี่ยง</p>' : ''}
          <ul style="padding-left: 20px; font-size: 14px; color: #475569; line-height: 1.8;">
            \${riskList.map(item => \`<li><strong>ข้อ \${item.qNum}:</strong> \${escapeHtml(item.label)}</li>\`).join('')}
          </ul>
        </div>
      \`;

      document.getElementById('resultModal').classList.add('open');
    }

    function evaluateScoreTest() {
      let score = 0;
      let total = 0;
      FORM_DATA.schema.forEach(f => {
        if (f.points) {
          total += f.points;
          if (answers[f.id] === f.correctAnswer) {
            score += f.points;
          }
        }
      });

      const pct = total > 0 ? Math.round((score / total) * 100) : 0;
      const passed = pct >= 70;

      const modalContent = document.getElementById('modalContent');
      modalContent.innerHTML = \`
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="font-size: 22px; font-weight: 700;">ผลการทดสอบ</h2>
          <p style="font-size: 28px; font-weight: 800; color: \${passed ? '#16a34a' : '#dc2626'}; margin: 10px 0;">
            \${score} / \${total} คะแนน (\${pct}%)
          </p>
          <div class="result-badge \${passed ? 'risk-low' : 'risk-high'}">
            <h3 style="margin: 0; font-size: 17px;">สถานะ: \${passed ? '✅ ผ่านเกณฑ์การทดสอบ' : '❌ ไม่ผ่านเกณฑ์ (เกณฑ์ 70%)'}</h3>
          </div>
        </div>
      \`;
      document.getElementById('resultModal').classList.add('open');
    }

    function evaluateGeneral() {
      const modalContent = document.getElementById('modalContent');
      modalContent.innerHTML = \`
        <div style="text-align: center; margin-bottom: 20px;">
          <span style="font-size: 48px;">🎉</span>
          <h2 style="font-size: 22px; font-weight: 700; margin-top: 10px;">บันทึกข้อมูลสำเร็จ</h2>
          <p style="color: #64748b; font-size: 14px;">แบบฟอร์มของคุณได้รับการบันทึกข้อมูลเรียบร้อยแล้วในโหมดออฟไลน์</p>
        </div>
      \`;
      document.getElementById('resultModal').classList.add('open');
    }

    function closeResultModal() {
      document.getElementById('resultModal').classList.remove('open');
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Trigger download ของไฟล์ HTML ในเบราว์เซอร์
 */
export function downloadFormHtml(form: FormDetail) {
  const htmlContent = generateStandaloneFormHtml(form);
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeTitle = (form.title || 'form').replace(/[^a-zA-Z0-9ก-๙_-]/g, '_');
  a.download = `${safeTitle}_iPad_Offline.html`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
