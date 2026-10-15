const RED_FLAG_RULES = [
  {
    questionId: 'q0000000-0000-0000-0000-000000000004',
    values: ['bloody'],
    level: 'urgent',
    title: 'Coughing blood needs urgent medical attention',
    guidance: 'Contact local emergency services or seek urgent in-person care now.'
  },
  {
    questionId: 'q0000000-0000-0000-0000-000000000008',
    values: ['severe'],
    level: 'urgent',
    title: 'Severe breathing difficulty is an emergency warning sign',
    guidance: 'Call local emergency services now. Do not wait for an online assessment.'
  },
  {
    questionId: 'q0000000-0000-0000-0000-000000000007',
    values: ['1'],
    level: 'urgent',
    title: 'Extremely low energy may require urgent assessment',
    guidance: 'Seek prompt in-person medical evaluation, especially if symptoms are worsening.'
  }
]

function hasValue(answer, values) {
  return Array.isArray(answer) ? answer.some(value => values.includes(value)) : values.includes(answer)
}

function assessTriage(responses = {}) {
  const matches = RED_FLAG_RULES.filter(rule => hasValue(responses[rule.questionId], rule.values))

  if (matches.length === 0) {
    return {
      level: 'routine',
      title: 'No immediate red flags detected in the questionnaire',
      guidance: 'Continue monitoring symptoms and arrange routine clinical care if they persist or worsen.',
      redFlags: []
    }
  }

  return {
    level: 'urgent',
    title: matches[0].title,
    guidance: matches[0].guidance,
    redFlags: matches.map(({ questionId, values, ...rule }) => ({ questionId, values, ...rule }))
  }
}

module.exports = { assessTriage }
