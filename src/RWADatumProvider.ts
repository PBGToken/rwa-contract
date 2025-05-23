import { bytesToHex } from "@helios-lang/codec-utils"
import { StrictType } from "@helios-lang/contract-utils"
import { makeShelleyAddress, makeValidatorHash, MintingPolicyHash, TxInput } from "@helios-lang/ledger"
import { ReadonlyCardanoClient } from "@helios-lang/tx-utils"
import { expectDefined } from "@helios-lang/type-utils"
import { tokenized_account } from "./validators"

const castMetadata = tokenized_account.$types.Metadata
type RWAMetadata = StrictType<typeof castMetadata>

const castDatum = tokenized_account.$types.State
export type RWADatum = StrictType<typeof castDatum>

/**
 * Export the interface, not the class itself.
 * 
 * This approach allows as to add/remove/rename private properties without breaking compatibiliy.
 * This also prevents the use of `instanceof`, which is an evil operator.
 */
export interface RWADatumProvider {
    fetch(policy: MintingPolicyHash): Promise<RWADatum>
}

/**
 * Constructs a RWADatumProvider instance.
 * 
 * @param client
 * The Cardano provider, initialized to the correct network
 * 
 * TODO: generalize to be able to use any Cardano provider
 * 
 * @returns
 * A RWADatumProvider instance.
 */
export function makeRWADatumProvider(provider: ReadonlyCardanoClient): RWADatumProvider {
    return new RWADatumProviderImpl(provider)
}

class RWADatumProviderImpl implements RWADatumProvider {
    private readonly provider: ReadonlyCardanoClient

    constructor(provider: ReadonlyCardanoClient) {
        this.provider = provider
    }

    async fetch(policy: MintingPolicyHash): Promise<RWADatum> {
        const utxo = await this.fetchMetadataUTXO(policy)
        const metadata: RWAMetadata = castMetadata({isMainnet: this.isMainnet}).fromUplcData(expectDefined(utxo.datum?.data, "metadata UTXO doesn't have datum"))

        return metadata.Cip68.state
    }

    private get isMainnet(): boolean {
        return this.provider.isMainnet()
    }

    private async fetchMetadataUTXO(policy: MintingPolicyHash): Promise<TxInput> {
        const vh = makeValidatorHash(policy.bytes)
        const addr = makeShelleyAddress(this.isMainnet, vh)

        let utxos = await this.provider.getUtxos(addr)
        utxos = utxos.filter(utxo => 
            utxo.value.assets.assets.some(([mph, tokens]) => 
                mph.isEqual(policy) && tokens.some(([tokenName, qty]) => 
                    bytesToHex(tokenName.slice(0, 4)) == "000643b0" && qty == 1n
                )
            )
        )

        return expectDefined(utxos[0], "expected 1 metadata UTXO")
    }
}