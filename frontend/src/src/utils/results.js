export const getResultSubject = (result) => {
  const rawSubject =
    result?.analytics?.test_subject ||
    result?.test_subject ||
    result?.subject ||
    'Test Result';

  return String(rawSubject)
    .replace(/\s*[-#·]\s*[A-Fa-f0-9]{6,12}$/u, '')
    .trim() || 'Test Result';
};

export const getResultAccuracy = (result) =>
  result?.accuracy ?? result?.accuracy_percent ?? 0;

export const getResultCorrect = (result) =>
  result?.correct ?? result?.correct_count ?? result?.score ?? 0;

export const getResultWrong = (result) =>
  result?.wrong ?? result?.wrong_count ?? Math.max((result?.total ?? 0) - getResultCorrect(result), 0);
