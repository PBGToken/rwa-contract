import { makeBSCAccountProvider } from "../src/BSCAccountProvider";
import { makeCoinGeckoProvider } from "../src/CoinGeckoProvider";
import { TEST_DATA } from "./const";

const priceProvider = makeCoinGeckoProvider();

describe("BSCAccountProvider", () => {
  const provider = makeBSCAccountProvider(TEST_DATA.bnbAddress, priceProvider, TEST_DATA.alchemyApiKey);

  test("should return balance as a number", async () => {
    const balance = await provider.balance;
    expect(typeof balance).toBe("number");
  });

  test("should return transfer history as array", async () => {
    const transfers = await provider.transferHistory;
    expect(Array.isArray(transfers)).toBe(true);
  });

  test("should calculate deposits in USD from transfer IDs", async () => {
    const transfers = await provider.transferHistory;
    const depositUsd = await provider.deposits(transfers);
    expect(typeof depositUsd).toBe("number");
  });
});
