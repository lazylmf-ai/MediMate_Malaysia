-- ============================================================================
-- MediMate Malaysia - Healthcare Extension Seed Data
-- Sample data for extended healthcare tables with Malaysian cultural context
-- ============================================================================

-- ============================================================================
-- MALAYSIAN MEDICAL TERMINOLOGY AND TRANSLATIONS
-- ============================================================================

-- Medical conditions with Malaysian translations
INSERT INTO medical_conditions (
    user_id, condition_name, condition_name_ms, condition_name_zh, condition_name_ta,
    condition_code, condition_category, severity, diagnosis_date, diagnosed_by,
    current_status, treatment_approach, cultural_impact, monitoring_frequency,
    hereditary_factor, active
) VALUES
-- Ahmad's diabetes management
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 'Type 2 Diabetes Mellitus', 'Diabetes Mellitus Jenis 2', '2型糖尿病', 'வகை 2 நீரிழிவு நோய்',
 'E11', 'endocrine', 'moderate', '2023-06-15', 'Dr. Siti Hajar',
 'chronic', 'Lifestyle modification with medication',
 '{"dietary_restrictions": ["sugar_controlled", "halal"], "religious_considerations": ["ramadan_fasting_adjustments"], "family_support_available": true}',
 'monthly', TRUE, TRUE),

-- Ahmad's hypertension
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 'Essential Hypertension', 'Hipertensi Penting', '原发性高血压', 'அத்தியாவசிய உயர் இரத்த அழுத்தம்',
 'I10', 'cardiovascular', 'mild', '2023-05-20', 'Dr. Siti Hajar',
 'chronic', 'ACE inhibitor with lifestyle changes',
 '{"dietary_restrictions": ["low_sodium", "halal"], "religious_considerations": ["prayer_time_medication"], "family_support_available": true}',
 'weekly', TRUE, TRUE),

-- David's hypercholesterolemia
((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 'Mixed Hyperlipidemia', 'Hiperlipidemia Campuran', '混合性高脂血症', 'கலப்பு ஹைபர்லிபிடெமியா',
 'E78.2', 'endocrine', 'moderate', '2023-01-10', 'Dr. Tan Wei Chong',
 'chronic', 'Statin therapy with dietary management',
 '{"dietary_restrictions": ["low_cholesterol", "vegetarian"], "cultural_treatments_used": ["traditional_chinese_medicine"], "family_support_available": true}',
 'quarterly', FALSE, TRUE),

-- Priya's iron deficiency anemia
((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 'Iron Deficiency Anemia', 'Anemia Kekurangan Zat Besi', '缺铁性贫血', 'இரும்புச் சத்து குறைபாடு இரத்த சோகை',
 'D50.9', 'hematologic', 'mild', '2024-08-01', 'Dr. Rajesh Kumar',
 'active', 'Iron supplementation with dietary counseling',
 '{"dietary_restrictions": ["iron_rich_vegetarian"], "religious_considerations": ["thaipusam_fasting"], "family_support_available": true}',
 'monthly', FALSE, TRUE);

-- ============================================================================
-- EMERGENCY CONTACTS WITH CULTURAL CONTEXT
-- ============================================================================

-- Ahmad's emergency contacts
INSERT INTO emergency_contacts (
    user_id, full_name, relationship, contact_priority, phone_primary, phone_secondary,
    email, preferred_language, cultural_notes, medical_decision_authority,
    healthcare_proxy, medical_knowledge_level, location_proximity,
    notification_methods, critical_conditions_only, consent_to_contact, active
) VALUES
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 'Siti Aminah binti Ahmad', 'spouse', 1, '+60123456790', '+60321234567',
 'siti.aminah@email.com', 'ms', 'Wife, Islamic considerations important for medical decisions',
 TRUE, TRUE, 'basic', 'same_household',
 '["phone", "sms", "app"]', FALSE, TRUE, TRUE),

((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 'Abdullah bin Hassan', 'father', 2, '+60123456791', NULL,
 NULL, 'ms', 'Elderly father, prefers phone communication in Bahasa Malaysia',
 FALSE, FALSE, 'basic', 'local',
 '["phone"]', TRUE, TRUE, TRUE),

-- David's emergency contacts
((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 'Michelle Lim Hui Ling', 'spouse', 1, '+60187654322', '+60321234568',
 'michelle.lim@email.com', 'en', 'Wife, speaks English and Mandarin, vegetarian dietary considerations',
 TRUE, TRUE, 'intermediate', 'same_household',
 '["phone", "email", "app"]', FALSE, TRUE, TRUE),

((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 'Dr. Lim Wei Hong', 'brother', 2, '+60187654323', NULL,
 'drwh.lim@hospital.com.my', 'en', 'Brother who is a medical doctor, can make informed decisions',
 TRUE, FALSE, 'medical_professional', 'local',
 '["phone", "email"]', FALSE, TRUE, TRUE),

-- Priya's emergency contacts
((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 'Rajesh a/l Krishnan', 'father', 1, '+60198765433', NULL,
 NULL, 'ta', 'Father, prefers Tamil communication, traditional Hindu practices',
 TRUE, TRUE, 'basic', 'local',
 '["phone", "sms"]', FALSE, TRUE, TRUE),

((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 'Kavitha a/p Rajesh', 'sister', 2, '+60198765434', '+60321234569',
 'kavitha.raj@email.com', 'en', 'Sister, healthcare worker, understands medical terminology',
 FALSE, FALSE, 'intermediate', 'distant',
 '["phone", "email", "app"]', TRUE, TRUE, TRUE);

-- ============================================================================
-- MALAYSIAN VACCINATION RECORDS
-- ============================================================================

-- Malaysian National Immunization Program vaccinations
INSERT INTO vaccination_records (
    user_id, vaccine_name, vaccine_type, manufacturer, administration_date,
    dose_number, total_doses_required, malaysia_vaccine_code, immunization_program,
    vaccine_source, administered_by, clinic_name, halal_certified, vaccination_status,
    certificate_number, who_recognized, travel_validity
) VALUES
-- Ahmad's COVID-19 vaccinations
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 'Comirnaty', 'COVID-19', 'Pfizer-BioNTech', '2021-06-15', 1, 2,
 'CV001', 'National COVID-19 Immunisation Programme', 'government',
 'Nurse Fatimah Abdul Rahman', 'PPV Stadium Shah Alam', TRUE, 'completed',
 'MY210615001234', TRUE, TRUE),

((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 'Comirnaty', 'COVID-19', 'Pfizer-BioNTech', '2021-07-06', 2, 2,
 'CV001', 'National COVID-19 Immunisation Programme', 'government',
 'Nurse Fatimah Abdul Rahman', 'PPV Stadium Shah Alam', TRUE, 'completed',
 'MY210706001235', TRUE, TRUE),

-- Ahmad's booster
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 'Comirnaty Booster', 'COVID-19 Booster', 'Pfizer-BioNTech', '2022-01-10', 3, 3,
 'CV002', 'National COVID-19 Immunisation Programme', 'government',
 'Dr. Ahmad Rashid', 'Klinik Kesihatan Shah Alam', TRUE, 'completed',
 'MY220110001236', TRUE, TRUE),

-- David's COVID-19 vaccinations  
((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 'CoronaVac', 'COVID-19', 'Sinovac', '2021-05-20', 1, 2,
 'CV003', 'National COVID-19 Immunisation Programme', 'government',
 'Nurse Lee Mei Ling', 'PPV Penang International Sports Arena', FALSE, 'completed',
 'MY210520002345', TRUE, TRUE),

((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 'CoronaVac', 'COVID-19', 'Sinovac', '2021-06-10', 2, 2,
 'CV003', 'National COVID-19 Immunisation Programme', 'government',
 'Nurse Lee Mei Ling', 'PPV Penang International Sports Arena', FALSE, 'completed',
 'MY210610002346', TRUE, TRUE),

-- Priya's hepatitis B (workplace requirement)
((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 'Engerix-B', 'Hepatitis B', 'GSK', '2023-03-15', 1, 3,
 'HB001', 'Adult Immunization Programme', 'employer',
 'Dr. Meera Devi', 'Occupational Health Clinic KL', TRUE, 'completed',
 'MY230315003456', TRUE, FALSE),

-- Priya's HPV vaccination
((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 'Gardasil 9', 'Human Papillomavirus', 'Merck', '2023-02-01', 1, 3,
 'HP001', 'National HPV Immunisation Programme', 'government',
 'Nurse Sushila Devi', 'Klinik Kesihatan Klang', TRUE, 'completed',
 'MY230201003457', TRUE, FALSE);

-- ============================================================================
-- APPOINTMENT TYPES FOR MALAYSIAN HEALTHCARE
-- ============================================================================

INSERT INTO appointment_types (
    type_name, type_name_ms, type_name_zh, type_name_ta, type_code,
    category, typical_duration, advance_booking_days, same_day_booking,
    requires_referral, requires_fasting, cultural_scheduling_rules, active
) VALUES
('General Consultation', 'Konsultasi Am', '综合咨询', 'பொது ஆலோசனை', 'GEN_CONSULT',
 'consultation', 30, 7, TRUE, FALSE, FALSE,
 '{"avoid_prayer_times": true, "respect_fasting_periods": false, "cultural_holidays_affect": false}', TRUE),

('Diabetes Follow-up', 'Susulan Diabetes', '糖尿病随访', 'நீரிழிவு பின்தொடர்தல்', 'DM_FOLLOWUP',
 'follow_up', 45, 14, FALSE, FALSE, TRUE,
 '{"avoid_prayer_times": true, "respect_fasting_periods": true, "cultural_holidays_affect": true}', TRUE),

('Cardiac Consultation', 'Konsultasi Jantung', '心脏咨询', 'இதய ஆலோசனை', 'CARDIAC_CONSULT',
 'consultation', 60, 21, FALSE, TRUE, FALSE,
 '{"avoid_prayer_times": true, "respect_fasting_periods": false, "cultural_holidays_affect": false}', TRUE),

('Vaccination', 'Vaksinasi', '疫苗接种', 'தடுப்பூசி', 'VACCINATION',
 'vaccination', 15, 3, TRUE, FALSE, FALSE,
 '{"avoid_prayer_times": false, "respect_fasting_periods": false, "cultural_holidays_affect": true}', TRUE),

('Lab Test', 'Ujian Makmal', '实验室检查', 'ஆய்வக சோதனை', 'LAB_TEST',
 'lab_test', 20, 7, TRUE, FALSE, TRUE,
 '{"avoid_prayer_times": false, "respect_fasting_periods": true, "cultural_holidays_affect": false}', TRUE),

('Health Screening', 'Saringan Kesihatan', '健康筛查', 'சுகாதார பரிசோதனை', 'HEALTH_SCREEN',
 'screening', 90, 30, FALSE, FALSE, TRUE,
 '{"avoid_prayer_times": true, "respect_fasting_periods": true, "cultural_holidays_affect": true}', TRUE);

-- ============================================================================
-- SAMPLE APPOINTMENTS WITH CULTURAL CONSIDERATIONS
-- ============================================================================

INSERT INTO appointments (
    user_id, provider_id, appointment_type_id, appointment_date, appointment_time,
    duration_minutes, appointment_status, booking_source, chief_complaint,
    cultural_adjustments, assigned_physician, notification_preferences,
    follow_up_required, insurance_covered, payment_status
) VALUES
-- Ahmad's diabetes follow-up
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Klinik Primer 1Malaysia'),
 (SELECT id FROM appointment_types WHERE type_code = 'DM_FOLLOWUP'),
 CURRENT_DATE + 7, '09:00', 45, 'scheduled', 'online',
 'Routine diabetes check-up, some concerns about blood sugar control during Ramadan',
 '{"prayer_time_avoidance": true, "fasting_consideration": true, "cultural_interpreter_needed": false}',
 'Dr. Siti Hajar', '["sms", "app"]', TRUE, TRUE, 'pending'),

-- David's cardiac consultation
((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Gleneagles Hospital KL'),
 (SELECT id FROM appointment_types WHERE type_code = 'CARDIAC_CONSULT'),
 CURRENT_DATE + 14, '14:30', 60, 'scheduled', 'referral',
 'Chest pain episodes, family history of heart disease',
 '{"prayer_time_avoidance": false, "fasting_consideration": false, "cultural_interpreter_needed": false}',
 'Dr. Tan Wei Chong', '["email", "app"]', TRUE, TRUE, 'pending'),

-- Priya's health screening
((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Klinik Primer 1Malaysia'),
 (SELECT id FROM appointment_types WHERE type_code = 'HEALTH_SCREEN'),
 CURRENT_DATE + 21, '08:00', 90, 'scheduled', 'manual',
 'Annual health screening, concerns about family history',
 '{"prayer_time_avoidance": false, "fasting_consideration": true, "cultural_interpreter_needed": false, "gender_preference": "female"}',
 'Dr. Meera Devi', '["phone", "sms"]', FALSE, TRUE, 'pending');

-- ============================================================================
-- MALAYSIAN INSURANCE PROVIDERS
-- ============================================================================

INSERT INTO insurance_providers (
    provider_name, provider_type, company_registration, license_number,
    regulator, contact_info, coverage_types, network_hospitals,
    direct_billing, cashless_treatment, shariah_compliant, cultural_services, active
) VALUES
('Great Eastern Takaful', 'takaful', '196701000220', 'GT001/2023', 'Bank Negara Malaysia',
 '{"phone": "+603-4259-8888", "website": "https://www.greateasterntakaful.com", "email": "customercare@greateasterntakaful.com"}',
 '{"medical", "dental", "optical", "pharmacy", "maternity"}',
 '{"Hospital Kuala Lumpur", "Gleneagles Hospital KL", "Prince Court Medical Centre"}',
 TRUE, TRUE, TRUE,
 '{"multilingual_support": ["ms", "en", "zh"], "cultural_liaisons": true, "religious_dietary_coverage": true}', TRUE),

('Allianz Malaysia', 'private', '197301000442', 'AM001/2023', 'Bank Negara Malaysia',
 '{"phone": "+603-2264-1188", "website": "https://www.allianz.com.my", "email": "customer.service@allianz.com.my"}',
 '{"medical", "dental", "optical", "pharmacy", "specialist"}',
 '{"Pantai Hospital KL", "Sunway Medical Centre", "Gleneagles Hospital KL"}',
 TRUE, TRUE, FALSE,
 '{"multilingual_support": ["ms", "en", "zh", "ta"], "cultural_liaisons": false, "religious_dietary_coverage": false}', TRUE),

('Government Healthcare Scheme', 'government', 'GOV001', 'GHS001/2023', 'Ministry of Health',
 '{"phone": "+603-8000-8000", "website": "https://www.moh.gov.my"}',
 '{"medical", "emergency", "pharmacy", "preventive"}',
 '{"Hospital Kuala Lumpur", "Hospital Selayang", "Klinik Kesihatan"}',
 TRUE, TRUE, FALSE,
 '{"multilingual_support": ["ms", "en", "zh", "ta"], "cultural_liaisons": true, "religious_dietary_coverage": true}', TRUE),

('Prudential Assurance Malaysia', 'private', '196301000114', 'PA001/2023', 'Bank Negara Malaysia',
 '{"phone": "+603-2053-8888", "website": "https://www.prudential.com.my"}',
 '{"medical", "critical_illness", "dental", "optical"}',
 '{"Prince Court Medical Centre", "Pantai Hospital", "KPJ Healthcare"}',
 FALSE, FALSE, FALSE,
 '{"multilingual_support": ["ms", "en", "zh"], "cultural_liaisons": false, "religious_dietary_coverage": false}', TRUE);

-- ============================================================================
-- USER INSURANCE COVERAGE
-- ============================================================================

INSERT INTO user_insurance_coverage (
    user_id, insurance_provider_id, policy_number, coverage_type,
    effective_date, expiry_date, coverage_status, annual_limit,
    deductible_amount, co_payment_percentage, government_scheme,
    employer_coverage, cultural_benefits
) VALUES
-- Ahmad's Takaful coverage
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 (SELECT id FROM insurance_providers WHERE provider_name = 'Great Eastern Takaful'),
 'GT123456789', 'primary', '2024-01-01', '2024-12-31', 'active',
 50000.00, 500.00, 10.00, FALSE, TRUE,
 '{"traditional_medicine_covered": false, "halal_pharmaceuticals_preferred": true, "cultural_interpreter_coverage": false}'),

-- David's private insurance
((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 (SELECT id FROM insurance_providers WHERE provider_name = 'Allianz Malaysia'),
 'AM987654321', 'primary', '2024-01-01', '2024-12-31', 'active',
 100000.00, 1000.00, 20.00, FALSE, FALSE,
 '{"traditional_medicine_covered": true, "halal_pharmaceuticals_preferred": false, "cultural_interpreter_coverage": true}'),

-- Priya's government scheme
((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 (SELECT id FROM insurance_providers WHERE provider_name = 'Government Healthcare Scheme'),
 'GHS456789123', 'primary', '2024-01-01', '2024-12-31', 'active',
 20000.00, 0.00, 0.00, TRUE, FALSE,
 '{"traditional_medicine_covered": false, "halal_pharmaceuticals_preferred": false, "cultural_interpreter_coverage": true}');

-- ============================================================================
-- SAMPLE MEDICAL RECORDS WITH CULTURAL CONTEXT
-- ============================================================================

INSERT INTO medical_records (
    user_id, provider_id, record_type, visit_date, visit_time,
    chief_complaint, clinical_assessment, diagnosis_codes, treatment_plan,
    cultural_factors, attending_physician, confidentiality_level, record_status
) VALUES
-- Ahmad's recent consultation
((SELECT id FROM users WHERE email = 'ahmad.hassan@email.com'),
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Klinik Primer 1Malaysia'),
 'consultation', CURRENT_DATE - 14, '09:30',
 'Follow-up for diabetes management, concerns about Ramadan fasting',
 'Diabetes well controlled with current medication. Patient concerned about medication timing during Ramadan fasting period.',
 '{"E11", "Z71.3"}',
 'Continue current medication with adjusted timing during Ramadan. Dietary counseling provided.',
 '{"language_used": "ms", "religious_considerations": ["ramadan_fasting_adjustments"], "dietary_restrictions_noted": ["halal", "diabetic_diet"]}',
 'Dr. Siti Hajar', 'standard', 'active'),

-- David's cardiac evaluation
((SELECT id FROM users WHERE email = 'david.lim@email.com'),
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Gleneagles Hospital KL'),
 'consultation', CURRENT_DATE - 7, '14:00',
 'Chest pain episodes, family history of coronary artery disease',
 'Atypical chest pain. ECG normal. Family history significant. Stress test recommended.',
 '{"R06.02", "Z87.891"}',
 'Stress echocardiogram scheduled. Continue current medications. Lifestyle modifications discussed.',
 '{"language_used": "en", "cultural_sensitivities": ["traditional_chinese_medicine_use"], "dietary_restrictions_noted": ["vegetarian"]}',
 'Dr. Tan Wei Chong', 'standard', 'active'),

-- Priya's anemia follow-up
((SELECT id FROM users WHERE email = 'priya.raj@email.com'),
 (SELECT id FROM healthcare_providers WHERE provider_name = 'Klinik Primer 1Malaysia'),
 'consultation', CURRENT_DATE - 21, '10:00',
 'Follow-up for iron deficiency anemia, ongoing fatigue',
 'Hemoglobin improved from 8.5 to 10.2 g/dL. Continue iron supplementation.',
 '{"D50.9"}',
 'Continue ferrous sulfate 200mg daily. Repeat CBC in 4 weeks. Dietary counseling reinforced.',
 '{"language_used": "en", "religious_considerations": ["thaipusam_fasting"], "dietary_restrictions_noted": ["vegetarian", "iron_rich"]}',
 'Dr. Rajesh Kumar', 'standard', 'active');

-- ============================================================================
-- LOG SUCCESSFUL SEED DATA INSERTION
-- ============================================================================

INSERT INTO audit_log (table_name, operation, new_data, changed_by, compliance_reason) VALUES
('healthcare_extension_seed', 'INSERT', 
 '{"action": "healthcare_extension_seed_data_loaded", "tables": ["medical_conditions", "emergency_contacts", "vaccination_records", "appointment_types", "appointments", "insurance_providers", "user_insurance_coverage", "medical_records"], "cultural_context": "malaysian_healthcare"}', 
 'system', 'development_environment_healthcare_extension');

-- Display summary
DO $$
DECLARE
    medical_conditions_count INTEGER;
    emergency_contacts_count INTEGER;
    vaccination_records_count INTEGER;
    appointments_count INTEGER;
    insurance_coverage_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO medical_conditions_count FROM medical_conditions WHERE active = TRUE;
    SELECT COUNT(*) INTO emergency_contacts_count FROM emergency_contacts WHERE active = TRUE;
    SELECT COUNT(*) INTO vaccination_records_count FROM vaccination_records;
    SELECT COUNT(*) INTO appointments_count FROM appointments WHERE appointment_status = 'scheduled';
    SELECT COUNT(*) INTO insurance_coverage_count FROM user_insurance_coverage WHERE coverage_status = 'active';
    
    RAISE NOTICE 'MediMate Malaysia healthcare extension seed data loaded:';
    RAISE NOTICE '  - % active medical conditions', medical_conditions_count;
    RAISE NOTICE '  - % emergency contacts', emergency_contacts_count;
    RAISE NOTICE '  - % vaccination records', vaccination_records_count;
    RAISE NOTICE '  - % scheduled appointments', appointments_count;
    RAISE NOTICE '  - % active insurance coverage', insurance_coverage_count;
    RAISE NOTICE '  - Malaysian cultural intelligence integrated';
    RAISE NOTICE '  - PDPA compliance maintained';
    RAISE NOTICE '  - Multi-language support included';
END $$;