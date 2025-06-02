import { ethers } from "ethers";
import { PricesProvider } from "./PricesProvider";
import { TokenizedAccountProvider } from "./TokenizedAccountProvider";
import { TransferID } from "./TransferID";

/**
 * BSCAccountProvider
 *
 * Implements TokenizedAccountProvider for Binance Smart Chain (BSC).
 * Supports fetching native BNB or BEP-20 token balances and their USD value.
 * Uses ethers.js for blockchain access and CoinGecko for price data.
 */
class BSCAccountProvider implements TokenizedAccountProvider {
    /**
     * @param walletAddress The BSC wallet address to query.
     * @param priceProvider CoinGecko Price Provider
     * @param tokenContractAddress The BEP-20 token contract address, or null for native BNB.
     * @param rpcUrl The BSC RPC endpoint to use.
     */
    constructor(
        private walletAddress: string,
        private priceProvider: PricesProvider,
        private tokenContractAddress: `0x${string}` | null = null,
        private rpcUrl: string = "https://bsc-dataseed.binance.org/"
    ) { }

    /**
     * Returns the balance of the wallet for the specified token or native BNB.
     */
    get balance(): Promise<number> {
        return this.getBalance();
    };

    /**
     * Returns the USD value of the wallet's balance for the specified token or native BNB.
     */
    get usdBalance(): Promise<number> {
        return this.getUSDValue();
    };

    /**
     * Returns the transfer history for the wallet.
     * Not implemented, returns an empty array.
     */
    get transferHistory(): Promise<string[]> {
        return Promise.resolve([]);
    };

    /**
     * Throws an error because deposits are not implemented.
     * @param _transfers Array of TransferID (unused).
     */
    deposits(_transfers: TransferID[]): Promise<number> {
        throw new Error("Method not implemented.");
    }

    /**
     * Fetches the balance for the wallet.
     * If tokenContractAddress is null, returns native BNB balance.
     * Otherwise, returns BEP-20 token balance.
     */
    async getBalance(): Promise<number> {
        const provider = new ethers.JsonRpcProvider(this.rpcUrl);

        // If tokenContractAddress is not provided, treat as native BNB
        if (!this.tokenContractAddress) {
            const balance = await provider.getBalance(this.walletAddress);
            return Number(ethers.formatEther(balance));
        }

        // Otherwise, treat as BEP-20 token
        const bep20Abi = [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];
        const contract = new ethers.Contract(this.tokenContractAddress, bep20Abi, provider);
        const balance = await contract.balanceOf(this.walletAddress);
        const decimals = await contract.decimals();
        return Number(ethers.formatUnits(balance, decimals));
    }

    /**
     * Fetches the USD value of the wallet's balance using CoinGecko.
     * Uses the contract address for BEP-20 tokens, or native BNB if contract address is null.
     */
    async getUSDValue(): Promise<number> {
        const balance = await this.getBalance();
        const price = this.tokenContractAddress ?
            await this.priceProvider.getSpotPriceByTokenAddress(this.tokenContractAddress, "ethereum", "usd")
            :
            await this.priceProvider.getSpotPrice("binancecoin", "usd");
        return balance * price;
    }
}

export function makeBSCAccountProvider(
    walletAddress: string,
    priceProvider: PricesProvider,
    tokenContractAddress: `0x${string}` | null = null,
    rpcUrl: string = "https://bsc-dataseed.binance.org/"
): TokenizedAccountProvider {
    return new BSCAccountProvider(walletAddress, priceProvider, tokenContractAddress, rpcUrl);
}