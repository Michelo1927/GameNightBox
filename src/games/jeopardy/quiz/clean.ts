import type { FinalQuestion, Media, Question, Quiz } from './schema';

function cleanMedia(m?: Media): Media | undefined {
  if (!m || !m.src.trim()) return undefined;
  const out: Media = { type: m.type, src: m.src.trim() };
  if (m.start !== undefined && !Number.isNaN(m.start)) out.start = m.start;
  if (m.end !== undefined && !Number.isNaN(m.end)) out.end = m.end;
  if (m.audioOnly) out.audioOnly = true;
  if (m.caption?.trim()) out.caption = m.caption.trim();
  return out;
}

export function cleanQuestion(q: Question): Question {
  const o: Question = { points: q.points, question: q.question.trim(), answer: q.answer.trim() };
  const media = cleanMedia(q.media);
  if (media) o.media = media;
  if (q.choices) {
    const choices = q.choices.map((x) => x.trim()).filter(Boolean);
    if (choices.length) o.choices = choices;
  }
  if (q.rules?.trim()) o.rules = q.rules.trim();
  const answerMedia = cleanMedia(q.answerMedia);
  if (answerMedia) o.answerMedia = answerMedia;
  if (q.hostNote?.trim()) o.hostNote = q.hostNote.trim();
  return o;
}

/** Drops empty optional fields and trims text, so saved/shared quizzes stay tidy. */
export function cleanQuiz(quiz: Quiz): Quiz {
  const out: Quiz = { title: quiz.title.trim(), categories: [] };
  if (quiz.description?.trim()) out.description = quiz.description.trim();
  if (quiz.author?.trim()) out.author = quiz.author.trim();
  if (quiz.credits?.length) out.credits = quiz.credits;
  out.categories = quiz.categories.map((c) => ({ name: c.name.trim(), questions: c.questions.map(cleanQuestion) }));
  const final = cleanFinal(quiz.final);
  if (final) out.final = final;
  return out;
}

/** The final question is optional: an untouched one (no category, question or answer) is dropped. */
export function cleanFinal(f?: FinalQuestion): FinalQuestion | undefined {
  if (!f || (!f.category.trim() && !f.question.trim() && !f.answer.trim() && !f.media?.src.trim())) return undefined;
  const { points: _, ...q } = cleanQuestion({ ...f, points: 0 });
  return { category: f.category.trim(), ...q };
}

/** A question is ready to play when it has an answer and either text or media. */
export const isQuestionComplete = (q: Question) => !!q.answer.trim() && (!!q.question.trim() || !!q.media?.src.trim());
