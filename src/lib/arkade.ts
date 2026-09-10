import {
  ArkAddress,
  InMemoryContractRepository,
  InMemoryWalletRepository,
  MnemonicIdentity,
  RestArkProvider,
  Wallet,
} from "@arkade-os/sdk";

export type PayoutInfo = { address: string; amountSats: number };

export function validatePayoutInfo({ address, amountSats }: PayoutInfo): void {
  if (!Number.isSafeInteger(amountSats) || amountSats <= 0 || amountSats > 2_100_000_000_000_000) {
    throw new Error("Amount (sats) must be a positive whole number within Bitcoin's supply.");
  }
  try {
    const decoded = ArkAddress.decode(address);
    if (!/^(?:ark|tark)1[0-9a-z]+$/.test(address) || decoded.version !== 0) throw new Error();
  } catch {
    throw new Error("Payout destination must be a valid Arkade address.");
  }
}

export async function sendPayout(info: PayoutInfo): Promise<{ txid: string }> {
  validatePayoutInfo(info);
  const mnemonic = process.env.ARKADE_MNEMONIC;
  const serverUrl = process.env.ARKADE_SERVER_URL;
  if (!mnemonic || !serverUrl) throw new Error("ARKADE_MNEMONIC and ARKADE_SERVER_URL are required.");
  const url = new URL(serverUrl);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.username || url.password || (url.protocol !== "https:" && !(local && url.protocol === "http:"))) {
    throw new Error("ARKADE_SERVER_URL must use HTTPS (HTTP is allowed only for local regtest).");
  }

  const provider = new RestArkProvider(serverUrl);
  const server = await provider.getInfo();
  // Mainnet stays disabled until a separately approved, funded testnet proof exists.
  if (!["testnet", "signet", "mutinynet", "regtest"].includes(server.network)) {
    throw new Error("Payouts are restricted to testnet, signet, mutinynet, or regtest.");
  }
  const destination = ArkAddress.decode(info.address);
  const signer = server.signerPubkey.replace(/^(02|03)(?=[0-9a-fA-F]{64}$)/, "");
  if (destination.hrp !== "tark" || Buffer.from(destination.serverPubKey).toString("hex") !== signer.toLowerCase()) {
    throw new Error("Payout destination does not match the configured test network and Arkade server.");
  }
  const identity = MnemonicIdentity.fromMnemonic(mnemonic, { isMainnet: false });
  const wallet = await Wallet.create({
    identity,
    arkServerUrl: serverUrl,
    arkProvider: provider,
    // A short-lived runner has no IndexedDB or persistent HD address counter.
    walletMode: "static",
    storage: {
      walletRepository: new InMemoryWalletRepository(),
      contractRepository: new InMemoryContractRepository(),
    },
    settlementConfig: false,
  });
  try {
    const txid = await wallet.sendBitcoin({ address: info.address, amount: info.amountSats });
    if (!/^[0-9a-fA-F]{64}$/.test(txid)) throw new Error("Arkade returned an invalid transaction ID; reconcile before retrying.");
    return { txid };
  } finally {
    await wallet.dispose();
  }
}
