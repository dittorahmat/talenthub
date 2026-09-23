## Purpose

Answers routine employee HR questions instantly with canned knowledge and performs a mocked leave request, mirroring the flyer's assistant example.

## ADDED Requirements

### Requirement: Assistant answers seeded HR questions
The system SHALL match employee questions against a seeded Indonesian FAQ set (leave balance, reimbursement, travel procedure, payslip, SOP access, employment letter, and at least 6 more) and SHALL return the canned answer for the best match.

#### Scenario: Leave balance question answered
- **WHEN** an employee asks "Berapa sisa cuti saya tahun ini?"
- **THEN** the chat replies with the mocked balance (8 hari) and an "Ajukan Cuti" action within 1 second

#### Scenario: Unmatched question falls back gracefully
- **WHEN** no FAQ entry matches
- **THEN** the chat suggests contacting HR with HR's contact info instead of inventing an answer

### Requirement: Leave request flow completes as a mock
The system SHALL complete a leave request from the chat's action button and SHALL confirm with a reference number, storing nothing durable beyond the demo session log.

#### Scenario: Request from chat action
- **WHEN** the employee taps "Ajukan Cuti" and confirms dates
- **THEN** the chat shows a confirmation with a mock reference number and the request appears in the session's request list
