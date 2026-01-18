const pkg = require('yahoo-finance2');
console.log('Keys:', Object.keys(pkg));
console.log('Type of default:', typeof pkg.default);
console.log('Default keys:', pkg.default ? Object.keys(pkg.default) : 'N/A');
if (pkg.default && pkg.default.quoteSummary) {
    console.log('quoteSummary type:', typeof pkg.default.quoteSummary);
}
