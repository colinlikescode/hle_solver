import 'dotenv/config';
//@ts-ignore
import { OpenAI } from 'openai';

//@ts-ignore
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function AnswerFormatChecker(question: string, answer: string) {
  console.log(`[AnswerFormatChecker] Checking format for: ${answer}`);

  let content = [
    {
      role: 'system',
      content: `
Please follow instructions exactly. Return either the original or a fixed answer so that it follows the format in the question if there's a specified format.
Return only valid JSON: {"answer":"<some string>"}
No extra text or keys.
`,
    },
    {
      role: 'user',
      content: `
Check this user's answer: "${answer}"
Does it follow the required answer format from the question: "${question}"?
If not, fix it.

EXAMPLE:

Letter + Answer like "E. Weak Quality Addition" is INCORRECT

Just like "E" by itself is CORRECT

Return only valid JSON: {"answer":"the final or fixed answer"}
No other text or keys.
    `,
    },
  ];

  const requestPayload = {
    model: 'gpt-4o',
    temperature: 0.2,
    messages: content,
  };

  try {
    //@ts-ignore
    const response = await openai.chat.completions.create(requestPayload);
    const rawJson = response.choices?.[0]?.message?.content?.trim() || '{}';
    console.log('[AnswerFormatChecker] Raw:', rawJson);

    const parsed = JSON.parse(rawJson);
    if (parsed.answer && typeof parsed.answer === 'string') {
      return parsed.answer;
    }
    return 'error';
  } catch (err) {
    console.error('[AnswerFormatChecker] error:', err);
    return 'error';
  }
}
