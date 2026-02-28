export interface OptionContract {
    contractSymbol: string;
    strike: number;
    currency?: string;
    lastPrice: number;
    change: number;
    percentChange?: number;
    volume?: number;
    openInterest?: number;
    bid?: number;
    ask?: number;
    contractSize: string;
    expiration: string;
    lastTradeDate: string;
    impliedVolatility: number;
    inTheMoney: boolean;
}

export interface OptionExpiration {
    expirationDate: string;
    hasMiniOptions: boolean;
    calls: OptionContract[];
    puts: OptionContract[];
}

export interface OptionsData {
    underlyingSymbol: string;
    expirationDates: string[];
    strikes: number[];
    hasMiniOptions: boolean;
    quote: {
        symbol: string;
        shortName: string;
        regularMarketPrice: number;
        regularMarketChange: number;
        regularMarketChangePercent: number;
        marketCap?: number;
    };
    options: OptionExpiration[];
}
