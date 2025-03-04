document.addEventListener("DOMContentLoaded", () => {
  initializeCurrencyInputs();
  initializePercentageInputs();
  //   initializeMortgageSplit();
  initializeMortgageInputs();
  document
    .getElementById("calculate")
    .addEventListener("click", calculateSplit);
});

function formatNumberWithCommas(value) {
  // Remove any non-digit characters except decimal point
  let number = value.replace(/[^\d]/g, "");
  // Format with commas
  return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function parseFormattedNumber(value) {
  // Remove commas and convert to number
  return Number(value.toString().replace(/,/g, ""));
}

function readInputBox(id) {
  return parseFormattedNumber(document.getElementById(id).value || 0);
}

function initializeCurrencyInputs() {
  document
    .querySelectorAll('.input-group.pound input[type="number"]')
    .forEach((input) => {
      // Convert to text input to allow commas
      input.type = "text";

      input.addEventListener("input", function (e) {
        // Store current cursor position
        const cursorPosition = this.selectionStart;
        const value = this.value;

        // Remove commas from current value
        const originalLength = value.length;
        const cleanValue = value.replace(/,/g, "");

        if (cleanValue) {
          // Format with commas
          const formattedValue = formatNumberWithCommas(cleanValue);
          this.value = formattedValue;

          // Adjust cursor position based on added commas
          const newPosition =
            cursorPosition + (formattedValue.length - originalLength);

          this.setSelectionRange(newPosition, newPosition);
        }
      });
    });
}

function initializePercentageInputs() {
  const percentageInputs = ["mortgageSplit1", "interestRate"].map((id) =>
    document.getElementById(id)
  );

  percentageInputs.forEach((input) => {
    // Convert to text type to allow better control
    input.type = "text";

    input.addEventListener("input", function (e) {
      // Store cursor position
      const cursorPosition = this.selectionStart;

      // Remove any non-numeric characters except decimal point
      let value = this.value.replace(/[^\d.]/g, "");

      // Limit decimal places to 2
      if (value.includes(".")) {
        const [whole, decimal] = value.split(".");
        value = `${whole}.${decimal.slice(0, 2)}`;
      }

      // Enforce maximum value of 100
      if (parseFloat(value) > 100) {
        value = value.slice(0, 2);
      }

      this.value = value;

      // Update related fields if needed
      if (this.id === "mortgageSplit1") {
        const split2Input = document.getElementById("mortgageSplit2");
        split2Input.value = 100 - parseFloat(value) || 0;
      }

      // Restore cursor position
      this.setSelectionRange(cursorPosition, cursorPosition);
    });
  });
}

function initializeMortgageInputs() {
  const radioInputs = document.querySelectorAll(
    'input[name="mortgageInputMethod"]'
  );
  const calculateInputs = document.getElementById("calculateInputs");
  const estimateListeners = [
    "originalValue",
    "deposit1",
    "deposit2",
    "monthlyPayment",
    "interestRate",
    "yearsPayingMortgage",
  ];

  radioInputs.forEach((input) => {
    input.addEventListener("change", (e) => {
      if (e.target.value === "direct") {
        // Hide estimate inputs
        calculateInputs.style.display = "none";
        // Set direct inputs to writable
        document
          .getElementById("totalMortgageInterest")
          .removeAttribute("readonly");
        document
          .getElementById("totalMortgageEquity")
          .removeAttribute("readonly");
        // Add estimate listeners so values auto-update
        estimateListeners.forEach((id) => {
          document
            .getElementById(id)
            .removeEventListener("input", calculateFromMonthly);
        });
      } else {
        // Show estimate inputs
        estimateInputs.style.display = "block";
        // Set direct inputs to read-only
        document
          .getElementById("totalMortgageInterest")
          .setAttribute("readonly", true);
        document
          .getElementById("totalMortgageEquity")
          .setAttribute("readonly", true);
        // Remove estimate listeners so values don't auto-update
        estimateListeners.forEach((id) => {
          document
            .getElementById(id)
            .addEventListener("input", estimateFromMonthly);
        });
      }
    });
  });

  estimateListeners.forEach((id) => {
    document.getElementById(id).addEventListener("input", estimateFromMonthly);
  });
}

function estimateFromMonthly() {
  const monthlyPayment = readInputBox("monthlyPayment");
  const interestRate = readInputBox("interestRate") / 100;
  const years = readInputBox("yearsPayingMortgage");
  const deposit1 = readInputBox(`deposit1`);
  const deposit2 = readInputBox(`deposit2`);
  const originalValue = readInputBox("originalValue");

  const monthsPaid = years * 12;
  const monthlyInterestRate = interestRate / 12;

  // Loop through to calculate how much of each monthly payment contributed to equity and interest
  let remainingPrincipal = originalValue - deposit1 - deposit2;
  let totalMortgageInterest = 0;
  let totalMortgageEquity = 0;
  for (let i = 0; i < monthsPaid; i++) {
    const interestPayment = remainingPrincipal * monthlyInterestRate;
    const principalPayment = monthlyPayment - interestPayment;
    remainingPrincipal -= principalPayment;
    totalMortgageInterest += interestPayment;
    totalMortgageEquity += principalPayment;
  }

  // Update the direct input fields
  document.getElementById("totalMortgageEquity").value = formatNumberWithCommas(
    Math.round(totalMortgageEquity).toString()
  );
  document.getElementById("totalMortgageInterest").value =
    formatNumberWithCommas(Math.round(totalMortgageInterest).toString());
}

function getContributorValues(contributorNum) {
  const mortgageTotal = readInputBox("totalMortgageEquity");
  const totalMortgageInterest = readInputBox("totalMortgageInterest");
  const mortgageSplit = readInputBox(`mortgageSplit${contributorNum}`) / 100;

  return {
    direct: {
      deposit: readInputBox(`deposit${contributorNum}`),
      mortgage: mortgageTotal * mortgageSplit,
      overpayments: readInputBox(`overpayments${contributorNum}`),
    },
    additional: {
      mortgageInterest: totalMortgageInterest * mortgageSplit,
      purchaseFees: readInputBox(`purchaseFees${contributorNum}`),
      improvements: readInputBox(`improvements${contributorNum}`),
    },
  };
}

function calculateTotals(contributorValues) {
  return {
    directTotal: Object.values(contributorValues.direct).reduce(
      (a, b) => a + b,
      0
    ),
    additionalTotal: Object.values(contributorValues.additional).reduce(
      (a, b) => a + b,
      0
    ),
  };
}

function calculateSplit() {
  const houseValues = {
    originalValue: readInputBox("originalValue"),
    saleValue: readInputBox("saleValue"),
    saleFees: readInputBox("saleFees"),
  };

  // Get contributor values
  const contributor1Values = getContributorValues(1);
  const contributor2Values = getContributorValues(2);

  // Calculate totals for each contributor
  const contributor1Totals = calculateTotals(contributor1Values);
  const contributor2Totals = calculateTotals(contributor2Values);

  const totalDirectContributions =
    contributor1Totals.directTotal + contributor2Totals.directTotal;

  // Calculate remaining mortgage and remaining equity
  const remainingMortgage =
    houseValues.originalValue - totalDirectContributions;
  const equityAfterSale =
    houseValues.saleValue - remainingMortgage - houseValues.saleFees;

  // Calculate total contributions and percentages
  const contributor1Total =
    contributor1Totals.directTotal + contributor1Totals.additionalTotal;
  const contributor2Total =
    contributor2Totals.directTotal + contributor2Totals.additionalTotal;
  const totalAllContributions = contributor1Total + contributor2Total;
  const contributionProportion1 = contributor1Total / totalAllContributions;
  const contributionProportion2 = contributor2Total / totalAllContributions;

  // Share of profit/loss
  const profitLoss = equityAfterSale - totalDirectContributions;
  const profitLoss1 = contributionProportion1 * profitLoss;
  const profitLoss2 = contributionProportion2 * profitLoss;

  const results = {
    saleValue: houseValues.saleValue,
    remainingMortgage,
    saleFees: houseValues.saleFees,
    equityAfterSale,
    contributor1: {
      direct: contributor1Totals.directTotal,
      total: contributor1Total,
      percentage: contributionProportion1 * 100,
      profitLoss: profitLoss1,
      returnFromSale: contributor1Totals.directTotal + profitLoss1,
    },
    contributor2: {
      direct: contributor2Totals.directTotal,
      total: contributor2Total,
      percentage: contributionProportion2 * 100,
      profitLoss: profitLoss2,
      returnFromSale: contributor2Totals.directTotal + profitLoss2,
    },
  };

  displayResults(results);
}

function displayCurrency(value) {
  // Remove any decimals and add commas
  return Math.round(value).toLocaleString();
}

function displayContributorResults(contributor, num) {
  return `
        <div>
            <h4>Contributor ${num}</h4>
            <p>Direct contribution: £${displayCurrency(contributor.direct)}</p>
            <p>Total contribution: £${displayCurrency(contributor.total)}</p>
            <p>Contribution percentage: ${contributor.percentage.toFixed(
              1
            )}%</p>
            <p>Share of profit/loss: £${displayCurrency(
              contributor.profitLoss
            )}</p>
            <p><b>Return from sale: £${displayCurrency(
              contributor.returnFromSale
            )}</b></p>
        </div>
    `;
}

function displayResults(results) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.style.display = "block";

  resultsDiv.innerHTML = `
        <h3>Results</h3>
        <div class="results-summary">
            <h3>Equity after sale:</h3>
            <p>£${displayCurrency(results.saleValue)} <small>(value)</small>
            - £${displayCurrency(
              results.remainingMortgage
            )} <small>(remaining mortgage)</small>
            - £${displayCurrency(results.saleFees)} <small>(fees)</small>
            = <b>£${displayCurrency(results.equityAfterSale)}</b></p>
        </div>
        <div class="contributor-results">
            ${displayContributorResults(results.contributor1, 1)}
            ${displayContributorResults(results.contributor2, 2)}
        </div>
    `;
}
