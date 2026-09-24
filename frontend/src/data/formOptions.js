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

function projectTypes(category, names) {
  return names.map((name) => ({ value: name, label: `${category} - ${name}` }));
}

export const PROJECT_TYPE_OPTIONS = [
  ...projectTypes('Audio & Speech', [
    'Speech Data Collection',
    'Voice Recording',
    'Audio Transcription',
    'Audio Classification',
    'Automatic Speech Recognition (ASR)',
    'Text-to-Speech (TTS) Data',
    'Speaker Diarization',
    'Wake Word Collection',
    'Call Center Audio Analysis',
    'Pronunciation Evaluation'
  ]),
  ...projectTypes('Language & NLP', [
    'Translation and Localization',
    'Text Data Collection',
    'Text Annotation',
    'Text Classification',
    'Sentiment Analysis',
    'Named Entity Recognition (NER)',
    'Intent Classification',
    'Content Moderation',
    'Search Relevance Evaluation',
    'OCR and Data Extraction',
    'Document AI Processing'
  ]),
  ...projectTypes('Generative AI', [
    'LLM Training Data',
    'Prompt and Response Evaluation',
    'RLHF and Human Feedback',
    'AI Response Ranking',
    'Fact Checking',
    'AI Safety and Red Teaming',
    'Chatbot Evaluation',
    'Code Data Annotation'
  ]),
  ...projectTypes('Image', [
    'Image Data Collection',
    'Image Classification',
    'Object Detection - Bounding Box',
    'Polygon Annotation',
    'Semantic Segmentation',
    'Instance Segmentation',
    'Keypoint and Landmark Annotation',
    'OCR Image Annotation',
    'Face Recognition Data',
    'Medical Image Annotation'
  ]),
  ...projectTypes('Video & Spatial', [
    'Video Data Collection',
    'Video Classification',
    'Video Annotation',
    'Object Tracking',
    'Action Recognition',
    'LiDAR and Point Cloud Annotation',
    'Autonomous Vehicle Data Annotation',
    'Geospatial Data Annotation'
  ]),
  ...projectTypes('Data Operations', [
    'Tabular Data Classification',
    'Data Validation',
    'Data Enrichment',
    'Web Research and Data Collection',
    'Product Catalog Enrichment',
    'Synthetic Data Generation',
    'Model Evaluation and Quality Assurance'
  ])
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
