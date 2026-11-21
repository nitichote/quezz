export type ImportedQuestion = {
  prompt: string;
  choices: Array<{ text: string }>;
  correctIndex: number;
  imageUrl?: string;
};

export function parseQuestionsCsv(csvText: string): ImportedQuestion[] {
  const normalizedCsv = csvText.replace(/^\uFEFF/, "").trim();
  const rows = parseCsvRows(normalizedCsv);
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
  const questions: ImportedQuestion[] = [];
  const issues: string[] = [];

  rows.slice(1).forEach((row, rowIndex) => {
    if (!row.some((cell) => cell.trim())) return;

    const csvRowNumber = rowIndex + 2;
    const rowIssues: string[] = [];
    const prompt = row[indexOf("Question")]?.trim() ?? "";
    const choices = [1, 2, 3, 4].map((answerNumber) => ({
      text: row[indexOf(`Answer ${answerNumber}`)]?.trim() ?? "",
    }));
    const correctAnswerValue = row[indexOf("Correct answer")]?.trim() ?? "";
    const correctAnswer = parseCorrectAnswer(
      correctAnswerValue,
      choices.map((choice) => choice.text),
    );

    if (row.length > headers.length) {
      rowIssues.push(`พบ ${row.length} คอลัมน์ แต่ header มี ${headers.length} คอลัมน์ กรุณาตรวจ comma และเครื่องหมาย quote`);
    }
    if (!prompt) rowIssues.push('ช่อง "Question" ว่าง');
    choices.forEach((choice, choiceIndex) => {
      if (!choice.text) rowIssues.push(`ช่อง "Answer ${choiceIndex + 1}" ว่าง`);
    });
    if (!correctAnswerValue) {
      rowIssues.push('ช่อง "Correct answer" ว่าง');
    } else if (correctAnswer === null) {
      rowIssues.push(
        `ช่อง "Correct answer" มีค่า "${correctAnswerValue}" ซึ่งไม่รองรับ (ใช้ 1-4, A-D, Answer 1-4 หรือข้อความที่ตรงกับคำตอบ)`,
      );
    }

    if (rowIssues.length) {
      issues.push(...rowIssues.map((issue) => `แถวที่ ${csvRowNumber}: ${issue}`));
      return;
    }

    questions.push({
      prompt,
      choices,
      correctIndex: correctAnswer as number,
      imageUrl: headers.includes("Image URL") ? row[indexOf("Image URL")]?.trim() || undefined : undefined,
    });
  });

  if (issues.length) {
    const visibleIssues = issues.slice(0, 12);
    const remainingCount = issues.length - visibleIssues.length;
    const remainingMessage = remainingCount > 0 ? `\n- และอีก ${remainingCount} จุด` : "";
    throw new Error(`นำเข้า CSV ไม่สำเร็จ พบ ${issues.length} จุด:\n- ${visibleIssues.join("\n- ")}${remainingMessage}`);
  }

  if (!questions.length) {
    throw new Error("ไม่พบคำถามใน CSV");
  }

  return questions;
}

function parseCorrectAnswer(value: string, choiceTexts: string[]) {
  const normalized = value.trim();
  const answerNumberMatch = normalized.match(/^(?:answer\s*|ข้อ\s*)?([1-4])$/i);
  if (answerNumberMatch) return Number(answerNumberMatch[1]) - 1;

  const answerLetterMatch = normalized.match(/^([a-d])$/i);
  if (answerLetterMatch) return answerLetterMatch[1].toLowerCase().charCodeAt(0) - 97;

  const textIndex = choiceTexts.findIndex((choiceText) => choiceText.trim() === normalized);
  return textIndex >= 0 ? textIndex : null;
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

  if (inQuotes) {
    throw new Error('CSV อ่านไม่ได้: มีเครื่องหมาย quote (") เปิดไว้แต่ไม่ปิด กรุณาตรวจข้อความที่มี comma หรือเครื่องหมายคำพูด');
  }

  currentRow.push(currentCell);
  rows.push(currentRow);
  return rows;
}

