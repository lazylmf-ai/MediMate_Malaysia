-- MediMate Malaysia - Seed Data
-- Test data for development environment with Malaysian cultural context

-- ============================================================================
-- MALAYSIAN CULTURAL EVENTS AND HOLIDAYS (2024-2025)
-- ============================================================================

INSERT INTO cultural_events (event_name, event_type, event_date, affects_medication, adjustment_rules, applicable_states, description) VALUES
-- Islamic Events
('Maulidur Rasul', 'islamic', '2024-09-16', TRUE, '{"fasting_adjustments": false, "prayer_time_emphasis": true}', '{all}', 'Prophet Muhammad birthday celebration'),
('Awal Muharram', 'islamic', '2024-07-08', TRUE, '{"fasting_adjustments": false, "prayer_time_emphasis": true}', '{all}', 'Islamic New Year'),
('Hari Raya Aidilfitri', 'islamic', '2024-04-10', TRUE, '{"meal_timing_changes": true, "family_gathering": true}', '{all}', 'End of Ramadan celebration'),
('Hari Raya Aidilfitri (Second Day)', 'islamic', '2024-04-11', TRUE, '{"meal_timing_changes": true, "family_gathering": true}', '{all}', 'Second day of Eid celebration'),
('Hari Raya Haji', 'islamic', '2024-06-17', TRUE, '{"prayer_time_emphasis": true, "community_activities": true}', '{all}', 'Feast of the Sacrifice'),

-- Chinese Events
('Chinese New Year', 'chinese', '2024-02-10', TRUE, '{"meal_timing_changes": true, "family_gathering": true, "travel_period": true}', '{all}', 'Lunar New Year celebration'),
('Chinese New Year (Second Day)', 'chinese', '2024-02-11', TRUE, '{"meal_timing_changes": true, "family_gathering": true}', '{all}', 'Second day of Chinese New Year'),

-- Indian Events
('Deepavali', 'indian', '2024-10-31', TRUE, '{"meal_timing_changes": true, "family_gathering": true, "sweet_consumption": true}', '{all}', 'Festival of Lights'),
('Thaipusam', 'indian', '2024-01-25', TRUE, '{"fasting_period": true, "medication_timing_critical": true}', '{"Penang", "Selangor", "Perak", "Johor", "Negeri Sembilan"}', 'Hindu festival with fasting requirements'),

-- National Holidays
('Merdeka Day', 'national', '2024-08-31', FALSE, '{}', '{all}', 'Independence Day celebration'),
('Malaysia Day', 'national', '2024-09-16', FALSE, '{}', '{all}', 'Formation of Malaysia'),
('Hari Kebangsaan', 'national', '2024-08-31', FALSE, '{}', '{all}', 'National Day'),

-- Christian Events
('Good Friday', 'christian', '2024-03-29', FALSE, '{"prayer_time_emphasis": true}', '{"Sabah", "Sarawak"}', 'Christian holy day'),
('Christmas Day', 'christian', '2024-12-25', TRUE, '{"family_gathering": true, "meal_timing_changes": true}', '{all}', 'Christmas celebration'),

-- State-specific holidays
('Hari Hol Sabah', 'local', '2024-05-30', FALSE, '{}', '{"Sabah"}', 'Sabah Harvest Festival'),
('Hari Gawai', 'local', '2024-06-01', TRUE, '{"traditional_meals": true, "alcohol_considerations": true}', '{"Sarawak"}', 'Dayak Harvest Festival'),
('Birthday of Sultan of Johor', 'local', '2024-03-23', FALSE, '{}', '{"Johor"}', 'Johor Sultan birthday');

-- ============================================================================
-- PRAYER TIMES FOR MAJOR MALAYSIAN CITIES (Sample Week)
-- ============================================================================

-- Kuala Lumpur prayer times
INSERT INTO prayer_times (city, state, prayer_date, fajr, dhuhr, asr, maghrib, isha, sunrise, sunset) VALUES
('Kuala Lumpur', 'Selangor', '2024-01-01', '06:05', '13:15', '16:30', '19:20', '20:35', '07:20', '19:20'),
('Kuala Lumpur', 'Selangor', '2024-01-02', '06:05', '13:15', '16:31', '19:21', '20:36', '07:21', '19:21'),
('Kuala Lumpur', 'Selangor', '2024-01-03', '06:06', '13:16', '16:31', '19:21', '20:36', '07:21', '19:21'),
('Kuala Lumpur', 'Selangor', '2024-01-04', '06:06', '13:16', '16:32', '19:22', '20:37', '07:22', '19:22'),
('Kuala Lumpur', 'Selangor', '2024-01-05', '06:06', '13:17', '16:32', '19:22', '20:37', '07:22', '19:22'),
('Kuala Lumpur', 'Selangor', '2024-01-06', '06:07', '13:17', '16:33', '19:23', '20:38', '07:23', '19:23'),
('Kuala Lumpur', 'Selangor', '2024-01-07', '06:07', '13:18', '16:33', '19:23', '20:38', '07:23', '19:23'),

-- Penang prayer times
('George Town', 'Penang', '2024-01-01', '06:15', '13:25', '16:40', '19:30', '20:45', '07:30', '19:30'),
('George Town', 'Penang', '2024-01-02', '06:15', '13:25', '16:41', '19:31', '20:46', '07:31', '19:31'),
('George Town', 'Penang', '2024-01-03', '06:16', '13:26', '16:41', '19:31', '20:46', '07:31', '19:31'),

-- Johor Bahru prayer times  
('Johor Bahru', 'Johor', '2024-01-01', '06:00', '13:10', '16:25', '19:15', '20:30', '07:15', '19:15'),
('Johor Bahru', 'Johor', '2024-01-02', '06:00', '13:10', '16:26', '19:16', '20:31', '07:16', '19:16'),
('Johor Bahru', 'Johor', '2024-01-03', '06:01', '13:11', '16:26', '19:16', '20:31', '07:16', '19:16');

-- ============================================================================
-- MALAYSIAN MEDICATION DATABASE
-- ============================================================================

INSERT INTO medication_database (
    medication_name, generic_name, brand_names, drug_registration_number, manufacturer,
    dosage_forms, strengths, therapeutic_class, halal_certified, contains_gelatin, 
    prescription_required, active
) VALUES
-- Common Malaysian medications
('Panadol', 'Paracetamol', '{"Panadol", "Febridol", "Tylenol"}', 'MAL19940001A', 'GlaxoSmithKline', 
 '{"tablet", "caplet", "suspension"}', '{"500mg", "1000mg", "250mg/5ml"}', 'Analgesic/Antipyretic', TRUE, FALSE, FALSE, TRUE),

('Ponstan', 'Mefenamic Acid', '{"Ponstan", "Ponstel"}', 'MAL19850023B', 'Pfizer Malaysia',
 '{"capsule", "tablet", "suspension"}', '{"250mg", "500mg"}', 'NSAID', TRUE, TRUE, TRUE, TRUE),

('Augmentin', 'Amoxicillin/Clavulanate', '{"Augmentin", "Co-Amoxiclav"}', 'MAL19920045C', 'GlaxoSmithKline',
 '{"tablet", "suspension", "injection"}', '{"625mg", "1g", "156.25mg/5ml"}', 'Antibiotic', TRUE, FALSE, TRUE, TRUE),

('Metformin', 'Metformin HCl', '{"Glucophage", "Diabex", "Metformin"}', 'MAL19880067D', 'Various',
 '{"tablet", "extended-release"}', '{"500mg", "850mg", "1000mg"}', 'Antidiabetic', TRUE, FALSE, TRUE, TRUE),

('Simvastatin', 'Simvastatin', '{"Zocor", "Lipex"}', 'MAL19950034E', 'MSD Malaysia',
 '{"tablet"}', '{"10mg", "20mg", "40mg"}', 'Statin', TRUE, FALSE, TRUE, TRUE),

('Losartan', 'Losartan Potassium', '{"Cozaar", "Losartan"}', 'MAL19980056F', 'MSD Malaysia',
 '{"tablet"}', '{"25mg", "50mg", "100mg"}', 'ACE Inhibitor', TRUE, FALSE, TRUE, TRUE),

('Omeprazole', 'Omeprazole', '{"Losec", "Prilosec"}', 'MAL19910078G', 'AstraZeneca',
 '{"capsule", "tablet"}', '{"20mg", "40mg"}', 'PPI', TRUE, TRUE, TRUE, TRUE),

('Salbutamol', 'Salbutamol', '{"Ventolin", "Airomir"}', 'MAL19820089H', 'GlaxoSmithKline',
 '{"inhaler", "nebule", "tablet"}', '{"100mcg/dose", "2mg", "4mg"}', 'Bronchodilator', TRUE, FALSE, TRUE, TRUE);

-- ============================================================================
-- SAMPLE FAMILIES AND USERS
-- ============================================================================

-- Sample families
INSERT INTO families (family_name, family_code, settings, privacy_settings) VALUES
('Ahmad Family', 'AHMAD01', 
 '{"notification_preferences": {"language": "ms", "time_format": "24h"}, "cultural_settings": {"religion": "islam"}}',
 '{"share_adherence": true, "notify_missed_doses": true, "share_location": false, "emergency_contacts_access": true}'),

('Lim Family', 'LIM001', 
 '{"notification_preferences": {"language": "zh", "time_format": "12h"}, "cultural_settings": {"religion": "buddhist"}}',
 '{"share_adherence": true, "notify_missed_doses": true, "share_location": true, "emergency_contacts_access": true}'),

('Raj Family', 'RAJ001', 
 '{"notification_preferences": {"language": "ta", "time_format": "12h"}, "cultural_settings": {"religion": "hindu"}}',
 '{"share_adherence": false, "notify_missed_doses": true, "share_location": false, "emergency_contacts_access": true}');

-- Sample users
INSERT INTO users (
    ic_number_hash, email, phone_number, full_name, preferred_name, date_of_birth, gender,
    preferred_language, secondary_languages, cultural_profile, family_id, role,
    location, privacy_consent, consent_date
) VALUES
-- Ahmad family (Muslim)
(generate_ic_hash('850215-14-1234'), 'ahmad.hassan@email.com', '+60123456789', 
 'Ahmad Hassan bin Abdullah', 'Ahmad', '1985-02-15', 'M',
 'ms', '{"en"}', 
 '{"religion": "islam", "prayer_times_enabled": true, "fasting_periods": ["ramadan"], "dietary_restrictions": ["halal"], "meal_times": {"breakfast": "07:00", "lunch": "13:00", "dinner": "19:30"}}',
 (SELECT id FROM families WHERE family_code = 'AHMAD01'), 'both',
 '{"city": "Kuala Lumpur", "state": "Selangor", "timezone": "Asia/Kuala_Lumpur"}',
 '{"data_collection": true, "family_sharing": true, "healthcare_provider_sharing": true, "analytics_participation": true, "marketing_communication": false}',
 NOW()),

(generate_ic_hash('880920-14-5678'), 'siti.aminah@email.com', '+60123456790', 
 'Siti Aminah binti Ahmad', 'Aminah', '1988-09-20', 'F',
 'ms', '{"en"}', 
 '{"religion": "islam", "prayer_times_enabled": true, "fasting_periods": ["ramadan"], "dietary_restrictions": ["halal"], "meal_times": {"breakfast": "07:30", "lunch": "13:30", "dinner": "20:00"}}',
 (SELECT id FROM families WHERE family_code = 'AHMAD01'), 'caregiver',
 '{"city": "Kuala Lumpur", "state": "Selangor", "timezone": "Asia/Kuala_Lumpur"}',
 '{"data_collection": true, "family_sharing": true, "healthcare_provider_sharing": false, "analytics_participation": true, "marketing_communication": false}',
 NOW()),

-- Lim family (Chinese Buddhist)
(generate_ic_hash('750810-08-9876'), 'david.lim@email.com', '+60187654321', 
 'David Lim Wei Ming', 'David', '1975-08-10', 'M',
 'en', '{"zh", "ms"}', 
 '{"religion": "buddhist", "prayer_times_enabled": false, "fasting_periods": [], "dietary_restrictions": ["vegetarian"], "cultural_holidays": ["chinese_new_year", "wesak_day"], "meal_times": {"breakfast": "08:00", "lunch": "12:30", "dinner": "19:00"}}',
 (SELECT id FROM families WHERE family_code = 'LIM001'), 'patient',
 '{"city": "George Town", "state": "Penang", "timezone": "Asia/Kuala_Lumpur"}',
 '{"data_collection": true, "family_sharing": true, "healthcare_provider_sharing": true, "analytics_participation": true, "marketing_communication": true}',
 NOW()),

-- Raj family (Hindu)
(generate_ic_hash('920505-10-1111'), 'priya.raj@email.com', '+60198765432', 
 'Priya Devi a/p Rajesh', 'Priya', '1992-05-05', 'F',
 'en', '{"ta", "ms"}', 
 '{"religion": "hindu", "prayer_times_enabled": false, "fasting_periods": ["ekadashi"], "dietary_restrictions": ["vegetarian"], "cultural_holidays": ["deepavali", "thaipusam"], "meal_times": {"breakfast": "07:30", "lunch": "13:00", "dinner": "19:30"}}',
 (SELECT id FROM families WHERE family_code = 'RAJ001'), 'patient',
 '{"city": "Klang", "state": "Selangor", "timezone": "Asia/Kuala_Lumpur"}',
 '{"data_collection": true, "family_sharing": false, "healthcare_provider_sharing": true, "analytics_participation": false, "marketing_communication": false}',
 NOW());

-- ============================================================================
-- SAMPLE HEALTHCARE PROVIDERS
-- ============================================================================

INSERT INTO healthcare_providers (
    provider_name, provider_type, registration_number, registration_type,
    contact_info, address, subscription_tier, features_enabled, active
) VALUES
('Hospital Kuala Lumpur', 'hospital', 'MOH-HKL-001', 'MOH',
 '{"phone": "+603-2615-5555", "email": "info@hkl.gov.my", "website": "https://www.hkl.gov.my"}',
 '{"address": "Jalan Pahang, 53000 Kuala Lumpur", "coordinates": {"lat": 3.1678, "lng": 101.7072}}',
 'enterprise', '{"medication_sync": true, "adherence_reports": true, "emergency_alerts": true}', TRUE),

('Gleneagles Hospital KL', 'hospital', 'PRIV-GH-001', 'private',
 '{"phone": "+603-4141-3000", "email": "enquiry@gleneagles.com.my"}',
 '{"address": "282 & 286 Jalan Ampang, 50450 Kuala Lumpur"}',
 'professional', '{"medication_sync": true, "adherence_reports": true}', TRUE),

('Guardian Pharmacy', 'pharmacy', 'PHARM-GUARD-001', 'pharmacy_board',
 '{"phone": "+603-7728-6000", "email": "customercare@guardian.com.my"}',
 '{"address": "Multiple locations nationwide"}',
 'basic', '{"prescription_sync": true}', TRUE),

('Klinik Primer 1Malaysia', 'clinic', 'MOH-K1M-001', 'MOH',
 '{"phone": "+603-8000-8000"}',
 '{"address": "Various locations"}',
 'basic', '{}', TRUE);

-- ============================================================================
-- SAMPLE MEDICATIONS AND SCHEDULES
-- ============================================================================

-- Ahmad's medications (Diabetes and Hypertension)
INSERT INTO medications (
    user_id, medication_db_id, medication_name, dosage, frequency, schedule_times,
    start_date, prescribed_by, provider_id, instructions, cultural_adjustments, active
) VALUES
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 (SELECT id FROM medication_database WHERE medication_name = 'Metformin'),
 'Metformin', '500mg', 'twice_daily', '{"08:00", "20:00"}',
 CURRENT_DATE - INTERVAL '30 days', 'Dr. Siti Hajar', 
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Klinik Primer 1Malaysia'),
 'Take with meals to reduce stomach upset', 
 '{"avoid_prayer_times": true, "ramadan_adjustments": true, "meal_timing_preference": "with_food"}', TRUE),

((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 (SELECT id FROM medication_database WHERE medication_name = 'Losartan'),
 'Losartan', '50mg', 'daily', '{"08:00"}',
 CURRENT_DATE - INTERVAL '45 days', 'Dr. Siti Hajar',
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Klinik Primer 1Malaysia'),
 'Take at the same time each day',
 '{"avoid_prayer_times": true}', TRUE);

-- David's medications (High cholesterol and occasional pain)
INSERT INTO medications (
    user_id, medication_db_id, medication_name, dosage, frequency, schedule_times,
    start_date, prescribed_by, provider_id, instructions, cultural_adjustments, active
) VALUES
((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 (SELECT id FROM medication_database WHERE medication_name = 'Simvastatin'),
 'Simvastatin', '20mg', 'daily', '{"21:00"}',
 CURRENT_DATE - INTERVAL '60 days', 'Dr. Tan Wei Chong',
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Gleneagles Hospital KL'),
 'Take in the evening with or without food',
 '{"meal_timing_preference": "flexible", "cultural_notes": "Avoid grapefruit"}', TRUE),

((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 (SELECT id FROM medication_database WHERE medication_name = 'Panadol'),
 'Panadol', '500mg', 'as_needed', '{}',
 CURRENT_DATE - INTERVAL '7 days', 'Pharmacist',
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Guardian Pharmacy'),
 'Take as needed for pain, maximum 4 times daily',
 '{"meal_timing_preference": "flexible"}', TRUE);

-- Priya's medications (Iron supplement and occasional pain relief)
INSERT INTO medications (
    user_id, medication_db_id, medication_name, dosage, frequency, schedule_times,
    start_date, prescribed_by, provider_id, instructions, cultural_adjustments, active
) VALUES
((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 (SELECT id FROM medication_database WHERE medication_name = 'Ponstan'),
 'Ponstan', '250mg', 'as_needed', '{}',
 CURRENT_DATE - INTERVAL '14 days', 'Dr. Rajesh Kumar',
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Klinik Primer 1Malaysia'),
 'Take with food for menstrual pain relief',
 '{"meal_timing_preference": "with_food", "cultural_notes": "Halal certified"}', TRUE);

-- ============================================================================
-- SAMPLE ADHERENCE DATA (Last 7 days)
-- ============================================================================

-- Generate adherence logs for Ahmad's medications
INSERT INTO adherence_logs (
    medication_id, user_id, scheduled_time, actual_time, status, notes, location_taken
) VALUES
-- Metformin adherence (mostly good with some delays)
((SELECT m.id FROM medications m JOIN users u ON m.user_id = u.id WHERE u.email = 'ahmad.hassan@email.com' AND m.medication_name = 'Metformin'),
 (SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 CURRENT_DATE - INTERVAL '1 day' + TIME '08:00', CURRENT_DATE - INTERVAL '1 day' + TIME '08:15', 'late', 'Delayed due to morning prayers', 'home'),

((SELECT m.id FROM medications m JOIN users u ON m.user_id = u.id WHERE u.email = 'ahmad.hassan@email.com' AND m.medication_name = 'Metformin'),
 (SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 CURRENT_DATE - INTERVAL '1 day' + TIME '20:00', CURRENT_DATE - INTERVAL '1 day' + TIME '20:00', 'taken', 'Taken with dinner', 'home'),

-- Losartan adherence
((SELECT m.id FROM medications m JOIN users u ON m.user_id = u.id WHERE u.email = 'ahmad.hassan@email.com' AND m.medication_name = 'Losartan'),
 (SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 CURRENT_DATE - INTERVAL '1 day' + TIME '08:00', CURRENT_DATE - INTERVAL '1 day' + TIME '08:20', 'late', 'Took after Metformin', 'home');

-- ============================================================================
-- SAMPLE REMINDERS
-- ============================================================================

-- Set up reminders for active medications
INSERT INTO medication_reminders (
    user_id, medication_id, reminder_time, reminder_type, notification_methods,
    advance_notice_minutes, notify_family, status
) VALUES
-- Ahmad's morning Metformin reminder
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 (SELECT m.id FROM medications m JOIN users u ON m.user_id = u.id WHERE u.email = 'ahmad.hassan@email.com' AND m.medication_name = 'Metformin'),
 CURRENT_DATE + TIME '07:55', 'dose', '["push", "sms"]', 5, TRUE, 'pending'),

-- Ahmad's evening Metformin reminder
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 (SELECT m.id FROM medications m JOIN users u ON m.user_id = u.id WHERE u.email = 'ahmad.hassan@email.com' AND m.medication_name = 'Metformin'),
 CURRENT_DATE + TIME '19:55', 'dose', '["push"]', 5, FALSE, 'pending'),

-- David's Simvastatin evening reminder
((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 (SELECT m.id FROM medications m JOIN users u ON m.user_id = u.id WHERE u.email = 'david.lim@email.com' AND m.medication_name = 'Simvastatin'),
 CURRENT_DATE + TIME '20:55', 'dose', '["push", "email"]', 5, FALSE, 'pending');

-- ============================================================================
-- CONSENT RECORDS FOR PDPA COMPLIANCE
-- ============================================================================

-- Sample consent records
INSERT INTO consent_records (
    user_id, consent_type, consent_granted, consent_date, legal_basis,
    purposes, data_categories, consent_version, consent_language
) VALUES
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 'data_processing', TRUE, NOW() - INTERVAL '30 days', 'consent',
 '{"medication_tracking", "family_notifications", "adherence_reporting"}',
 '{"health_data", "personal_identifiers", "location_data"}',
 '1.0', 'ms'),

((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 'data_processing', TRUE, NOW() - INTERVAL '60 days', 'consent',
 '{"medication_tracking", "analytics", "provider_reporting"}',
 '{"health_data", "personal_identifiers"}',
 '1.0', 'en'),

((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 'data_processing', TRUE, NOW() - INTERVAL '14 days', 'consent',
 '{"medication_tracking", "provider_reporting"}',
 '{"health_data", "personal_identifiers"}',
 '1.0', 'en');

-- ============================================================================
-- SUMMARY STATISTICS UPDATE
-- ============================================================================

-- Create initial adherence summaries for existing data
INSERT INTO adherence_summaries (
    user_id, medication_id, summary_date, period_type,
    scheduled_doses, taken_doses, missed_doses, late_doses, adherence_rate
)
SELECT 
    al.user_id,
    al.medication_id,
    CURRENT_DATE - 1,
    'daily',
    COUNT(*),
    COUNT(*) FILTER (WHERE al.status = 'taken'),
    COUNT(*) FILTER (WHERE al.status = 'missed'),
    COUNT(*) FILTER (WHERE al.status = 'late'),
    ROUND((COUNT(*) FILTER (WHERE al.status = 'taken')::DECIMAL / COUNT(*)) * 100, 2)
FROM adherence_logs al
WHERE DATE(al.scheduled_time) = CURRENT_DATE - 1
GROUP BY al.user_id, al.medication_id;

-- Log successful seed data insertion
INSERT INTO audit_log (table_name, operation, new_data, changed_by, compliance_reason) VALUES
('seed_data', 'INSERT', '{"action": "development_seed_data_loaded", "tables": ["cultural_events", "prayer_times", "medication_database", "families", "users", "medications", "adherence_logs", "reminders", "consent_records"]}', 'system', 'development_environment_setup');

-- Display summary
DO $$
DECLARE
    user_count INTEGER;
    medication_count INTEGER;
    cultural_events_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO medication_count FROM medications WHERE active = TRUE;
    SELECT COUNT(*) INTO cultural_events_count FROM cultural_events WHERE active = TRUE;
    
    RAISE NOTICE 'MediMate Malaysia seed data loaded successfully:';
    RAISE NOTICE '  - % users created', user_count;
    RAISE NOTICE '  - % active medications', medication_count;
    RAISE NOTICE '  - % cultural events loaded', cultural_events_count;
    RAISE NOTICE '  - Prayer times loaded for Kuala Lumpur, Penang, Johor Bahru';
    RAISE NOTICE '  - Malaysian medication database initialized';
    RAISE NOTICE '  - PDPA consent records created';
END $$;