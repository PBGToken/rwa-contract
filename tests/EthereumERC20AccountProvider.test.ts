import { makeEthereumERC20AccountProvider } from "../src/EthereumERC20AccountProvider";
import { makeCoinGeckoProvider } from "../src/CoinGeckoProvider";
import { TEST_DATA } from "./const";

const priceProvider = makeCoinGeckoProvider();

describe("EthereumERC20AccountProvider", () => {
  const provider = makeEthereumERC20AccountProvider(TEST_DATA.ethAddress, priceProvider, TEST_DATA.alchemyApiKey, TEST_DATA.usdtContract);

  test("should return balance as a number", async () => {
    const balance = await provider.balance;
    expect(typeof balance).toBe("number");
  });

  test("should return transfer history as array", async () => {
    const transfers = await provider.transferHistory;
    expect(Array.isArray(transfers)).toBe(true);
  });

  it("should calculate deposits in USD from transfer IDs", async () => {
    const transfers = await provider.transferHistory;
    const depositUsd = await provider.deposits(transfers);
    expect(typeof depositUsd).toBe("number");
  });
});
