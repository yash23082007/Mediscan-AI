const { query } = require('../config/database');
const axios = require('axios');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:5000';

/**
 * Start a new questionnaire session
 * POST /api/questionnaire/start
 */
const startQuestionnaire = async (req, res, next) => {
  try {
    const patientId = req.user.id;

    // Get the root question node
    const rootResult = await query(
      `SELECT id, question_text, category, question_type, options
       FROM decision_tree_nodes
       WHERE is_root = TRUE AND is_active = TRUE
       ORDER BY display_order
       LIMIT 1`
    );

    if (rootResult.rows.length === 0) {
      return res.status(500).json({ error: 'No questionnaire available' });
    }

    // Create questionnaire response record
    const qrResult = await query(
      `INSERT INTO questionnaire_responses (patient_id, responses, decision_path, completed)
       VALUES ($1, '{}'::jsonb, '[]'::jsonb, FALSE)
       RETURNING id`,
      [patientId]
    );

    res.json({
      sessionId: qrResult.rows[0].id,
      question: rootResult.rows[0],
      totalEstimatedQuestions: 8
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get next adaptive question
 * POST /api/questionnaire/next
 */
const getNextQuestion = async (req, res, next) => {
  try {
    const { sessionId, currentQuestionId, answer } = req.body;

    // Save the current answer
    await query(
      `UPDATE questionnaire_responses
       SET responses = responses || $1::jsonb,
           decision_path = decision_path || $2::jsonb
       WHERE id = $3`,
      [
        JSON.stringify({ [currentQuestionId]: answer }),
        JSON.stringify([currentQuestionId]),
        sessionId
      ]
    );

    // Get current node to determine next
    const currentNode = await query(
      'SELECT * FROM decision_tree_nodes WHERE id = $1',
      [currentQuestionId]
    );

    if (currentNode.rows.length === 0) {
      return res.json({ completed: true, sessionId });
    }

    const node = currentNode.rows[0];
    const nextNodeLogic = node.next_node_logic || {};

    // Determine next node ID
    let nextNodeId = null;

    if (typeof answer === 'string' && nextNodeLogic[answer]) {
      nextNodeId = nextNodeLogic[answer];
    } else if (nextNodeLogic['*']) {
      nextNodeId = nextNodeLogic['*'];
    }

    // If no next node, try AI engine for adaptive selection
    if (!nextNodeId) {
      try {
        // Get current responses
        const sessionResult = await query(
          'SELECT responses FROM questionnaire_responses WHERE id = $1',
          [sessionId]
        );
        const currentResponses = sessionResult.rows[0]?.responses || {};

        const aiResponse = await axios.post(`${AI_ENGINE_URL}/next-question`, {
          current_responses: currentResponses,
          answered_questions: Object.keys(currentResponses)
        }, { timeout: 10000 });

        nextNodeId = aiResponse.data?.next_question_id;
      } catch (aiError) {
        console.error('AI next-question error:', aiError.message);
        // Questionnaire is complete if AI can't determine next
      }
    }

    // If still no next node, questionnaire is complete
    if (!nextNodeId) {
      await query(
        `UPDATE questionnaire_responses SET completed = TRUE, completed_at = NOW() WHERE id = $1`,
        [sessionId]
      );

      // Count total questions answered
      const sessionData = await query(
        'SELECT responses FROM questionnaire_responses WHERE id = $1',
        [sessionId]
      );
      const totalQuestions = Object.keys(sessionData.rows[0]?.responses || {}).length;

      await query(
        'UPDATE questionnaire_responses SET total_questions = $1 WHERE id = $2',
        [totalQuestions, sessionId]
      );

      return res.json({ completed: true, sessionId, totalQuestions });
    }

    // Fetch next question
    const nextQuestion = await query(
      `SELECT id, question_text, category, question_type, options
       FROM decision_tree_nodes WHERE id = $1 AND is_active = TRUE`,
      [nextNodeId]
    );

    if (nextQuestion.rows.length === 0) {
      await query(
        'UPDATE questionnaire_responses SET completed = TRUE, completed_at = NOW() WHERE id = $1',
        [sessionId]
      );
      return res.json({ completed: true, sessionId });
    }

    // Estimate progress
    const sessionData = await query(
      'SELECT responses FROM questionnaire_responses WHERE id = $1',
      [sessionId]
    );
    const answeredCount = Object.keys(sessionData.rows[0]?.responses || {}).length;
    const estimatedTotal = Math.max(answeredCount + 3, 8); // Rough estimate
    const progress = Math.min(95, Math.round((answeredCount / estimatedTotal) * 100));

    res.json({
      question: nextQuestion.rows[0],
      progress,
      answeredCount,
      sessionId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get questionnaire session data
 * GET /api/questionnaire/:sessionId
 */
const getSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await query(
      'SELECT * FROM questionnaire_responses WHERE id = $1 AND patient_id = $2',
      [sessionId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startQuestionnaire,
  getNextQuestion,
  getSession
};
