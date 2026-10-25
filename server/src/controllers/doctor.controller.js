const { collection } = require('../config/database');
const { asRecord, asRecords } = require('../utils/mongo');
const { getPagination, paginationMeta } = require('../utils/helpers');

const getDashboard = async (req, res, next) => {
  try {
    const [pendingReviews, reviewedByMe, patientIds, recentDocs] = await Promise.all([
      collection('diagnoses').countDocuments({ status: 'pending' }),
      collection('feedback').countDocuments({ doctor_id: req.user.id }),
      collection('diagnoses').distinct('patient_id'),
      collection('diagnoses').find({}).sort({ created_at: -1, _id: -1 }).limit(40).toArray()
    ]);

    const urgencyRank = { emergency: 4, urgent: 3, routine: 2 };
    const selected = recentDocs.sort((a, b) =>
      (urgencyRank[b.triage_level] || 1) - (urgencyRank[a.triage_level] || 1)
      || new Date(a.created_at) - new Date(b.created_at)
    ).slice(0, 10);
    const patients = await collection('users').find({
      _id: { $in: [...new Set(selected.map(item => item.patient_id))] },
      role: 'patient'
    }, { projection: { name: 1, age: 1, gender: 1 } }).toArray();
    const patientMap = new Map(patients.map(patient => [patient._id, patient]));
    const recentSubmissions = selected.map(document => {
      const diagnosis = asRecord(document);
      const patient = patientMap.get(document.patient_id);
      return {
        ...diagnosis,
        patient_name: patient?.name || 'Patient record unavailable',
        patient_age: patient?.age ?? null,
        patient_gender: patient?.gender ?? null
      };
    });

    res.json({ dashboard: { stats: { pendingReviews, reviewedByMe, totalPatients: patientIds.length }, recentSubmissions } });
  } catch (error) {
    next(error);
  }
};

const getSubmissions = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const filter = {};
    if (req.query.status === 'pending') filter.status = 'pending';
    else if (req.query.status === 'reviewed') filter.status = { $in: ['approved', 'corrected', 'overridden'] };
    else if (req.query.status) return res.status(400).json({ error: 'Status must be pending or reviewed' });
    if (req.query.triage) filter.triage_level = req.query.triage;

    const [total, diagnosisDocs] = await Promise.all([
      collection('diagnoses').countDocuments(filter),
      collection('diagnoses').aggregate([
        { $match: filter },
        { $addFields: { urgency_rank: { $switch: {
          branches: [
            { case: { $eq: ['$triage_level', 'emergency'] }, then: 4 },
            { case: { $eq: ['$triage_level', 'urgent'] }, then: 3 },
            { case: { $eq: ['$triage_level', 'routine'] }, then: 2 }
          ],
          default: 1
        } } } },
        { $sort: { urgency_rank: -1, created_at: 1, _id: 1 } },
        { $skip: offset },
        { $limit: limit },
        { $project: { urgency_rank: 0 } }
      ]).toArray()
    ]);

    const patientIds = [...new Set(diagnosisDocs.map(item => item.patient_id))];
    const questionnaireIds = [...new Set(diagnosisDocs.map(item => item.questionnaire_id).filter(Boolean))];
    const [patients, questionnaires] = await Promise.all([
      patientIds.length ? collection('users').find({ _id: { $in: patientIds }, role: 'patient' }, {
        projection: { name: 1, age: 1, gender: 1, weight: 1, height: 1 }
      }).toArray() : [],
      questionnaireIds.length ? collection('questionnaire_responses').find({ _id: { $in: questionnaireIds } }, {
        projection: { responses: 1, total_questions: 1, completed_at: 1 }
      }).toArray() : []
    ]);
    const patientMap = new Map(patients.map(patient => [patient._id, patient]));
    const questionnaireMap = new Map(questionnaires.map(item => [item._id, item]));
    const urgencyRank = { emergency: 4, urgent: 3, routine: 2 };
    const submissions = diagnosisDocs.map(document => {
      const diagnosis = asRecord(document);
      const patient = patientMap.get(document.patient_id);
      const questionnaire = questionnaireMap.get(document.questionnaire_id);
      return {
        ...diagnosis,
        patient_name: patient?.name || 'Patient record unavailable',
        patient_age: patient?.age ?? null,
        patient_gender: patient?.gender ?? null,
        patient_weight: patient?.weight ?? null,
        patient_height: patient?.height ?? null,
        questionnaire_responses: questionnaire?.responses || {},
        total_questions: questionnaire?.total_questions ?? null,
        completed_at: questionnaire?.completed_at ?? null
      };
    }).sort((a, b) => (urgencyRank[b.triage_level] || 1) - (urgencyRank[a.triage_level] || 1)
      || new Date(a.created_at) - new Date(b.created_at));

    res.json({ submissions, pagination: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

const getSubmissionDetail = async (req, res, next) => {
  try {
    const diagnosisDoc = await collection('diagnoses').findOne({ _id: req.params.id });
    if (!diagnosisDoc) return res.status(404).json({ error: 'Submission not found' });
    const diagnosis = asRecord(diagnosisDoc);

    const [patientDoc, questionnaireDoc, feedbackDocs] = await Promise.all([
      collection('users').findOne({ _id: diagnosis.patient_id, role: 'patient' }, {
        projection: { name: 1, age: 1, gender: 1, weight: 1, height: 1 }
      }),
      diagnosis.questionnaire_id
        ? collection('questionnaire_responses').findOne({ _id: diagnosis.questionnaire_id }, {
            projection: { responses: 1, decision_path: 1, total_questions: 1, completed_at: 1 }
          })
        : null,
      collection('feedback').find({ diagnosis_id: diagnosis.id }).sort({ created_at: -1 }).toArray()
    ]);
    if (!patientDoc) return res.status(404).json({ error: 'Patient record not found' });

    const doctorIds = [...new Set(feedbackDocs.map(item => item.doctor_id))];
    const doctors = doctorIds.length
      ? await collection('users').find({ _id: { $in: doctorIds }, role: { $in: ['doctor', 'admin'] } }, {
          projection: { name: 1, specialization: 1 }
        }).toArray()
      : [];
    const doctorMap = new Map(doctors.map(doctor => [doctor._id, doctor]));
    const patient = asRecord(patientDoc);
    const questionnaire = questionnaireDoc ? asRecord(questionnaireDoc) : {};
    const feedbackHistory = feedbackDocs.map(document => {
      const feedback = asRecord(document);
      const doctor = doctorMap.get(document.doctor_id);
      return { ...feedback, doctor_name: doctor?.name || 'Clinician record unavailable', specialization: doctor?.specialization || null };
    });

    res.json({
      submission: {
        ...diagnosis,
        patient_name: patient.name,
        patient_age: patient.age,
        patient_gender: patient.gender,
        patient_weight: patient.weight,
        patient_height: patient.height,
        questionnaire_responses: questionnaire.responses || {},
        decision_path: questionnaire.decision_path || [],
        total_questions: questionnaire.total_questions ?? null,
        completed_at: questionnaire.completed_at ?? null
      },
      feedbackHistory
    });
  } catch (error) {
    next(error);
  }
};

const getCaseHistory = async (req, res, next) => {
  try {
    const patientDoc = await collection('users').findOne({ _id: req.params.patientId, role: 'patient' }, {
      projection: { name: 1, email: 1, age: 1, gender: 1, weight: 1, height: 1, created_at: 1 }
    });
    if (!patientDoc) return res.status(404).json({ error: 'Patient not found' });

    const diagnosisDocs = await collection('diagnoses')
      .find({ patient_id: req.params.patientId }).sort({ created_at: -1 }).toArray();
    const patientDiagnosisIds = diagnosisDocs.map(item => item._id);
    const patientFeedback = patientDiagnosisIds.length
      ? await collection('feedback').find({ diagnosis_id: { $in: patientDiagnosisIds } }).sort({ created_at: -1 }).toArray()
      : [];
    const reviewerIds = [...new Set([
      ...diagnosisDocs.map(item => item.reviewed_by),
      ...patientFeedback.map(item => item.doctor_id)
    ].filter(Boolean))];
    const reviewers = reviewerIds.length
      ? await collection('users').find({ _id: { $in: reviewerIds }, role: { $in: ['doctor', 'admin'] } }, {
          projection: { name: 1 }
        }).toArray()
      : [];
    const reviewerMap = new Map(reviewers.map(item => [item._id, item]));

    res.json({
      patient: asRecord(patientDoc),
      diagnoses: diagnosisDocs.map(item => ({ ...asRecord(item), reviewer_name: reviewerMap.get(item.reviewed_by)?.name || null })),
      feedback: patientFeedback.map(item => ({ ...asRecord(item), doctor_name: reviewerMap.get(item.doctor_id)?.name || null }))
    });
  } catch (error) {
    next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const diagnoses = collection('diagnoses');
    const feedback = collection('feedback');
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [conditionDistribution, agreementTrends, dailySubmissions, feedbackBreakdown] = await Promise.all([
      diagnoses.aggregate([
        { $unwind: '$conditions' },
        { $group: { _id: '$conditions.name', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 10 },
        { $project: { _id: 0, condition_name: '$_id', count: 1 } }
      ]).toArray(),
      diagnoses.aggregate([
        { $match: { reviewed_at: { $type: 'date' } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$reviewed_at', timezone: 'UTC' } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          corrected: { $sum: { $cond: [{ $in: ['$status', ['overridden', 'corrected']] }, 1, 0] } },
          total: { $sum: 1 }
        } },
        { $sort: { _id: -1 } },
        { $limit: 12 },
        { $project: {
          _id: 0,
          month: '$_id',
          approved: 1,
          corrected: 1,
          total: 1,
          agreement_rate_percentage: { $cond: [{ $gt: ['$total', 0] }, { $round: [{ $multiply: [{ $divide: ['$approved', '$total'] }, 100] }, 1] }, 0] }
        } }
      ]).toArray(),
      diagnoses.aggregate([
        { $match: { created_at: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at', timezone: 'UTC' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', count: 1 } }
      ]).toArray(),
      feedback.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, action: '$_id', count: 1 } }
      ]).toArray()
    ]);

    res.json({ analytics: { conditionDistribution, agreementTrends, dailySubmissions, feedbackBreakdown } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboard, getSubmissions, getSubmissionDetail, getCaseHistory, getAnalytics };
