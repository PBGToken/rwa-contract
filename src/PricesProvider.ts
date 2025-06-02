export interface PricesProvider {
    /**
     * @param asset
     * eg. ADA
     * 
     * @param currency
     * eg. USD
     * 
     * @returns
     * A number `currency` for one `asset`
     */
    getSpotPrice(asset: string, currency: string): Promise<number>

    /**
     * Get spot prices for multiple tokens by their CoinGecko asset symbols.
     *
     * @param symbols - Array of CoinGecko asset symbols (e.g., ["btc", "eth"]).
     * @param currency - Fiat or crypto currency symbol for price (default: "usd").
     * @returns An object mapping each asset symbol to its price data.
     */
    getSpotPriceBySymbols(
        symbols: string[],
        currency?: string
    ): Promise<Record<string, Record<string, number>>>;

    /**
     * Get the spot price for a token by contract address and chain (used for ERC20, BEP20, etc.).
     * 
     * @param contract - The token contract address.
     * @param chain - The blockchain network ("ethereum" | "binance-smart-chain").
     * @param currency - The fiat or crypto currency symbol to convert to (default: "usd").
     * @returns A number representing the price of one unit of the token in `currency`.
     */
    getSpotPriceByTokenAddress(
        contract: string,
        chain: "ethereum" | "binance-smart-chain",
        currency?: string
    ): Promise<number>
}