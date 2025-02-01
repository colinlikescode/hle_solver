import 'dotenv/config';
//@ts-ignore
import Replicate from 'replicate';
//@ts-ignore
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_KEY,
});

export async function DeepSeekChild(question: string) {
  console.log('DeepSeekChild sub-question:', question);

  let content = [
    {
      role: 'system',
      content: `
You are a subtask solver for "DeepSeek". 
Your only job is to answer the short sub-question with extreme care and accuracy.

You must return valid JSON of the form: {"answer":"<your answer>"}

Steps:
1) Listen carefully.
2) Take a 5-second breath.
3) Thoroughly think step by step.
4) Return ONLY {"answer":"..."} with no extra text.
`,
    },
    {
      role: 'user',
      content: `Sub-question: ${question}\n\nReturn exactly {"answer":"<your answer>"}`,
    },
  ];

  const requestPayload = { messages: content };

  try {
    const input = { prompt: JSON.stringify(requestPayload) };
    const rawOutput = await replicate.run('deepseek-ai/deepseek-r1', { input });

    let rawOutputString = '';
    if (Array.isArray(rawOutput)) {
      rawOutputString = rawOutput.join('');
    } else if (typeof rawOutput === 'string') {
      rawOutputString = rawOutput;
    } else {
      rawOutputString = JSON.stringify(rawOutput);
    }

    console.log('DeepSeekChild raw:', rawOutputString);

    const jsonMatch = rawOutputString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in output');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.answer === 'string') {
      return parsed.answer;
    }
    return 'error';
  } catch (err) {
    console.error('DeepSeekChild error:', err);
    return 'error';
  }
}
