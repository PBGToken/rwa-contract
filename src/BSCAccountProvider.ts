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
     * @param alchemyApiKey The Alchemy API key.
     * @param tokenContractAddress The BEP-20 token contract address, or null for native BNB.
     * @param rpcUrl The BSC RPC endpoint to use.
     */
    constructor(
        private walletAddress: string,
        private priceProvider: PricesProvider,
        private alchemyApiKey: string,
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
     */
    get transferHistory(): Promise<string[]> {
        return this.getTransferHistory();
    };

    /**
     * Calculates the net USD value of the specified Binance Smart Chain transactions.
     * 
     * - For native BNB: uses transaction value directly.
     * - For BEP-20 tokens: extracts transfer amounts from logs (tx.value is always 0).
     * - Adds amounts received by the wallet, subtracts amounts sent.
     * 
     * Converts the net token or BNB amount to USD using the current spot price.
     *
     * @param transfers Array of Binance Smart Chain transaction hashes (TransferID[])
     * @returns Net deposit amount in USD.
     */
    async deposits(_transfers: TransferID[]): Promise<number> {
        const provider = new ethers.JsonRpcProvider(this.rpcUrl);
        const lowerWalletAddress = this.walletAddress.toLowerCase();
        let usdTotal = 0;

        if (this.tokenContractAddress) {
            const bep20Abi = [
                "function decimals() view returns (uint8)",
                "event Transfer(address indexed from, address indexed to, uint amount)"
            ];
            const contract = new ethers.Contract(this.tokenContractAddress, bep20Abi, provider);
            const decimals = await contract.decimals();

            for (const txHash of _transfers) {
                const receipt = await provider.getTransactionReceipt(txHash);
                if (!receipt) continue;

                for (const log of receipt.logs) {
                    try {
                        const parsed = contract.interface.parseLog(log);
                        if (!parsed || parsed.name !== "Transfer") continue;

                        const [from, to, amountWei] = parsed.args;
                        const amount = Number(ethers.formatUnits(amountWei, decimals));
                        const price = await this.priceProvider.getSpotPriceByTokenAddress(
                            this.tokenContractAddress,
                            "binance-smart-chain",
                            "usd"
                        );

                        if (to === lowerWalletAddress) {
                            usdTotal += amount * price;
                        }
                        if (from === lowerWalletAddress) {
                            usdTotal -= amount * price;
                        }
                    } catch {
                        // ignore non-Transfer logs or decoding errors
                    }
                }
            }
        } else {
            for (const txHash of _transfers) {
                const tx = await provider.getTransaction(txHash);
                if (!tx) continue;

                const from = tx.from.toLowerCase();
                const to = tx.to?.toLowerCase();

                const amount = Number(ethers.formatEther(tx.value));
                const price = await this.priceProvider.getSpotPrice("binancecoin", "usd");

                if (to === lowerWalletAddress) {
                    usdTotal += amount * price;
                }
                if (from === lowerWalletAddress) {
                    usdTotal -= amount * price;
                }
            }
        }

        return usdTotal;
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

    /**
     * Fetches the transfer history for the wallet using the Alchemy API.
     * For BEP-20 tokens, filters by contract address and returns only BEP-20 transfers.
     * For native BNB, returns both external and internal transfers.
     * Returns an array of transaction hashes (TransferID[]).
     */
    async getTransferHistory(): Promise<TransferID[]> {
        const url = `https://bnb-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}}`;
        const body = {
            jsonrpc: "2.0",
            method: "alchemy_getAssetTransfers",
            params: [
                {
                    fromAddress: this.walletAddress,
                    contractAddresses: this.tokenContractAddress ? [this.tokenContractAddress] : undefined,
                    category: this.tokenContractAddress
                        ? ["bep20"]
                        : ["external", "internal"],
                }
            ],
            id: 1,
        };

        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        };

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            const txHashs = data.result.transfers.map((transfer: any) => transfer.hash);
            return txHashs;
        } catch (error) {
            console.error(error);
        }

        return [];
    }
}

export function makeBSCAccountProvider(
    walletAddress: string,
    priceProvider: PricesProvider,
    alchemyApiKey: string,
    tokenContractAddress: `0x${string}` | null = null,
    rpcUrl: string = "https://bsc-dataseed.binance.org/"
): TokenizedAccountProvider {
    return new BSCAccountProvider(walletAddress, priceProvider, alchemyApiKey, tokenContractAddress, rpcUrl);
}