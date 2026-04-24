# Domain Constraints Library
# FairSynth AI — RAG Compliance Knowledge Base
# Category: CONSTRAINT
# Purpose: Logical consistency validation during profiling and post-synthesis QA

---

## CONSTRAINT-MED-01: Age Range Validity
**Rule ID:** CONSTRAINT-MED-01
**Domain:** Medical / General
**Constraint Type:** Range validation
**Column Patterns:** age, patient_age, age_years, age_at_admission, current_age
**Valid Range:** 0 to 150
**Synthesis Note:** Numeric age values must stay within 0–150. DP noise injection must be clipped to this range. For SDV synthesis, add a Constraint: 0 <= age <= 150.
**Context:** Ages outside 0–150 indicate data entry errors. During profiling, flag columns where max > 150 or min < 0. These rows should be excluded before synthesis.

---

## CONSTRAINT-MED-02: ICD-10 Code Format
**Rule ID:** CONSTRAINT-MED-02
**Domain:** Medical
**Constraint Type:** Format validation
**Column Patterns:** diagnosis_code, icd_code, icd10, diagnosis, primary_diagnosis, secondary_diagnosis
**Valid Format:** Letter followed by 2–3 digits, optional decimal and 1–4 additional characters (e.g., J18.1, A41.9, Z87.39)
**Regex Pattern:** ^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$
**Synthesis Note:** ICD-10 codes should be treated as categorical columns. SDV will synthesize plausible codes from the observed distribution. Validate that synthetic codes match ICD-10 format pattern.
**Context:** Invalid ICD-10 codes (e.g., all-numeric, wrong format) indicate data quality issues. Flag during profiling.

---

## CONSTRAINT-MED-03: Date Ordering — Admission Before Discharge
**Rule ID:** CONSTRAINT-MED-03
**Domain:** Medical
**Constraint Type:** Temporal ordering constraint
**Column Patterns:** admission_date + discharge_date, admission_date + death_date, start_date + end_date
**Constraint:** discharge_date >= admission_date (and death_date >= admission_date)
**Synthesis Note:** Apply SDV CustomConstraint: discharge_date must be >= admission_date. Length of stay (LOS) = discharge_date - admission_date must be >= 0 days.
**Context:** Discharge before admission is a data error. Flag rows violating this constraint during profiling. Exclude from synthesis.

---

## CONSTRAINT-MED-04: Vital Sign Ranges
**Rule ID:** CONSTRAINT-MED-04
**Domain:** Medical
**Constraint Type:** Clinical range validation
**Column Patterns:** heart_rate, pulse, blood_pressure_systolic, bp_systolic, blood_pressure_diastolic, bp_diastolic, temperature, body_temp, respiratory_rate, oxygen_saturation, spo2, bmi
**Valid Ranges:**
  - heart_rate: 20–300 bpm
  - bp_systolic: 50–300 mmHg
  - bp_diastolic: 20–200 mmHg
  - temperature: 85–115 °F (29.4–46.1 °C)
  - respiratory_rate: 4–60 breaths/min
  - oxygen_saturation: 50–100 %
  - bmi: 10–80 kg/m²
**Synthesis Note:** Apply range constraints to each vital sign column during synthesis. DP noise must be clipped to valid ranges.
**Context:** Vitals outside these ranges are physiologically impossible and indicate data quality issues. Flag during profiling.

---

## CONSTRAINT-FIN-01: Credit Score Range
**Rule ID:** CONSTRAINT-FIN-01
**Domain:** Financial
**Constraint Type:** Range validation
**Column Patterns:** credit_score, fico_score, vantage_score, credit_rating_numeric
**Valid Range:** 300 to 850 (FICO scale)
**Synthesis Note:** After DP noise injection, clip credit scores to [300, 850]. SDV constraint: 300 <= credit_score <= 850.
**Context:** FICO scores outside 300–850 are invalid. Credit data with scores outside this range indicates wrong column mapping or data corruption.

---

## CONSTRAINT-FIN-02: Interest Rate Range
**Rule ID:** CONSTRAINT-FIN-02
**Domain:** Financial
**Constraint Type:** Range validation
**Column Patterns:** interest_rate, apr, annual_interest_rate, mortgage_rate, loan_rate
**Valid Range:** 0.0 to 100.0 (percent)
**Synthesis Note:** Interest rates must remain non-negative. After DP noise, clip to [0.0, 100.0]. Rates above 50% are unusual in consumer lending — flag for review but do not exclude.
**Context:** Negative interest rates or rates above 100% indicate data quality issues.

---

## CONSTRAINT-FIN-03: Monetary Values Must Be Non-Negative
**Rule ID:** CONSTRAINT-FIN-03
**Domain:** Financial
**Constraint Type:** Non-negativity constraint
**Column Patterns:** loan_amount, income, salary, annual_income, mortgage_balance, account_balance, transaction_amount, purchase_amount
**Constraint:** value >= 0
**Synthesis Note:** After DP Laplace noise injection, clip all monetary columns to [0, +inf]. Negative income or loan amounts are invalid.
**Context:** DP Laplace mechanism can produce negative values. Post-injection clipping is required for all monetary columns.

---

## CONSTRAINT-FIN-04: Debt-to-Income Ratio Range
**Rule ID:** CONSTRAINT-FIN-04
**Domain:** Financial
**Constraint Type:** Range validation
**Column Patterns:** dti, dti_ratio, debt_to_income, debt_to_income_ratio
**Valid Range:** 0.0 to 2.0 (DTI ratios above 2.0 are extreme but not impossible)
**Synthesis Note:** Clip DTI to [0.0, 5.0] after DP noise — extreme values above 5.0 indicate data errors.
**Context:** DTI ratios are used in mortgage underwriting. A DTI of 0.43 (43%) is the typical maximum for qualified mortgages. DTI above 1.0 means monthly debt exceeds monthly income.

---

## CONSTRAINT-HR-01: Employment Date Ordering
**Rule ID:** CONSTRAINT-HR-01
**Domain:** HR / Employment
**Constraint Type:** Temporal ordering constraint
**Column Patterns:** hire_date + termination_date, start_date + end_date, employment_start + employment_end
**Constraint:** termination_date >= hire_date (if termination_date is not null)
**Synthesis Note:** Apply SDV CustomConstraint for date ordering. Tenure = termination_date - hire_date must be >= 0.
**Context:** Termination before hire date is a data error. Flag during profiling.

---

## CONSTRAINT-HR-02: Salary Must Be Positive
**Rule ID:** CONSTRAINT-HR-02
**Domain:** HR / Employment
**Constraint Type:** Non-negativity + reasonable range
**Column Patterns:** salary, annual_salary, hourly_rate, wage, compensation, base_salary, total_compensation
**Constraint:** salary > 0
**Reasonable Range Flag:** salary > 10,000,000 (flag for review — possible unit error)
**Synthesis Note:** Clip salary to [0, +inf] after DP noise. Flag synthetic values above $10M for review.
**Context:** Negative salaries are invalid. Salaries above $10M are possible but unusual — verify units (e.g., cents vs dollars).

---

## CONSTRAINT-HR-03: Age for Employment Must Be ≥ 16
**Rule ID:** CONSTRAINT-HR-03
**Domain:** HR / Employment
**Constraint Type:** Range constraint (legal minimum)
**Column Patterns:** age (in HR/employment datasets)
**Constraint:** age >= 16 (US federal minimum for most employment)
**Synthesis Note:** In HR datasets, clip synthesized age to [16, 100].
**Context:** Federal law (FLSA) restricts employment of individuals under 16 in most industries. An employee age below 16 in a workforce dataset is a data quality issue.

---

## CONSTRAINT-HR-04: Performance Rating Range
**Rule ID:** CONSTRAINT-HR-04
**Domain:** HR / Employment
**Constraint Type:** Range validation
**Column Patterns:** performance_rating, perf_rating, performance_score, review_score, evaluation_score
**Context:** Performance ratings vary by company system. Common scales: 1–5, 1–10, 0–100. Detect scale from min/max during profiling and apply range constraint accordingly. Flag values outside the detected scale.
**Synthesis Note:** Apply detected min-max constraint to performance rating column during synthesis.

---

## CONSTRAINT-EDU-01: GPA Range
**Rule ID:** CONSTRAINT-EDU-01
**Domain:** Education
**Constraint Type:** Range validation
**Column Patterns:** gpa, grade_point_average, cumulative_gpa, academic_gpa
**Valid Range:** 0.0 to 4.0 (US standard scale)
**Synthesis Note:** Clip GPA to [0.0, 4.0] after DP noise. Some institutions use 4.3 or 5.0 scales — detect from max observed value.
**Context:** GPA outside 0.0–4.3 indicates data quality issues or non-standard scale. Flag during profiling.

---

## CONSTRAINT-EDU-02: SAT/ACT Score Range
**Rule ID:** CONSTRAINT-EDU-02
**Domain:** Education
**Constraint Type:** Range validation
**Column Patterns:** sat_score, act_score, test_score, standardized_test
**Valid Ranges:**
  - SAT: 400 to 1600 (post-2016 format)
  - ACT: 1 to 36
**Synthesis Note:** Apply range constraint based on detected score type. Clip after DP noise.
**Context:** SAT/ACT scores outside valid ranges indicate data errors.

---

## CONSTRAINT-BINARY-01: Binary Outcome Columns
**Rule ID:** CONSTRAINT-BINARY-01
**Domain:** All
**Constraint Type:** Valid value set
**Column Patterns:** hired, approved, loan_approved, hiring_decision, admission_decision, outcome, label, target, result, decision
**Valid Values:** Binary — typically {0,1}, {True,False}, {"Hired","Rejected"}, {"Approved","Denied"}, {"Yes","No"}
**Synthesis Note:** Binary outcome columns must be treated as categorical during synthesis. SDV will preserve the distribution. Do not apply DP noise to binary outcomes — the mechanism would produce non-binary values.
**Context:** Outcome columns in bias analysis must remain binary or clearly categorical for fairness metric computation.
