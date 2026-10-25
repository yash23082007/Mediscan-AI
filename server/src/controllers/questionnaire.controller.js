const { randomUUID } = require('node:crypto');
const { collection } = require('../config/database');
const { asRecord } = require('../utils/mongo');

const startQuestionnaire = async (req, res, next) => {
  try {
    const rootNode = await collection('decision_tree_nodes')
      .find({ is_root: true, is_active: true })
      .sort({ display_order: 1 })
      .limit(1)
      .next();

    if (!rootNode) return res.status(500).json({ error: 'No questionnaire available. Please contact support.' });

    const sessionId = randomUUID();
    await collection('questionnaire_responses').insertOne({
      _id: sessionId,
      patient_id: req.user.id,
      current_node_code: rootNode.code,
      responses: {},
      decision_path: [],
      total_questions: 0,
      completed: false,
      completed_at: null,
      created_at: new Date()
    });

    res.json({
      sessionId,
      question: {
        id: String(rootNode._id),
        code: rootNode.code,
        question_text: rootNode.question_text,
        category: rootNode.category,
        question_type: rootNode.question_type,
        options: rootNode.options
      },
      answeredCount: 0
    });
  } catch (error) {
    next(error);
  }
};

const getNextQuestion = async (req, res, next) => {
  try {
    const { sessionId, currentQuestionId, answer } = req.body;
    const patientId = req.user.id;
    const sessionCollection = collection('questionnaire_responses');
    const sessionDoc = await sessionCollection.findOne({ _id: sessionId, patient_id: patientId });
    if (!sessionDoc) return res.status(404).json({ error: 'Session not found' });
    if (sessionDoc.completed) return res.status(400).json({ error: 'This questionnaire session is already completed' });
    if (!sessionDoc.current_node_code || currentQuestionId !== sessionDoc.current_node_code) {
      return res.status(409).json({ error: 'Question does not match the current questionnaire step' });
    }

    const currentNode = await collection('decision_tree_nodes').findOne({
      code: sessionDoc.current_node_code,
      is_active: true
    });
    if (!currentNode) return res.status(409).json({ error: 'Current questionnaire step is unavailable' });

    const validOptions = (currentNode.options || []).map(option => option.value);
    if (currentNode.question_type === 'multiple_choice') {
      const answers = Array.isArray(answer) ? answer : [answer];
      const invalid = answers.filter(value => typeof value !== 'string' || !validOptions.includes(value));
      if (invalid.length) return res.status(400).json({ error: `Invalid answer(s): ${invalid.join(', ')}` });
    } else if (typeof answer !== 'string' || !validOptions.includes(answer)) {
      return res.status(400).json({ error: 'Invalid answer for this question' });
    }

    const nextNodeCode = typeof answer === 'string'
      ? currentNode.next_node_logic?.[answer] || currentNode.next_node_logic?.['*'] || null
      : currentNode.next_node_logic?.['*'] || null;
    const nextNode = nextNodeCode
      ? await collection('decision_tree_nodes').findOne({ code: nextNodeCode, is_active: true })
      : null;
    const responses = { ...(sessionDoc.responses || {}), [currentNode.code]: answer };
    const decisionPath = [...(sessionDoc.decision_path || []), currentNode.code];
    const completed = !nextNode;
    const now = completed ? new Date() : null;

    const updated = await sessionCollection.findOneAndUpdate(
      {
        _id: sessionId,
        patient_id: patientId,
        completed: false,
        current_node_code: currentQuestionId
      },
      {
        $set: {
          responses,
          decision_path: decisionPath,
          current_node_code: completed ? null : nextNode.code,
          completed,
          completed_at: now,
          total_questions: Object.keys(responses).length
        }
      },
      { returnDocument: 'after' }
    );

    if (!updated) return res.status(409).json({ error: 'This questionnaire step has already been saved. Reload the session to continue.' });
    if (completed) return res.json({ completed: true, sessionId, totalQuestions: updated.total_questions });

    res.json({
      question: {
        id: String(nextNode._id),
        code: nextNode.code,
        question_text: nextNode.question_text,
        category: nextNode.category,
        question_type: nextNode.question_type,
        options: nextNode.options
      },
      answeredCount: Object.keys(updated.responses || {}).length,
      sessionId
    });
  } catch (error) {
    next(error);
  }
};

const getSession = async (req, res, next) => {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(req.params.sessionId)) return res.status(400).json({ error: 'Invalid session ID format' });

    const session = await collection('questionnaire_responses').findOne({
      _id: req.params.sessionId,
      patient_id: req.user.id
    });
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({ session: asRecord(session) });
  } catch (error) {
    next(error);
  }
};

module.exports = { startQuestionnaire, getNextQuestion, getSession };
