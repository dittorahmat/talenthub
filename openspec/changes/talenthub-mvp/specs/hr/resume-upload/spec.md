# Resume Upload

## Feature

Allow candidates to upload their resume (PDF/DOCX) during the application process. The system will:
- Store the resume file in the `uploads/` directory
- Extract text content for basic parsing
- Store file path in the database
- Display filename and download link in candidate detail view
- Enable search/filter based on resume content (skills, experience keywords)

## Requirements

### API Endpoints
- `POST /api/applicants/:id/resume` - Upload resume file
- `GET /api/applicants/:id/resume` - Get resume file URL

### Database Schema
Add to `applicants` table:
- `resume_path`: TEXT (file path in uploads directory)
- `resume_filename`: TEXT (original filename)

### UI Components
- `AddCandidateForm`: Add file input field
- `CandidateDetailModal`: Show resume filename with download link
- `ResumeFilter`: Add to search/filter bar to search by resume content

### Implementation Notes
- Use `multer` or similar for file handling in API
- Basic resume parsing: extract text from PDF/DOCX (use `pdf-parse` and `docx` npm packages)
- Store files in `public/uploads/resumes/` directory
- Security: Validate file types (only PDF/DOCX), limit file size (5MB)
- Search: Allow filtering by keywords found in resume text (e.g., "JavaScript", "React", "management")