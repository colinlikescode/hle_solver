import { ConversationContext } from './conversationContext';
import { OpenAIParent } from './helpers/parents/openaiParent';
import { DeepSeekParent } from './helpers/parents/deepseekParent';
import AnswerFormatChecker from './answerFormatChecker';

export async function solverGrandParent(question: string) {
  console.log('[Grandparent] Received question:', question);
  const context = new ConversationContext(question);

  const [openAiFirst, deepSeekFirst] = await Promise.all([OpenAIParent(context), DeepSeekParent(context)]);

  if (openAiFirst === 'error') {
    console.error('[Grandparent] OpenAI error');
    return 'error';
  }
  if (deepSeekFirst === 'error') {
    console.error('[Grandparent] DeepSeek error');
    return 'error';
  }

  let openAiChecked = await AnswerFormatChecker(question, openAiFirst.finalAnswer);
  let deepSeekChecked = await AnswerFormatChecker(question, deepSeekFirst.finalAnswer);

  if (openAiChecked === deepSeekChecked) {
    console.log('[Grandparent] Both parents agree immediately:', openAiChecked);
    return openAiChecked;
  }

  console.log('[Grandparent] Disagreement detected. Entering single negotiation phase...');
  let openAiLatest = openAiFirst;
  let deepSeekLatest = deepSeekFirst;

  const maxAttempts = 8;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    console.log(`[Grandparent] Negotiation iteration #${attempt}`);
    console.log(`[Grandparent]   Current => OpenAI: "${openAiChecked}", DeepSeek: "${deepSeekChecked}"`);

    context.sharedNegotiation.push({
      role: 'assistant',
      content: `Negotiation Iteration #${attempt}:
OpenAI's final: ${openAiChecked}
DeepSeek's final: ${deepSeekChecked}`,
    });

    const [oNext, dNext] = await Promise.all([
      OpenAIParent(
        context,
        deepSeekChecked,
        openAiChecked,
        deepSeekLatest.solutionOutline,
        openAiLatest.solutionOutline,
      ),
      DeepSeekParent(
        context,
        openAiChecked,
        deepSeekChecked,
        openAiLatest.solutionOutline,
        deepSeekLatest.solutionOutline,
      ),
    ]);

    if (oNext === 'error' || dNext === 'error') {
      console.error('[Grandparent] Error in negotiation iteration.');
      return 'error';
    }

    openAiLatest = oNext;
    deepSeekLatest = dNext;

    openAiChecked = await AnswerFormatChecker(question, openAiLatest.finalAnswer);
    deepSeekChecked = await AnswerFormatChecker(question, deepSeekLatest.finalAnswer);

    console.log('openAi', openAiLatest);
    console.log('deepSeek', deepSeekLatest);

    if (openAiChecked === deepSeekChecked) {
      console.log('[Grandparent] Converged on:', openAiChecked);
      return openAiChecked;
    }

    attempt++;
  }

  console.log('[Grandparent] Still no agreement => forcing compromise...');
  context.sharedNegotiation.push({
    role: 'assistant',
    content: `
We have not converged. You must now create a single shared finalAnswer that both sides endorse.
No further disagreement is allowed. Summarize or combine your positions.
Return one finalAnswer, solutionOutline, explanation in valid JSON.
`,
  });

  const forcedCompromise = await OpenAIParent(
    context,
    deepSeekChecked,
    openAiChecked,
    deepSeekLatest.solutionOutline,
    openAiLatest.solutionOutline,
  );

  if (forcedCompromise === 'error') {
    console.error('[Grandparent] Forced compromise returned an error.');
    return 'error';
  }

  let finalCompromise = await AnswerFormatChecker(question, forcedCompromise.finalAnswer);
  console.log('[Grandparent] Final forced compromise =', finalCompromise);
  return finalCompromise;
}
