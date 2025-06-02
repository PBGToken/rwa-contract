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
     * @param tokenContractAddress The ERC-20 token contract address, or null for native ETH.
     * @param rpcUrl The Ethereum RPC endpoint to use.
     */
    constructor(
        private walletAddress: string,
        private priceProvider: PricesProvider,
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
}

export function makeEthereumERC20AccountProvider(
    walletAddress: string,
    priceProvider: PricesProvider,
    tokenContractAddress: `0x${string}` | null = null,
    rpcUrl: string = "https://eth.rpc.blxrbdn.com"
): TokenizedAccountProvider {
    return new EthereumERC20AccountProvider(walletAddress, priceProvider, tokenContractAddress, rpcUrl);
}