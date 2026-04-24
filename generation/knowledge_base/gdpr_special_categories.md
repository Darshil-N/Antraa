# GDPR Special Categories Knowledge Base
# FairSynth AI — RAG Compliance Knowledge Base
# Category: PRIVACY
# Source: GDPR Articles 9 and 17 — European Union General Data Protection Regulation

---

## GDPR-ART9-01: Racial or Ethnic Origin
**Rule ID:** GDPR-ART9-01
**Special Category:** Racial or ethnic origin
**Required Action:** SUPPRESS
**Column Patterns:** race, ethnicity, ethnic_origin, ethnic_group, racial_group, nationality, national_origin, country_of_origin, heritage
**Citation:** GDPR Article 9(1) — "racial or ethnic origin"
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Processing racial or ethnic origin data is prohibited by default under GDPR Article 9(1). Requires explicit consent or specific legal basis (Art. 9(2)). In synthetic data contexts, this column must be suppressed unless it is a protected attribute being retained for bias auditing purposes with explicit consent.

---

## GDPR-ART9-02: Political Opinions
**Rule ID:** GDPR-ART9-02
**Special Category:** Political opinions
**Required Action:** SUPPRESS
**Column Patterns:** political_opinion, political_affiliation, party_affiliation, political_party, voting_preference, political_belief
**Citation:** GDPR Article 9(1) — "political opinions"
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Political opinions constitute a special category requiring explicit consent for processing. Must be suppressed in synthetic data output.

---

## GDPR-ART9-03: Religious and Philosophical Beliefs
**Rule ID:** GDPR-ART9-03
**Special Category:** Religious or philosophical beliefs
**Required Action:** SUPPRESS
**Column Patterns:** religion, religious_belief, faith, denomination, church, mosque, temple, philosophical_belief, worldview, spiritual_belief
**Citation:** GDPR Article 9(1) — "religious or philosophical beliefs"
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Religious identity is a protected special category. Must be suppressed unless explicit consent or Article 9(2) exception applies.

---

## GDPR-ART9-04: Trade Union Membership
**Rule ID:** GDPR-ART9-04
**Special Category:** Trade union membership
**Required Action:** SUPPRESS
**Column Patterns:** union_membership, trade_union, labor_union, union_member, union_status
**Citation:** GDPR Article 9(1) — "trade union membership"
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Trade union membership is a special category under GDPR and indicates political and economic affiliation. Must be suppressed.

---

## GDPR-ART9-05: Genetic Data
**Rule ID:** GDPR-ART9-05
**Special Category:** Genetic data
**Required Action:** SUPPRESS
**Column Patterns:** genetic_data, genome, dna, genotype, genetic_profile, genetic_test, genetic_marker, allele, snp, genetic_variation
**Citation:** GDPR Article 9(1) — "genetic data"
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Genetic data uniquely identifies individuals and cannot be changed. Must be completely suppressed. No generalization is sufficient — genetic identifiers must be removed entirely.

---

## GDPR-ART9-06: Biometric Data for Identification
**Rule ID:** GDPR-ART9-06
**Special Category:** Biometric data processed for identification
**Required Action:** SUPPRESS
**Column Patterns:** fingerprint, biometric, facial_scan, retina, iris, voice_print, gait, biometric_hash, face_encoding
**Citation:** GDPR Article 9(1) — "biometric data for the purpose of uniquely identifying a natural person"
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Biometric identifiers used for identification purposes fall under GDPR's special categories. Must be suppressed.

---

## GDPR-ART9-07: Health Data
**Rule ID:** GDPR-ART9-07
**Special Category:** Health data (PHI)
**Required Action:** SUPPRESS or RETAIN_WITH_NOISE
**Column Patterns:** diagnosis, diagnosis_code, icd_code, icd10, condition, disease, illness, health_status, medical_condition, prescription, medication, treatment, symptom, lab_result, test_result, blood_type, bmi, weight, height, chronic_condition, disability_status
**Citation:** GDPR Article 9(1) — "data concerning health"
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Health data is a core GDPR special category. In healthcare synthetic data, health status columns may be retained with differential privacy noise if they are the primary research variable. However, they must never appear in raw form in outputs without appropriate DP treatment.

---

## GDPR-ART9-08: Sex Life or Sexual Orientation
**Rule ID:** GDPR-ART9-08
**Special Category:** Sex life or sexual orientation
**Required Action:** SUPPRESS
**Column Patterns:** sexual_orientation, sexuality, sex_life, gender_identity, lgbtq_status, sexual_preference
**Citation:** GDPR Article 9(1) — "data concerning a natural person's sex life or sexual orientation"
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Sexual orientation and gender identity beyond biological sex are special categories requiring explicit consent. Must be suppressed.

---

## GDPR-ART17-01: Right to Erasure — Data Retention Policy
**Rule ID:** GDPR-ART17-01
**Special Category:** Right to erasure (right to be forgotten)
**Required Action:** SUPPRESS (raw data destroyed post-synthesis)
**Column Patterns:** all columns in uploaded dataset (applies to the raw file, not synthetic output)
**Citation:** GDPR Article 17 — "Right to erasure"
**Regulation:** GDPR Right to Erasure
**Context:** Under GDPR Article 17, individuals have the right to request erasure of their personal data. FairSynth honors this by implementing a data destruction protocol: the original uploaded dataset is permanently deleted after synthesis completes (or within 2 hours of job creation). The destruction timestamp is logged in the audit trail. The synthetic output contains no personal data and is not subject to Article 17 requests.

---

## GDPR-ART9-09: Mental Health Data
**Rule ID:** GDPR-ART9-09
**Special Category:** Mental health and psychiatric data (subset of health data)
**Required Action:** SUPPRESS
**Column Patterns:** mental_health, psychiatric, depression, anxiety, mental_disorder, psychological_condition, therapy, counseling, psychotherapy, medication_psychiatric, mental_health_diagnosis
**Citation:** GDPR Article 9(1) — "data concerning health" (mental health subset)
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Mental health data carries significant stigma risk and discrimination potential. Must be suppressed even if general health data is retained with DP noise. Heightened protection applies.

---

## GDPR-ART9-10: Disability Status
**Rule ID:** GDPR-ART9-10
**Special Category:** Disability status (health data subset)
**Required Action:** GENERALIZE or SUPPRESS
**Column Patterns:** disability, disability_status, disabled, disability_type, accessibility_needs, impairment, physical_disability, cognitive_disability
**Citation:** GDPR Article 9(1) — "data concerning health"
**Regulation:** GDPR Special Categories of Personal Data
**Context:** Disability status is health-related data under GDPR Article 9. May be generalized (binary disabled/not-disabled to preserve statistical distributions for research) rather than suppressed if needed for legitimate analytical purposes.
