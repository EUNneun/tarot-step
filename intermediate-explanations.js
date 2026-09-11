(function () {
  if (!window.TAROT_DATA || !Array.isArray(window.TAROT_DATA.questions)) return;

  const questions = window.TAROT_DATA.questions;
  const cardNameCache = {};

  if (!document.getElementById('tarotstep-explanation-format-style')) {
    const style = document.createElement('style');
    style.id = 'tarotstep-explanation-format-style';
    style.textContent = '#explain{white-space:pre-line;}';
    document.head.appendChild(style);
  }

  const tidy = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  function splitSentences(text) {
    const source = String(text || '').trim();
    if (!source) return [];
    return (source.match(/[^.!?]+[.!?]?/g) || [source])
      .map(tidy)
      .filter(Boolean);
  }

  function getCorrectChoice(q) {
    return (q.choices || []).find((choice) => choice.correct) || null;
  }

  function getWrongChoices(q) {
    return (q.choices || []).filter((choice) => !choice.correct);
  }

  function parseCoreExplanation(original, q) {
    const source = tidy(original);
    const match = source.match(/^(.+?)\s+핵심:\s*([^.]*)\.\s*(.*)$/);
    if (match) {
      const detailSentences = splitSentences(match[3]);
      const firstDetail = detailSentences[0] || '';
      const cautionLike = /(단정|확정|한 장만으로|별도 문제)/.test(firstDetail);
      const correct = getCorrectChoice(q);
      const answerSentences = splitSentences(correct ? stripContextPrefix(correct.text) : '');
      return {
        name: tidy(match[1]),
        keywords: tidy(match[2]),
        detail: cautionLike ? (answerSentences[0] || firstDetail) : firstDetail,
        caution: cautionLike ? detailSentences.join(' ') : detailSentences.slice(1).join(' ')
      };
    }

    const fallbackName = getCardName(q, original);
    return {
      name: fallbackName,
      keywords: '',
      detail: source,
      caution: ''
    };
  }

  function getCardSpec(cardId) {
    return window.TAROTSTEP_BEGINNER_CARDS?.[cardId] || null;
  }

  function conceptLine(cardId) {
    const spec=getCardSpec(cardId);
    if(!spec) return '';
    return `${spec.name}: ${spec.evidence}. ${spec.core}`;
  }

  function getCardNameById(cardId) {
    if (!cardId) return '';
    if (cardNameCache[cardId]) return cardNameCache[cardId];

    const metaName = window.TAROT_DATA.cardMeta
      && window.TAROT_DATA.cardMeta[cardId]
      && window.TAROT_DATA.cardMeta[cardId].name;
    if (metaName) {
      cardNameCache[cardId] = tidy(metaName);
      return cardNameCache[cardId];
    }

    cardNameCache[cardId] = cardId;
    return cardId;
  }

  function getCardName(q, original) {
    const correct = getCorrectChoice(q);
    if (correct && correct.value_id === q.card_id) {
      const text = tidy(correct.text);
      if (text.length <= 22 && !/[.!?]/.test(text)) return text;
    }

    const core = tidy(original).match(/^(.+?)\s+핵심:/);
    if (core) return tidy(core[1]);

    const arrow = String(q.prompt || '').match(/→\s*([^\n]+)/);
    if (arrow) return tidy(arrow[1]);

    return q.card_id || '정답 카드';
  }

  function stripContextPrefix(text) {
    let result = tidy(text);
    const prefixes = [
      /^관계에서\s*‘[^’]+’의?\s*흐름이\s*핵심\.\s*/,
      /^업무·조직\s*상황에서\s*‘[^’]+’[가-힣]*\s*두드러진다\.\s*/,
      /^돈·자원\s*문제를\s*‘[^’]+’의\s*관점에서\s*본다\.\s*/,
      /^사람\s*사이에서\s*‘[^’]+’[가-힣]*\s*핵심으로\s*작용한다\.\s*/
    ];
    prefixes.forEach((re) => { result = result.replace(re, ''); });
    return tidy(result);
  }

  function getCompareCue(q) {
    const prompt = String(q.prompt || '');
    const quoted = prompt.match(/“([^”]+)”/);
    const source = quoted ? quoted[1] : prompt;
    const parts = source.split(/\s+[—–-]\s+/);
    return {
      cue: tidy(parts[0]),
      detail: tidy(parts.slice(1).join(' — '))
    };
  }

  function cardSimilarity(a, b) {
    if (!a || !b) return 0;
    let score = 0;
    const aSuit = a.charAt(0);
    const bSuit = b.charAt(0);
    const aRank = a.slice(1);
    const bRank = b.slice(1);
    if (aSuit === bSuit) score += 4;
    if (aRank === bRank) score += 3;
    if (aSuit === 'M' && bSuit === 'M') score += 2;
    if (/^(11|12|13|14)$/.test(aRank) && aRank === bRank) score += 2;
    return score;
  }

  function pickContrast(q) {
    const wrong = getWrongChoices(q).filter((choice) => choice.value_id);
    if (!wrong.length) return null;
    return [...wrong].sort((a, b) =>
      cardSimilarity(q.card_id, b.value_id) - cardSimilarity(q.card_id, a.value_id)
    )[0];
  }

  function buildComparisonExplanation(q, original) {
    const correct = getCorrectChoice(q);
    const cardName = getCardName(q, original);
    const { cue, detail } = getCompareCue(q);
    const meaning = detail || '문제에 제시된 상황과 가장 가까운 흐름입니다.';

    const lines = [
      '핵심 의미',
      `${cardName}: ${meaning}`,
      '',
      '정답 근거',
      cue
        ? `문제의 “${cue}”라는 표현과 뒤의 상황 설명이 ${cardName}의 핵심 흐름을 직접 보여줍니다.`
        : `${cardName}이 문제에서 묻는 핵심 흐름과 가장 가깝습니다.`,
      '',
      '구분 포인트',
      tidy(original)
    ];

    return lines.join('\n');
  }

  function buildSituationExplanation(q, original) {
    const core = parseCoreExplanation(original, q);
    const contrast = pickContrast(q);
    const spec = getCardSpec(q.card_id);
    const cardName = spec?.name || core.name;
    const coreText = spec?.core || core.detail || '카드의 기본 흐름을 질문 상황에 적용합니다.';
    const evidence = spec?.evidence || core.keywords || '핵심 흐름';

    const lines = [
      '핵심 의미',
      `${cardName} — ${evidence}. ${coreText}`,
      '',
      '정답 근거',
      `이 문제에서는 보기의 문장을 그대로 외우기보다 ‘${evidence}’가 상황 속에서 어떻게 드러나는지를 잡는 것이 중요합니다. ${q.category || '해당'} 질문에서도 카드의 기본 의미가 유지되는지를 기준으로 판단합니다.`
    ];

    if (contrast?.value_id) {
      const contrastSpec=getCardSpec(contrast.value_id);
      lines.push('', '구분 포인트');
      if(contrastSpec){
        lines.push(
          `${contrastSpec.name} — ${contrastSpec.evidence}: ${contrastSpec.core}`,
          `${cardName} — ${evidence}: ${coreText}`
        );
      } else {
        lines.push(`${getCardNameById(contrast.value_id)}와는 질문에서 강조하는 초점과 변화 단계가 다릅니다.`);
      }
    }

    if (core.caution) {
      lines.push('', '해석 주의', core.caution);
    } else if (q.category && q.category !== '기본') {
      lines.push('', '적용 포인트', `한 장의 카드로 결과를 단정하기보다 ${evidence}가 현재 상황에서 어떤 태도·감정·판단·현실 조건으로 나타나는지 연결해서 읽습니다.`);
    }
    return lines.join('\n');
  }

  function parseConsultationRoles(prompt) {
    const lines = String(prompt || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const roleLine = lines.find((line) => line.includes(':') && line.includes('·'))
      || lines.find((line) => line.includes(':'));
    if (!roleLine) return [];

    return roleLine.split('·').map((part) => {
      const idx = part.indexOf(':');
      if (idx < 0) return null;
      return {
        role: tidy(part.slice(0, idx)),
        card: tidy(part.slice(idx + 1))
      };
    }).filter(Boolean);
  }

  function removeCardLead(sentence, cardName) {
    if (!sentence || !cardName) return sentence;
    const escaped = cardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return tidy(sentence.replace(new RegExp(`^${escaped}(?:은|는|이|가)?\\s*`), ''));
  }

  function buildConsultationExplanation(q, original) {
    const roles = parseConsultationRoles(q.prompt);
    const sentences = splitSentences(original);
    const correct = getCorrectChoice(q);

    const roleCount = roles.length || Math.min((q.card_ids || []).length, 3);
    const cardSentences = sentences.slice(0, roleCount);
    const synthesis = sentences.slice(roleCount).join(' ');

    const lines = ['카드별 의미'];

    if (roles.length) {
      roles.forEach((item, index) => {
        const meaning = removeCardLead(cardSentences[index] || '', item.card);
        lines.push(`${index + 1}. ${item.role} · ${item.card}${meaning ? `: ${meaning}` : ''}`);
      });
    } else {
      cardSentences.forEach((sentence, index) => lines.push(`${index + 1}. ${sentence}`));
    }

    lines.push('', '카드 흐름');
    lines.push(synthesis || tidy(original));

    if (correct) {
      lines.push(
        '',
        '정답 근거',
        '상담형 문제에서는 한 카드만 강조하거나 결과를 단정하는 보기보다, 각 카드가 맡은 역할을 순서대로 연결하고 내담자가 확인할 수 있는 방향을 제시하는 해석이 적절합니다.',
        '',
        '읽는 순서',
        '현재 상황 → 상대·영향 → 조언의 흐름으로 연결한 뒤, 서로 충돌하는 카드가 있다면 어느 카드가 상황 설명이고 어느 카드가 행동 지침인지 구분해 읽습니다.'
      );
    }

    return lines.join('\n');
  }

  let applied = 0;

  questions.forEach((q) => {
    if (q.difficulty !== '중급') return;

    const original = q.explanation || '';
    if (!original) return;

    if (q.type === '헷갈리는카드') {
      q.explanation = buildComparisonExplanation(q, original);
    } else if (q.type === '오늘의 상담') {
      q.explanation = buildConsultationExplanation(q, original);
    } else if (q.type === '상황해석선택') {
      q.explanation = buildSituationExplanation(q, original);
    } else {
      const core = parseCoreExplanation(original, q);
      q.explanation = [
        '핵심 의미',
        `${core.name}${core.keywords ? ` — ${core.keywords}` : ''}${core.detail ? `. ${core.detail}` : ''}`,
        '',
        '정답 근거',
        getCardSpec(q.card_id)
          ? `${getCardSpec(q.card_id).evidence}가 이 카드의 핵심 구분점입니다. 보기의 표현 자체보다 이 의미가 질문의 상황에서 어떻게 나타나는지를 확인하세요.`
          : tidy(original).replace(/정답(?:인|은|이|가| 문장은?)?\s*[“"'][^”"']+[”"']?(?:입니다|이다)?\.?/g, '카드의 핵심 의미와 질문의 단서를 연결해 판단합니다.')
      ].join('\n');
    }

    applied += 1;
  });

  window.TAROTSTEP_INTERMEDIATE_EXPLANATIONS = { applied };
})();
