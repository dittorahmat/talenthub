## Purpose

Gives HR an instant, glanceable read on each candidate by simulating AI CV screening — a short summary plus a skills-and-experience match score against the job.

## ADDED Requirements

### Requirement: Screening runs as simulated background processing after CV upload
The system SHALL start a mocked AI screening job when a CV upload completes and SHALL expose a `processing` state until the result is ready.

#### Scenario: Upload triggers processing state
- **WHEN** HR uploads a CV for an applicant
- **THEN** the applicant's screening status becomes `processing` and the UI shows a screening-in-progress indicator within 1 second

#### Scenario: Processing completes with stored result
- **WHEN** the simulated job finishes (2–4 seconds)
- **THEN** the system stores summary, score, matched skills, missing skills, and experience years, and screening status becomes `ready`

#### Scenario: Seeded candidates already screened
- **WHEN** HR opens the Kanban board on a freshly seeded database
- **THEN** every applicant with a CV shows screening status `ready` with no waiting

### Requirement: System generates a short CV summary per candidate
The system SHALL provide a 2–3 sentence summary per screened candidate covering experience, key skills, and most recent role context.

#### Scenario: Summary visible in detail modal
- **WHEN** HR opens the candidate detail modal for a screened applicant
- **THEN** an AI Screening section shows the full summary text

#### Scenario: Missing CV has no summary
- **WHEN** an applicant has no uploaded CV
- **THEN** the AI Screening section shows an empty state prompting HR to upload a CV instead of a summary

### Requirement: System scores job match on skills plus experience
The system SHALL compute a match score from 0–100 combining skill-keyword overlap with the job's required skills and an experience-years factor, and SHALL map the score to a band: Strong (≥75), Potential (50–74), Weak (<50).

#### Scenario: Score combines skills and experience
- **WHEN** screening completes for a candidate with known keywords and experience years
- **THEN** the stored score reflects both factors and the response includes matched skills, missing skills, and experience years used

#### Scenario: Score band is deterministic for demo
- **WHEN** screening runs twice for the same candidate and job
- **THEN** it returns the same score and band so the demo is reproducible

### Requirement: Match score is glanceable on the candidate card
The system SHALL display the match score as a color-coded badge on each screened candidate card (green Strong, amber Potential, gray Weak) and SHALL show a shimmer/processing badge while screening is running.

#### Scenario: Badge shows band color
- **WHEN** HR views the Kanban board
- **THEN** each screened card shows its score badge in the correct band color and unscreened cards show no score badge

#### Scenario: Board can filter by score band
- **WHEN** HR selects a score-band filter on the Kanban board
- **THEN** only candidates in that band remain visible

### Requirement: Detail modal shows full screening breakdown
The system SHALL show score bar, band label, summary, matched skills, missing skills, and experience years in the candidate detail modal for screened applicants.

#### Scenario: Full breakdown renders
- **WHEN** HR opens the detail modal for a screened applicant
- **THEN** the modal shows score bar with band, summary, matched/missing skill chips, and experience years

#### Scenario: Processing state renders in modal
- **WHEN** HR opens the detail modal while screening is still processing
- **THEN** the AI section shows a loading state and refreshes to the full breakdown without closing the modal

### Requirement: HR can delete a candidate
The system SHALL allow deleting an applicant with confirmation, SHALL remove the applicant plus dependent notes, activities, and screening data, and SHALL refresh the board without a page reload.

#### Scenario: Delete from card and modal
- **WHEN** HR confirms deletion on a candidate card or in the detail modal
- **THEN** the system deletes the applicant via `DELETE /api/applicants/:id`, closes the modal if open, and the card disappears from the board

#### Scenario: Delete missing candidate
- **WHEN** HR deletes an applicant id that does not exist
- **THEN** the system returns 404 and the board is unchanged

### Requirement: HR can delete a job
The system SHALL allow deleting a job with confirmation, SHALL cascade-delete its applicants plus their notes, activities, and screening data, and SHALL refresh the dashboard without a page reload.

#### Scenario: Delete from dashboard
- **WHEN** HR confirms deletion on a job card
- **THEN** the system deletes the job via `DELETE /api/jobs/:id` and the card disappears from the dashboard

#### Scenario: Delete missing job
- **WHEN** HR deletes a job id that does not exist
- **THEN** the system returns 404 and the dashboard is unchanged
