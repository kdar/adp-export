ADP Data Download
=================

This allows you to download your ADP Global MyView paystubs.

## Features

* Adds a button to bottom of paystub list to download them.
* Uses the already existing checkboxes to select which paystubs to download.
* Adds a "Select all" link to select all the paystubs for that year.

## CSV header configuration

This user script needs to know how to map specific JSON fields into CSV headers. We could just convert it to what the JSON keys are, but the issue with this is they aren't always intuitive and you may want to rename them, and it's actually useful to know when there is a new paystub line item (it will pop up an error when it finds a new JSON key that hasn't been configured).

The configuration is in the format of: one column per line, and a \<key>=\<rename> format. For example, if we wanted to rename the paystub line item of "Net Pay - Amount to be paid" to "Net", we would do:
```
Net Pay - Amount to be paid=Net
```

If you use "-" as the column to convert to, it will ignore it. Example:
```
Employer Contributions - ESPP Jun-Nov=-
```

There are 4 special columns, they are:
* *date - The date the paystub is for.
* *from - The from date which is the starting period of the paystub.
* *to - The to date which is the ending period of the paystub.
* *gross - The gross income.

Below is an example configuration.
```
*date=Date
*from=FromDate
*to=ToDate
*gross=Gross
Net Pay - Amount to be paid=Net
Earnings - Salary Exempt=Earnings (Salary Exempt)
Earnings - Corp Bonus=Earnings (Corp Bonus)
EE Taxes - TX Withholding Tax Federal=Deduction (Federal Income Tax)
EE Taxes - TX EE Social Security Tax Federal=Deduction (Social Security Tax)
EE Taxes - TX EE Medicare Tax Federal=Deduction (Medicare Tax)
Emp. Benefits Pre-tax ded. - *Std Medical EE pre-tax=Deduction (Medical Insurance pre-tax)
Emp. Benefits Post-Tax ded. - ESPP  Ded=Deduction (ESPP)
Emp. Benefits Pre-tax ded. - *401k EE pretax=Deduction (401k pre-tax)
Emp. Benefits Post-Tax ded. - Stock Offset=Deduction (Stock Offset)
Emp. Benefits Post-Tax ded. - Net Pay Off-Set=Deduction (Net Pay Offset)
Emp. Benefits Post-Tax ded. - MIS-Tax=Deduction (MIS-Tax)
Employer Contributions - ESPP Dec-May=-
Employer Contributions - ESPP Jun-Nov=-
Federal Wages - RE Withholding Tax Federal=-
```