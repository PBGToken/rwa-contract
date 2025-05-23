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
}