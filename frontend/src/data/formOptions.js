import ISO6391 from 'iso-639-1';

const indianLanguages = [
  'Assamese', 'Bengali', 'Bodo', 'Dogri', 'Gujarati', 'Hindi', 'Kannada', 'Kashmiri', 'Konkani',
  'Maithili', 'Malayalam', 'Manipuri (Meitei)', 'Marathi', 'Nepali', 'Odia', 'Punjabi', 'Sanskrit',
  'Santali', 'Sindhi', 'Tamil', 'Telugu', 'Urdu'
];

const indianLanguageNames = new Set(indianLanguages.map((name) => name.toLowerCase()));
const internationalLanguages = ISO6391.getAllNames()
  .filter((name) => !indianLanguageNames.has(name.toLowerCase()))
  .sort((a, b) => a.localeCompare(b));

export const LANGUAGE_OPTIONS = [
  ...indianLanguages.map((name) => ({ value: name, label: `India - ${name}` })),
  ...internationalLanguages.map((name) => ({ value: name, label: `International - ${name}` }))
];

export const EXPERIENCE_OPTIONS = [
  'Fresher',
  'Less than 1 year',
  '1-2 years',
  '2-3 years',
  '3-5 years',
  '5-7 years',
  '7-10 years',
  '10+ years'
];

function timeLabel(date) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function availabilityOptions() {
  const now = new Date();
  const timeSlots = Array.from({ length: 24 }, (_, hour) => {
    const start = new Date(2000, 0, 1, hour);
    const end = new Date(2000, 0, 1, (hour + 1) % 24);
    const label = `${timeLabel(start)} - ${timeLabel(end)}`;
    return { value: label, label };
  });

  return [
    { value: 'Available Now', label: `Available now (${timeLabel(now)})` },
    { value: 'Available', label: 'Available' },
    { value: 'Not Available', label: 'Not Available' },
    { value: 'Full Time', label: 'Full Time' },
    { value: 'Part Time', label: 'Part Time' },
    { value: 'Weekdays', label: 'Weekdays' },
    { value: 'Weekends', label: 'Weekends' },
    ...timeSlots
  ];
}
