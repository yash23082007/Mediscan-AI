const { MongoClient } = require('mongodb');

let client;
let database;
let connectionPromise;

const getMongoUri = () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI must be configured to connect to MongoDB');
  return uri;
};

const createIndexes = async (db) => {
  await Promise.all([
    db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' }),
    db.collection('decision_tree_nodes').createIndex({ code: 1 }, { unique: true, name: 'question_code_unique' }),
    db.collection('questionnaire_responses').createIndex({ patient_id: 1, created_at: -1 }, { name: 'questionnaires_patient_created' }),
    db.collection('diagnoses').createIndex({ questionnaire_id: 1 }, { unique: true, sparse: true, name: 'diagnosis_questionnaire_unique' }),
    db.collection('diagnoses').createIndex({ patient_id: 1, created_at: -1 }, { name: 'diagnoses_patient_created' }),
    db.collection('diagnoses').createIndex({ status: 1, triage_level: 1, created_at: 1 }, { name: 'diagnoses_review_queue' }),
    db.collection('feedback').createIndex({ diagnosis_id: 1 }, { unique: true, name: 'feedback_diagnosis_unique' }),
    db.collection('feedback').createIndex({ doctor_id: 1, created_at: -1 }, { name: 'feedback_doctor_created' }),
    db.collection('audit_logs').createIndex({ user_id: 1, created_at: -1 }, { name: 'audit_user_created' }),
    db.collection('audit_logs').createIndex({ action: 1, created_at: -1 }, { name: 'audit_action_created' })
  ]);
};

const connectDatabase = async () => {
  if (database) return database;
  if (!connectionPromise) {
    connectionPromise = (async () => {
      client = new MongoClient(getMongoUri(), {
        appName: 'MediScanAI',
        maxPoolSize: Number.parseInt(process.env.DB_POOL_MAX, 10) || 10,
        serverSelectionTimeoutMS: Number.parseInt(process.env.DB_CONNECT_TIMEOUT_MS, 10) || 10000
      });
      await client.connect();
      database = client.db(process.env.MONGODB_DB_NAME || undefined);
      await createIndexes(database);
      return database;
    })().catch(error => {
      if (client) void client.close().catch(() => {});
      connectionPromise = null;
      client = null;
      throw error;
    });
  }
  return connectionPromise;
};

const getDatabase = () => {
  if (!database) throw new Error('MongoDB is not connected. Call connectDatabase() before accessing collections.');
  return database;
};

const collection = (name) => getDatabase().collection(name);

const checkDatabase = async () => {
  try {
    await getDatabase().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
};

const withTransaction = async (callback) => {
  const session = client.startSession();
  try {
    return await session.withTransaction(() => callback(session));
  } finally {
    await session.endSession();
  }
};

const closeDatabase = async () => {
  if (client) await client.close();
  client = null;
  database = null;
  connectionPromise = null;
};

module.exports = { MongoClient, connectDatabase, getDatabase, collection, checkDatabase, withTransaction, closeDatabase };
