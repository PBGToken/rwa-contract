export const TEST_DATA = {
    // Ethereum ERC-20
    ethAddress: "0xd31F13827c798d8f457313C2A7bA5f764e4842D8",
    usdtContract: "0xdAC17F958D2ee523a2206206994597C13D831ec7" as `0x${string}`, // USDT contract on Ethereum
    infuraRpc: process.env.INFURA_RPC_URL || "https://1rpc.io/eth",
    alchemyApiKey: process.env.ALCHEMY_API_KEY || "",

    // Binance Smart Chain
    bnbAddress: "0xd31f13827c798d8f457313c2a7ba5f764e4842d8",

    // Bitcoin
    btcAddress: "bc1q8s3h3vw5xufdas890q29lpuca56r0ezqar0mvs",

    // Binance Account API
    binanceApiKey: process.env.BINANCE_API_KEY || "",
}