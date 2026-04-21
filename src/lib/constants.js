export const GRADE_LEVELS = [
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
  'IB Year 1',
  'IB Year 2',
]

export const SUBJECT_GROUPS = [
  {
    group: 'Language',
    subjects: [
      'English Lang & Lit HL',
      'English Lang & Lit SL',
      'English Lit HL',
      'English Lit SL',
      'Korean Lang & Lit HL',
      'Korean Lang & Lit SL',
      'Korean Lit HL',
      'Korean Lit SL',
      'Spanish HL',
      'Spanish SL',
      'Mandarin HL',
      'Mandarin SL',
    ],
  },
  {
    group: 'Math',
    subjects: [
      'Math AI HL',
      'Math AI SL',
      'Math AA HL',
      'Math AA SL',
    ],
  },
  {
    group: 'Science',
    subjects: [
      'Biology HL',
      'Biology SL',
      'Chemistry HL',
      'Chemistry SL',
      'Physics HL',
      'Physics SL',
      'Environmental Systems & Societies HL',
      'Environmental Systems & Societies SL',
    ],
  },
  {
    group: 'Individuals & Societies',
    subjects: [
      'Business Management HL',
      'Business Management SL',
      'Economics HL',
      'Economics SL',
      'Global Politics HL',
      'Global Politics SL',
      'Psychology HL',
      'Psychology SL',
      'Geography HL',
      'Geography SL',
      'History HL',
      'History SL',
    ],
  },
  {
    group: 'Art',
    subjects: [
      'Visual Art HL',
      'Visual Art SL',
      'Film HL',
      'Film SL',
      'Media Art HL',
      'Media Art SL',
    ],
  },
  {
    group: 'IB Core',
    subjects: [
      'Theory of Knowledge',
      'Extended Essay',
    ],
  },
  {
    group: 'Academic Counseling',
    subjects: [
      'College Application',
    ],
  },
]

export const ALL_SUBJECTS = SUBJECT_GROUPS.flatMap((g) => g.subjects)
