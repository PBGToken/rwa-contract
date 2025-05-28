import { type TokenizedAccountProvider } from "./TokenizedAccountProvider";
import { CoinGeckoProvider } from "./CoinGeckoProvider";
import { TransferID } from "./TransferID";

/**
 * BitcoinWalletProvider
 *
 * Implements TokenizedAccountProvider for Bitcoin.
 * Supports fetching native BTC balance and its USD value.
 * Uses Blockstream public API for blockchain access and CoinGecko for price data.
 */
export class BitcoinWalletProvider implements TokenizedAccountProvider {
    /**
     * @param walletAddress The Bitcoin wallet address to query.
     */
    constructor(private walletAddress: string) { }

    /**
     * Throws an error because deposits are not implemented.
     * @param _transfers Array of TransferID (unused).
     */
    deposits(_transfers: TransferID[]): Promise<number> {
        throw new Error("Method not implemented.");
    }

    /**
     * Returns the balance of the wallet in BTC.
     */
    get balance(): Promise<number> {
        return this.getBalance();
    }

    /**
     * Returns the transfer history for the wallet.
     * Not implemented, returns an empty array.
     */
    get transferHistory(): Promise<string[]> {
        return Promise.resolve([]);
    };

    /**
     * Fetches the BTC balance for the wallet using Blockstream public API.
     */
    async getBalance(): Promise<number> {
        const url = `https://blockstream.info/api/address/${this.walletAddress}`;
        const res = await fetch(url);
        const data = await res.json();
        const sats = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        return sats / 1e8; // BTC
    }

    /**
     * Fetches the USD value of the wallet's BTC balance using CoinGecko.
     */
    async getUSDValue(): Promise<number> {
        const balance = await this.getBalance();
        const priceProvider = new CoinGeckoProvider("bitcoin");
        const price = await priceProvider.getSpotPrice(null);
        return balance * price;
    }
}