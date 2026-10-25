const { collection } = require('../config/database');
const { asRecord, asRecords, escapeRegExp } = require('../utils/mongo');
const { encrypt, decryptFields } = require('../config/encryption');
const { sanitizeUser, getPagination, paginationMeta } = require('../utils/helpers');

const getPatient = async (req, res, next) => {
  try {
    const patientDoc = await collection('users').findOne({
      _id: req.params.id,
      role: 'patient',
      is_active: true
    });
    if (!patientDoc) return res.status(404).json({ error: 'Patient not found' });

    const patient = decryptFields(asRecord(patientDoc), ['allergies', 'chronic_conditions']);
    res.json({ patient: sanitizeUser(patient) });
  } catch (error) {
    next(error);
  }
};

const updatePatient = async (req, res, next) => {
  try {
    const { name, age, gender, weight, height, allergies, chronic_conditions } = req.body;
    const updates = { updated_at: new Date() };
    if (name !== undefined) updates.name = name;
    if (age !== undefined) updates.age = age;
    if (gender !== undefined) updates.gender = gender;
    if (weight !== undefined) updates.weight = weight;
    if (height !== undefined) updates.height = height;
    if (allergies !== undefined) updates.allergies = encrypt(allergies);
    if (chronic_conditions !== undefined) updates.chronic_conditions = encrypt(chronic_conditions);

    if (Object.keys(updates).length === 1) return res.status(400).json({ error: 'No fields to update' });

    const updated = await collection('users').findOneAndUpdate(
      { _id: req.params.id, role: 'patient', is_active: true },
      { $set: updates },
      { returnDocument: 'after', projection: { password_hash: 0 } }
    );
    if (!updated) return res.status(404).json({ error: 'Patient not found' });

    res.json({ message: 'Profile updated', patient: asRecord(updated) });
  } catch (error) {
    next(error);
  }
};

const getAllPatients = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const filter = { role: 'patient', is_active: true };
    if (req.query.search) {
      const term = new RegExp(escapeRegExp(req.query.search), 'i');
      filter.$or = [{ name: term }, { email: term }];
    }

    const [total, documents] = await Promise.all([
      collection('users').countDocuments(filter),
      collection('users').find(filter, {
        projection: { name: 1, email: 1, age: 1, gender: 1, role: 1, created_at: 1 }
      }).sort({ created_at: -1, _id: 1 }).skip(offset).limit(limit).toArray()
    ]);

    res.json({ patients: asRecords(documents), pagination: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

const getPatientHistory = async (req, res, next) => {
  try {
    const { page, limit, offset } = getPagination(req.query);
    const filter = { patient_id: req.params.id };
    const diagnoses = collection('diagnoses');
    const [total, documents] = await Promise.all([
      diagnoses.countDocuments(filter),
      diagnoses.find(filter, {
        projection: {
          conditions: 1,
          confidence_scores: 1,
          explanation: 1,
          feature_contributions: 1,
          status: 1,
          reviewed_by: 1,
          created_at: 1,
          reviewed_at: 1
        }
      }).sort({ created_at: -1, _id: -1 }).skip(offset).limit(limit).toArray()
    ]);

    const reviewerIds = [...new Set(documents.map(diagnosis => diagnosis.reviewed_by).filter(Boolean))];
    const reviewers = reviewerIds.length
      ? await collection('users').find({ _id: { $in: reviewerIds }, role: { $in: ['doctor', 'admin'] } }, {
          projection: { name: 1, specialization: 1 }
        }).toArray()
      : [];
    const reviewerMap = new Map(reviewers.map(reviewer => [reviewer._id, reviewer]));
    const history = documents.map(document => {
      const diagnosis = asRecord(document);
      const reviewer = reviewerMap.get(document.reviewed_by);
      return {
        ...diagnosis,
        reviewer_name: reviewer?.name || null,
        reviewer_specialization: reviewer?.specialization || null
      };
    });

    res.json({ history, pagination: paginationMeta(total, page, limit) });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPatient, updatePatient, getAllPatients, getPatientHistory };
