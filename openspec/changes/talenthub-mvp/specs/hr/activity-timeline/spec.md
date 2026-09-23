## Purpose

Provides a chronological audit trail of candidate interactions, status changes, and notes for transparency.

## ADDED Requirements

### Requirement: Activity timeline renders
The system SHALL display a vertical timeline of all candidate activities in the candidate detail modal.

#### Scenario: Timeline shows all activities
- **WHEN** user opens the candidate detail modal
- **THEN** a vertical timeline appears below the resume section
- **AND** each entry shows a dot, connector line, description, timestamp, and user name
- **AND** entries are ordered newest‑first
- **AND** the timeline includes: status changes, notes added, resume viewed, reminders sent
- **AND** clicking "Edit" on a note entry opens the note editor
- **AND** clicking "Delete" on a note entry removes it after confirmation

### Requirement: Activity log entry creation
The system SHALL create a new activity log entry whenever a status change or note is saved.

#### Scenario: Status change creates activity
- **WHEN** user changes a candidate's status
- **THEN** a new activity entry is created with type "status_change", description "[User] moved [Candidate] to [Stage]", and timestamp
- **AND** the entry is displayed in the timeline immediately

#### Scenario: Note creation creates activity
- **WHEN** user saves a new note
- **THEN** a new activity entry is created with type "note", description "[User] added a note", and timestamp
- **AND** the note text is stored and displayed in the timeline