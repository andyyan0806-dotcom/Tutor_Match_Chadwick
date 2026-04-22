export const GRADE_LEVELS = [
  'Village School',
  'Middle School',
  'Grade 9',
  'Grade 10',
  'IB Year 1',
  'IB Year 2',
  'Graduated',
]

// cohort_year = the year the student enters/entered Grade 9
// This is the fixed anchor — Grade 9 is index 2 in GRADE_LEVELS
const GRADE9_IDX = 2

// Returns the current academic year (starts August 1 each year)
function academicYear() {
  const now = new Date()
  return now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
}

// Compute the display grade from the stored cohort year
export function gradeFromCohort(cohortYear) {
  if (!cohortYear) return ''
  const idx = GRADE9_IDX + (academicYear() - cohortYear)
  return GRADE_LEVELS[Math.min(Math.max(idx, 0), GRADE_LEVELS.length - 1)]
}

// Compute the cohort year to store from the selected grade
export function cohortFromGrade(grade) {
  const idx = GRADE_LEVELS.indexOf(grade)
  return academicYear() - (idx < 0 ? 0 : idx - GRADE9_IDX)
}

export const SUBJECT_GROUPS = [
  {
    group: 'Language',
    subjects: [
      'English Language & Literature HL',
      'English Language & Literature SL',
      'English Literature HL',
      'English Literature SL',
      'Korean Language & Literature HL',
      'Korean Language & Literature SL',
      'Korean Literature HL',
      'Korean Literature SL',
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
