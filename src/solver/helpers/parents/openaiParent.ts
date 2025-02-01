import { OpenAI } from 'openai';
import 'dotenv/config';
import { ConversationContext } from '../../conversationContext';
import { OpenAIChild } from '../children/openaiChild';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      const subtaskPrompt = match[1].trim();
      subtasks.push(subtaskPrompt);
    }

    for (const st of subtasks) {
      const childResult = await childFunction(st);

      solution += `\n[OpenAIParent] Child result for "${st}": ${childResult}`;
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

export async function OpenAIParent(
  context: ConversationContext,
  otherParentFinalAnswer?: string,
  myLastFinalAnswer?: string,
  otherParentSolutionOutline?: string,
  myLastSolutionOutline?: string,
): Promise<{ finalAnswer: string; solutionOutline: string; explanation: string } | 'error'> {
  const isDiscussion = Boolean(otherParentFinalAnswer && myLastFinalAnswer);

  let systemPrompt = `
You are assisting in analyzing a complex question using structured reasoning.
You must consider that you are working together with a sibling parent model called "DeepSeek."
You each produce an independent solution, then negotiate to converge on a single best answer.

Your goal is to provide a well-supported and logically structured response, in valid JSON:
{
  "finalAnswer": "...",
  "solutionOutline": "...",
  "explanation": "..."
}

"finalAnswer" is your concluding solution.
"solutionOutline" is a structured breakdown (you may keep hidden chain-of-thought private, but remain coherent).
"explanation" is a concise justification.

You CAN call your sub-model (OpenAIChild) by writing "SUBTASK: <something>" in your solutionOutline.
You can make multiple subtask calls if needed; each subtask line should be: SUBTASK: ...
Then you finalize a single consistent solution.
`;

  if (!isDiscussion) {
    systemPrompt += `
=================
INITIAL ANSWER MODE
=================
Main question: "${context.question}"

1) Break it into logical parts.
2) Provide finalAnswer, solutionOutline, explanation.
3) If you need more detail, do "SUBTASK: <some subtask>" in solutionOutline (multiple times if needed).
4) Return valid JSON.
`;
  } else {
    systemPrompt += `
=================
NEGOTIATION MODE
=================
Another parent "DeepSeek" has weighed in.

DeepSeek's finalAnswer: "${otherParentFinalAnswer}"
Your last finalAnswer: "${myLastFinalAnswer}"

DeepSeek's solutionOutline: "${otherParentSolutionOutline}"
Your last solutionOutline: "${myLastSolutionOutline}"

Compare, refine, or unify your finalAnswer. 
Use "SUBTASK: <stuff>" if needed (multiple times).
Return updated JSON with finalAnswer, solutionOutline, explanation.
`;
  }

  context.openAiParentHistory.push({ role: 'system', content: systemPrompt });
  const messages = [...context.openAiParentHistory, ...gatherNegotiationHistory(context)];

  try {
    const response = await openai.chat.completions.create({
      model: 'o1',
      messages,
    });

    const rawText = response.choices?.[0]?.message?.content?.trim() || '{}';
    context.openAiParentHistory.push({ role: 'assistant', content: rawText });

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return 'error';
    }

    if (typeof parsed.finalAnswer !== 'string') {
      return 'error';
    }

    let solutionOutline: string;
    if (typeof parsed.solutionOutline === 'string') {
      solutionOutline = parsed.solutionOutline;
    } else if (Array.isArray(parsed.solutionOutline)) {
      solutionOutline = parsed.solutionOutline.join('\n');
    } else {
      return 'error';
    }

    if (typeof parsed.explanation !== 'string') {
      return 'error';
    }

    solutionOutline = await resolveAllSubtasks(solutionOutline, OpenAIChild);

    return {
      finalAnswer: parsed.finalAnswer,
      solutionOutline,
      explanation: parsed.explanation,
    };
  } catch (err) {
    console.error('[OpenAIParent] Error in completion:', err);
    return 'error';
  }
}
