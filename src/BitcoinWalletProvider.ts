import { type TokenizedAccountProvider } from "./TokenizedAccountProvider";
import { PricesProvider } from "./PricesProvider";
import { TransferID } from "./TransferID";

/**
 * BitcoinWalletProvider
 *
 * Implements TokenizedAccountProvider for Bitcoin.
 * Supports fetching native BTC balance and its USD value.
 * Uses Blockstream public API for blockchain access and CoinGecko for price data.
 */
class BitcoinWalletProvider implements TokenizedAccountProvider {
    /**
     * @param walletAddress The Bitcoin wallet address to query.
     * @param priceProvider CoinGecko Price Provider
     */
    constructor(
        private walletAddress: string,
        private priceProvider: PricesProvider,
    ) { }

    /**
     * Calculates the net USD value of Bitcoin transactions for the given transfer IDs.
     * 
     * - Adds value from outputs (vout) sent **to** the wallet.
     * - Subtracts value from inputs (vin.prevout) **from** the wallet.
     * 
     * Converts net BTC to USD using the current spot price.
     *
     * @param transfers Array of Bitcoin transaction hashes (TransferID[])
     * @returns Net deposit amount in USD.
     */
    async deposits(transfers: TransferID[]): Promise<number> {
        const url = `https://blockstream.info/api/address/${this.walletAddress}/txs`;
        const res = await fetch(url);
        const txs = await res.json();

        const depositTxIDs = new Set(transfers);
        let totalDepositedBTC = 0;

        for (const tx of txs) {
            if (!depositTxIDs.has(tx.txid)) continue;

            for (const vout of tx.vout) {
                if (
                    vout.scriptpubkey_address === this.walletAddress &&
                    typeof vout.value === "number"
                ) {
                    totalDepositedBTC += vout.value / 1e8; // Convert from sats to BTC
                }
            }

            for (const vin of tx.vin) {
                if (
                    vin.prevout?.scriptpubkey_address === this.walletAddress &&
                    typeof vin.prevout.value === "number"
                ) {
                    totalDepositedBTC -= vin.prevout.value / 1e8; // Convert from sats to BTC
                }
            }
        }

        const price = await this.priceProvider.getSpotPrice("bitcoin", "usd");
        return totalDepositedBTC * price;
    }

    /**
     * Returns the balance of the wallet in BTC.
     */
    get balance(): Promise<number> {
        return this.getBalance();
    }

    /**
     * Returns the USD value of the wallet's balance for native BTC.
     */
    get usdBalance(): Promise<number> {
        return this.getUSDValue();
    };

    /**
     * Returns the transfer history for the wallet.
     */
    get transferHistory(): Promise<TransferID[]> {
        return this.getTransferHistory();
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
        const price = await this.priceProvider.getSpotPrice("bitcoin", "usd");
        return balance * price;
    }

    /**
     * Fetches the transfer history for the wallet using Blockstream public API.
     * Returns an array of transaction IDs.
     */
    async getTransferHistory(): Promise<TransferID[]> {
        const url = `https://blockstream.info/api/address/${this.walletAddress}/txs`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const txs = await res.json();
        return txs.map((tx: any) => tx.txid).reverse(); // oldest first
    }
}

export function makeBitcoinWalletProvider(
    walletAddress: string,
    priceProvider: PricesProvider
): TokenizedAccountProvider {
    return new BitcoinWalletProvider(walletAddress, priceProvider);
}