# Fairness Legal Thresholds Knowledge Base
# FairSynth AI — RAG Compliance Knowledge Base
# Category: FAIRNESS
# Sources: EEOC, Fair Housing Act, ECOA, ADA, Title VII, ADEA

---

## FAIR-EEOC-01: Disparate Impact Ratio — EEOC 80% Rule (Employment)
**Rule ID:** FAIR-EEOC-01
**Metric:** Disparate Impact Ratio (DIR)
**Legal Threshold:** 0.8 (80% Rule)
**Severity Below 0.6:** CRITICAL
**Severity 0.6–0.8:** HIGH
**Severity 0.8–0.9:** MEDIUM
**Severity Above 0.9:** LOW
**Citation:** 29 CFR Part 1607 — Uniform Guidelines on Employee Selection Procedures
**Regulation:** EEOC Adverse Impact Standard
**Context:** The "4/5ths rule" or "80% rule" is the primary legal threshold for employment discrimination claims. If the selection rate for a protected group is less than 80% of the selection rate for the group with the highest rate, adverse impact is indicated. Formula: DIR = (positive_rate_minority / positive_rate_majority). Values below 0.8 trigger adverse impact analysis. Values below 0.6 indicate severe systemic discrimination.
**Protected Classes:** Race, color, sex, religion, national origin, age (40+), disability
**Applicable Datasets:** Hiring decisions, promotions, terminations, performance evaluations, salary decisions, training selection

---

## FAIR-EEOC-02: Demographic Parity Difference — Employment
**Rule ID:** FAIR-EEOC-02
**Metric:** Demographic Parity Difference (DPD)
**Legal Threshold:** 0.1 (10% difference in positive outcome rates)
**Severity Above 0.3:** CRITICAL
**Severity 0.2–0.3:** HIGH
**Severity 0.1–0.2:** MEDIUM
**Severity Below 0.1:** LOW
**Citation:** 29 CFR Part 1607 + Title VII of Civil Rights Act
**Regulation:** EEOC Employment Discrimination Standards
**Context:** Demographic Parity Difference measures the absolute difference in positive outcome rates between the most favored and least favored group. A DPD of 0 means all groups are selected at equal rates. In employment contexts, a DPD above 0.1 warrants investigation. Above 0.3 indicates a pattern consistent with systemic discrimination under Title VII jurisprudence.

---

## FAIR-EEOC-03: Equal Opportunity Difference — Employment
**Rule ID:** FAIR-EEOC-03
**Metric:** Equal Opportunity Difference (EOD)
**Legal Threshold:** 0.1 (10% difference in true positive rates)
**Severity Above 0.2:** CRITICAL
**Severity 0.1–0.2:** HIGH
**Severity 0.05–0.1:** MEDIUM
**Severity Below 0.05:** LOW
**Citation:** 29 CFR Part 1607
**Regulation:** EEOC Employment Discrimination Standards
**Context:** EOD measures whether qualified individuals from different groups are identified at equal rates (true positive rate parity). In hiring: among candidates who should be hired based on qualifications, are all groups advanced at equal rates? An EOD above 0.1 suggests unequal treatment of equally qualified candidates.

---

## FAIR-ECOA-01: Disparate Impact Ratio — ECOA (Lending)
**Rule ID:** FAIR-ECOA-01
**Metric:** Disparate Impact Ratio (DIR)
**Legal Threshold:** 0.8 (same 80% rule applied to credit)
**Severity Below 0.6:** CRITICAL
**Severity 0.6–0.8:** HIGH
**Severity 0.8–0.9:** MEDIUM
**Severity Above 0.9:** LOW
**Citation:** 15 U.S.C. § 1691 — Equal Credit Opportunity Act + 12 CFR Part 202
**Regulation:** ECOA Fair Lending Standard
**Context:** ECOA prohibits discrimination in credit transactions based on race, color, religion, national origin, sex, marital status, age, or receipt of public assistance. The CFPB and DOJ use the 80% rule as the primary adverse impact threshold for fair lending analysis. A DIR below 0.8 for any protected class in loan approvals triggers mandatory remediation review.
**Protected Classes:** Race, color, religion, national origin, sex, marital status, age (if of legal age), receipt of public assistance
**Applicable Datasets:** Loan approvals, credit card applications, mortgage decisions, credit limit assignments, interest rate decisions

---

## FAIR-FHA-01: Fair Housing Act — Mortgage Discrimination
**Rule ID:** FAIR-FHA-01
**Metric:** Disparate Impact Ratio (DIR)
**Legal Threshold:** 0.8
**Citation:** 42 U.S.C. § 3604 — Fair Housing Act + HUD Rule 24 CFR Part 100
**Regulation:** Fair Housing Act
**Context:** The Fair Housing Act prohibits discrimination in housing sales, rentals, and mortgage lending. The Supreme Court confirmed (Texas Dept. of Housing v. ICP, 2015) that disparate impact claims are cognizable under the FHA. A DIR below 0.8 in mortgage approval rates by race or national origin creates substantial fair lending risk.
**Protected Classes:** Race, color, national origin, religion, sex, familial status, disability
**Applicable Datasets:** Mortgage applications, rental approvals, housing decisions, neighborhood pricing

---

## FAIR-ADEA-01: Age Discrimination in Employment
**Rule ID:** FAIR-ADEA-01
**Metric:** Demographic Parity Difference (age 40+ vs under 40)
**Legal Threshold:** 0.1 DPD
**Severity Above 0.2:** HIGH
**Severity 0.1–0.2:** MEDIUM
**Severity Below 0.1:** LOW
**Citation:** 29 U.S.C. § 623 — Age Discrimination in Employment Act
**Regulation:** ADEA
**Context:** The ADEA protects workers aged 40 and older from employment discrimination. The age threshold for protected class analysis is 40. Datasets should be analyzed for disparate outcomes between workers under 40 and those 40 and above. Note: ADEA does not use the strict 80% rule — courts apply a reasonableness analysis — but DPD above 0.1 warrants documentation.
**Protected Class:** Individuals aged 40 and above
**Applicable Datasets:** Hiring decisions, promotions, terminations, salary, retirement benefits

---

## FAIR-ADA-01: Disability Discrimination
**Rule ID:** FAIR-ADA-01
**Metric:** Demographic Parity Difference (disabled vs non-disabled)
**Legal Threshold:** 0.15 DPD (higher tolerance due to reasonable accommodation complexity)
**Severity Above 0.3:** HIGH
**Severity 0.15–0.3:** MEDIUM
**Severity Below 0.15:** LOW
**Citation:** 42 U.S.C. § 12112 — Americans with Disabilities Act, Title I
**Regulation:** ADA Employment Non-Discrimination
**Context:** ADA Title I prohibits employment discrimination against qualified individuals with disabilities. Statistical parity analysis for disability is complex because legitimate reasonable accommodations may affect outcome rates. A DPD above 0.3 between disabled and non-disabled populations in hiring or promotion warrants investigation.

---

## FAIR-SPD-01: Statistical Parity Difference — General Threshold
**Rule ID:** FAIR-SPD-01
**Metric:** Statistical Parity Difference (SPD)
**Legal Threshold:** 0.1 (10% probability difference)
**Severity Above 0.3:** CRITICAL
**Severity 0.1–0.3:** HIGH
**Severity 0.05–0.1:** MEDIUM
**Severity Below 0.05:** LOW
**Citation:** Multiple — applies across EEOC, ECOA, FHA contexts
**Regulation:** Cross-regulation fairness standard
**Context:** Statistical Parity Difference is the probability difference of receiving a positive outcome between protected group and reference group across the full marginal distribution. It is regulation-agnostic and serves as a first-pass screening metric across all domains. An SPD above 0.1 in any domain warrants deeper metric analysis.

---

## FAIR-CDI-01: Class Distribution Imbalance — Underrepresentation
**Rule ID:** FAIR-CDI-01
**Metric:** Class Distribution Imbalance (CDI) — minority/majority count ratio
**Legal Threshold:** 0.1 (less than 10% representation is severe underrepresentation)
**Severity Below 0.05:** CRITICAL
**Severity 0.05–0.1:** HIGH
**Severity 0.1–0.2:** MEDIUM
**Severity Above 0.2:** LOW
**Citation:** 29 CFR Part 1607 (adverse impact analysis requires representative samples)
**Regulation:** EEOC Uniform Guidelines
**Context:** If a protected group represents less than 10% of the dataset, even balanced label distributions may cause discriminatory model behavior due to insufficient training data. CDI flags datasets where minority group sample sizes are too small for reliable bias metric computation (n<30 triggers insufficient data warning).
