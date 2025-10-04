# Content Production Workflow Guide

**Version**: 1.0
**Last Updated**: October 4, 2025
**Audience**: Content Team, Project Managers, Translators, Reviewers

---

## Table of Contents

1. [Overview](#overview)
2. [Team Roles and Responsibilities](#team-roles-and-responsibilities)
3. [Content Production Pipeline](#content-production-pipeline)
4. [Phase 1: Planning and Assignment](#phase-1-planning-and-assignment)
5. [Phase 2: Research and Writing](#phase-2-research-and-writing)
6. [Phase 3: Medical Review](#phase-3-medical-review)
7. [Phase 4: Translation](#phase-4-translation)
8. [Phase 5: Quality Assurance](#phase-5-quality-assurance)
9. [Phase 6: CMS Upload and Publishing](#phase-6-cms-upload-and-publishing)
10. [Phase 7: Post-Publication Review](#phase-7-post-publication-review)
11. [Timeline and Milestones](#timeline-and-milestones)
12. [Tools and Platforms](#tools-and-platforms)
13. [Escalation Process](#escalation-process)
14. [Version Control and Updates](#version-control-and-updates)

---

## Overview

This workflow guide outlines the complete process for creating, reviewing, translating, and publishing educational health content for MediMate's Education Hub. The workflow ensures:

- **Medical accuracy** through physician review
- **Quality** through multiple checkpoints
- **Cultural appropriateness** through native speaker review
- **Accessibility** through readability testing
- **Consistency** through standardized processes

**Production Goal**: 50+ high-quality educational content pieces in 4 languages (English, Malay, Chinese, Tamil).

**Timeline**: 12 weeks from project start to completion.

---

## Team Roles and Responsibilities

### Content Team Lead
**Responsibilities**:
- Overall project management and coordination
- Content planning and topic assignment
- Quality control and final approval
- Timeline management and milestone tracking
- Team communication and issue resolution

**Deliverables**:
- Content calendar and assignment sheet
- Weekly progress reports
- Quality audit reports

### Medical Writers (3 writers)
**Qualifications**: Health science background, medical writing experience preferred

**Responsibilities**:
- Research topics using authoritative medical sources
- Write content following Content Creation Guide standards
- Ensure 8th grade reading level
- Complete metadata and tagging
- Incorporate feedback from medical reviewers

**Deliverables**:
- English-language articles (800-1200 words)
- Source bibliography (internal use)
- Completed metadata form

**Time Allocation**:
- Stream A Writer: 15 chronic disease articles
- Stream B Writer: 25 medication guides
- Stream C Writer: 10 general health articles

### Medical Reviewers (2 physicians)
**Qualifications**: Licensed physician (MMC registered), relevant specialty experience

**Responsibilities**:
- Verify medical accuracy of all content
- Check appropriateness of advice for target audience (seniors)
- Ensure Malaysian clinical guidelines followed
- Approve or request revisions
- Sign off on final English version

**Deliverables**:
- Medical review checklist for each article
- Revision notes (if needed)
- Final approval signature

**Time Commitment**: 15-20 hours per week during review phases

### Professional Translators (9 translators: 3 per language)
**Qualifications**:
- Certified medical translator or healthcare background
- Native speaker of target language
- Familiar with Malaysian cultural context

**Languages**:
- Malay (Bahasa Melayu) - 3 translators
- Chinese (Mandarin) - 3 translators
- Tamil - 3 translators

**Responsibilities**:
- Translate English content to target language
- Maintain medical terminology accuracy
- Adapt cultural references appropriately
- Match reading level of original
- Complete translation within deadline

**Deliverables**:
- Complete translated article
- Translation notes (cultural adaptations, terminology choices)

### Native Speaker Reviewers (3 reviewers: 1 per language)
**Qualifications**:
- Native speaker
- Healthcare or medical background preferred
- Familiar with Malaysian cultural norms

**Responsibilities**:
- Review translations for accuracy and natural flow
- Verify medical terminology in native language
- Check cultural appropriateness
- Suggest improvements for clarity
- Approve or request revisions

**Deliverables**:
- Review checklist for each translation
- Revision notes (if needed)
- Final approval

### Video Production Team
**Roles**:
- Video Producer/Director
- Scriptwriter
- Video Editor
- Voice Actors (4, one per language)
- Subtitle Specialist

**Responsibilities**:
- Create video scripts from written content
- Produce educational videos (animation/live action)
- Record voiceovers in all 4 languages
- Create subtitle files (.vtt format)
- Ensure accessibility standards (large text, high contrast)

**Deliverables**:
- MP4 video files (1080p, H.264)
- Audio tracks (4 languages)
- Subtitle files (4 languages, .vtt format)
- Thumbnail and chapter images

### Content Administrator
**Responsibilities**:
- Upload content to CMS (Admin Panel)
- Add metadata and tags
- Upload media files to AWS S3
- Configure CDN URLs
- Test content display across devices
- Schedule publication

**Deliverables**:
- All content published in CMS
- Media files stored in S3 with proper CDN links
- Content accessibility tested

### QA Specialist
**Responsibilities**:
- Readability testing (Flesch-Kincaid)
- Link checking
- Cross-device testing (mobile, tablet, desktop)
- Accessibility compliance testing (WCAG 2.1 AA)
- Final pre-publication review

**Deliverables**:
- QA checklist for each content piece
- Bug/issue reports
- Final approval for publication

---

## Content Production Pipeline

### Pipeline Overview

```
Planning → Writing → Medical Review → Translation →
Native Review → QA → CMS Upload → Publishing → Post-Review
```

**Total Timeline per Article**: 4-6 weeks (depending on complexity)

**Parallel Processing**: Multiple articles at different pipeline stages simultaneously

---

## Phase 1: Planning and Assignment

**Duration**: Week 1

**Owner**: Content Team Lead

### Activities

1. **Topic Selection**
   - Review content requirements (chronic diseases, medications, general health)
   - Prioritize based on user needs and medical importance
   - Assign topics to medical writers

2. **Create Content Calendar**
   - Schedule writing deadlines
   - Assign medical reviewers
   - Schedule translation windows
   - Set publication dates

3. **Resource Allocation**
   - Assign writers to streams (A, B, or C)
   - Schedule medical reviewer availability
   - Contract translators
   - Book video production resources

### Deliverables

- [ ] Content calendar (all 50+ topics scheduled)
- [ ] Writer assignments
- [ ] Medical reviewer schedule
- [ ] Translator contracts signed
- [ ] Kickoff meeting completed

### Tools

- Google Sheets: Content tracking spreadsheet
- Asana/Trello: Task management
- Google Calendar: Team schedule

---

## Phase 2: Research and Writing

**Duration**: 1-2 weeks per article

**Owner**: Medical Writers

### Step-by-Step Process

#### Step 1: Research (2-3 days)

1. **Gather Sources**
   - Malaysian Clinical Practice Guidelines (first priority)
   - WHO guidelines
   - Peer-reviewed journals (PubMed)
   - Medication package inserts (for medication guides)

2. **Create Bibliography**
   - Document all sources with URLs and dates
   - Note key facts and page references
   - Store in shared Google Drive folder

3. **Outline Article**
   - Follow standard template structure
   - Plan sections and key points
   - Identify visuals needed (charts, diagrams)

#### Step 2: Writing (3-5 days)

1. **Draft English Version**
   - Follow Content Creation Guide standards
   - Write at 8th grade reading level
   - Use active voice and simple language
   - Include all required sections

2. **Self-Edit**
   - Run Flesch-Kincaid readability test
   - Check for medical accuracy against sources
   - Verify all facts and figures
   - Proofread for grammar and spelling

3. **Complete Metadata**
   - Fill out all required fields
   - Add ICD-10 codes
   - Choose relevant tags
   - Calculate estimated read time

#### Step 3: Submit for Review (1 day)

1. **Upload to Shared Drive**
   - Place in "Pending Medical Review" folder
   - Include bibliography file
   - Add metadata spreadsheet

2. **Notify Medical Reviewer**
   - Send email with article details
   - Provide review deadline (3-5 business days)
   - Include any specific questions

### Deliverables

- [ ] Complete English article (800-1200 words)
- [ ] Bibliography with all sources
- [ ] Completed metadata form
- [ ] Self-review checklist completed
- [ ] Readability score documented (grade 8 or below)

### Quality Gates

Before submitting to medical review:
- ✅ Flesch-Kincaid grade level 8 or below
- ✅ All sources credible and current (within 5 years)
- ✅ Medical disclaimer included
- ✅ "When to Seek Help" section included
- ✅ All metadata fields completed

---

## Phase 3: Medical Review

**Duration**: 3-5 business days

**Owner**: Medical Reviewers

### Step-by-Step Process

#### Step 1: Initial Review (2-3 days)

1. **Medical Accuracy Check**
   - Verify all medical facts against sources
   - Check medication dosages and instructions
   - Confirm ICD-10 codes are correct
   - Validate symptom descriptions and warning signs

2. **Appropriateness for Audience**
   - Ensure advice is suitable for seniors (60+)
   - Check for safety considerations
   - Verify reading level is accessible

3. **Malaysian Context**
   - Confirm guidelines align with Malaysian standards
   - Check medication availability in Malaysia
   - Verify units (mmol/L for blood glucose)

#### Step 2: Provide Feedback

**If Approved**:
- Sign medical review checklist
- Add credentials and license number
- Move to "Approved for Translation" folder

**If Revisions Needed**:
- Document specific issues in review form
- Provide correction guidance
- Set revision deadline (2-3 days)
- Return to writer

#### Step 3: Re-review (if needed, 1-2 days)

- Check that all requested changes made
- Verify corrections are accurate
- Final approval

### Deliverables

- [ ] Completed medical review checklist
- [ ] Revision notes (if applicable)
- [ ] Final approval with signature
- [ ] Reviewer credentials documented

### Quality Gates

- ✅ Zero medical inaccuracies
- ✅ All advice safe and appropriate for elderly
- ✅ Malaysian clinical guidelines followed
- ✅ Emergency warning signs clearly stated

---

## Phase 4: Translation

**Duration**: 5-7 days per language

**Owner**: Professional Translators

### Step-by-Step Process

#### Step 1: Translation Assignment

1. **Content Team Lead assigns translation**
   - Select translator based on topic expertise
   - Provide English approved article
   - Set deadline (5-7 days)
   - Share glossary of standard medical terms

#### Step 2: Professional Translation (4-5 days)

1. **Translate Content**
   - Translate all text to target language
   - Maintain medical terminology accuracy
   - Adapt cultural references appropriately
   - Match reading level of original

2. **Use Translation Memory**
   - Leverage previously translated medical terms
   - Maintain consistency across articles
   - Build glossary for future use

3. **Add Translation Notes**
   - Document cultural adaptations made
   - Note any terminology choices requiring review
   - Flag any sections needing clarification

#### Step 3: Self-Review

- Proofread for grammar and spelling
- Check medical terms against glossary
- Verify all sections translated (none missed)
- Ensure formatting consistent with original

#### Step 4: Submit for Native Speaker Review

- Upload to "Pending Native Review" folder
- Include translation notes
- Notify native speaker reviewer

### Deliverables per Language

- [ ] Complete translated article (MS, ZH, or TA)
- [ ] Translation notes documenting adaptations
- [ ] Self-review checklist completed

### Quality Gates

- ✅ All sections translated (100% complete)
- ✅ Medical terminology accurate
- ✅ Cultural references adapted appropriately
- ✅ Reading level matches original (accessible)

---

## Phase 5: Quality Assurance

**Duration**: 3-5 days

**Owners**: Native Speaker Reviewers + QA Specialist

### Step-by-Step Process

#### Step 1: Native Speaker Review (2-3 days)

**Per Language Reviewer**:

1. **Review Translation Quality**
   - Check for natural flow and readability
   - Verify medical terminology is correct
   - Ensure cultural appropriateness
   - Confirm nothing "lost in translation"

2. **Compare to Original**
   - Verify all key points translated
   - Check that meaning is preserved
   - Ensure emphasis and tone consistent

3. **Provide Feedback**
   - Approve OR request specific revisions
   - Document any improvements needed
   - Return to translator if changes needed

#### Step 2: Technical QA (2 days)

**QA Specialist**:

1. **Readability Testing**
   - Run Flesch-Kincaid on all 4 language versions
   - Verify grade 8 level or below

2. **Formatting Check**
   - Consistent heading structure across languages
   - Proper bullet points and numbering
   - All bold/emphasis preserved

3. **Metadata Validation**
   - All fields completed correctly
   - ICD-10 codes valid
   - Tags appropriate and consistent

4. **Link Checking**
   - All URLs functional
   - External resources appropriate

5. **Cross-Device Testing** (after CMS upload)
   - Test on mobile, tablet, desktop
   - Check all 4 language versions display correctly
   - Verify media loads properly

### Deliverables

- [ ] Native speaker approval for each language (MS, ZH, TA)
- [ ] QA checklist completed
- [ ] Readability scores documented (all 4 languages)
- [ ] All formatting issues resolved
- [ ] Content ready for CMS upload

### Quality Gates

- ✅ All 4 language versions approved
- ✅ Readability grade 8 or below (all languages)
- ✅ Formatting consistent across languages
- ✅ Metadata complete and accurate
- ✅ Zero broken links

---

## Phase 6: CMS Upload and Publishing

**Duration**: 2-3 days

**Owner**: Content Administrator

### Step-by-Step Process

#### Step 1: CMS Upload (1 day)

1. **Create New Content Entry**
   - Log into MediMate CMS Admin Panel
   - Select "Create New Article"
   - Choose content type (article, medication guide, video)

2. **Upload English Version**
   - Copy/paste or import Markdown content
   - Preview formatting
   - Fix any display issues

3. **Upload Translated Versions**
   - Add Malay version
   - Add Chinese version
   - Add Tamil version
   - Verify all versions display correctly

4. **Add Metadata**
   - Enter all metadata fields from form
   - Add ICD-10 codes
   - Add tags
   - Link related content (medications, conditions)
   - Set difficulty level

5. **Upload Media Files (if applicable)**
   - Upload to AWS S3 bucket
   - Generate CDN URLs
   - Add URLs to CMS
   - Test media playback

#### Step 2: Preview and Test (1 day)

1. **Preview Mode**
   - Review article in staging environment
   - Check all 4 language versions
   - Verify formatting correct
   - Test language switcher

2. **Device Testing**
   - View on mobile (iOS, Android)
   - View on tablet
   - View on desktop
   - Check responsive design

3. **Accessibility Testing**
   - Test with screen reader
   - Verify heading hierarchy
   - Check contrast ratios
   - Test font scaling

#### Step 3: Final Approval and Publishing (1 day)

1. **Final Review**
   - Content Team Lead reviews in staging
   - Medical Reviewer spot-checks (sample)
   - Address any last-minute issues

2. **Schedule Publication**
   - Set publication date/time
   - Add to content calendar
   - Prepare social media announcements (if applicable)

3. **Publish to Production**
   - Move from staging to production
   - Verify live content displays correctly
   - Update content inventory

### Deliverables

- [ ] Content published in CMS (all 4 languages)
- [ ] Media files uploaded to S3 with CDN URLs
- [ ] Related content linked correctly
- [ ] Content appears in Education Hub
- [ ] Publication confirmed in content tracker

### Quality Gates

- ✅ All 4 language versions published
- ✅ Media files load correctly
- ✅ Content displays properly on all devices
- ✅ Accessibility compliance verified (WCAG 2.1 AA)
- ✅ Related content links functional

---

## Phase 7: Post-Publication Review

**Duration**: Ongoing (30 days after publication)

**Owner**: Content Team Lead + Analytics Team

### Step-by-Step Process

#### Step 1: Performance Monitoring (First 30 days)

1. **Track Engagement Metrics**
   - Page views per language
   - Average time on page
   - Completion rate (scroll depth)
   - Quiz pass rate (if applicable)
   - User ratings/feedback

2. **Identify Issues**
   - User-reported errors
   - Confusion points (FAQ questions)
   - Accessibility complaints
   - Translation issues

#### Step 2: User Feedback Collection

1. **Gather Feedback**
   - In-app ratings and comments
   - Support tickets related to content
   - Beta tester feedback
   - Healthcare provider feedback

2. **Categorize Feedback**
   - Medical accuracy concerns (high priority)
   - Clarity issues
   - Translation problems
   - Technical issues

#### Step 3: Content Updates (as needed)

**Trigger for Update**:
- Medical accuracy error reported
- New clinical guidelines published
- Medication information changed (dosing, safety warnings)
- Significant user confusion

**Update Process**:
1. Writer makes corrections
2. Medical reviewer approves changes
3. Translators update affected languages
4. Content Administrator publishes update
5. Version number incremented

### Deliverables

- [ ] 30-day performance report per article
- [ ] User feedback summary
- [ ] Issues log and resolution status
- [ ] Content update schedule (if needed)

---

## Timeline and Milestones

### Production Timeline (Per Article)

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Planning & Assignment | 1 day | Day 1 |
| Research & Writing | 5-7 days | Day 8 |
| Medical Review | 3-5 days | Day 13 |
| Translation (3 languages in parallel) | 5-7 days | Day 20 |
| Native Speaker Review (3 languages) | 3 days | Day 23 |
| QA Testing | 2 days | Day 25 |
| CMS Upload & Publishing | 2-3 days | Day 28 |
| **Total Time** | **4 weeks** | |

### Project Timeline (50+ Articles)

**Parallel Processing**: Multiple articles at different stages simultaneously

**Weeks 1-2**:
- Planning and topic assignment
- Writers start first batch (15 articles across 3 streams)

**Weeks 3-6**:
- Writing continues (second and third batches)
- First batch in medical review
- First batch translations begin

**Weeks 7-10**:
- Final writing completed
- Bulk of translations ongoing
- First articles published
- Video production in parallel

**Weeks 11-12**:
- Final translations and QA
- Remaining articles published
- Final testing and polish
- Project completion report

### Key Milestones

- ✅ Week 2: All topics assigned and scheduled
- ✅ Week 4: First 10 articles written and reviewed
- ✅ Week 6: First 10 articles translated (all languages)
- ✅ Week 8: First 20 articles published
- ✅ Week 10: 40 articles published
- ✅ Week 12: All 50+ articles published

---

## Tools and Platforms

### Content Management

1. **Google Drive**
   - Folder structure: Planning / Writing / Medical Review / Translation / Published
   - Shared with entire content team
   - Version history enabled

2. **MediMate CMS Admin Panel**
   - Content creation and editing
   - Metadata management
   - Publishing workflow
   - Preview/staging environment

3. **AWS S3**
   - Media file storage (videos, images, audio)
   - CDN integration (CloudFront)

### Project Management

1. **Content Tracking Spreadsheet** (Google Sheets)
   - All 50+ articles listed
   - Current status per article
   - Owner assignments
   - Deadlines
   - Completion checkboxes

2. **Asana/Trello** (Task Management)
   - Individual tasks per article
   - Checklists and due dates
   - Team collaboration

3. **Google Calendar**
   - Deadlines and milestones
   - Team availability
   - Review meetings

### Communication

1. **Slack/Microsoft Teams**
   - Channels: #content-writing, #medical-review, #translation, #qa
   - Quick questions and updates
   - File sharing

2. **Email**
   - Formal assignments
   - Review approvals
   - Document sharing

3. **Weekly Meetings**
   - Monday: Week planning and assignments
   - Friday: Progress review and blocker resolution

### Quality Tools

1. **Hemingway Editor** (Readability)
2. **Grammarly** (Grammar and spelling)
3. **Google Translate** (Reference only, NOT for final translation)
4. **WAVE** (Web accessibility testing)

---

## Escalation Process

### Issue Types and Resolution

#### Level 1: Minor Issues (Resolve within team)

**Examples**:
- Grammar or spelling errors
- Minor formatting inconsistencies
- Unclear wording

**Resolution**:
- Writer/translator fixes immediately
- No escalation needed
- Document in version notes

#### Level 2: Moderate Issues (Team Lead involvement)

**Examples**:
- Writer and reviewer disagree on medical fact
- Translation significantly different from original meaning
- Missed deadline affecting other team members

**Resolution**:
1. Notify Content Team Lead
2. Team Lead investigates and makes decision
3. Document resolution and reasoning
4. Timeline adjusted if needed

**Response Time**: 24-48 hours

#### Level 3: Serious Issues (Medical/Legal review)

**Examples**:
- Potential medical inaccuracy in published content
- Legal concern (copyright, liability)
- User safety issue reported
- Medication recall or safety warning

**Resolution**:
1. Immediately notify Content Team Lead
2. Escalate to Medical Director and Legal (if applicable)
3. Content may be unpublished pending review
4. Crisis communication plan activated

**Response Time**: Immediate (same day)

### Escalation Contact List

| Issue Type | Contact | Response Time |
|------------|---------|---------------|
| Medical accuracy | Medical Reviewer → Medical Director | 24 hours |
| Translation quality | Native Reviewer → Translation Agency | 48 hours |
| Technical (CMS) | Content Admin → IT Support | 24 hours |
| Legal/Compliance | Team Lead → Legal Department | 48 hours |
| User safety | Team Lead → Medical Director + Legal | Immediate |

---

## Version Control and Updates

### Version Numbering

**Format**: `Major.Minor`

**Examples**:
- Version 1.0: Initial publication
- Version 1.1: Minor edit (typo fix, formatting)
- Version 2.0: Major update (content rewrite, new medical guidelines)

### When to Update Content

**Required Updates** (within 30 days):
- Medical error discovered
- New clinical guidelines published
- Medication safety warning issued
- Regulatory change affecting advice

**Optional Updates** (within 90 days):
- Minor improvements to clarity
- Additional FAQ questions
- Enhanced visuals or examples

**Annual Review** (every 12 months):
- All content reviewed for currency
- Medical facts verified against latest guidelines
- Outdated references updated
- Version incremented

### Update Process

1. **Identify Need for Update**
   - User feedback, medical reviewer alert, or scheduled review

2. **Writer Makes Revisions**
   - English version updated
   - Changes documented in version notes

3. **Medical Re-review**
   - Reviewer approves changes (abbreviated review if minor)

4. **Translation Updates**
   - Only affected sections re-translated
   - Maintain consistency with existing content

5. **Re-publish**
   - Version number incremented
   - "Last reviewed date" updated
   - Users notified of update (if significant)

---

## Best Practices

### For Smooth Workflow

1. **Communicate Early**: Flag issues as soon as identified
2. **Batch Similar Tasks**: Review multiple articles at once for efficiency
3. **Parallel Processing**: Don't wait for entire batch to complete before starting next phase
4. **Buffer Time**: Build 2-3 day buffer into deadlines for unexpected delays
5. **Documentation**: Keep detailed notes on decisions and changes
6. **Consistency**: Use templates and checklists for every article
7. **Feedback Loop**: Share learnings across team (common errors, good examples)

### Common Pitfalls to Avoid

❌ Waiting for all articles to be written before starting medical review (bottleneck)
✅ Review articles as soon as each is completed

❌ Translating before medical review approval (wasted effort if changes needed)
✅ Only translate medically approved content

❌ Uploading to CMS without thorough testing
✅ Always preview in staging environment first

❌ Publishing without native speaker review
✅ Require native speaker approval for every language

---

## Success Metrics

### Content Quality

- Medical accuracy: 100% (zero errors in published content)
- Readability: 100% at grade 8 or below
- Translation quality: >95% approval rate from native speakers
- Accessibility: 100% WCAG 2.1 AA compliance

### Production Efficiency

- On-time delivery: >90% of articles meet deadline
- Revision rate: <20% of articles require major revisions
- Average time per article: 4 weeks or less
- Team utilization: >80% of scheduled time productive

### User Engagement

- Article completion rate: >70% (users read to end)
- Quiz pass rate: >60% (users understand content)
- User satisfaction: >4.0/5.0 stars average
- Support tickets: <5% related to content confusion

---

## Appendix

### Checklist Templates

Templates available in shared Google Drive:
- Writer Self-Review Checklist
- Medical Review Checklist
- Translation Review Checklist
- QA Testing Checklist
- CMS Upload Checklist

### Contact Information

**Content Team Lead**: content-lead@medimate.com
**Medical Review**: medical-review@medimate.com
**Translation Services**: translation@medimate.com
**Technical Support**: cms-support@medimate.com

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-04 | Initial creation | Content Team |

---

**Document Owner**: MediMate Content Team Lead
**Review Cycle**: Quarterly (every 3 months)
**Next Review Date**: January 4, 2026
