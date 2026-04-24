# GLBA Financial Privacy Knowledge Base
# FairSynth AI — RAG Compliance Knowledge Base
# Category: PRIVACY
# Source: Gramm-Leach-Bliley Act (GLBA) — 15 U.S.C. §§ 6801-6809
# Safeguards Rule: 16 CFR Part 314

---

## GLBA-NPI-01: Social Security Numbers (Financial Context)
**Rule ID:** GLBA-NPI-01
**NPI Type:** Social Security Numbers in financial records
**Required Action:** SUPPRESS
**Column Patterns:** ssn, social_security, social_security_number, tax_id, tin, taxpayer_id, itin
**Citation:** 15 U.S.C. § 6802 — "nonpublic personal information"
**Regulation:** GLBA Privacy Rule — Nonpublic Personal Information
**Context:** SSNs in financial datasets are nonpublic personal information (NPI) under GLBA. Must be completely suppressed. GLBA applies to financial institutions including banks, mortgage companies, credit unions, insurance companies, and securities firms. Any dataset from these institutions containing SSNs requires immediate suppression.

---

## GLBA-NPI-02: Customer Account Numbers
**Rule ID:** GLBA-NPI-02
**NPI Type:** Financial account numbers
**Required Action:** SUPPRESS
**Column Patterns:** account_number, account_no, bank_account, checking_account, savings_account, account_id, financial_account, routing_number, iban, swift_code, account_identifier
**Citation:** 15 U.S.C. § 6802
**Regulation:** GLBA Privacy Rule
**Context:** Customer account numbers at financial institutions are NPI and must be suppressed. Routing numbers combined with account numbers are especially sensitive — either field alone should also be suppressed.

---

## GLBA-NPI-03: Credit and Debit Card Numbers
**Rule ID:** GLBA-NPI-03
**NPI Type:** Payment card numbers
**Required Action:** SUPPRESS
**Column Patterns:** card_number, credit_card, debit_card, card_no, pan, payment_card, card_id, cc_number, visa_number, mastercard_number
**Citation:** 15 U.S.C. § 6802 + PCI-DSS alignment
**Regulation:** GLBA Privacy Rule
**Context:** Payment card numbers are NPI under GLBA and also governed by PCI-DSS. Must be completely suppressed. No partial retention (e.g., last 4 digits) is permitted in the synthetic output.

---

## GLBA-NPI-04: Credit Scores and Credit History
**Rule ID:** GLBA-NPI-04
**NPI Type:** Credit scores and credit history
**Required Action:** RETAIN_WITH_NOISE
**Column Patterns:** credit_score, fico_score, vantage_score, credit_rating, credit_history, credit_grade, creditworthiness
**Citation:** 15 U.S.C. § 6802
**Regulation:** GLBA Privacy Rule
**Context:** Credit scores are NPI but are often the primary analytical variable in financial datasets (e.g., loan default prediction). Retain with differential privacy noise (ε=1.0 recommended). Valid credit score range: 300–850 (FICO). Noise injection must preserve this range.

---

## GLBA-NPI-05: Income and Salary Data
**Rule ID:** GLBA-NPI-05
**NPI Type:** Income and financial status information
**Required Action:** RETAIN_WITH_NOISE
**Column Patterns:** income, annual_income, salary, monthly_income, gross_income, net_income, household_income, wage, earnings, compensation, total_income
**Citation:** 15 U.S.C. § 6802
**Regulation:** GLBA Privacy Rule
**Context:** Income data is NPI under GLBA. Retain with differential privacy noise. Income values are generally non-negative — noise injection must be calibrated to avoid negative output values.

---

## GLBA-NPI-06: Loan Application Details
**Rule ID:** GLBA-NPI-06
**NPI Type:** Loan and credit application data
**Required Action:** RETAIN_WITH_NOISE
**Column Patterns:** loan_amount, loan_balance, debt_amount, outstanding_debt, mortgage_balance, loan_requested, credit_limit, credit_line, debt_to_income, dti_ratio, loan_term
**Citation:** 15 U.S.C. § 6802
**Regulation:** GLBA Privacy Rule
**Context:** Loan amounts and debt levels are NPI. Retain with DP noise. Loan amounts must remain positive after noise injection. Debt-to-income ratios should remain within 0–1 range.

---

## GLBA-NPI-07: Transaction History Patterns
**Rule ID:** GLBA-NPI-07
**NPI Type:** Transaction history and spending patterns
**Required Action:** RETAIN_WITH_NOISE
**Column Patterns:** transaction_amount, purchase_amount, spend_amount, payment_amount, transaction_count, monthly_spend, average_transaction, transaction_history, spending_pattern
**Citation:** 15 U.S.C. § 6802
**Regulation:** GLBA Privacy Rule
**Context:** Individual transaction patterns are NPI. Aggregate statistical properties (mean, distribution) can be preserved via DP noise while preventing re-identification from specific transaction amounts.

---

## GLBA-NPI-08: Loan Approval Decisions
**Rule ID:** GLBA-NPI-08
**NPI Type:** Credit decision outcomes
**Required Action:** RETAIN (outcome variable)
**Column Patterns:** loan_approved, loan_status, credit_approved, approval_status, credit_decision, approved, rejected, loan_outcome, application_status
**Citation:** 15 U.S.C. § 6802 + ECOA alignment
**Regulation:** GLBA Privacy Rule + Equal Credit Opportunity Act
**Context:** Loan approval decisions are the outcome variable in lending datasets. Retain as-is in synthetic data (the distribution of approvals/rejections is what the synthetic model must preserve). This column is also the primary outcome variable for bias audit analysis under ECOA.

---

## GLBA-NPI-09: Employment Status (Financial Context)
**Rule ID:** GLBA-NPI-09
**NPI Type:** Employment and financial status
**Required Action:** RETAIN
**Column Patterns:** employment_status, employed, unemployed, employment_type, job_status, self_employed, occupation_type
**Citation:** 15 U.S.C. § 6802
**Regulation:** GLBA Privacy Rule
**Context:** Employment status in financial datasets (e.g., loan applications) is NPI. Retain in synthetic data — it is a legitimate underwriting variable. Synthesize normally as a categorical column.

---

## GLBA-SAFEGUARDS-01: Data at Rest Protection
**Rule ID:** GLBA-SAFEGUARDS-01
**Requirement:** Safeguards Rule — protecting NPI at rest
**Required Action:** SUPPRESS (raw file destruction)
**Column Patterns:** all columns (applies to the raw uploaded file)
**Citation:** 16 CFR Part 314 — Standards for Safeguarding Customer Information
**Regulation:** GLBA Safeguards Rule
**Context:** The GLBA Safeguards Rule (revised 2023) requires financial institutions to implement technical, administrative, and physical safeguards for NPI. FairSynth implements this through the data destruction protocol: the original uploaded file is permanently deleted after synthesis. The 3-pass secure overwrite (zeros → ones → random bytes) satisfies the "secure disposal" requirement under 16 CFR Part 314.4(f).
