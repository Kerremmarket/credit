// Feature abbreviations and explanations

export const FEATURE_ABBREV: Record<string, string> = {
  'RevolvingUtilizationOfUnsecuredLines': 'RUUL',
  'age': 'AGE',
  'NumberOfTime30-59DaysPastDueNotWorse': 'PD30',
  'DebtRatio': 'DEBT',
  'MonthlyIncome': 'INCM',
  'NumberOfOpenCreditLinesAndLoans': 'OCLL',
  'NumberOfTimes90DaysLate': 'PD90',
  'NumberRealEstateLoansOrLines': 'RELL',
  'NumberOfTime60-89DaysPastDueNotWorse': 'PD60',
  'NumberOfDependents': 'DEPS',
};

export const FEATURE_EXPLANATION: Record<string, string> = {
  'RevolvingUtilizationOfUnsecuredLines': 'Total balance on credit cards divided by credit limits',
  'age': 'Age of borrower in years',
  'NumberOfTime30-59DaysPastDueNotWorse': 'Count of 30-59 days past due in last 2 years',
  'DebtRatio': 'Monthly debt payments divided by monthly income',
  'MonthlyIncome': 'Monthly income in dollars',
  'NumberOfOpenCreditLinesAndLoans': 'Number of open loans and credit lines',
  'NumberOfTimes90DaysLate': 'Count of 90+ days past due',
  'NumberRealEstateLoansOrLines': 'Number of mortgage and real estate loans',
  'NumberOfTime60-89DaysPastDueNotWorse': 'Count of 60-89 days past due in last 2 years',
  'NumberOfDependents': 'Number of dependents excluding self',
};

export function abbrev(feature: string): string {
  return FEATURE_ABBREV[feature] || feature;
}

export function explain(feature: string): string {
  return FEATURE_EXPLANATION[feature] || feature;
}
