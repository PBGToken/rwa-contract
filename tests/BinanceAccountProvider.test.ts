import { makeBinanceAccountProvider } from "../src/BinanceAccountProvider";
import { makeCoinGeckoProvider } from "../src/CoinGeckoProvider";
import { TEST_DATA } from "./const";

const priceProvider = makeCoinGeckoProvider();

describe("BinanceAccountProvider", () => {
  const provider = makeBinanceAccountProvider(TEST_DATA.binanceApiKey, priceProvider);

  test("should return a USD balance", async () => {
    const usdBalance = await provider.balance;
    expect(typeof usdBalance).toBe("number");
    expect(usdBalance).toBeGreaterThanOrEqual(0);
  });

  test("should return an array of transfer history", async () => {
    const transfers = await provider.transferHistory;
    expect(Array.isArray(transfers)).toBe(true);
  });

  test("should calculate deposits in USD from transfer IDs", async () => {
    const transfers = await provider.transferHistory;
    const depositUsd = await provider.deposits(transfers);
    expect(typeof depositUsd).toBe("number");
  });
});
