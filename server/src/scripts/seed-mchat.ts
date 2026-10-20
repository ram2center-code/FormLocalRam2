import { PrismaClient, FormType, FormVisibility, FormStatus } from '@prisma/client';
const prisma = new PrismaClient();

const QUESTIONS = [
  {
    t: "ถ้าคุณชี้ไปที่สิ่งใดสิ่งหนึ่งในห้อง ลูกของคุณมองไปที่สิ่งนั้นหรือไม่",
    ex: "ตัวอย่างเช่น เมื่อคุณชี้ไปที่ของเล่นหรือสัตว์เลี้ยง ลูกของคุณมองไปที่ของเล่นหรือสัตว์เลี้ยงนั้นหรือไม่",
    reverse: false
  },
  {
    t: "คุณเคยรู้สึกสงสัยหรือไม่ว่าลูกของคุณหูหนวก",
    reverse: true
  },
  {
    t: "ลูกของคุณรู้จักเล่นสมมติหรือไม่",
    ex: "ตัวอย่างเช่น เล่นสมมติดื่มน้ำจากถ้วยเปล่า เล่นสมมติว่าพูดโทรศัพท์ เล่นสมมติว่าป้อนอาหารให้ตุ๊กตาหรือตุ๊กตาสัตว์",
    reverse: false
  },
  {
    t: "ลูกของคุณชอบปีนป่ายสิ่งของหรือไม่",
    ex: "ตัวอย่างเช่น โต๊ะ เก้าอี้ ของเล่นในสนามเด็กเล่น หรือบันได",
    reverse: false
  },
  {
    t: "ลูกของคุณเคลื่อนไหวนิ้วมือแบบแปลกๆ อยู่ใกล้ๆ กับลูกตาของเขาหรือไม่",
    ex: "ตัวอย่างเช่น ลูกของคุณกระดิกนิ้วไปมาใกล้ลูกตาของเขา",
    reverse: true
  },
  {
    t: "ลูกของคุณใช้นิ้วหนึ่งนิ้วชี้ไปเพื่อเป็นการขอบางสิ่งบางอย่างหรือเพื่อขอความช่วยเหลือหรือไม่",
    ex: "ตัวอย่างเช่น ชี้ไปที่ขนม หรือของเล่นที่เขาหยิบไม่ถึง",
    reverse: false
  },
  {
    t: "ลูกของคุณใช้นิ้วหนึ่งนิ้วชี้ไปเพื่อบอกคุณว่าสิ่งนั้นน่าสนใจหรือไม่",
    ex: "ตัวอย่างเช่น ชี้ไปที่เครื่องบินบนท้องฟ้า หรือรถบรรทุกบนถนน",
    reverse: false
  },
  {
    t: "ลูกของคุณสนใจเด็กคนอื่นบ้างหรือไม่",
    ex: "ตัวอย่างเช่น ลูกของคุณมองไปที่เด็กคนอื่น ยิ้มให้ หรือเดินไปหาเด็กคนอื่นบ้างหรือไม่",
    reverse: false
  },
  {
    t: "ลูกของคุณอวดสิ่งของโดยนำมาให้คุณดู หรือชูสิ่งของที่อยากอวดให้คุณได้เห็น ใช่หรือไม่ (ข้อนี้ไม่ได้หมายความว่าเป็นการขอความช่วยเหลือ แต่เป็นการอยากให้คุณมีส่วนร่วมเท่านั้น)",
    ex: "ตัวอย่างเช่น อวดคุณว่ามีดอกไม้ มีตุ๊กตาสัตว์ หรืออวดรถยนต์ของเล่น",
    reverse: false
  },
  {
    t: "ลูกของคุณตอบสนองเวลาที่คุณเรียกชื่อเขาหรือไม่",
    ex: "ตัวอย่างเช่น เมื่อคุณเรียกชื่อเขา เขาก็จะเงยหน้ามองคุณ พูดกับคุณหรือทำเสียงอ้อแอ้ หรือถ้าเขาทำอะไรอยู่เขาก็จะหยุด",
    reverse: false
  },
  {
    t: "เมื่อคุณยิ้มให้กับลูกของคุณ เขายิ้มตอบหรือไม่",
    reverse: false
  },
  {
    t: "ลูกของคุณอารมณ์เสียเมื่อได้ยินเสียงที่เกิดขึ้นประจำวันหรือไม่",
    ex: "ตัวอย่างเช่น ลูกของคุณจะกรีดร้องหรือร้องไห้เมื่อได้ยินเสียง เช่น เสียงเครื่องดูดฝุ่น หรือเสียงดนตรีดังๆ",
    reverse: true
  },
  {
    t: "ลูกของคุณเดินหรือไม่",
    reverse: false
  },
  {
    t: "ลูกของคุณสบตาคุณเวลาที่คุณคุยกับเขา เล่นกับเขา หรือแต่งตัวให้เขาหรือไม่",
    reverse: false
  },
  {
    t: "ลูกของคุณพยายามเลียนแบบสิ่งที่คุณทำหรือไม่",
    ex: "ตัวอย่างเช่น โบกมือบ๊ายบาย ปรบมือ หรือทำเสียงขบขันตามที่คุณทำ",
    reverse: false
  },
  {
    t: "ถ้าคุณหันไปมองบางสิ่งบางอย่าง ลูกของคุณหันไปมองหาว่าคุณกำลังมองอะไรหรือไม่",
    reverse: false
  },
  {
    t: "ลูกของคุณพยายามทำให้คุณมองดูเขาหรือไม่",
    ex: "ตัวอย่างเช่น ลูกของคุณจะมองมาที่คุณเพื่อขอคำชม หรือพูดว่า “ดูนี่” หรือ “ดูหนูซิ”",
    reverse: false
  },
  {
    t: "ลูกของคุณเข้าใจคุณเมื่อคุณบอกให้เขาทำบางสิ่งบางอย่างหรือไม่",
    ex: "ตัวอย่างเช่น ลูกของคุณเข้าใจคำพูดที่ว่า “วางหนังสือไว้บนโต๊ะ” หรือ “เอาผ้าขนหนูมาให้หน่อยนะ” ได้โดยคุณไม่ต้องชี้",
    reverse: false
  },
  {
    t: "ถ้ามีอะไรใหม่ๆ เกิดขึ้น ลูกของคุณจะมองดูหน้าคุณเพื่อดูว่าคุณรู้สึกอย่างไร",
    ex: "ตัวอย่างเช่น ถ้าลูกของคุณได้ยินเสียงแปลกๆ หรือเสียงขบขัน หรือเห็นของเล่นใหม่ๆ เขามองหน้าคุณหรือไม่",
    reverse: false
  },
  {
    t: "ลูกของคุณชอบกิจกรรมเคลื่อนไหวใช่หรือไม่",
    ex: "ตัวอย่างเช่น ชอบถูกจับแกว่ง หรือจับเด้งขึ้นลงไปมาบนเข่าของคุณ",
    reverse: false
  }
];

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('Admin user not found!');
    return;
  }

  // Delete previous M-CHAT form if any
  await prisma.form.deleteMany({
    where: { title: { contains: 'M-CHAT-R' } }
  });

  const layerId = 'layer_child_info';
  const schema: any[] = [
    // 1. Layer Box: ข้อมูลเด็ก (2 Columns)
    {
      id: layerId,
      type: 'layer_box',
      label: 'ข้อมูลเด็ก',
      description: 'กรุณากรอกข้อมูลของเด็กเพื่อการประเมินที่แม่นยำ',
      columns: 2,
      required: false,
      colSpan: 24
    },
    {
      id: 'cname',
      type: 'text',
      label: 'ชื่อ-นามสกุลเด็ก',
      placeholder: 'ระบุชื่อ-นามสกุล',
      required: true,
      layerId: layerId,
      colSpan: 12
    },
    {
      id: 'hn',
      type: 'text',
      label: 'HN (ถ้ามี)',
      placeholder: 'ระบุ Hospital Number',
      required: false,
      layerId: layerId,
      colSpan: 12
    },
    {
      id: 'dob',
      type: 'date',
      label: 'วันเกิดเด็ก',
      placeholder: 'เลือกวันเกิด',
      required: true,
      layerId: layerId,
      colSpan: 12
    },
    {
      id: 'age',
      type: 'number',
      label: 'อายุ (เดือน)',
      placeholder: 'คำนวณจากวันเกิดอัตโนมัติ (เป้าหมาย 16–30 เดือน)',
      required: false,
      layerId: layerId,
      colSpan: 12
    },
    {
      id: 'resp',
      type: 'text',
      label: 'ผู้ตอบแบบสอบถาม',
      placeholder: 'เช่น มารดา บิดา ผู้ดูแล',
      required: false,
      layerId: layerId,
      colSpan: 12
    },
    {
      id: 'date',
      type: 'date',
      label: 'วันที่ทำแบบสอบถาม',
      placeholder: 'เลือกวันที่',
      required: true,
      layerId: layerId,
      colSpan: 12
    }
  ];

  // 2. 20 M-CHAT-R Questions
  const yesNoOptions = [
    { id: 'yes', label: 'ใช่' },
    { id: 'no', label: 'ไม่ใช่' }
  ];

  QUESTIONS.forEach((q, idx) => {
    const qNum = idx + 1;
    // คะแนนความเสี่ยง: ปกติตอบไม่ใช่ = 1 คะแนนความเสี่ยง, ข้อย้อนกลับ (2, 5, 12) ตอบใช่ = 1 คะแนนความเสี่ยง
    const riskAnswer = q.reverse ? 'yes' : 'no';

    schema.push({
      id: `q_${qNum}`,
      type: 'single_choice',
      label: `${q.t}`,
      description: q.ex ? `(${q.ex})` : (q.reverse ? '(*ข้อย้อนกลับ)' : undefined),
      required: true,
      options: yesNoOptions,
      points: 1,
      correctAnswer: riskAnswer, // คะแนนความเสี่ยง (ตอบข้อเสี่ยง = 1 คะแนน)
      colSpan: 24
    });
  });

  const scoreConfig = {
    passScore: 0,
    passType: 'points',
    showResultToUser: true,
    gradeBands: [
      {
        label: 'ความเสี่ยงสูง (High Risk : 8–20 คะแนน) - มีความเป็นไปได้สูงที่จะเป็นออทิสติก แนะนำส่งต่อแพทย์เพื่อการประเมินและช่วยเหลือทันที',
        minScore: 40 // 8/20 = 40%
      },
      {
        label: 'ความเสี่ยงปานกลาง (Medium Risk : 3–7 คะแนน) - มีความเป็นไปได้ปานกลาง แนะนำให้แพทย์ทำแบบประเมินติดตามผล M-CHAT-R Follow-Up',
        minScore: 15 // 3/20 = 15%
      },
      {
        label: 'ความเสี่ยงต่ำ (Low Risk : 0–2 คะแนน) - มีโอกาสเป็นออทิสติกต่ำ ผลการคัดกรองเป็นลบ',
        minScore: 0
      }
    ]
  };

  const form = await prisma.form.create({
    data: {
      title: 'แบบคัดกรอง M-CHAT-R ฉบับภาษาไทย (สำหรับเด็กเล็กอายุ 16–30 เดือน)',
      description: 'แบบคัดกรองภาวะออทิซึมสเปกตรัมในเด็กเล็ก (อายุ 16–30 เดือน) สำหรับผู้ปกครอง\n\nคำแนะนำในการตอบ:\nโปรดตอบแบบสอบถามเกี่ยวกับพฤติกรรมที่ลูกของท่านมักทำ โดยพยายามตอบคำถามทุกข้อ ถ้าพฤติกรรมนั้นไม่ค่อยเกิดขึ้น (เช่น ท่านเห็นพฤติกรรมดังกล่าวเพียง 1 หรือ 2 ครั้ง) โปรดตอบว่าลูกของท่านไม่ได้ทำพฤติกรรมในข้อนั้นๆ\n\n* ข้อมูลประเมินผลจะแสดงระดับความเสี่ยง (ต่ำ / ปานกลาง / สูง) พร้อมสรุปข้อที่มีความเสี่ยงเพื่อให้แพทย์ประเมินต่อ',
      type: FormType.SCORE_TEST,
      visibility: FormVisibility.PUBLIC,
      status: FormStatus.PUBLISHED,
      ownerId: admin.id,
      isAcceptingResponses: true,
      allowMultiple: true,
      versions: {
        create: {
          version: 1,
          schema: schema,
          scoreConfig: scoreConfig
        }
      }
    },
    include: {
      versions: true
    }
  });

  console.log('SUCCESS: Created M-CHAT-R form with ID:', form.id);
  console.log('Title:', form.title);
  console.log('Total questions in schema:', (form.versions[0]?.schema as any)?.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
