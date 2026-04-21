import { SUBJECT_GROUPS } from '../lib/constants'

export default function SubjectPicker({ selected, onChange }) {
  function toggle(subject) {
    if (selected.includes(subject)) {
      onChange(selected.filter((s) => s !== subject))
    } else {
      onChange([...selected, subject])
    }
  }

  return (
    <div>
      {SUBJECT_GROUPS.map((group) => (
        <div key={group.group} className="subject-group">
          <div className="subject-group-title">{group.group}</div>
          <div className="subject-chips">
            {group.subjects.map((subject) => (
              <button
                key={subject}
                type="button"
                className={`subject-chip ${selected.includes(subject) ? 'selected' : ''}`}
                onClick={() => toggle(subject)}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
