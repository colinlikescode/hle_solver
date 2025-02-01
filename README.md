> [!Important]
> This is an experimental repository & may produce mixed results!

[Humanity's Last Exam](https://agi.safe.ai) was co-created by the [Center for AI Safety](https://www.safe.ai) in collaboration with [Scale AI](https://scale.com). The exam contains 3,000 of the world's most challenging questions. The benchmark is meant to push LLM solving to the frontier of human knowledge.

The goal for this exercise was to test if a multi-LLM approach that utilizes two of the world's "most powerful" language models according to the [Seal LLM Leaderboard](https://scale.com/leaderboard/instruction_following) could outperform independent instances of either DeepSeek's r1 or OpenAI's o1 models. For context, this repository contains a typescript implementation of the original HLE parquet exam questions in the src folder, and can be ran locally on your laptop

<br>

| Model               | Accuracy (%) |
| ------------------- | :----------: |
| GPT-4o              |     3.3      |
| Grok-2              |     3.8      |
| Claude 3.5 Sonnet   |     4.3      |
| Gemini Thinking     |     6.2      |
| o1                  |     9.1      |
| DeepSeek-R1\*       |     9.4      |
| Multi-LLM R1 + o1\* |     12.2     |

\*Model is not multi-modal, evaluated on text-only subset.

<br>

### Experiment highlights, why early testing shows high performance

- Both OpenAI's o1 & DeepSeek's r1 are initially prompted to be co-directors of a question solving task-force
- Each co-director can consult with an infinite number subordinates on their team, posing subquestions for them to solve, in order to assist the co-director in finalizing an answer to the original question asked by HLE.
- After each co-director forms an independent answer utilizing their team of subordinates, the co-directors then showcase their answers to each other. If the co-directors disagree, they must negotiate. The negotiation involves sharing the logic and reasoning behind each solution until a final consensus is reached.
- It's worth noting, for this experiment, o1 is hosted on OpenAI's 1st Party Developer Platform. r1 is hosted on replicate.com's infrastructure.
- If you would like to clone the repository, you will need an API key for both services to place in your .env

<br>

### MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
