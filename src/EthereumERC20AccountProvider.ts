import { ethers } from "ethers";
import { PricesProvider } from "./PricesProvider";
import { TokenizedAccountProvider } from "./TokenizedAccountProvider";
import { TransferID } from "./TransferID";

/**
 * EthereumERC20AccountProvider
 *
 * Implements TokenizedAccountProvider for Ethereum mainnet.
 * Supports fetching native ETH or ERC-20 token balances and their USD value.
 * Uses ethers.js for blockchain access and CoinGecko for price data.
 */
class EthereumERC20AccountProvider implements TokenizedAccountProvider {
    /**
     * @param walletAddress The Ethereum wallet address to query.
     * @param priceProvider CoinGecko Price Provider
     * @param alchemyApiKey The Alchemy API key.
     * @param tokenContractAddress The ERC-20 token contract address, or null for native ETH.
     * @param rpcUrl The Ethereum RPC endpoint to use.
     */
    constructor(
        private walletAddress: string,
        private priceProvider: PricesProvider,
        private alchemyApiKey: string,
        private tokenContractAddress: `0x${string}` | null = null,
        private rpcUrl: string = "https://eth.rpc.blxrbdn.com"
    ) { }

    /**
     * Returns the balance of the wallet for the specified token or native ETH.
     */
    get balance(): Promise<number> {
        return this.getBalance();
    };

    /**
     * Returns the USD value of the wallet's balance for the specified token or native ETH.
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
     * Calculates the net USD value of the specified Ethereum transactions.
     * 
     * - For native ETH: uses transaction value directly.
     * - For ERC-20 tokens: extracts transfer amounts from logs (tx.value is always 0).
     * - Adds amounts received by the wallet, subtracts amounts sent.
     * 
     * Converts the net token or ETH amount to USD using the current spot price.
     *
     * @param transfers Array of Ethereum transaction hashes (TransferID[])
     * @returns Net deposit amount in USD.
     */
    async deposits(_transfers: TransferID[]): Promise<number> {
        const provider = new ethers.JsonRpcProvider(this.rpcUrl);
        const lowerWalletAddress = this.walletAddress.toLowerCase();
        let totalAmount = 0;

        const price = this.tokenContractAddress ?
            await this.priceProvider.getSpotPriceByTokenAddress(
                this.tokenContractAddress,
                "ethereum",
                "usd"
            )
            :
            await this.priceProvider.getSpotPrice("ethereum", "usd");

        if (this.tokenContractAddress) {
            const erc20Abi = [
                "function decimals() view returns (uint8)",
                "event Transfer(address indexed from, address indexed to, uint amount)"
            ];
            const contract = new ethers.Contract(this.tokenContractAddress, erc20Abi, provider);
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

                        if (to === lowerWalletAddress) {
                            totalAmount += amount;
                        }
                        if (from === lowerWalletAddress) {
                            totalAmount -= amount;
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

                if (to === lowerWalletAddress) {
                    totalAmount += amount;
                }
                if (from === lowerWalletAddress) {
                    totalAmount -= amount;
                }
            }
        }

        return totalAmount * price;
    }

    /**
     * Fetches the balance for the wallet.
     * If tokenContractAddress is null, returns native ETH balance.
     * Otherwise, returns ERC-20 token balance.
     */
    async getBalance(): Promise<number> {
        const provider = new ethers.JsonRpcProvider(this.rpcUrl);

        // If tokenContractAddress is not provided, treat as native ETH
        if (!this.tokenContractAddress) {
            const balance = await provider.getBalance(this.walletAddress);
            return Number(ethers.formatEther(balance));
        }

        // Otherwise, treat as ERC-20
        const erc20Abi = [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)"
        ];
        const contract = new ethers.Contract(this.tokenContractAddress, erc20Abi, provider);
        const balance = await contract.balanceOf(this.walletAddress);
        const decimals = await contract.decimals();
        return Number(ethers.formatUnits(balance, decimals));
    }

    /**
     * Fetches the USD value of the wallet's balance using CoinGecko.
     * Uses the contract address for ERC-20 tokens, or native ETH if contract address is null.
     */
    async getUSDValue(): Promise<number> {
        const balance = await this.getBalance();
        const price = this.tokenContractAddress ?
            await this.priceProvider.getSpotPriceByTokenAddress(this.tokenContractAddress, "ethereum", "usd")
            :
            await this.priceProvider.getSpotPrice("ethereum", "usd");
        return balance * price;
    }

    /**
     * Fetches the transfer history for the wallet using the Alchemy API.
     * For ERC-20 tokens, filters by contract address and returns only ERC-20 transfers.
     * For native ETH, returns both external and internal transfers.
     * Returns an array of transaction hashes (TransferID[]).
     */
    async getTransferHistory(): Promise<TransferID[]> {
        const url = `https://eth-mainnet.g.alchemy.com/v2/${this.alchemyApiKey}`;
        const body = {
            jsonrpc: "2.0",
            method: "alchemy_getAssetTransfers",
            params: [
                {
                    fromAddress: this.walletAddress,
                    contractAddresses: this.tokenContractAddress ? [this.tokenContractAddress] : undefined,
                    category: this.tokenContractAddress
                        ? ["erc20"]
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

export function makeEthereumERC20AccountProvider(
    walletAddress: string,
    priceProvider: PricesProvider,
    alchemyApiKey: string,
    tokenContractAddress: `0x${string}` | null = null,
    rpcUrl: string = "https://eth.rpc.blxrbdn.com"
): TokenizedAccountProvider {
    return new EthereumERC20AccountProvider(walletAddress, priceProvider, alchemyApiKey, tokenContractAddress, rpcUrl);
}