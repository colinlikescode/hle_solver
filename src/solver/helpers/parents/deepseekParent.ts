import Replicate from 'replicate';
import 'dotenv/config';
import { jsonrepair } from 'jsonrepair';
import { ConversationContext } from '../../conversationContext';
import { DeepSeekChild } from '../children/deepseekChild';

const replicate = new Replicate({ auth: process.env.REPLICATE_API_KEY });

async function resolveAllSubtasks(text: string, childFunction: (q: string) => Promise<string>): Promise<string> {
  let solution = text;
  let foundSubtask = true;

  while (foundSubtask) {
    foundSubtask = false;
    const subtaskRegex = /SUBTASK:\s*(.+?)(?:$|\n)/gim;
    let match;
    let subtasks: string[] = [];

    while ((match = subtaskRegex.exec(solution)) !== null) {
      foundSubtask = true;
      subtasks.push(match[1].trim());
    }

    for (const st of subtasks) {
      const childResult = await childFunction(st);
      solution += `\n[DeepSeekParent] Child result for "${st}": ${childResult}`;
    }
  }

  return solution;
}

function gatherNegotiationHistory(context: ConversationContext) {
  return context.sharedNegotiation.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

export async function DeepSeekParent(
  context: ConversationContext,
  otherParentFinalAnswer?: string,
  myLastFinalAnswer?: string,
  otherParentSolutionOutline?: string,
  myLastSolutionOutline?: string,
): Promise<{ finalAnswer: string; solutionOutline: string; explanation: string } | 'error'> {
  const isNegotiation = Boolean(otherParentFinalAnswer && myLastFinalAnswer);

  let systemPrompt = `
You are "DeepSeek," one of two co-directors (the other is "OpenAI"). 
You must produce sophisticated structured reasoning, then converge on a single finalAnswer with your sibling.

Output valid JSON:
{
  "finalAnswer": "...",
  "solutionOutline": "...",
  "explanation": "..."
}

- "finalAnswer": succinct solution
- "solutionOutline": short structured approach (you can use multiple SUBTASK calls if needed).
- "explanation": concise justification

You may do "SUBTASK: <X>" lines as many times as you wish to ask DeepSeekChild for deeper detail.

Ultimately, analyze the question and also respond to your sibling's perspective.
`;

  if (!isNegotiation) {
    systemPrompt += `
=================
INITIAL SOLVE MODE
=================
Grandparent's question: "${context.question}"
1) Possibly break it down, do multiple subtasks if needed.
2) Summarize approach in "solutionOutline".
3) Return finalAnswer, explanation in valid JSON.
`;
  } else {
    systemPrompt += `
=================
NEGOTIATION MODE
=================
OpenAI's finalAnswer: "${otherParentFinalAnswer}"
Your last finalAnswer: "${myLastFinalAnswer}"

OpenAI's solutionOutline: "${otherParentSolutionOutline}"
Your last solutionOutline: "${myLastSolutionOutline}"

Refine, unify, or confirm your finalAnswer. 
You can do multiple "SUBTASK: <stuff>" calls if you like.
Return { finalAnswer, solutionOutline, explanation } in valid JSON.
`;
  }

  context.deepSeekParentHistory.push({ role: 'system', content: systemPrompt });
  const messages = [...context.deepSeekParentHistory, ...gatherNegotiationHistory(context)];

  try {
    const requestPayload = { messages };
    const rawOutput = await replicate.run('deepseek-ai/deepseek-r1', {
      input: { prompt: JSON.stringify(requestPayload) },
    });

    let rawOutputString = '';
    if (Array.isArray(rawOutput)) {
      rawOutputString = rawOutput.join('');
    } else if (typeof rawOutput === 'string') {
      rawOutputString = rawOutput;
    } else {
      rawOutputString = JSON.stringify(rawOutput);
    }

    const jsonMatch = rawOutputString.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[DeepSeekParent] No valid JSON found in replicate output.');
      return 'error';
    }

    let candidateJson = jsonMatch[0];
    candidateJson = candidateJson.replace(/[\u0000-\u0019]+/g, '');
    candidateJson = candidateJson.replace(/\r?\n/g, '\\n');
    candidateJson = candidateJson.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');

    let parsedJson;
    try {
      parsedJson = JSON.parse(candidateJson);
    } catch (e) {
      try {
        const repaired = jsonrepair(candidateJson);
        parsedJson = JSON.parse(repaired);
      } catch (e2) {
        console.error('[DeepSeekParent] JSON parse failed even after repair:', e2);
        return 'error';
      }
    }

    if (typeof parsedJson.finalAnswer !== 'string') {
      return 'error';
    }

    let solutionOutline: string;
    if (typeof parsedJson.solutionOutline === 'string') {
      solutionOutline = parsedJson.solutionOutline;
    } else if (Array.isArray(parsedJson.solutionOutline)) {
      solutionOutline = parsedJson.solutionOutline.join('\n');
    } else {
      return 'error';
    }

    if (typeof parsedJson.explanation !== 'string') {
      return 'error';
    }

    solutionOutline = await resolveAllSubtasks(solutionOutline, DeepSeekChild);

    return {
      finalAnswer: parsedJson.finalAnswer,
      solutionOutline,
      explanation: parsedJson.explanation,
    };
  } catch (err) {
    console.error('[DeepSeekParent] Error:', err);
    return 'error';
  }
}
