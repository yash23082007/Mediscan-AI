'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import {
  IconChevronLeft,
  IconArrowRight,
  IconHelpCircle,
  IconCheckCircle,
  IconStethoscope,
  IconAlertTriangle
} from '@/components/Icons'
import ClinicalDisclaimer from '@/components/ClinicalDisclaimer'
import EmergencyNotice from '@/components/EmergencyNotice'

const CATEGORY_RATIONALES = {
  respiratory: 'Evaluating pulmonary symptoms allows our clinical model to distinguish between upper airway irritation, bronchial inflammation, and deeper alveolar distress.',
  gastrointestinal: 'Digestive symptoms help isolate gastroesophageal reflux, microbial gastroenteritis, and hepatobiliary patterns.',
  cardiovascular: 'Thoracic discomfort and circulatory markers are evaluated to screen for cardiovascular contraindications and determine triage urgency.',
  systemic: 'Core manifestations such as chills, pyrexia, and generalized asthenia indicate systemic inflammatory and immunological responses.',
  dermatological: 'Cutaneous presentations provide key diagnostic clues for allergic, viral, or autoimmune etiologies.',
  neurological: 'Cephalic and sensory symptoms are assessed to rule out neurological red flags and secondary headache syndromes.',
  musculoskeletal: 'Joint, axial, and muscular pains differentiate systemic inflammatory arthropathies from acute viral myalgias.'
}

export default function QuestionnairePage() {
  const { authFetch } = useAuth()
  const router = useRouter()
  const [sessionId, setSessionId] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [selectedMultiple, setSelectedMultiple] = useState([])
  const [answeredHistory, setAnsweredHistory] = useState([])
  const [answeredCount, setAnsweredCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [diagnosisLoading, setDiagnosisLoading] = useState(false)

  useEffect(() => {
    startQuestionnaire()
  }, [])

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!currentQuestion || submitting || completed || diagnosisLoading) return

      const options = currentQuestion.options || []
      const isMulti = currentQuestion.question_type === 'multiple_choice'

      // Number key selection (1 to 9)
      const num = parseInt(e.key, 10)
      if (!isNaN(num) && num >= 1 && num <= options.length) {
        const optionVal = options[num - 1].value
        if (isMulti) {
          toggleMultiple(optionVal)
        } else {
          setSelectedAnswer(optionVal)
        }
      }

      // Enter key to proceed if valid
      if (e.key === 'Enter') {
        const hasSelection = isMulti ? selectedMultiple.length > 0 : selectedAnswer !== null
        if (hasSelection) {
          handleNext()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentQuestion, selectedAnswer, selectedMultiple, submitting, completed, diagnosisLoading])

  const startQuestionnaire = async () => {
    try {
      const res = await authFetch('/questionnaire/start', { method: 'POST' })
      const data = await res.json()
      setSessionId(data.sessionId)
      setCurrentQuestion(data.question)
    } catch (err) {
      console.error('Questionnaire start failure:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleNext = async () => {
    if (!currentQuestion) return

    const isMulti = currentQuestion.question_type === 'multiple_choice'
    const answer = isMulti ? selectedMultiple : selectedAnswer
    if (!answer || (Array.isArray(answer) && answer.length === 0)) return

    // Save into history stack for step-back review
    setAnsweredHistory(prev => [
      ...prev,
      { question: currentQuestion, answer, count: answeredCount }
    ])

    setSubmitting(true)
    try {
      const res = await authFetch('/questionnaire/next', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          currentQuestionId: currentQuestion.id,
          answer
        })
      })
      const data = await res.json()

      if (data.completed) {
        setCompleted(true)
        await requestDiagnosis()
      } else {
        setCurrentQuestion(data.question)
        setAnsweredCount(data.answeredCount || answeredCount + 1)
        setSelectedAnswer(null)
        setSelectedMultiple([])
      }
    } catch (err) {
      console.error('Question submission error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    if (answeredHistory.length === 0) return
    const prevItem = answeredHistory[answeredHistory.length - 1]
    const updatedHistory = answeredHistory.slice(0, -1)

    setAnsweredHistory(updatedHistory)
    setCurrentQuestion(prevItem.question)
    setAnsweredCount(prevItem.count)

    const isMulti = prevItem.question.question_type === 'multiple_choice'
    if (isMulti) {
      setSelectedMultiple(Array.isArray(prevItem.answer) ? prevItem.answer : [prevItem.answer])
      setSelectedAnswer(null)
    } else {
      setSelectedAnswer(prevItem.answer)
      setSelectedMultiple([])
    }
  }

  const requestDiagnosis = async () => {
    setDiagnosisLoading(true)
    try {
      const res = await authFetch('/diagnoses', {
        method: 'POST',
        body: JSON.stringify({ questionnaire_id: sessionId })
      })
      const data = await res.json()
      router.push(`/diagnosis?id=${data.diagnosis?.id}`)
    } catch (err) {
      console.error('Diagnosis synthesis error:', err)
      router.push('/dashboard')
    }
  }

  const toggleMultiple = (value) => {
    setSelectedMultiple(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    )
  }

  const isMulti = currentQuestion?.question_type === 'multiple_choice'
  const canProceed = isMulti ? selectedMultiple.length > 0 : selectedAnswer !== null
  const categoryKey = currentQuestion?.category?.toLowerCase() || 'general'
  const rationaleText = CATEGORY_RATIONALES[categoryKey] || 'This symptom inquiry helps differentiate potential conditions across verified clinical datasets.'

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner spinner-lg mb-3" style={{ margin: '0 auto' }}></div>
          <h2 className="heading-sm mb-1">Initiating Clinical Consultation</h2>
          <p className="text-caption">Calibrating adaptive inquiry based on your health baseline...</p>
        </div>
      </div>
    )
  }

  if (completed || diagnosisLoading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <div className="clinical-card-elevated text-center" style={{ maxWidth: '540px', padding: '3rem 2.5rem' }}>
          <div className="spinner spinner-lg mb-3" style={{ margin: '0 auto' }}></div>
          <div className="eyebrow-clinical mb-1">Differential Analysis</div>
          <h2 className="editorial-heading-lg mb-2" style={{ fontSize: '1.75rem' }}>
            Evaluating Clinical Evidence
          </h2>
          <p className="text-secondary mb-4" style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
            Cross-referencing your reported symptom vector with 4,920 peer-reviewed medical cases across 41 pathological conditions...
          </p>
          <div style={{
            height: '4px',
            background: 'var(--surface-subtle)',
            borderRadius: '2px',
            overflow: 'hidden',
            maxWidth: '320px',
            margin: '0 auto'
          }}>
            <div style={{
              height: '100%',
              width: '100%',
              background: 'var(--clinical-teal)',
              animation: 'calmFadeIn 1.2s ease-in-out infinite alternate'
            }}></div>
          </div>
          <p className="text-caption mt-3" style={{ fontSize: '0.75rem' }}>
            Preparing explainable symptom contributions and physician review packet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="question-consultation-container animate-calm-fade">
      {/* Consultation Navigation & Status Bar */}
      <div className="question-status-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          {answeredHistory.length > 0 && (
            <button
              onClick={handleBack}
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem' }}
              title="Return to previous question to modify your response"
            >
              <IconChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <span className="question-counter">
            Consultation Inquiry &bull; Item {answeredCount + 1}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="text-caption text-tabular">
            ~2 min remaining
          </span>
          <span className="question-category-tag">
            {currentQuestion?.category?.replace(/_/g, ' ') || 'Clinical Evaluation'}
          </span>
        </div>
      </div>

      {/* Main Question Environment */}
      {currentQuestion && (
        <div className="clinical-card-elevated" key={currentQuestion.id} style={{ padding: '2.5rem 2.25rem' }}>
          <h1 className="question-statement">
            {currentQuestion.question_text}
          </h1>

          {/* Clinical Rationale — Explaining "Why am I being asked this?" */}
          <div className="question-rationale" role="note">
            <IconHelpCircle size={18} color="var(--clinical-teal)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Clinical Context: </strong>
              <span>{rationaleText}</span>
            </div>
          </div>

          {/* Instruction Note */}
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-caption">
              {isMulti ? 'Select all symptoms that apply to you:' : 'Select the most accurate response:'}
            </span>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>
              Press numbers (1-9) or click
            </span>
          </div>

          {/* Answer Targets */}
          <div className="option-target-list" role={isMulti ? 'group' : 'radiogroup'}>
            {currentQuestion.options?.map((option, i) => {
              const isSelected = isMulti
                ? selectedMultiple.includes(option.value)
                : selectedAnswer === option.value

              return (
                <div
                  key={option.value}
                  className={`option-target ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (isMulti) {
                      toggleMultiple(option.value)
                    } else {
                      setSelectedAnswer(option.value)
                    }
                  }}
                  role={isMulti ? 'checkbox' : 'radio'}
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault()
                      if (isMulti) {
                        toggleMultiple(option.value)
                      } else {
                        setSelectedAnswer(option.value)
                      }
                    }
                  }}
                  id={`option-${i}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                    {isMulti ? (
                      <div className="option-checkbox-box">
                        {isSelected && <span style={{ color: '#ffffff', fontSize: '0.75rem', fontWeight: 700 }}>✓</span>}
                      </div>
                    ) : (
                      <div className="option-radio-dot" />
                    )}
                    <span style={{ fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      {option.label}
                    </span>
                  </div>

                  <span className="text-caption text-tabular" style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                    [{i + 1}]
                  </span>
                </div>
              )
            })}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <span className="text-caption" style={{ fontSize: '0.75rem' }}>
              Answers are securely saved in this consultation.
            </span>

            <button
              className="btn btn-primary btn-lg"
              onClick={handleNext}
              disabled={!canProceed || submitting}
              id="questionnaire-next"
            >
              {submitting ? (
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></span>
              ) : (
                <>
                  <span>Save & Continue</span>
                  <IconArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Immediate Clinical Caution Notice */}
      <div style={{ marginTop: '2rem' }}>
        <EmergencyNotice />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <ClinicalDisclaimer compact />
      </div>
    </div>
  )
}
