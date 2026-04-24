# HIPAA Safe Harbor Knowledge Base
# FairSynth AI — RAG Compliance Knowledge Base
# Category: PRIVACY
# Source: 45 CFR §164.514(b)(2) — HIPAA Safe Harbor De-Identification Standard
# 18 identifiers that must be removed or suppressed for PHI de-identification

---

## HIPAA-SH-01: Names
**Rule ID:** HIPAA-SH-01
**Identifier:** Names (patient, relative, employer, household members)
**Required Action:** SUPPRESS
**Column Patterns:** name, full_name, first_name, last_name, patient_name, member_name, firstname, lastname, given_name, surname
**Citation:** §164.514(b)(2)(i)(A)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** All names of the individual or their relatives, employers, or household members must be removed. Generic fake replacements (e.g., "Patient_001") are acceptable for research use but the original name must not appear in any output.

---

## HIPAA-SH-02: Geographic Subdivisions
**Rule ID:** HIPAA-SH-02
**Identifier:** Geographic subdivisions smaller than state
**Required Action:** GENERALIZE
**Column Patterns:** zip_code, zipcode, postal_code, city, county, address, street, neighborhood, ward, district, census_tract
**Citation:** §164.514(b)(2)(i)(B)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** ZIP codes, city, county, street addresses must be generalized. ZIP codes may be retained as 3-digit prefixes only if the geographic unit contains more than 20,000 people. Full 5-digit ZIP codes must be suppressed or generalized to first 3 digits.

---

## HIPAA-SH-03: Dates (Except Year)
**Rule ID:** HIPAA-SH-03
**Identifier:** Dates directly related to individual (except year)
**Required Action:** GENERALIZE
**Column Patterns:** date_of_birth, dob, birth_date, admission_date, discharge_date, service_date, death_date, date_of_death, procedure_date, visit_date, appointment_date, treatment_date
**Citation:** §164.514(b)(2)(i)(C)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** All elements of dates (except year) must be removed. For individuals over 89 years of age, all dates including year must be aggregated into a single category (90+). Allowable: year only, or age ranges derived from birth year.

---

## HIPAA-SH-04: Social Security Numbers
**Rule ID:** HIPAA-SH-04
**Identifier:** Social Security Numbers (SSN)
**Required Action:** SUPPRESS
**Column Patterns:** ssn, social_security, social_security_number, tax_id, tin, social_security_no, ss_number
**Citation:** §164.514(b)(2)(i)(D)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Social Security Numbers are among the highest-risk identifiers. They must be completely removed from any output. No partial retention (e.g., last 4 digits) is permitted under Safe Harbor. If a surrogate key is needed, generate a random non-tracing UUID.

---

## HIPAA-SH-05: Medical Record Numbers
**Rule ID:** HIPAA-SH-05
**Identifier:** Medical record numbers
**Required Action:** SUPPRESS
**Column Patterns:** mrn, medical_record_number, medical_record_no, record_number, patient_id, patient_number, chart_number, encounter_id, emr_id, ehr_id
**Citation:** §164.514(b)(2)(i)(E)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Medical record numbers directly link individuals to their health records. Must be removed entirely. A synthetic surrogate patient ID may be generated for linking records within the synthetic dataset.

---

## HIPAA-SH-06: Health Plan Beneficiary Numbers
**Rule ID:** HIPAA-SH-06
**Identifier:** Health plan beneficiary numbers
**Required Action:** SUPPRESS
**Column Patterns:** beneficiary_id, beneficiary_number, plan_id, member_id, insurance_id, policy_number, insurance_number, health_plan_id, subscriber_id
**Citation:** §164.514(b)(2)(i)(F)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** All health plan or insurance identifiers must be suppressed. These numbers can be used to cross-reference insurer databases and re-identify individuals.

---

## HIPAA-SH-07: Account Numbers
**Rule ID:** HIPAA-SH-07
**Identifier:** Account numbers
**Required Action:** SUPPRESS
**Column Patterns:** account_number, account_no, bank_account, account_id, checking_account, savings_account, financial_account
**Citation:** §164.514(b)(2)(i)(G)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Financial account numbers linked to an individual's health record or identity must be suppressed. Applies in healthcare financial records contexts.

---

## HIPAA-SH-08: Certificate and License Numbers
**Rule ID:** HIPAA-SH-08
**Identifier:** Certificate and license numbers
**Required Action:** SUPPRESS
**Column Patterns:** license_number, certificate_number, license_no, medical_license, driver_license, drivers_license, professional_license, npi_number, dea_number
**Citation:** §164.514(b)(2)(i)(H)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Professional license and certificate numbers (e.g., medical license, DEA number, NPI for linking to provider) must be suppressed when they appear in patient records.

---

## HIPAA-SH-09: Vehicle Identifiers
**Rule ID:** HIPAA-SH-09
**Identifier:** Vehicle identifiers and serial numbers (including license plates)
**Required Action:** SUPPRESS
**Column Patterns:** vin, vehicle_id, license_plate, plate_number, vehicle_serial, car_id, vehicle_identification
**Citation:** §164.514(b)(2)(i)(I)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Vehicle identifiers including VIN numbers and license plate numbers must be removed from health records.

---

## HIPAA-SH-10: Device Identifiers
**Rule ID:** HIPAA-SH-10
**Identifier:** Device identifiers and serial numbers
**Required Action:** SUPPRESS
**Column Patterns:** device_id, device_serial, serial_number, imei, mac_address, device_identifier, medical_device_id, implant_id
**Citation:** §164.514(b)(2)(i)(J)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Medical device serial numbers and implant identifiers must be suppressed. These can link individuals to specific product registries.

---

## HIPAA-SH-11: URLs and Web Addresses
**Rule ID:** HIPAA-SH-11
**Identifier:** Web Universal Resource Locators (URLs)
**Required Action:** SUPPRESS
**Column Patterns:** url, website, web_address, profile_url, patient_portal_url, personal_website
**Citation:** §164.514(b)(2)(i)(K)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** URLs that can be used to identify individuals (personal websites, patient portal links) must be removed.

---

## HIPAA-SH-12: IP Addresses
**Rule ID:** HIPAA-SH-12
**Identifier:** Internet Protocol (IP) address numbers
**Required Action:** SUPPRESS
**Column Patterns:** ip_address, ip_addr, ipaddress, client_ip, user_ip, source_ip, remote_addr
**Citation:** §164.514(b)(2)(i)(L)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** IP addresses associated with patient health portal access or telemedicine must be suppressed.

---

## HIPAA-SH-13: Biometric Identifiers
**Rule ID:** HIPAA-SH-13
**Identifier:** Biometric identifiers (fingerprints, voiceprints)
**Required Action:** SUPPRESS
**Column Patterns:** fingerprint, biometric_id, voice_print, retina_scan, iris_scan, facial_recognition, biometric_hash, dna_sequence
**Citation:** §164.514(b)(2)(i)(M)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** All biometric identifiers must be removed. These are inherently re-identifying and cannot be generalized.

---

## HIPAA-SH-14: Full-Face Photographs
**Rule ID:** HIPAA-SH-14
**Identifier:** Full-face photographs and comparable images
**Required Action:** SUPPRESS
**Column Patterns:** photo, photograph, image, face_image, patient_photo, profile_picture, headshot
**Citation:** §164.514(b)(2)(i)(N)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Any column referencing photographs or image files of individuals must be suppressed.

---

## HIPAA-SH-15: Phone Numbers
**Rule ID:** HIPAA-SH-15
**Identifier:** Telephone numbers
**Required Action:** SUPPRESS
**Column Patterns:** phone, phone_number, telephone, mobile, cell_phone, home_phone, work_phone, fax, fax_number, contact_number
**Citation:** §164.514(b)(2)(i)(A) — covers all direct identifiers
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Phone numbers directly identify individuals and must be completely removed.

---

## HIPAA-SH-16: Fax Numbers
**Rule ID:** HIPAA-SH-16
**Identifier:** Fax numbers
**Required Action:** SUPPRESS
**Column Patterns:** fax, fax_number, facsimile
**Citation:** §164.514(b)(2)(i)(A)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Fax numbers are direct identifiers and must be suppressed.

---

## HIPAA-SH-17: Email Addresses
**Rule ID:** HIPAA-SH-17
**Identifier:** Email addresses
**Required Action:** MASK
**Column Patterns:** email, email_address, e_mail, contact_email, personal_email, work_email, user_email
**Citation:** §164.514(b)(2)(i)(A)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Email addresses must be removed. A synthetic fake email may be generated for structural purposes (e.g., person_001@synthetic.local) but the original address must not appear in output.

---

## HIPAA-SH-18: Any Other Unique Identifying Code
**Rule ID:** HIPAA-SH-18
**Identifier:** Any other unique identifying number or code
**Required Action:** SUPPRESS
**Column Patterns:** unique_id, uid, identifier, patient_key, custom_id, tracking_id, reference_number, case_number, application_id, applicant_id, user_id, customer_id, client_id
**Citation:** §164.514(b)(2)(i)(R)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Any column that serves as a unique identifier for an individual must be suppressed or replaced with a non-tracing synthetic surrogate key. This is the catch-all rule for identifiers not covered by SH-01 through SH-17.

---

## Age Range Generalization Rules
**Rule ID:** HIPAA-AGE-01
**Identifier:** Age (quasi-identifier)
**Required Action:** GENERALIZE
**Column Patterns:** age, patient_age, age_years, age_at_admission, current_age
**Citation:** §164.514(b)(2)(i)(C)
**Regulation:** HIPAA Safe Harbor De-Identification
**Context:** Age is a quasi-identifier. Generalize to decade buckets: 0-9, 10-19, 20-29, ..., 80-89, 90+. Individuals aged 90+ must all be placed in a single "90+" category to prevent re-identification of elderly patients.
