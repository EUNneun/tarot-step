const ALLOWED_ORIGINS = new Set([
  'https://eunneun.github.io',
  'https://tarot.eunlab.com',
  'https://tarot-step-mw2v.vercel.app'
]);

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function extractOutputText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  for (const item of data?.output || []) {
    if (item?.type !== 'message') continue;
    for (const part of item?.content || []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') return part.text.trim();
    }
  }
  return '';
}

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: 'OPENAI_API_KEY is not configured' });
  }

  const { question, context, cards, answer } = req.body || {};
  if (!question || !answer || !Array.isArray(cards) || cards.length < 1) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (String(answer).trim().length < 20) {
    return res.status(400).json({ error: 'Answer is too short' });
  }

  const cardText = cards.map(c => `${c.role}: ${c.name}`).join('\n');
  const input = `상담 질문: ${question}\n상황: ${context || '별도 정보 없음'}\n카드:\n${cardText}\n\n학습자 해석:\n${String(answer).trim()}`;

  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      score: { type: 'integer', minimum: 0, maximum: 100 },
      cardUnderstanding: { type: 'integer', minimum: 0, maximum: 100 },
      connection: { type: 'integer', minimum: 0, maximum: 100 },
      contextFit: { type: 'integer', minimum: 0, maximum: 100 },
      overInterpretation: { type: 'integer', minimum: 0, maximum: 100 },
      goodPoints: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
      missedPoints: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 3 },
      feedback: { type: 'string' },
      improvedReading: { type: 'string' }
    },
    required: ['score','cardUnderstanding','connection','contextFit','overInterpretation','goodPoints','missedPoints','feedback','improvedReading']
  };

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-5.2',
        store: false,
        reasoning: { effort: 'low' },
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'tarot_reading_review',
            strict: true,
            schema
          }
        },
        instructions: '당신은 타로 학습 코치입니다. 점술 결과를 사실처럼 단정하지 말고, 카드 상징과 질문 맥락을 연결하는 학습 관점에서 평가하세요. 사용자의 해석에서 잘한 점과 빠진 점을 구체적으로 짚고, 카드별 의미를 나열하는 데 그치지 말고 카드 간 흐름을 평가하세요. 한국어로 간결하게 답하세요. overInterpretation 점수는 100에 가까울수록 단정이 적고 균형 잡힌 해석이라는 뜻입니다.',
        input,
        max_output_tokens: 1200
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('OpenAI error', data);
      return res.status(502).json({ error: 'AI review failed', detail: data?.error?.message || 'Unknown API error' });
    }

    const text = extractOutputText(data);
    if (!text) return res.status(502).json({ error: 'Empty AI response' });

    let review;
    try { review = JSON.parse(text); }
    catch { return res.status(502).json({ error: 'Invalid AI response' }); }

    return res.status(200).json(review);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error' });
  }
};