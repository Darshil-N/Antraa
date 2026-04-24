export type PipelinePhase = "PROFILING" | "COMPLIANCE" | "AWAITING_APPROVAL" | "GENERATING" | "VALIDATING" | "COMPLETE"

export const pipelinePhases: PipelinePhase[] = [
  "PROFILING",
  "COMPLIANCE",
  "AWAITING_APPROVAL",
  "GENERATING",
  "VALIDATING",
  "COMPLETE",
]

export const uploadPreview = {
  columns: [
    "applicant_id",
    "ssn",
    "dob",
    "gender",
    "race",
    "interview_score",
    "experience_years",
    "loan_approved",
  ],
  rows: [
    {
      applicant_id: "A-1001",
      ssn: "918-23-7721",
      dob: "1994-05-20",
      gender: "Female",
      race: "Asian",
      interview_score: 82,
      experience_years: 4,
      loan_approved: 1,
    },
    {
      applicant_id: "A-1002",
      ssn: "761-44-1109",
      dob: "1989-08-10",
      gender: "Male",
      race: "White",
      interview_score: 74,
      experience_years: 6,
      loan_approved: 1,
    },
    {
      applicant_id: "A-1003",
      ssn: "662-55-9901",
      dob: "1998-11-13",
      gender: "Female",
      race: "Black",
      interview_score: 67,
      experience_years: 2,
      loan_approved: 0,
    },
  ],
}

export const sampleColumns = [
  {
    column: "applicant_id",
    detectedType: "categorical",
    sensitivity: "PII",
    action: "SUPPRESS - HIPAA 164.514(b)(2)",
    epsilon: "Strong",
  },
  {
    column: "ssn",
    detectedType: "text",
    sensitivity: "PII",
    action: "SUPPRESS - GLBA Safeguards Rule",
    epsilon: "Strong",
  },
  {
    column: "dob",
    detectedType: "datetime",
    sensitivity: "PHI",
    action: "GENERALIZE - HIPAA Safe Harbor",
    epsilon: "Balanced",
  },
  {
    column: "interview_score",
    detectedType: "numeric",
    sensitivity: "SENSITIVE",
    action: "RETAIN_WITH_NOISE - DP",
    epsilon: "Balanced",
  },
  {
    column: "gender",
    detectedType: "categorical",
    sensitivity: "SENSITIVE",
    action: "RETAIN_WITH_NOISE - fairness tracking",
    epsilon: "Balanced",
  },
]

export const sampleLogs = [
  "Profiler Agent: applicant_id classified as PII (0.97 confidence)",
  "Profiler Agent: ssn classified as PII (0.99 confidence)",
  "RAG Policy Agent: matched GLBA Safeguards Rule for ssn",
  "Pipeline paused: waiting for human approval",
  "Generator: SDV GaussianCopula training started",
  "Validator: KS test completed for interview_score",
]

export const qualityMetrics = [
  { name: "Overall quality", value: 0.87 },
  { name: "Correlation similarity", value: 0.91 },
  { name: "Privacy risk score", value: 0.12 },
]

export const ksScores = [
  { column: "age", score: 0.93 },
  { column: "income", score: 0.9 },
  { column: "interview_score", score: 0.88 },
  { column: "experience_years", score: 0.85 },
]

export const biasFindings = [
  {
    severity: "CRITICAL",
    attribute: "gender",
    outcome: "loan_approved",
    metric: "Disparate Impact Ratio",
    value: 0.63,
    interpretation:
      "Female applicants are approved at 63% the rate of male applicants, below the EEOC 80% threshold.",
  },
  {
    severity: "HIGH",
    attribute: "race",
    outcome: "loan_approved",
    metric: "Demographic Parity Difference",
    value: 0.22,
    interpretation:
      "Approval rates differ by 22 percentage points between race groups, indicating significant imbalance.",
  },
  {
    severity: "MEDIUM",
    attribute: "age_bucket",
    outcome: "loan_approved",
    metric: "Equal Opportunity Difference",
    value: 0.14,
    interpretation:
      "True positive rates vary across age groups and should be reviewed before deployment.",
  },
]
