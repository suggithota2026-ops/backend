/**
 * Normalize admin mobile lookups so 10-digit, +91…, and 91… inputs match stored values.
 */
function mobileNumberCandidates(raw) {
  const s = String(raw || '').trim();
  const digits = s.replace(/\D/g, '');
  const last10 = digits.slice(-10);
  const set = new Set();
  if (s) set.add(s);
  if (last10.length === 10) {
    set.add(last10);
    set.add(`+91${last10}`);
    set.add(`91${last10}`);
  }
  return [...set];
}

function adminMobileWhere(raw) {
  const list = mobileNumberCandidates(raw);
  if (list.length === 0) {
    return { mobileNumber: '__no_match__' };
  }
  if (list.length === 1) {
    return { mobileNumber: list[0] };
  }
  return { $or: list.map((mobileNumber) => ({ mobileNumber })) };
}

module.exports = { mobileNumberCandidates, adminMobileWhere };
