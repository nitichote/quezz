import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseQuestionsCsv } from "../lib/quiz-csv";

test("imports the supplied A-D answer format", async () => {
  const csvPath = process.env.npm_config_fixture;
  if (!csvPath) return;

  const csv = await readFile(csvPath, "utf8");
  const questions = parseQuestionsCsv(csv);

  assert.equal(questions.length, 10);
  assert.deepEqual(
    questions.map((question) => question.correctIndex),
    [1, 1, 1, 3, 2, 3, 3, 2, 1, 2],
  );
});

test("reports every incomplete field with its CSV row", () => {
  const csv = [
    "Question,Answer 1,Answer 2,Answer 3,Answer 4,Correct answer",
    "คำถามแรก,หนึ่ง,สอง,,สี่,B",
    "คำถามที่สอง,หนึ่ง,สอง,สาม,สี่,X",
  ].join("\n");

  assert.throws(
    () => parseQuestionsCsv(csv),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /แถวที่ 2.*Answer 3/);
      assert.match(error.message, /แถวที่ 3.*Correct answer.*X/);
      return true;
    },
  );
});

test("reports an unclosed quoted field", () => {
  const csv = 'Question,Answer 1,Answer 2,Answer 3,Answer 4,Correct answer\n"คำถาม,หนึ่ง,สอง,สาม,สี่,1';

  assert.throws(() => parseQuestionsCsv(csv), /เครื่องหมาย quote/);
});

