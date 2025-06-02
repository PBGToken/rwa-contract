import { type PricesProvider } from "./PricesProvider";

type Prices = {
  [symbol: string]: {
    usd: number;
  };
};

class CoinGeckoProvider implements PricesProvider {
    /**
     * Get spot price for any token by CoinGecko asset ID.
     *
     * @param asset CoinGecko asset ID (e.g., "ethereum").
     * @param currency Fiat or crypto currency symbol for price (default: "usd").
     * @returns Spot price as a number, or 0 if not found.
     */
    async getSpotPrice(
        asset: string,
        currency: string = "usd"
    ): Promise<number> {
        const url = "https://api.coingecko.com/api/v3/simple/price";
        const params = new URLSearchParams({
            ids: asset,
            vs_currencies: currency.toLowerCase(),
        });
        const response = await fetch(`${url}?${params.toString()}`);
        const data = await response.json();
        return data[asset]?.[currency.toLowerCase()] ?? 0;
    }

    /**
     * Get spot prices for multiple tokens by their CoinGecko asset symbols.
     *
     * @param symbols Array of CoinGecko asset symbols (e.g., ["btc", "eth"]).
     * @param currency Fiat or crypto currency symbol for price (default: "usd").
     * @returns An object mapping each asset ID to its price data, or empty object if not found.
     */
    async getSpotPriceBySymbols(
        symbols: string[],
        currency: string = "usd"
    ): Promise<Prices> {
        const url = "https://api.coingecko.com/api/v3/simple/price";
        const params = new URLSearchParams({
            symbols: symbols.join(",").toLowerCase(),
            vs_currencies: currency.toLowerCase(),
        });
        const response = await fetch(`${url}?${params.toString()}`);
        return await response.json();
    }

    /**
     * Get spot price for a token by contract address and chain.
     * 
     * @param contract The token contract address.
     * @param chain The blockchain network ("ethereum", "binance-smart-chain", etc).
     * @param currency Fiat or crypto currency symbol for price (default: "usd").
     * @returns Spot price as a number, or 0 if not found.
     */
    async getSpotPriceByTokenAddress(
        contract: string,
        chain: "ethereum" | "binance-smart-chain" = "ethereum",
        currency: string = "usd"
    ): Promise<number> {
        const url = `https://api.coingecko.com/api/v3/simple/token_price/${chain}`;
        const params = new URLSearchParams({
            contract_addresses: contract,
            vs_currencies: currency.toLowerCase(),
        });
        const response = await fetch(`${url}?${params.toString()}`);
        const data = await response.json();
        return data[contract]?.[currency.toLowerCase()] ?? 0;
    }
}

export function makeCoinGeckoProvider(): PricesProvider {
  return new CoinGeckoProvider();
}