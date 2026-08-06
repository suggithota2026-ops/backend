const { mobileNumberCandidates, adminMobileWhere } = require('./adminMobile');

function normalizeMobileNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

function userMobileWhere(raw) {
  return adminMobileWhere(raw);
}

function contactNumberWhere(raw) {
  const list = mobileNumberCandidates(raw);
  if (list.length === 0) {
    return { contactNumber: '__no_match__' };
  }
  if (list.length === 1) {
    return { contactNumber: list[0] };
  }
  return { $or: list.map((contactNumber) => ({ contactNumber })) };
}

module.exports = {
  normalizeMobileNumber,
  mobileNumberCandidates,
  userMobileWhere,
  contactNumberWhere,
};
