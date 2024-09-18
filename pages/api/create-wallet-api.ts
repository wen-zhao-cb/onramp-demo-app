import type { NextApiRequest, NextApiResponse } from "next";
import {  fetchWallet } from "./helpers";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const reqBody = JSON.parse(req.body);
  let {wallet}  = await fetchWallet(reqBody.network_id);
  if(wallet != undefined){
    let addresses = await wallet.listAddresses();
    let address = addresses[0].getId();
    console.log(`Address: ${addresses}`);
    console.log(`Address: ${address}`);
    
    // Get the wallet's balance.
    let balance = await wallet.listBalances();
    console.log(`Wallet balance: ${balance.toString()}`);

    return res.json({ wallet_address: addresses[0].getId(), network_id: addresses[0].getNetworkId(), balance: balance.toString()});;
  }
}