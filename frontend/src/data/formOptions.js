import ISO6391 from 'iso-639-1';

const indianLanguages = [
  'Assamese', 'Bengali', 'Bodo', 'Dogri', 'English', 'Gujarati', 'Hindi', 'Kannada', 'Kashmiri', 'Konkani',
  'Maithili', 'Malayalam', 'Manipuri (Meitei)', 'Marathi', 'Nepali', 'Odia', 'Punjabi', 'Sanskrit',
  'Santali', 'Sindhi', 'Tamil', 'Telugu', 'Urdu',
  'Bhojpuri', 'Haryanvi', 'Rajasthani', 'Marwari', 'Garhwali', 'Kumaoni', 'Magahi', 'Chhattisgarhi',
  'Angika', 'Bundeli', 'Tulu', 'Mizo', 'Khasi', 'Garo', 'Kokborok', 'Mundari', 'Ho', 'Kurukh',
  'Gondi', 'Bhili', 'Kodava', 'Ladakhi', 'Lepcha', 'Pahari', 'Nicobarese'
];

const pakistanLanguages = [
  'Urdu', 'English', 'Punjabi', 'Pashto', 'Sindhi', 'Saraiki', 'Balochi', 'Hindko', 'Brahui',
  'Mewati', 'Kohistani', 'Kashmiri', 'Shina', 'Balti', 'Kalasha', 'Aer', 'Badeshi', 'Bagri',
  'Balochi (Makrani)', 'Balochi (Rakhshani)', 'Balochi (Sulaimani)', 'Bateri', 'Bhaya',
  'Burushaski', 'Chilisso', 'Dameli', 'Dari', 'Dehwari', 'Dhatki', 'Domaaki', 'Gawar-Bati',
  'Gawri', 'Ghera', 'Goaria', 'Gowro', 'Gujarati', 'Gujari', 'Gurgula', 'Haryanvi (Rangri)',
  'Hazaragi', 'Hindko (Northern)', 'Hindko (Southern)', 'Jadgali', 'Jandavra', 'Jogi', 'Kabutra',
  'Kacchi', 'Kalkoti', 'Kamviri', 'Kati', 'Khetrani', 'Khowar', 'Kyrgyz', 'Indus Kohistani',
  'Kachi Koli', 'Parkari Koli', 'Wadiyari Koli', 'Kutchi', 'Kundal Shahi', 'Lasi', 'Loarki',
  'Mankiyali', 'Marwari', 'Memoni', 'Oadki', 'Ormuri', 'Pahari-Pothwari',
  'Pakistan Sign Language', 'Palula', 'Pashto (Central)', 'Pashto (Northern)', 'Pashto (Southern)',
  'Punjabi (Shahmukhi)', 'Sarikoli', 'Savi', 'Shina (Kohistani)', 'Sindhi Bhil', 'Torwali',
  'Ushojo', 'Vaghri', 'Wakhi', 'Waneci', 'Waziri', 'Yidgha'
];

// Major and regional Nigerian languages. The searchable worldwide ISO catalog below remains available too.
const nigerianLanguages = [
  'English', 'Nigerian Pidgin', 'Hausa', 'Yoruba', 'Igbo', 'Fulfulde', 'Kanuri', 'Tiv', 'Ibibio', 'Edo',
  'Efik', 'Ijaw', 'Idoma', 'Igala', 'Ebira', 'Nupe', 'Gbagyi', 'Gbari', 'Jukun', 'Berom', 'Urhobo', 'Itsekiri',
  'Isoko', 'Esan', 'Etsako', 'Owan', 'Ika', 'Ikwerre', 'Ekpeye', 'Etche', 'Okrika', 'Kalabari', 'Ogoni', 'Gokana',
  'Khana', 'Eleme', 'Andoni', 'Oron', 'Anaang', 'Eket', 'Boki', 'Yala', 'Bekwarra', 'Mbembe', 'Ukelle', 'Ekoid',
  'Bura-Pabir', 'Margi', 'Chibok', 'Bachama', 'Bata', 'Higi', 'Kilba', 'Lamang', 'Tera', 'Tangale', 'Waja',
  'Dadiya', 'Tula', 'Kamo', 'Karekare', 'Ngas', 'Goemai', 'Mwaghavul', 'Ron', 'Tarok', 'Pyem', 'Mupun', 'Jara',
  'Mambila', 'Kaka', 'Koma', 'Kuteb', 'Yandang', 'Mumuye', 'Jibu', 'Chamba', 'Bali', 'Fali', 'Mafa', 'Shuwa Arabic',
  'Zarma', 'Dukkawa', 'Kamuku', 'Koro', 'Gade', 'Alago', 'Mada', 'Ningye', 'Amo', 'Atyap', 'Adara', 'Tyap',
  'Ukaan', 'Irigwe', 'Izere', 'Hausa Sign Language', 'Nigerian Sign Language', 'Other Nigerian Language'
];

const indianLanguageNames = new Set(indianLanguages.map((name) => name.toLowerCase()));
const internationalLanguages = ISO6391.getAllNames()
  .filter((name) => !indianLanguageNames.has(name.toLowerCase()))
  .sort((a, b) => a.localeCompare(b));

export const LANGUAGE_OPTIONS = [
  { value: 'Any / All Languages', label: 'Any / All Languages' },
  ...indianLanguages.map((name) => ({ value: name, label: `India - ${name}` })),
  ...pakistanLanguages.map((name) => ({ value: `Pakistan - ${name}`, label: `Pakistan - ${name}` })),
  ...nigerianLanguages.map((name) => ({ value: `Nigeria - ${name}`, label: `Nigeria - ${name}` })),
  // ISO-639 includes languages used across every country, beyond the India and Pakistan lists above.
  ...internationalLanguages.map((name) => ({ value: name, label: `International / All Countries - ${name}` }))
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
