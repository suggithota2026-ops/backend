const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitBelow100(value) {
  if (value === 0) return '';
  if (value < 20) return ONES[value];
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
}

function convertBelow1000(value) {
  if (value === 0) return '';
  if (value < 100) return twoDigitBelow100(value);

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  const remainderWords = twoDigitBelow100(remainder);
  return remainderWords
    ? `${ONES[hundreds]} Hundred ${remainderWords}`
    : `${ONES[hundreds]} Hundred`;
}

function convertIndianInteger(value) {
  if (value === 0) return 'Zero';

  let num = value;
  const parts = [];

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  const remainder = num % 1000;

  if (crore) parts.push(`${convertBelow1000(crore)} Crore`.trim());
  if (lakh) parts.push(`${convertBelow1000(lakh)} Lakh`.trim());
  if (thousand) parts.push(`${convertBelow1000(thousand)} Thousand`.trim());
  if (remainder) parts.push(convertBelow1000(remainder));

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function amountInWords(amount) {
  const absolute = Math.abs(Number(amount) || 0);
  const rupees = Math.floor(absolute);
  const paise = Math.round((absolute - rupees) * 100);

  let result = `${convertIndianInteger(rupees)} Rupee${rupees === 1 ? '' : 's'}`;

  if (paise > 0) {
    result += ` and ${convertIndianInteger(paise)} Paise`;
  }

  if (amount < 0) {
    result = `Minus ${result}`;
  }

  return result;
}

module.exports = { amountInWords };
