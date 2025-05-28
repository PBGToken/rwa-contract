import { type PricesProvider } from "./PricesProvider";

export class CoinGeckoProvider implements PricesProvider {
    constructor(
        private chain: "ethereum" | "binance-smart-chain" | "bitcoin" = "ethereum",
    ) { }

    /**
     * Get spot price for a native token (ETH, BNB, BTC) or an ERC-20/BEP-20 token by contract address.
     * 
     * - If `asset` is null, returns the native token price for the configured chain (ETH for Ethereum, BNB for BSC, BTC for Bitcoin).
     * - If `asset` is a contract address, returns the token price for that contract on the configured chain.
     * 
     * @param asset Contract address or null for native token.
     * @param currency Fiat or crypto currency symbol for price (default: "usd").
     * @returns Spot price as a number, or 0 if not found.
     */
    async getSpotPrice(
        asset: string | null,
        currency: string = "usd"
    ): Promise<number> {
        // Native asset on the chain
        if (asset === null) {
            const assetId =
                this.chain === "ethereum"
                    ? "ethereum"
                    : this.chain === "binance-smart-chain"
                        ? "binancecoin"
                        : this.chain === "bitcoin"
                            ? "bitcoin"
                            : "ethereum";
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=${currency.toLowerCase()}`;
            const response = await fetch(url);
            const data = await response.json();
            return data[assetId]?.[currency.toLowerCase()] ?? 0;
        }

        // ERC-20 or BEP-20 token by contract address
        const url = `https://api.coingecko.com/api/v3/simple/token_price/${this.chain}?contract_addresses=${asset}&vs_currencies=${currency.toLowerCase()}`;
        const response = await fetch(url);
        const data = await response.json();
        return data[asset.toLowerCase()]?.[currency.toLowerCase()] ?? 0;
    }
}
