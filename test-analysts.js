const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance();

async function test() {
    try {
        // modules to check: recommendationTrend, financialData, upgradeDowngradeHistory, earningsTrend
        const queryOptions = { modules: ['recommendationTrend', 'financialData', 'upgradeDowngradeHistory', 'earningsTrend'] };
        console.log('Fetching Analyst Data for AAPL...');
        const result = await yahooFinance.quoteSummary('AAPL', queryOptions);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
