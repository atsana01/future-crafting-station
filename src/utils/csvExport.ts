export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
) => {
  if (data.length === 0) return;

  // Determine columns
  const cols = columns || Object.keys(data[0]).map(key => ({ key, header: key }));
  
  // Create CSV header
  const header = cols.map(col => col.header).join(',');
  
  // Create CSV rows
  const rows = data.map(row => {
    return cols.map(col => {
      const value = row[col.key];
      // Handle complex values
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
      return String(value);
    }).join(',');
  });
  
  // Combine header and rows
  const csv = [header, ...rows].join('\n');
  
  // Create download link
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
