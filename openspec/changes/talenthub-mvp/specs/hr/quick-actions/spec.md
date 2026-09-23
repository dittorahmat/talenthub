## Purpose

Allows HR to change candidate status and send WhatsApp reminders directly from candidate cards and the detail modal.

## ADDED Requirements

### Requirement: Hover quick-actions
The system SHALL display action buttons (View, Status, Remind) when user hovers over a candidate card.

#### Scenario: Quick-actions appear on hover
- **WHEN** user moves cursor over a candidate card in the Jobs Dashboard or Kanban Board
- **THEN** three icons appear: an eye (View), a pencil (Status), and a speech bubble (Remind)
- **AND** the icons fade in over 150ms
- **AND** hovering off the card causes the icons to fade out over 150ms
- **AND** the card does not register click events while quick-actions are visible

### Requirement: Status change via quick-action
The system SHALL open the status dropdown when the pencil icon is clicked.

#### Scenario: Click pencil opens status dropdown
- **WHEN** user clicks the pencil icon on a candidate card
- **THEN** a dropdown appears with the 6 pipeline stages (Applied → Phone Screen → Technical → Final Interview → Offer → Hired)
- **AND** selecting a stage updates the candidate's status inline
- **AND** the quick-actions disappear
- **AND** an activity log entry is created (see activity‑timeline spec)

### Requirement: WhatsApp reminder via quick-action
The system SHALL open a pre‑filled WhatsApp link when the speech‑bubble icon is clicked.

#### Scenario: Click speech bubble opens WhatsApp
- **WHEN** user clicks the speech‑bubble icon on a candidate card
- **THEN** a new tab opens to `https://wa.me/<phone>?text=<url‑encoded message>`
- **AND** the message reads: "Halo [Nama], ini pengingat interview Anda di TalentHub untuk posisi [Posisi] pada [Tanggal]. Silakan konfirmasi kehadirannya."
- **AND** the phone number is pulled from the candidate's profile