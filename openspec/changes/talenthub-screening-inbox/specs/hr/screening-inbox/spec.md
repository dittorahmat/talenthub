## Purpose

Lets HR drop a batch of CV files on a job and get a triaged shortlist with reasoning before anyone enters the interview pipeline, removing manual intake typing.

## ADDED Requirements

### Requirement: Bulk CV upload creates inbox items with progress
The system SHALL accept multiple CV files per job upload and SHALL expose per-file status `queued`, `parsing`, `ready`, or `error` until each item is triaged.

#### Scenario: Multi-file drop creates one item per file
- **WHEN** HR drops 5 PDFs on a job's upload zone
- **THEN** the inbox lists 5 items within 2 seconds, each showing filename and a live status that advances to `ready` without a page reload

#### Scenario: Oversized or wrong-type file is rejected per file
- **WHEN** one file in a batch exceeds 5MB or is not PDF/DOCX/TXT
- **THEN** that item shows an `error` state with the reason while the rest of the batch still processes

### Requirement: Every ready item carries a verdict with reasoning
The system SHALL assign each ready inbox item a verdict `Hire`, `Consider`, or `Pass`, a 0–100 score reusing the existing screening engine, and a one-sentence rationale naming the deciding factor.

#### Scenario: Verdict visible at a glance
- **WHEN** HR opens the screening inbox for a job
- **THEN** each ready item shows its verdict pill, score, and rationale sentence without opening any detail view

#### Scenario: Verdict bands stay consistent with card scores
- **WHEN** an item scoring 82 (Strong) is compared with its verdict
- **THEN** the verdict is `Hire`, matching the Strong band of the existing screening display

### Requirement: Promotion creates a candidate card with screening attached
The system SHALL create an `Applied` applicant from an inbox item on HR confirmation, carrying over the file, extracted keywords, score, and verdict, and SHALL mark the item `promoted`.

#### Scenario: One-click promote
- **WHEN** HR confirms promotion on a ready item (editing name/email first if needed)
- **THEN** a new card appears in the job's `Applied` column with its score badge and the inbox item shows `promoted`

#### Scenario: Promoted item cannot promote twice
- **WHEN** HR views an already-promoted item
- **THEN** the promote action is replaced with a link to the created candidate card

### Requirement: Duplicates are flagged, not duplicated
The system SHALL flag an upload whose email, phone, or filename already exists for the same job and SHALL offer a link to the existing card instead of creating a second record.

#### Scenario: Duplicate upload flagged
- **WHEN** HR uploads a CV whose email matches an existing applicant on that job
- **THEN** the item shows "sudah melamar" with a link to the existing candidate and no duplicate applicant is created

### Requirement: Knockout questions auto-flag mismatches
The system SHALL support per-job yes/no knockout questions and SHALL flag inbox items whose (mocked) answers mismatch, with the mismatch named in the item.

#### Scenario: Mismatch flagged with reason
- **WHEN** a job requires onsite availability and the item's mocked answer is negative
- **THEN** the item shows which question failed and its verdict caps at `Consider` regardless of score

### Requirement: Dismissal removes inbox noise
The system SHALL allow dismissing an inbox item with one action, hiding it from the default inbox view without creating any candidate record.

#### Scenario: Dismiss hides item
- **WHEN** HR dismisses a `Pass` item
- **THEN** it disappears from the inbox list and no applicant, note, or activity record exists for it
