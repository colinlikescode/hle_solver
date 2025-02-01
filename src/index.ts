import 'dotenv/config';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ParquetReader } from '@dsnp/parquetjs';
import { solverGrandParent } from './solver/solverGrandParent';

const TOTAL_QUESTIONS = 3000; // 3000 is the total questions, you can decrease for testing
const BATCH_SIZE = 10; // 10 seems to work with most laptop hardware

interface HLERow {
  id?: string;
  question?: string;
  answer?: string;
  image?: string;
  image_preview?: string;
  answer_type?: string;
  author_name?: string;
  rationale?: string;
  raw_subject?: string;
  category?: string;
  canary?: string;
}

const CSV_FILE = `answers_${uuidv4()}.csv`;
fs.writeFileSync(CSV_FILE, 'question,real_answer,ai_answer\n');

function chunkArray<T>(array: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) => array.slice(i * size, i * size + size));
}

async function readParquetFile() {
  try {
    console.log('Opening Parquet file...');
    const reader = await ParquetReader.openFile('src/hle.parquet');
    const cursor = reader.getCursor();
    const records: { question: string; id: string; realAnswer: string }[] = [];

    console.log('Successfully opened file. Reading rows...');
    let rowIndex = 0;
    let corruptCount = 0;

    while (records.length < TOTAL_QUESTIONS) {
      try {
        const row = (await cursor.next()) as HLERow;
        if (!row) break;
        rowIndex++;

        if (!row.question || !row.id || !row.answer) {
          corruptCount++;
          continue;
        }
        if (row.image && row.image.length > 0) {
          corruptCount++;
          continue;
        }

        delete row.image;
        delete row.image_preview;

        records.push({
          question: row.question,
          id: row.id,
          realAnswer: row.answer,
        });
      } catch (err: any) {
        corruptCount++;
        console.error(`Skipping corrupt row ${rowIndex}: ${err.message}`);
      }
    }

    console.log(`Read ${records.length} valid rows.`);
    console.log(`Skipped ${corruptCount} corrupt rows.`);
    await reader.close();
    return records;
  } catch (error) {
    console.error('Fatal error reading Parquet file:', error);
    process.exit(1);
  }
}

async function processQuestions(records: { question: string; id: string; realAnswer: string }[]) {
  try {
    const batches = chunkArray(records, BATCH_SIZE);
    const allPredictions = [];

    for (let i = 0; i < batches.length; i++) {
      console.log(`Processing batch ${i + 1}/${batches.length}`);
      const batch = batches[i];

      const results = await Promise.all(
        batch.map(async (item) => {
          const ai_answer = await solverGrandParent(item.question);

          fs.appendFileSync(
            CSV_FILE,
            `"${item.question.replace(/"/g, '""')}","${item.realAnswer.replace(/"/g, '""')}","${String(
              ai_answer,
            ).replace(/"/g, '""')}"\n`,
          );

          return {
            id: item.id,
            question: item.question,
            realAnswer: item.realAnswer,
            answer: ai_answer,
          };
        }),
      );
      allPredictions.push(...results);
    }

    fs.writeFileSync('predictions.json', JSON.stringify(allPredictions, null, 2));
    console.log('Generated predictions.json');

    let correctCount = 0;
    for (const pred of allPredictions) {
      if (pred.answer === pred.realAnswer) {
        correctCount++;
      }
    }
    const percentageCorrect = (correctCount / allPredictions.length) * 100;
    console.log(`Accuracy: ${percentageCorrect.toFixed(2)}%`);
  } catch (error) {
    console.error('Error processing questions:', error);
    process.exit(1);
  }
}

async function main() {
  console.log('Starting...');
  const records = await readParquetFile();
  console.log('Processing records in batches of 10...');
  await processQuestions(records);
}

main();
