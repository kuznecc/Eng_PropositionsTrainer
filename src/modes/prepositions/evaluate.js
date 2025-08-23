import { sanitizeAnswer, splitAnswers } from '../../utils/validation.js';

export function evaluate(input, item) {
  const answers = splitAnswers(item.preposition);
  const v = sanitizeAnswer(input);
  const correct = answers.includes(v);
  return { correct, correctAnswers: answers };
}

