import { Answer, GameSession, Question } from "@/lib/types";

export const starterQuestions: Question[] = [
  {
    prompt: "คุณคิดว่าปัจจุบัน Generative AI (เช่น ChatGPT) สามารถทำสิ่งใดในโรงพยาบาลได้ดีที่สุด",
    choices: [
      { text: "วินิจฉัยโรคหายากได้แม่นยำ 100% โดยไม่ต้องใช้แพทย์" },
      { text: "ช่วยร่างเอกสาร สรุปประวัติ หรือคิดไอเดียสื่อสารกับคนไข้" },
      { text: "ผ่าตัดคนไข้แทนศัลยแพทย์ผ่านระบบทางไกล" },
      { text: "ตัดสินใจจ่ายยาเสพติดให้โทษแทนแพทย์ได้อย่างถูกกฎหมาย" },
    ],
    correctIndex: 1,
  },
  {
    prompt: "ถ้า AI เขียนอ้างอิงชื่อเปเปอร์และชื่ออาจารย์แพทย์อย่างละเอียดในคำตอบ เราควรเชื่อทันทีหรือไม่",
    choices: [
      { text: "เชื่อได้ทันที เพราะ AI มีฐานข้อมูลอัปเดตระดับโลก" },
      { text: "เชื่อได้ถ้าเป็น AI เวอร์ชันที่ต้องเสียเงินซื้อ" },
      { text: "ไม่ควรเชื่อทันที เพราะ AI อาจกุเรื่องขึ้นมาเอง (Hallucination) ต้องเช็ก PubMed ก่อน" },
      { text: "ไม่ควรเชื่อ และควรเลิกใช้ AI ตัวนั้นไปเลย" },
    ],
    correctIndex: 2,
  },
  {
    prompt: "ในวงการ AI คำว่า Hallucination (ภาพหลอน) หมายถึงพฤติกรรมใดของ AI ที่แพทย์ต้องระวังที่สุด",
    choices: [
      { text: "การที่ระบบ AI เกิดอาการค้างและหน้าจอกะพริบเป็นสีแดง" },
      { text: "การที่ AI มโนหรือแต่งข้อมูลดิบ/ผลแล็บ/เคสขึ้นมาเองอย่างแนบเนียน" },
      { text: "การที่ AI ปฏิเสธไม่ยอมตอบคำถามเกี่ยวกับโรคติดต่อร้ายแรง" },
      { text: "การที่หน้าจอแสดงผลสลับตัวอักษรภาษาไทยเป็นภาษาต่างดาว" },
    ],
    correctIndex: 1,
  },
  {
    prompt: "สถานการณ์ใดต่อไปนี้ เสี่ยงต่อการละเมิดกฎหมาย PDPA ของคนไข้มากที่สุด",
    choices: [
      { text: "ให้ AI ช่วยแต่งกลอนอวยพรวันเกิดให้ผู้อำนวยการโรงพยาบาล" },
      { text: "ถาม AI เกี่ยวกับแนวทางการรักษาโรคเบาหวานตามมาตรฐานสากล" },
      { text: "พิมพ์เล่าเคสคนไข้โดยระบุชื่อ-สกุล และ HN ลงใน AI สาธารณะเพื่อให้ช่วยคิดโรค" },
      { text: "ใช้ AI ช่วยแปลใบยินยอมการรับการรักษาที่เป็นฟอร์มเปล่า" },
    ],
    correctIndex: 2,
  },
  {
    prompt: "ข้อใดคือความเข้าใจที่ถูกต้องเกี่ยวกับข้อมูลที่เราพิมพ์ลงไปใน AI เวอร์ชันฟรีทั่วไป",
    choices: [
      { text: "ข้อมูลจะถูกลบทันทีที่เราปิดหน้าต่างเบราว์เซอร์" },
      { text: "ข้อมูลอาจถูกนำไปใช้เทรน AI ต่อ ทำให้คนภายนอกมีโอกาสเห็นข้อมูลของเราได้" },
      { text: "มีเฉพาะแพทย์ในโรงพยาบาลเดียวกันเท่านั้นที่มองเห็นข้อมูลนี้" },
      { text: "ข้อมูลทุกอย่างจะถูกเข้ารหัสลับและไม่มีใครเปิดดูได้อีกเลย" },
    ],
    correctIndex: 1,
  },
  {
    prompt: "หากคุณพิมพ์สั่ง AI สั้นๆ ว่า ขอแนวทางการรักษาโรคฟันผุ แล้วได้คำตอบกว้างเกินไปเกิดจากอะไร",
    choices: [
      { text: "AI ตัวนี้ไม่มีความรู้เรื่องทันตกรรมเลย" },
      { text: "คำสั่ง (Prompt) กว้างเกินไป ขาดบริบท เช่น ไม่ระบุอายุคนไข้หรือความรุนแรง" },
      { text: "ระบบคอมพิวเตอร์ของโรงพยาบาลติดไวรัส" },
      { text: "AI กำลังแกล้งผู้ใช้งาน" },
    ],
    correctIndex: 1,
  },
  {
    prompt: "ถ้าคนไข้เปิดข้อความจาก AI มาแย้งแผนการรักษาของคุณ ยุทธวิธีใดที่แพทย์ควรนำมาใช้",
    choices: [
      { text: "บอกคนไข้ว่าห้ามเชื่อ AI เด็ดขาดเพราะมันเป็นของปลอม" },
      { text: "เปลี่ยนแผนการรักษาตามที่ AI บอกทันทีเพื่อตามใจคนไข้" },
      { text: "รับฟัง ชวนคุยเพื่อดูความกังวล และอธิบายด้วยหลักวิชาการว่าวิธีของเราเหมาะที่สุด" },
      { text: "เชิญคนไข้ให้ออกจากห้องตรวจและปฏิเสธการรักษา" },
    ],
    correctIndex: 2,
  },
  {
    prompt: "ข้อใดเป็นวิธีนำ Generative AI มาช่วยงานวิจัยหรือการเรียนต่อได้อย่างปลอดภัยและมีจริยธรรม",
    choices: [
      { text: "ให้ AI เขียนบทคัดย่อ (Abstract) ให้ โดยที่เราไม่ต้องอ่านงานวิจัยชิ้นนั้นเลย" },
      { text: "ใช้ AI ช่วยขัดเกลาสำนวนภาษาอังกฤษให้สละสลวยขึ้น จากเนื้อหาที่เราวิจัยเอง" },
      { text: "พิมพ์สั่งว่า ช่วยคิดตัวเลขผลการทดลองในห้องแล็บให้หน่อย" },
      { text: "คัดลอกบทความจากเว็บอื่นมาให้ AI สรุปแล้วส่งเป็นผลงานตัวเอง" },
    ],
    correctIndex: 1,
  },
  {
    prompt: "คำว่า Human-in-the-loop ในการใช้ AI ทางการแพทย์ หมายความว่าอย่างไร",
    choices: [
      { text: "การบังคับให้แพทย์ต้องนั่งเฝ้าหน้าจอคอมพิวเตอร์ห้ามลุกไปไหน" },
      { text: "ต้องมี มนุษย์ (แพทย์) คอยตรวจสอบและตัดสินใจขั้นสุดท้ายเสมอ ก่อนนำผลไปใช้กับคนไข้" },
      { text: "การเอาคนไข้เข้าไปอยู่ในเครื่องประมวลผลของ AI" },
      { text: "การปล่อยให้ AI ตัดสินใจทุกอย่าง แล้วให้แพทย์ทำหน้าที่เซ็นชื่ออย่างเดียว" },
    ],
    correctIndex: 1,
  },
  {
    prompt: "ข้อใดสะท้อนทัศนคติที่ดีที่สุดของแพทย์/ทันตแพทย์จบใหม่ ในยุคที่มี AI เข้ามาช่วยทำงาน",
    choices: [
      { text: "ต่อต้านและไม่ยอมรับเทคโนโลยีทุกชนิด เพราะเชื่อว่ามนุษย์เก่งที่สุดแล้ว" },
      { text: "เปิดใจเรียนรู้เพื่อช่วยลดงานแอดมิน แต่ยังคงฝึกฝนทักษะทางคลินิกและจริยธรรมเข้มงวด" },
      { text: "พึ่งพา AI ทุกอย่างจนไม่ต้องอ่านตำราหรือทบทวนความรู้เองอีกต่อไป" },
      { text: "ลาออกไปทำอาชีพอื่นเพราะคิดว่า AI จะมาแย่งงานแพทย์ในอีก 1-2 ปีนี้แน่นอน" },
    ],
    correctIndex: 1,
  },
];

export function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export function emptyQuestion(): Question {
  return {
    prompt: "",
    choices: [{ text: "" }, { text: "" }, { text: "" }, { text: "" }],
    correctIndex: 0,
  };
}

export function calculateAnswerScore(answer: Answer | undefined, question: Question | undefined, session: GameSession | null) {
  if (!answer || !question || !session?.question_started_at || answer.choice_index !== question.correctIndex) {
    return 0;
  }

  const startedAt = new Date(session.question_started_at).getTime();
  const answeredAt = answer.created_at ? new Date(answer.created_at).getTime() : startedAt + session.question_duration * 1000;
  const elapsedMs = Math.max(0, answeredAt - startedAt);
  const durationMs = Math.max(1000, session.question_duration * 1000);
  const remainingRatio = Math.max(0, Math.min(1, (durationMs - elapsedMs) / durationMs));

  return Math.round(500 + 500 * remainingRatio);
}

export function parseQuestionsCsv(csvText: string) {
  const rows = parseCsvRows(csvText.trim());
  if (rows.length < 2) {
    throw new Error("CSV ต้องมี header และคำถามอย่างน้อย 1 แถว");
  }

  const headers = rows[0].map((header) => header.trim());
  const required = ["Question", "Answer 1", "Answer 2", "Answer 3", "Answer 4", "Correct answer"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) {
    throw new Error(`CSV ขาดคอลัมน์: ${missing.join(", ")}`);
  }

  const indexOf = (header: string) => headers.indexOf(header);
  const questions = rows.slice(1).filter((row) => row.some((cell) => cell.trim())).map((row, rowIndex) => {
    const prompt = row[indexOf("Question")]?.trim() ?? "";
    const choices = [1, 2, 3, 4].map((answerNumber) => ({
      text: row[indexOf(`Answer ${answerNumber}`)]?.trim() ?? "",
    }));
    const correctAnswer = Number(row[indexOf("Correct answer")]?.trim());

    if (!prompt || choices.some((choice) => !choice.text) || !Number.isInteger(correctAnswer) || correctAnswer < 1 || correctAnswer > 4) {
      throw new Error(`ข้อมูลคำถามแถวที่ ${rowIndex + 2} ไม่สมบูรณ์`);
    }

    return {
      prompt,
      choices,
      correctIndex: correctAnswer - 1,
      imageUrl: headers.includes("Image URL") ? row[indexOf("Image URL")]?.trim() || undefined : undefined,
    };
  });

  if (!questions.length) {
    throw new Error("ไม่พบคำถามใน CSV");
  }

  return questions;
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows;
}
