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
      `SELECT id, code, question_text, category, question_type, options
       FROM decision_tree_nodes
       WHERE is_root = TRUE AND is_active = TRUE
       ORDER BY display_order
       LIMIT 1`
    );

    if (rootResult.rows.length === 0) {
      return res.status(500).json({ error: 'No questionnaire available. Please contact support.' });
    }

    const rootNode = rootResult.rows[0];

    // Create questionnaire response record, tracking current node
    const qrResult = await query(
      `INSERT INTO questionnaire_responses (patient_id, current_node_code, responses, decision_path, completed)
       VALUES ($1, $2, '{}'::jsonb, '[]'::jsonb, FALSE)
       RETURNING id`,
      [patientId, rootNode.code]
    );

    res.json({
      sessionId: qrResult.rows[0].id,
      question: rootNode,
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
    const patientId = req.user.id;

    // Validate session ownership (IDOR fix — SEC4)
    const sessionCheck = await query(
      `SELECT id, current_node_code, completed
       FROM questionnaire_responses
       WHERE id = $1 AND patient_id = $2`,
      [sessionId, patientId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionCheck.rows[0];

    if (session.completed) {
      return res.status(400).json({ error: 'This questionnaire session is already completed' });
    }

    if (!session.current_node_code || currentQuestionId !== session.current_node_code) {
      return res.status(409).json({ error: 'Question does not match the current questionnaire step' });
    }

    const nodeResult = await query(
      'SELECT * FROM decision_tree_nodes WHERE code = $1 AND is_active = TRUE',
      [session.current_node_code]
    );
    const currentNode = nodeResult.rows[0];

    if (!currentNode) {
      return res.json({ completed: true, sessionId });
    }

    // Validate answer against allowed options (SEC4)
    const validOptions = (currentNode.options || []).map(o => o.value);
    if (currentNode.question_type === 'multiple_choice') {
      const answers = Array.isArray(answer) ? answer : [answer];
      const invalid = answers.filter(a => !validOptions.includes(a));
      if (answers.some(a => typeof a !== 'string') || invalid.length > 0) {
        return res.status(400).json({ error: `Invalid answer(s): ${invalid.join(', ')}` });
      }
    } else if (typeof answer !== 'string' || !validOptions.includes(answer)) {
      return res.status(400).json({ error: `Invalid answer: ${answer}. Valid options: ${validOptions.join(', ')}` });
    }

    // Save the current answer with ownership check
    await query(
      `UPDATE questionnaire_responses
       SET responses = responses || $1::jsonb,
           decision_path = decision_path || $2::jsonb
       WHERE id = $3 AND patient_id = $4`,
      [
        JSON.stringify({ [currentNode.code]: answer }),
        JSON.stringify([currentNode.code]),
        sessionId,
        patientId
      ]
    );

    // Determine next node using code-based next_node_logic
    const nextNodeLogic = currentNode.next_node_logic || {};
    let nextNodeCode = null;

    if (typeof answer === 'string' && nextNodeLogic[answer]) {
      nextNodeCode = nextNodeLogic[answer];
    } else if (nextNodeLogic['*']) {
      nextNodeCode = nextNodeLogic['*'];
    }

    // If no next node from static logic, try AI engine for adaptive selection
    if (!nextNodeCode) {
      try {
        const sessionResult = await query(
          'SELECT responses FROM questionnaire_responses WHERE id = $1 AND patient_id = $2',
          [sessionId, patientId]
        );
        const currentResponses = sessionResult.rows[0]?.responses || {};

        const aiResponse = await axios.post(`${AI_ENGINE_URL}/next-question`, {
          current_responses: currentResponses,
          answered_questions: Object.keys(currentResponses)
        }, { timeout: 10000 });

        nextNodeCode = aiResponse.data?.next_question_code;
      } catch (aiError) {
        console.error('AI next-question error:', aiError.message);
      }
    }

    // If still no next node, questionnaire is complete
    if (!nextNodeCode) {
      await query(
        `UPDATE questionnaire_responses
         SET completed = TRUE, completed_at = NOW(),
             total_questions = (SELECT jsonb_object_keys_count FROM (SELECT count(*) as jsonb_object_keys_count FROM jsonb_object_keys(responses)) sub)
         WHERE id = $1 AND patient_id = $2`,
        [sessionId, patientId]
      );

      // Get total questions count
      const sessionData = await query(
        'SELECT responses FROM questionnaire_responses WHERE id = $1',
        [sessionId]
      );
      const totalQuestions = Object.keys(sessionData.rows[0]?.responses || {}).length;

      await query(
        'UPDATE questionnaire_responses SET total_questions = $1 WHERE id = $2 AND patient_id = $3',
        [totalQuestions, sessionId, patientId]
      );

      return res.json({ completed: true, sessionId, totalQuestions });
    }

    // Update server-tracked current node
    await query(
      'UPDATE questionnaire_responses SET current_node_code = $1 WHERE id = $2 AND patient_id = $3',
      [nextNodeCode, sessionId, patientId]
    );

    // Fetch next question by code
    const nextQuestion = await query(
      `SELECT id, code, question_text, category, question_type, options
       FROM decision_tree_nodes WHERE code = $1 AND is_active = TRUE`,
      [nextNodeCode]
    );

    if (nextQuestion.rows.length === 0) {
      // Code referenced but question not found — complete the session
      const sessionData = await query(
        'SELECT responses FROM questionnaire_responses WHERE id = $1',
        [sessionId]
      );
      const totalQuestions = Object.keys(sessionData.rows[0]?.responses || {}).length;

      await query(
        'UPDATE questionnaire_responses SET completed = TRUE, completed_at = NOW(), total_questions = $1 WHERE id = $2 AND patient_id = $3',
        [totalQuestions, sessionId, patientId]
      );
      return res.json({ completed: true, sessionId, totalQuestions });
    }

    // Estimate progress
    const sessionData = await query(
      'SELECT responses FROM questionnaire_responses WHERE id = $1',
      [sessionId]
    );
    const answeredCount = Object.keys(sessionData.rows[0]?.responses || {}).length;
    const estimatedTotal = Math.max(answeredCount + 3, 8);
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

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
