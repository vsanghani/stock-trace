const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance();

// Suppress notice
// yahooFinance.suppressNotices(['yahooSurvey']);


async function test() {
    try {
        const queryOptions = { modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics'] };
        console.log('Fetching AAPL...');
        const result = await yahooFinance.quoteSummary('AAPL', queryOptions);
        console.log('Success!');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
