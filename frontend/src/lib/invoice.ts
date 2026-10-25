import { round2, toNumber } from "@/lib/utils";

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function underHundred(value: number): string {
  if (value < 20) return ONES[value];
  const tens = TENS[Math.floor(value / 10)];
  const ones = ONES[value % 10];
  return ones ? `${tens} ${ones}` : tens;
}

function underThousand(value: number): string {
  if (value < 100) return underHundred(value);
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  return rest ? `${ONES[hundreds]} Hundred ${underHundred(rest)}` : `${ONES[hundreds]} Hundred`;
}

export function numberToIndianWords(value: number): string {
  const number = Math.floor(Math.abs(value));
  if (number === 0) return "Zero";

  const crore = Math.floor(number / 10000000);
  const lakh = Math.floor((number % 10000000) / 100000);
  const thousand = Math.floor((number % 100000) / 1000);
  const hundred = number % 1000;

  const parts: string[] = [];
  if (crore) parts.push(`${underThousand(crore)} Crore`);
  if (lakh) parts.push(`${underThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${underThousand(thousand)} Thousand`);
  if (hundred) parts.push(underThousand(hundred));

  return parts.join(" ");
}

export function amountInWords(value: string | number | null | undefined): string {
  const total = Math.round(toNumber(value) * 100);
  const rupees = Math.floor(total / 100);
  const paise = Math.abs(total % 100);
  const base = `Rupees ${numberToIndianWords(rupees)}`;
  return paise ? `${base} and ${numberToIndianWords(paise)} Paise Only` : `${base} Only`;
}

/** Split a total GST amount into its SGST and CGST halves without losing a paisa. */
export function splitGst(taxAmount: string | number | null | undefined) {
  const total = round2(toNumber(taxAmount));
  const half = round2(total / 2);
  return { sgst: half, cgst: round2(total - half) };
}

/** GST split for one invoice line, derived from its persisted rate + taxable amount. */
export function splitLineGst(
  taxableAmount: string | number | null | undefined,
  gstRate: string | number | null | undefined,
) {
  const taxable = toNumber(taxableAmount);
  const rate = toNumber(gstRate);
  const tax = round2((taxable * rate) / 100);
  return { tax, ...splitGst(tax) };
}

export function taxableFromLine(
  price: string | number | null | undefined,
  quantity: string | number | null | undefined,
) {
  return round2(toNumber(price) * toNumber(quantity));
}
