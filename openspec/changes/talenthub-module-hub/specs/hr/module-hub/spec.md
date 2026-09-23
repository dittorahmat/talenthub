## Purpose

Gives the demo a platform front door matching the flyer: eight module tiles where live modules open and the rest honestly preview the full-build scope.

## ADDED Requirements

### Requirement: Hub lists all eight flyer modules with live routing
The system SHALL show 8 tiles (AI HR Assistant, Company Brain, Talent Intelligence, Project Staffing, HR Operations, Performance & Development, Workforce Intelligence, Management Command Center) and SHALL route tiles 01 and 03 to working views.

#### Scenario: Live tiles enter modules
- **WHEN** HR clicks Talent Intelligence or AI HR Assistant
- **THEN** the existing recruitment app or the assistant chat opens within 1 second

#### Scenario: Future tiles preview honestly
- **WHEN** HR clicks any of tiles 02, 04, 05, 06, 07, 08
- **THEN** a panel names the module, describes its planned scope in one paragraph, and labels it "Segera hadir di full build" with no fake controls

### Requirement: Hub carries Sirius identity
The system SHALL display PT. Sirius Global Technologies branding on the hub so poster and product read as one company.

#### Scenario: Branding visible on entry
- **WHEN** HR opens the app
- **THEN** the hub header shows the Sirius name alongside TalentHub before any other content
