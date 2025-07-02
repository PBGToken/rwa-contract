import { makeBitcoinWalletProvider } from "../src/BitcoinWalletProvider";
import { makeCoinGeckoProvider } from "../src/CoinGeckoProvider";
import { TEST_DATA } from "./const";

const priceProvider = makeCoinGeckoProvider();

describe("BitcoinWalletProvider", () => {
  const provider = makeBitcoinWalletProvider(TEST_DATA.btcAddress, priceProvider);

  test("should return a valid USD balance", async () => {
    const usd = await provider.balance;
    expect(typeof usd).toBe("number");
    expect(usd).toBeGreaterThanOrEqual(0);
  });

  test("should return an array for transfer history", async () => {
    const transfers = await provider.transferHistory;
    expect(Array.isArray(transfers)).toBe(true);
  });

  test("should calculate USD deposits correctly", async () => {
    const transfers = await provider.transferHistory;
    const deposits = await provider.deposits(transfers);
    expect(typeof deposits).toBe("number");
  });
});
