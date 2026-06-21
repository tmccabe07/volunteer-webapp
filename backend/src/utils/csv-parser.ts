type CsvRow = Record<string, string>;

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values.map(value => value.trim());
}

export function parseCsv(csvContent: string): CsvRow[] {
  const normalized = csvContent.replace(/^﻿/, '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return [];
  }

  const lines = normalized.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return [];
  }

  const headers = splitCsvLine(lines[0]).map(header => header.trim());

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    return headers.reduce<CsvRow>((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}
