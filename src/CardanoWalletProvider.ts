import { addValues, makeTxId, makeValue, type Value, type Address, type ShelleyAddress } from "@helios-lang/ledger"
import { type ExtendedTxInfo, getAssetClassInfo, type BlockfrostV0Client } from "@helios-lang/tx-utils"
import { type PricesProvider } from "./PricesProvider"
import { type TransferID } from "./TransferID"
import { type TokenizedAccountProvider } from "./TokenizedAccountProvider"
import { retryExpBackoff } from "./retryExpBackoff"

/**
 * Constructs a CardanoWallet-specific implementation of TokenizedAccountClient.
 * 
 * @param provider
 * Must be a mainnet provider!
 * TODO: generalize to allow any Cardano provider
 * 
 * @param address
 * Must be a Shelley-era address on mainnet
 * 
 * @param prices
 * A provider for USD/ADA prices etc.
 * 
 * @throws
 * If the `provider` isn't for mainnet.
 * 
 * @throws
 * If the `address` isn't a Shelley-era address.
 * 
 * @returns
 * A CardanoWallet-specific implementation of TokenizedAccountClient.
 */
export function makeCardanoWalletProvider(
    provider: BlockfrostV0Client, 
    address: Address,
    prices: PricesProvider
): TokenizedAccountProvider {
    if (!provider.isMainnet()) {
        throw new Error("not a mainnet Cardano provider")
    }

    if (address.era != "Shelley") {
        throw new Error("not a Shelley era address")
    }

    if (!address.mainnet) {
        throw new Error("not a mainnet Cardano wallet address")
    }

    return new CardanoWalletProviderImpl(provider, address, prices)
}

class CardanoWalletProviderImpl implements TokenizedAccountProvider {
    private readonly provider: BlockfrostV0Client
    private readonly address: ShelleyAddress
    private readonly prices: PricesProvider

    /**
     * @param provider
     * The Cardano client
     * 
     * @param address
     * The mainnet address for which to fetch the balance and transactions.
     * 
     * @param prices
     */
    constructor(
        provider: BlockfrostV0Client,
        address: ShelleyAddress,
        prices: PricesProvider
    ) {
        this.provider = provider
        this.address = address
        this.prices = prices
    }

    /**
     * @returns
     * The USD total value of the Cardano wallet
     */
    get balance(): Promise<number> {
        return (async () => {
            const utxos = await this.provider.getUtxos(this.address)
            const v = addValues(utxos)
    
            const ada = await this.aggregateValue(v)
            const adaPrice = await this.prices.getSpotPrice("ADA", "USD")
    
            return ada * adaPrice
        })()
    }

    /**
     * @returns
     * A list of hex encoded transaction IDs
     */
    get transferHistory(): Promise<TransferID[]> {
        return (async () => {
            const txInfos = await this.provider.getAddressTxs(this.address)

            // earliest first
            txInfos.sort((a, b) => {
                return a.blockTime - b.blockTime
            })
    
            return txInfos.map(txInfo => txInfo.id.toHex())
        })()
    }

    /**
     * @param transfers
     * Sum over the given transfers only
     * 
     * @returns
     * USD value of deposits (positive) and withdrawals (negative)
     */
    async deposits(transfers: TransferID[]): Promise<number> {
        // fetch underlying txs one-by-one
        let txs: ExtendedTxInfo[] = []

        for (let i = 0; i < transfers.length; i++) {
            const id = transfers[i]

            const tx = await retryExpBackoff(
                async () => {
                    return await this.provider.getTxInfo(makeTxId(id))
                },
                {
                    delay: 1000,
                    maxRetries: 3
                }
            )

            txs.push(tx)
        }

        // sum all deposits and withdrawals
        const depositValue = txs.reduce((value, tx) => {
            value = tx.inputs.reduce((v, input) => {
                if (input.address.isEqual(this.address)) {
                    return v.subtract(input.value)
                } else {
                    return v
                }
            }, value)

            value = tx.outputs.reduce((v, output) => {
                if (output.address.isEqual(this.address)) {
                    return v.add(output.value)
                } else {
                    return v
                }
            }, value)

            return value
        }, makeValue(0n))

        return await this.aggregateValue(depositValue)
    }

    /**
     * CNTs are Cardano Native Tokens
     * 
     * @param value
     * Lovelace + CNTs
     *
     * @returns
     * A number of USD
     */
    private async aggregateValue(value: Value): Promise<number> {
        let ada = Number(value.lovelace) / 1_000_000

        for (let ac of value.assets.assetClasses) {
            try {
                // lookup ticker/ADA price
                const { ticker, decimals } = await getAssetClassInfo(
                    this.provider,
                    ac
                )

                try {
                    const tickerPrice = await this.prices.getSpotPrice(
                        ticker,
                        "ADA"
                    )

                    const qty = value.assets.getAssetClassQuantity(ac)

                    ada += (Number(qty) / Math.pow(10, decimals)) * tickerPrice
                } catch (e) {
                    console.error(
                        `${ticker} price not yet available (${(e as Error).message})`
                    )
                }
            } catch (e) {
                console.error(
                    `${ac.toString()} doesn't have CIP26 metadata, ignoring (${(e as Error).message})`
                )
            }
        }

        const adaPrice = await this.prices.getSpotPrice("ADA", "USD")
        return ada * adaPrice
    }
}