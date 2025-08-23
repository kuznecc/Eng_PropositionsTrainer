export const irregularVerbsMode = {
  id: 'irregular_verbs',
  title: 'Irregular Verbs',
  datasetPath: 'assets/dataset/dataset_irregular_verbs.csv',
  schema: { required: ['base', 'past_simple', 'past_participle'], optional: ['meaning_en'] },
  // TODO: implement parseRow, buildPrompt, evaluate, hint, levels
  parseRow(row) { return row; },
  buildPrompt() { return { before: 'Work in progress.', placeholder: '', after: '' }; },
  evaluate() { return { correct: false, correctAnswers: [] }; },
  hint() { return 'Coming soon'; },
  levels() { return null; },
};
