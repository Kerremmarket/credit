# Dataset Instructions

## Getting the Give Me Some Credit Dataset

### Option 1: Kaggle CLI (Recommended)
1. Get Kaggle API credentials from https://www.kaggle.com/account
2. Save kaggle.json to ~/.kaggle/
3. Run:
   ```bash
   kaggle competitions download -c GiveMeSomeCredit
   unzip GiveMeSomeCredit.zip
   ```

### Option 2: Manual Download
1. Visit https://www.kaggle.com/c/GiveMeSomeCredit/data
2. Download the dataset
3. Extract and place `cs-training.csv` here

### Expected Files
- `cs-training.csv` - Training dataset (150,000 rows)
- `cs-test.csv` - Test dataset (101,503 rows)

### Dataset Columns
- SeriousDlqin2yrs: Target variable (90 days past due)
- RevolvingUtilizationOfUnsecuredLines: Credit card utilization
- age: Age of borrower
- NumberOfTime30-59DaysPastDueNotWorse: Number of times 30-59 days past due
- DebtRatio: Monthly debt payments/gross monthly income
- MonthlyIncome: Monthly income
- NumberOfOpenCreditLinesAndLoans: Number of open loans
- NumberOfTimes90DaysLate: Number of times 90+ days late
- NumberRealEstateLoansOrLines: Number of real estate loans
- NumberOfTime60-89DaysPastDueNotWorse: Number of times 60-89 days past due
- NumberOfDependents: Number of dependents



