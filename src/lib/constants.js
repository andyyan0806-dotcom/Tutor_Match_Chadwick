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
    group: 'Group 1 – Language & Literature',
    subjects: ['English A Literature', 'Korean A Literature', 'English A Language & Literature'],
  },
  {
    group: 'Group 2 – Language Acquisition',
    subjects: ['Korean B', 'Spanish B', 'French B', 'Chinese B'],
  },
  {
    group: 'Group 3 – Individuals & Societies',
    subjects: ['History', 'Economics', 'Psychology', 'Geography', 'Business Management', 'Global Politics'],
  },
  {
    group: 'Group 4 – Sciences',
    subjects: ['Biology', 'Chemistry', 'Physics', 'Environmental Systems & Societies', 'Computer Science'],
  },
  {
    group: 'Group 5 – Mathematics',
    subjects: [
      'Mathematics: Analysis and Approaches HL',
      'Mathematics: Analysis and Approaches SL',
      'Mathematics: Applications and Interpretation HL',
      'Mathematics: Applications and Interpretation SL',
    ],
  },
  {
    group: 'Group 6 – The Arts',
    subjects: ['Visual Arts', 'Music', 'Theatre', 'Film'],
  },
  {
    group: 'IB Core',
    subjects: ['Theory of Knowledge (TOK)', 'Extended Essay (EE)'],
  },
  {
    group: 'Academic Counseling',
    subjects: ['University Application Support'],
  },
]

export const ALL_SUBJECTS = SUBJECT_GROUPS.flatMap((g) => g.subjects)
