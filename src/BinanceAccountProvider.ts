import crypto from "crypto";
import { TokenizedAccountProvider } from "./TokenizedAccountProvider";
import { PricesProvider } from "./PricesProvider";
import { TransferID } from "./TransferID";

interface Balance {
    asset: string;
    free: string;
    locked: string;
}

interface BinanceTransfer {
    amount: string;
    asset: string;
    txId: string;
    status: number;
    insertTime: number;
}

/**
 * BinanceAccountProvider
 *
 * Implements TokenizedAccountProvider for Binance exchange accounts.
 * Supports fetching all asset balances and their total USD value.
 * Uses Binance REST API for account data and CoinGecko for price data.
 */
class BinanceAccountProvider implements TokenizedAccountProvider {
    private baseURL = "https://api.binance.com";
    private apiSecret: string;

    /**
     * @param apiKey Binance API key.
     * @param priceProvider CoinGecko Price Provider
     */
    constructor(
        private apiKey: string,
        private priceProvider: PricesProvider,
    ) {
        this.apiSecret = crypto.randomBytes(32).toString("hex");
    }

    /**
     * Returns the total balance (not implemented, returns 0).
     */
    get balance(): Promise<number> {
        return Promise.resolve(0);
    };

    /**
     * Returns the total USD value of all free balances in the account.
     */
    get usdBalance(): Promise<number> {
        return this.getUSDValue();
    };

    /**
     * Returns the transfer history for the account.
     */
    get transferHistory(): Promise<TransferID[]> {
        return this.getTransferHistory();
    }

    /**
     * Returns the total USD value of the given transfer IDs.
     * Deposits are positive, withdrawals are negative.
     * @param transfers Array of TransferID.
     */
    async deposits(transfers: TransferID[]): Promise<number> {
        const deposits = await this.fetchTransfers("/sapi/v1/capital/deposit/hisrec");
        const withdrawals = await this.fetchTransfers("/sapi/v1/capital/withdraw/history");

        const all = [
            ...deposits.map(d => ({ ...d, type: "deposit" })),
            ...withdrawals.map(w => ({ ...w, type: "withdrawal" }))
        ].filter(t => transfers.includes(t.txId));

        const prices = await this.priceProvider.getSpotPriceBySymbols(
            all.map(t => t.asset), "usd"
        );

        return all.reduce((sum, t) => {
            const price = prices[t.asset.toLowerCase()]?.usd ?? 0;
            const amount = parseFloat(t.amount) * price;
            return sum + (t.type === "deposit" ? amount : -amount);
        }, 0);
    }

    /**
     * Signs a query string using HMAC SHA256 with the API secret.
     * @param queryString The query string to sign.
     * @returns The signature as a hex string.
     */
    private sign(queryString: string): string {
        return crypto
            .createHmac("sha256", this.apiSecret)
            .update(queryString)
            .digest("hex");
    }

    /**
     * Makes a signed request to a Binance API endpoint.
     * @param endpoint The API endpoint.
     * @param params Query parameters as an object.
     * @returns The parsed JSON response.
     */
    private async privateRequest(endpoint: string, params: Record<string, string | number> = {}) {
        const timestamp = Date.now();
        const query = new URLSearchParams({
            ...params,
            timestamp: timestamp.toString()
        }).toString();

        const signature = this.sign(query);
        const url = `${this.baseURL}${endpoint}?${query}&signature=${signature}`;

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "X-MBX-APIKEY": this.apiKey
            }
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Binance API error: ${res.status} ${errorText}`);
        }

        return await res.json();
    }

    /**
     * Fetches all asset balances for the account using Binance API.
     * @returns Array of Balance objects.
     */
    async getBalance(): Promise<Balance[]> {
        const data = await this.privateRequest("/api/v3/account");
        return data.balances;
    }

    /**
     * Fetches the total USD value of all free balances using CoinGecko prices.
     * @returns Total USD value as a number.
     */
    async getUSDValue(): Promise<number> {
        const balances = await this.getBalance();

        const prices = await this.priceProvider.getSpotPriceBySymbols(
            balances.map((balance: Balance) => balance.asset), "usd"
        );

        let totalUSD = 0;

        for (const balance of balances) {
            const symbol = balance.asset.toLowerCase();
            const price = prices[symbol]?.usd ?? 0;
            const freeAmount = parseFloat(balance.free);

            totalUSD += freeAmount * price;
        }

        return totalUSD;
    }

    /**
     * Fetches the transfer history for deposits and withdrawals.
     * @returns Array of transfer IDs.
     */
    async getTransferHistory(): Promise<TransferID[]> {
        const deposits = await this.fetchTransfers("/sapi/v1/capital/deposit/hisrec");
        const withdrawals = await this.fetchTransfers("/sapi/v1/capital/withdraw/history");
        const allTx = [...deposits, ...withdrawals].sort((a, b) => a.insertTime - b.insertTime);
        return allTx.map(t => t.txId);
    }

    /**
     * Helper method to fetch either deposit or withdrawal history.
     * @param endpoint Binance API endpoint.
     * @returns Array of BinanceTransfer.
     */
    private async fetchTransfers(endpoint: string): Promise<BinanceTransfer[]> {
        const data = await this.privateRequest(endpoint);
        return Array.isArray(data) ? data.filter(t => t.status === 1) : [];
    }
}

export function makeBinanceAccountProvider(
    apiKey: string,
    priceProvider: PricesProvider
): TokenizedAccountProvider {
    return new BinanceAccountProvider(apiKey, priceProvider);
}