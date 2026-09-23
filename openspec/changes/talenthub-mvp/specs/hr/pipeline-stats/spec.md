## Purpose

Provides a visual funnel showing conversion rates between pipeline stages to help HR assess hiring efficiency.

## ADDED Requirements

### Requirement: Pipeline stats display
The system SHALL display a funnel chart showing the percentage of candidates at each pipeline stage.

#### Scenario: Funnel chart renders
- **WHEN** user opens a job's Kanban view
- **THEN** a horizontal bar chart shows stage percentages (e.g., 100% → 65% → 40% → 22% → 12% → 8%)
- **AND** each bar reflects the count of candidates in that stage
- **AND** the chart updates in real-time when candidate status changes
- **AND** clicking a bar filters the Kanban view to that stage