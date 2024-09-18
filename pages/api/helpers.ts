import { SignOptions, sign } from "jsonwebtoken";
import crypto from "crypto";
import { NextApiResponse } from "next";
import fs from 'fs';
import { Coinbase, Wallet,CoinbaseOptions } from "@coinbase/coinbase-sdk";

export type createRequestParams = {
  request_method: "GET" | "POST";
  request_path: string;
};

export async function fetchApiCredentials() {
  const key = await import("../../api_keys/cdp_api_key.json");
  const key_name = key.name;
  const key_secret = key.privateKey;

  return { key_name, key_secret};
}

export async function createRequest({
  request_method,
  request_path,
}: createRequestParams) {
  const {key_name, key_secret}  = await fetchApiCredentials()
  const host = "api.developer.coinbase.com";

  const url = `https://${host}${request_path}`;
  const uri = `${request_method} ${host}${request_path}`;

  const payload = {
    iss: "coinbase-cloud",
    nbf: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120,
    sub: key_name,
    uri,
  };

  const signOptions: SignOptions = {
    algorithm: "ES256",
    header: {
      kid: key_name,
      nonce: crypto.randomBytes(16).toString("hex"), // non-standard, coinbase-specific header that is necessary
    },
  };

  const jwt = sign(payload, key_secret, signOptions);

  return { url, jwt };
}

type fetchOnrampRequestParams = {
  request_method: "GET" | "POST";
  url: string;
  jwt: string;
  body?: string;
  res: NextApiResponse;
};

export async function fetchOnrampRequest({
  request_method,
  url,
  jwt,
  body,
  res,
}: fetchOnrampRequestParams) {
  await fetch(url, {
    method: request_method,
    body: body,
    headers: { Authorization: "Bearer " + jwt },
  })
    .then((response) => {
      return response.json();
    })
    .then((json) => {
      if (json.message) {
        console.error("Error:", json.message);
        res.status(500).json({ error: json.message });
      } else {
        res.status(200).json(json);
      }
    })
    .catch((error) => {
      console.log("Caught error: ", error);
      res.status(500);
    });
}

export async function fetchWallet(network_id: string) {
  const {key_name, key_secret} = await fetchApiCredentials();
  const coinbaseOptions: CoinbaseOptions = {
    apiKeyName: key_name,
    privateKey: key_secret,
  };
  const coinbase = new Coinbase(coinbaseOptions);
  const seedFilePath = "wallet_seed/"+network_id+".json";
  var wallet;
  if(!fs.existsSync(seedFilePath)){
    console.log("create Wallet");
    // Create your first wallet, default wallets created if for Base Sepolia
    let wallet = await Wallet.create({ networkId: network_id });

    // Set encrypt to true to encrypt the wallet seed with your CDP API key.
    wallet.saveSeed(seedFilePath, true);
    console.log(`Seed for wallet ${wallet.getId()} successfully saved to ${seedFilePath}.`);

    // Fund your wallet with ETH using a faucet.
    // if (networkId == Coinbase.networks.BaseSepolia){
    //   let faucetEthTransaction = await wallet.faucet();
    //   console.log(`Faucet transaction: ${faucetEthTransaction}`);
    // }
   
  }else {
    console.log("load Wallet");
    var fetchedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf8'));
    for(var wallet_id in fetchedData){
      console.log(`load Wallet ${wallet_id}`);
      wallet = await Wallet.fetch(wallet_id);
      wallet.loadSeed(seedFilePath);
      break;
    }
  }
  return {wallet}
}