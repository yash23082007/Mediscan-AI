const configuredOrigin = process.env.AI_ENGINE_URL || 'http://localhost:5000'

const AI_ENGINE_URL = /^https?:\/\//i.test(configuredOrigin)
  ? configuredOrigin.replace(/\/+$/, '')
  : `http://${configuredOrigin.replace(/\/+$/, '')}`

module.exports = { AI_ENGINE_URL }
