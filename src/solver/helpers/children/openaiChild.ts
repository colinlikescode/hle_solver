import 'dotenv/config';
//@ts-ignore
import { OpenAI } from 'openai';
//@ts-ignore
const openai = new OpenAI({
  //@ts-ignore
  apiKey: process.env.OPENAI_API_KEY,
});

export async function OpenAIChild(question: string) {
  console.log('OpenAIChild sub-question:', question);

  let content = [
    {
      role: 'system',
      content: `
You are a subtask solver for "OpenAI." 
Your only job is to handle the sub-question with thorough reasoning.

Return valid JSON: {"answer":"<your answer>"}

Steps:
1) Read the sub-question carefully.
2) Breathe for 5 seconds.
3) Think step by step for as long as needed.
4) Return exactly {"answer":"<your answer>"} with no extras.
`,
    },
    {
      role: 'user',
      content: `Sub-question: ${question}\n\nReturn {"answer":"<your answer>"}`,
    },
  ];

  const requestPayload = {
    model: 'o1',
    messages: content,
  };

  try {
    //@ts-ignore
    const response = await openai.chat.completions.create(requestPayload);
    const rawJson = response.choices?.[0]?.message?.content?.trim() || '{}';
    console.log('OpenAIChild raw:', rawJson);

    const parsed = JSON.parse(rawJson);
    if (parsed.answer && typeof parsed.answer === 'string') {
      return parsed.answer;
    }
    return 'error';
  } catch (err) {
    console.error('OpenAIChild error:', err);
    return 'error';
  }
}
