import erc20ABI from "../contracts/erc20ABI";
import TOKENS from "./tokens";
import { ethers, utils } from "ethers";

import etherscan from "etherscan-api";

const etherscanAPI = etherscan.init(
  "JSY8UN7HFGC4PTKMGG86MTA336WS7GECQ6",
  "rinkeby",
  3000
);

// export async function getBalance(tokenSymbol: string, context) {
//   if (tokenSymbol === "ETH") {
//     const bal = await context.library.getBalance(context.account);
//     // console.log(bal.toString());
//     return bal;
//   } else {
//     const token = TOKENS[tokenSymbol];
//     if (!token) {
//       throw new Error("Token not supported");
//     }
//     const contract = getContract(token.address, erc20ABI.abi, context.library);
//     console.log(contract);

//     const bal = await contract.balanceOf(context.account);
//     console.log(bal);
//     return bal;
//   }
// }

export async function getBalance(tokenSymbol: string, context) {
  if (tokenSymbol === "ETH") {
    var balance = await etherscanAPI.account.balance(context.account);
    if (balance.status !== "1") {
      throw new Error("Etherscan: Unable to fetch balance");
    }

    console.log("Balance: ", balance);
    return utils.parseUnits(balance.result, "wei");
  } else {
    const token = TOKENS[tokenSymbol];
    if (!token) {
      throw new Error("Token not supported");
    }

    const balance = await etherscanAPI.account.tokenbalance(
      context.account,
      "",
      token.address.toLowerCase()
    );
    console.log(balance);
    if (balance.status !== "1") {
      throw new Error("Etherscan: Unable to fetch balance");
    }
    return utils.parseUnits(balance.result, 0);
  }
}

export function getContract(address, ABI, library) {
  if (!isAddress(address) || address === ethers.constants.AddressZero) {
    throw Error(`Invalid 'address' parameter '${address}'.`);
  }

  return new ethers.Contract(address, ABI, library.getSigner());
}

export function isAddress(value) {
  try {
    return ethers.utils.getAddress(value.toLowerCase());
  } catch {
    return false;
  }
}
