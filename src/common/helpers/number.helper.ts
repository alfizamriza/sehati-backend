/**
 * Helper untuk konversi angka ke Roman numerals
 * Contoh: 9 → IX, 3 → III, 12 → XII
 */

export function convertToRomanNumeral(num: number): string {
  if (num <= 0 || !Number.isInteger(num)) {
    return String(num);
  }

  const romanMap = [
    { value: 1000, numeral: 'M' },
    { value: 900, numeral: 'CM' },
    { value: 500, numeral: 'D' },
    { value: 400, numeral: 'CD' },
    { value: 100, numeral: 'C' },
    { value: 90, numeral: 'XC' },
    { value: 50, numeral: 'L' },
    { value: 40, numeral: 'XL' },
    { value: 10, numeral: 'X' },
    { value: 9, numeral: 'IX' },
    { value: 5, numeral: 'V' },
    { value: 4, numeral: 'IV' },
    { value: 1, numeral: 'I' },
  ];

  let roman = '';
  let remaining = num;

  for (const { value, numeral } of romanMap) {
    while (remaining >= value) {
      roman += numeral;
      remaining -= value;
    }
  }

  return roman;
}
