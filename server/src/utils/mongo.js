const asRecord = (document) => {
  if (!document) return null;
  const { _id, ...fields } = document;
  return { id: String(_id), ...fields };
};

const asRecords = (documents) => documents.map(asRecord);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { asRecord, asRecords, escapeRegExp };
