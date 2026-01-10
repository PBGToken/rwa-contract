import { Schema } from "effect"
import { Ledger, Uplc } from "@helios-lang/effect"

export const WrappedAssetMetadata = Uplc.Data.EnumVariant(0, {
    state: Uplc.Data.StructFromMap({
        supply: Uplc.Data.BigInt,
        type: Uplc.Data.LiteralString("WrappedAsset"),
        venue: Uplc.Data.String,
        policy: Uplc.Data.String,
        account: Uplc.Data.String,
        ticker: Uplc.Data.String,
        name: Uplc.Data.String,
        description: Uplc.Data.String,
        decimals: Uplc.Data.Int,
        url: Uplc.Data.String,
        logo: Uplc.Data.String,
        quorum: Uplc.Data.Int,
        oracles: Uplc.Data.Array(Ledger.PubKeyHash.FromUplcData),
        seed: Ledger.TxOutputId.FromUplcData
    }),
    version: Uplc.Data.Int,
    extra: Uplc.Data.EnumVariant(0, {})
})

export const SelfReportedAssetMetadata = Uplc.Data.EnumVariant(0, {
    state: Uplc.Data.StructFromMap({
        supply: Uplc.Data.BigInt,
        type: Uplc.Data.LiteralString("SelfReportedAsset"),
        asset: Uplc.Data.String,
        ticker: Uplc.Data.String,
        name: Uplc.Data.String,
        description: Uplc.Data.String,
        decimals: Uplc.Data.Int,
        url: Uplc.Data.String,
        logo: Uplc.Data.String,
        owner: Ledger.PubKeyHash.FromUplcData,
        seed: Ledger.TxOutputId.FromUplcData
    }),
    version: Uplc.Data.Int,
    extra: Uplc.Data.EnumVariant(0, {})
})

export const CorporateBondV1Metadata = Uplc.Data.EnumVariant(0, {
    state: Uplc.Data.StructFromMap({
        type: Uplc.Data.LiteralString("CorporateBondV1"),
        company: Uplc.Data.String,
        asset: Ledger.AssetClass.FromUplcData,
        principal: Uplc.Data.BigInt,
        rate: Uplc.Data.Int,
        start: Uplc.Data.Int,
        duration: Uplc.Data.Int,
        interval: Uplc.Data.Int,
        ticker: Uplc.Data.String,
        name: Uplc.Data.String,
        description: Uplc.Data.String,
        decimals: Uplc.Data.Int,
        url: Uplc.Data.String,
        logo: Uplc.Data.String,
        seed: Ledger.TxOutputId.FromUplcData
    }),
    version: Uplc.Data.Int,
    extra: Uplc.Data.EnumVariant(0, {})
})

export const RWAMetadata = Schema.Union(
    WrappedAssetMetadata,
    SelfReportedAssetMetadata,
    CorporateBondV1Metadata
)
