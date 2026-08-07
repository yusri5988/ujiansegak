# AI Agent Prompt — Sistem Pengurusan Ujian SEGAK

You are a senior full-stack software engineer and system architect.

Build a web-based “Sistem Pengurusan Ujian SEGAK” for Malaysian schools.

The system should be inspired by the workflow and presentation of this reference page:

https://sites.google.com/moe-dl.edu.my/p12s2mssnshometraining/training-schedule/12-julai?authuser=2

The reference website uses training schedules and embedded forms. Do not copy its branding, code, images, wording, or copyrighted content. Recreate only the general workflow and improve it into a proper multi-user application.

## Technology Stack

Use the following stack:

- Backend: Hono with TypeScript
- Frontend: React with Vite
- Database: Cloudflare D1
- ORM: Drizzle ORM
- Deployment: Cloudflare Workers or Cloudflare Pages
- Authentication: Secure session-based authentication
- Validation: Zod
- Styling: Clean responsive CSS or an existing lightweight UI system
- File storage: Cloudflare R2 when file uploads are required

Use a Laravel-inspired project structure.

Example:

```text
src/
├── controllers/
├── services/
├── repositories/
├── models/
├── middleware/
├── requests/
├── routes/
├── database/
│   ├── schema/
│   ├── migrations/
│   └── seeders/
├── modules/
└── utils/
```

Business logic must be placed inside Services.

Controllers should only handle requests and responses.

Database access must be handled through Repositories or Drizzle query modules.

Do not place complex business logic directly inside routes, React components, or controllers.

Do not create a new architectural pattern without a clear reason.

## Main Objective

Create a system where:

1. Teachers can manage students, classes, training schedules and SEGAK tests.
2. Students can log in and view their assigned training.
3. Students can submit training completion records.
4. Teachers can record official SEGAK test results.
5. Both teachers and students can view progress over time.
6. The system automatically calculates relevant SEGAK scores and performance categories based on configurable rules.

The system must support multiple teachers, classes and students.

## User Roles

Create these roles:

### 1. Administrator

Administrator can:

- Manage schools
- Manage teacher accounts
- View overall system statistics
- Configure SEGAK activities
- Configure scoring rules
- Configure performance categories
- Configure academic sessions
- Manage system settings

### 2. Teacher

Teacher can:

- Manage their classes
- Add and edit students
- Import students using CSV
- Reset student passwords
- Create training programmes
- Create weekly or daily training schedules
- Assign training to selected classes or students
- Record official SEGAK results
- Review student submissions
- Approve or reject training submissions
- View individual and class progress
- Export reports
- Add teacher comments

Teachers must only access classes and students assigned to them unless granted broader permission.

### 3. Student

Student can:

- Log in using student ID and password
- View current training assignments
- View training instructions
- Watch attached training videos
- Submit completed training
- Enter requested repetitions, duration or measurements
- Add short notes
- Upload evidence when required
- View submission status
- View previous training records
- View official SEGAK results
- View progress charts
- Read teacher feedback

Students cannot edit approved submissions unless the teacher reopens them.

## Student Information

Each student should have:

- Full name
- Student ID
- Gender
- Date of birth
- School
- Academic year
- Class
- Height
- Weight
- Account status
- Parent or guardian contact, optional
- Medical or participation note, optional
- Created date
- Updated date

Do not display sensitive student data to unauthorised users.

## Class Management

Each class should contain:

- Class name
- Academic year
- Teacher
- List of students
- Active or inactive status

Teachers can:

- Create a class
- Edit class details
- Add students individually
- Import students using CSV
- Move students between classes
- Archive previous classes

## Training Programme

Teachers must be able to create reusable training templates.

Each training template should contain:

- Training title
- Description
- Objective
- Instructions
- Training category
- Estimated duration
- Difficulty level
- Number of sets
- Number of repetitions
- Rest duration
- Video URL
- Image or attachment
- Safety instructions
- Active or inactive status

Example training categories:

- Cardiovascular endurance
- Muscular endurance
- Muscular strength
- Flexibility
- Warm-up
- Cool-down

## Training Schedule

Recreate the general idea of the “Home Training 12 Julai” page as a structured training schedule.

A training schedule should contain:

- Schedule title
- Training date
- Start date
- Due date
- Teacher
- Assigned class
- Assigned students
- Introduction
- Training instructions
- One or more activities
- Submission requirements
- Evidence requirement
- Teacher notes
- Draft, published, closed or archived status

Teachers should be able to duplicate an existing schedule for another date.

Students should see a simple daily training page containing:

1. Training title and date
2. Teacher instructions
3. Safety reminder
4. List of activities
5. Video or visual guide
6. Completion form
7. Submit button
8. Submission status

## Training Submission

Each student submission should record:

- Student
- Training schedule
- Submission date and time
- Completion status
- Duration
- Sets completed
- Repetitions completed
- Student notes
- Uploaded evidence
- Teacher feedback
- Review status
- Approved or rejected date
- Reviewed by

Submission statuses:

- Not started
- In progress
- Submitted
- Approved
- Needs correction
- Rejected
- Missed

Prevent duplicate submissions unless resubmission is enabled.

## Official SEGAK Assessment

Support configurable SEGAK activities instead of hard-coding all rules.

Initial assessment activities may include:

- Body Mass Index
- Step test
- Push-up or modified push-up
- Partial curl-up
- Sit and reach

Each activity configuration should contain:

- Activity name
- Activity code
- Description
- Measurement type
- Measurement unit
- Gender applicability
- Minimum age
- Maximum age
- Scoring rules
- Performance category rules
- Active status

The scoring engine must be configurable because assessment rules may change.

Do not invent official scoring values.

Create seed data placeholders and clearly mark that scoring values must be verified and entered by an authorised administrator.

## Assessment Session

Teachers can create an assessment session containing:

- Session title
- Assessment date
- Academic session
- Assessment phase
- Class
- Assigned teacher
- Selected activities
- Draft, active, completed or archived status

Possible assessment phases:

- Initial assessment
- Mid-year assessment
- Final assessment

## Recording Results

Teachers should be able to enter results quickly using a class table.

Example table:

| Student | Height | Weight | Step Test | Push-up | Curl-up | Sit and Reach |
|---------|--------|--------|-----------|---------|---------|---------------|

Requirements:

- Keyboard-friendly data entry
- Automatic save or clear save indicators
- Validation for impossible values
- Bulk data entry
- Save as draft
- Finalise results
- Lock finalised assessments
- Reopen only with permission
- Track who edited each result

## BMI Calculation

Calculate BMI using:

```text
BMI = weight in kilograms / height in metres squared
```

Store:

- Height used
- Weight used
- Calculated BMI
- Calculation date

BMI classification must use configurable age and gender rules.

Do not apply adult BMI categories automatically to children.

## Scoring Engine

Create a separate scoring service.

The service should:

1. Receive the student profile and recorded measurements.
2. Locate the matching scoring rule.
3. Calculate the score for each activity.
4. Calculate the total score.
5. Determine the performance category.
6. Store the rule version used.
7. Return an explanation of the result.

Scoring rules should support:

- Age range
- Gender
- Activity
- Minimum and maximum measurement
- Score
- Performance category
- Effective date
- Rule version

Historical results must remain unchanged when new scoring rules are added.

## Student Progress

Create progress views showing:

- Training completion rate
- Number of completed activities
- Number of missed activities
- Latest SEGAK scores
- Previous SEGAK scores
- Improvement or decline
- BMI trend
- Teacher comments

Use simple charts that work well on mobile devices.

Do not compare students publicly against each other.

Class rankings should be disabled by default.

## Teacher Dashboard

Display:

- Total students
- Total classes
- Training scheduled this week
- Pending submissions
- Students who missed training
- Upcoming SEGAK assessments
- Recently submitted work
- Class completion percentages
- Students requiring teacher review

Provide quick actions:

- Create training
- Record SEGAK results
- Add student
- Import students
- Review submissions
- Generate report

## Student Dashboard

Display:

- Today’s training
- Upcoming training
- Pending submissions
- Recently completed training
- Latest teacher feedback
- Latest SEGAK result
- Personal progress summary

The interface must be very simple and suitable for primary and secondary school students.

## Reports

Teachers can generate:

### Individual Student Report

Include:

- Student information
- Training attendance
- Training completion
- SEGAK results
- Previous result comparison
- Teacher comments

### Class Report

Include:

- Number of students
- Completion percentage
- Assessment completion status
- Class performance summary
- Students with missing results
- Students requiring follow-up

Export formats:

- Printable HTML
- PDF
- CSV

## Notifications

Create an internal notification system for:

- New training published
- Training due soon
- Missed training
- Submission approved
- Submission requires correction
- New teacher feedback
- Upcoming SEGAK assessment

External WhatsApp, email or SMS integration should be designed as an optional future module, not required for the first version.

## Authentication and Security

Implement:

- Secure password hashing
- Session expiration
- Role-based access control
- Route protection
- Login rate limiting
- Validation for every request
- File upload validation
- Audit logs for important changes
- Protection against unauthorised student access
- Protection against ID enumeration
- CSRF protection where applicable

A student must never be able to access another student’s records.

A teacher must never be able to access unrelated classes without permission.

## Audit Log

Record important actions such as:

- User login
- Student creation
- Student update
- Training publication
- Submission approval
- SEGAK result creation
- SEGAK result update
- Assessment finalisation
- Scoring rule update
- Password reset

Store:

- User
- Action
- Entity type
- Entity ID
- Old data when appropriate
- New data when appropriate
- Date and time
- IP address when available

## Suggested Database Tables

Design the database around these entities:

- schools
- users
- teacher_profiles
- student_profiles
- academic_sessions
- classes
- class_students
- training_templates
- training_schedules
- training_schedule_activities
- training_assignments
- training_submissions
- submission_files
- teacher_feedback
- segak_activities
- segak_scoring_rules
- assessment_sessions
- assessment_session_activities
- assessment_results
- assessment_result_items
- notifications
- audit_logs
- system_settings

Use proper foreign keys, indexes, unique constraints and timestamps.

Use soft deletion only where it provides real value.

## Required Screens

### Public

- Login
- Forgot password
- Reset password

### Teacher

- Dashboard
- Classes
- Class details
- Students
- Student details
- Training templates
- Create training template
- Training schedules
- Create training schedule
- Submission review
- Assessment sessions
- SEGAK result entry
- Reports
- Notifications
- Profile

### Student

- Dashboard
- Training schedule
- Training submission form
- Submission history
- SEGAK results
- Progress
- Notifications
- Profile

### Administrator

- Dashboard
- Schools
- Teachers
- Academic sessions
- SEGAK activities
- Scoring rules
- System settings
- Audit logs

## UI and Design Requirements

The design must be:

- Mobile-first
- Responsive
- Clean
- Easy to understand
- Suitable for school use
- Accessible
- Fast on low-end mobile devices
- Optimised for slow internet connections

Avoid:

- Excessive animations
- Complicated dashboards
- Large unnecessary JavaScript libraries
- AI-generated-looking gradients
- Overcrowded cards
- Excessive modal windows

Use Bahasa Melayu as the default interface language.

Prepare the system for future English language support.

Use Malaysian date format:

```text
DD/MM/YYYY
```

Use timezone:

```text
Asia/Kuala_Lumpur
```

## Development Workflow

Do not begin coding immediately.

Follow these steps:

### Phase 1 — Analyse

1. Review the reference website.
2. Analyse the requested functionality.
3. Identify unclear requirements.
4. Inspect the existing repository.
5. Identify the existing architecture and coding conventions.
6. List security and privacy risks.
7. List assumptions.

### Phase 2 — Plan

Produce:

1. Product requirements document
2. User roles and permissions matrix
3. User journeys
4. System architecture
5. Database entity relationship plan
6. API endpoint plan
7. Frontend route plan
8. Development phases
9. Testing strategy
10. Deployment strategy

Stop after presenting the plan.

Do not modify files until the plan is approved.

### Phase 3 — Database

After approval:

1. Create Drizzle schemas.
2. Create D1 migrations.
3. Create indexes and constraints.
4. Create safe seed data.
5. Create repositories.
6. Test relationships and queries.

### Phase 4 — Backend

Build modules in this order:

1. Authentication
2. Role and permission control
3. Schools and academic sessions
4. Classes and students
5. Training templates
6. Training schedules
7. Student submissions
8. SEGAK activity configuration
9. Assessment sessions
10. Result recording
11. Scoring engine
12. Reports
13. Notifications
14. Audit logs

### Phase 5 — Frontend

Build:

1. Shared layout
2. Authentication screens
3. Teacher dashboard
4. Teacher management screens
5. Student dashboard
6. Training pages
7. Submission pages
8. Assessment entry interface
9. Result and progress pages
10. Report pages
11. Administrator pages

### Phase 6 — Testing

Create tests for:

- Authentication
- Authorisation
- Student data isolation
- Teacher class isolation
- Training assignment
- Submission workflow
- Assessment recording
- Scoring rules
- BMI calculations
- Report generation
- Input validation

Test both desktop and mobile layouts.

## MVP Scope

For the first version, prioritise:

1. Teacher and student authentication
2. Class and student management
3. Training schedule creation
4. Student training submission
5. Teacher submission review
6. SEGAK assessment session
7. Result recording
8. Configurable scoring rules
9. Individual student progress
10. Basic reports

Do not build these during the first MVP unless required:

- Parent accounts
- WhatsApp automation
- Email automation
- Payment system
- Public rankings
- Inter-school competitions
- Native mobile application
- Advanced gamification

## Final Instruction

First inspect the existing codebase and the reference workflow.

Then produce a complete implementation plan containing:

- Assumptions
- Modules
- User journeys
- Permission matrix
- Database tables and relationships
- API routes
- Frontend routes
- Folder structure
- Security requirements
- MVP development phases

Do not write or modify any code yet.

Wait for explicit approval after presenting the implementation plan.