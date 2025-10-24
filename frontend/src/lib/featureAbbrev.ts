// Feature abbreviations and explanations

export const FEATURE_ABBREV: Record<string, string> = {
  'SeriousDlqin2yrs': 'TARGET',
  'RevolvingUtilizationOfUnsecuredLines': 'RUUL',
  'age': 'AGE',
  'NumberOfTime30-59DaysPastDueNotWorse': 'PD30',
  'NumberOfTime60-89DaysPastDueNotWorse': 'PD60',
  'NumberOfTimes90DaysLate': 'PD90',
  'DebtRatio': 'DEBT',
  'MonthlyIncome': 'INCM',
  'NumberOfOpenCreditLinesAndLoans': 'OCLL',
  'NumberRealEstateLoansOrLines': 'RELL',
  'NumberOfDependents': 'DEPS',
};

export const FEATURE_EXPLANATION: Record<string, string> = {
  'SeriousDlqin2yrs': 'Person experienced 90 days past due delinquency or worse (1 for yes, 0 for no)',
  'RevolvingUtilizationOfUnsecuredLines': 'Total balance on credit cards divided by credit limits',
  'age': 'Age of borrower in years',
  'NumberOfTime30-59DaysPastDueNotWorse': 'Count of 30-59 days past due in last 2 years',
  'NumberOfTime60-89DaysPastDueNotWorse': 'Count of 60-89 days past due in last 2 years',
  'NumberOfTimes90DaysLate': 'Count of 90+ days past due',
  'DebtRatio': 'Monthly debt payments divided by monthly income',
  'MonthlyIncome': 'Monthly income in dollars',
  'NumberOfOpenCreditLinesAndLoans': 'Number of open loans and credit lines',
  'NumberRealEstateLoansOrLines': 'Number of mortgage and real estate loans',
  'NumberOfDependents': 'Number of dependents excluding self',
};

export function abbrev(feature: string): string {
  return FEATURE_ABBREV[feature] || feature;
}

export function explain(feature: string): string {
  return FEATURE_EXPLANATION[feature] || feature;
}
