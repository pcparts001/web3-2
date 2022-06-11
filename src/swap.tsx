import * as React from "react";
import { useEffect, useState } from "react";
import { render } from "react-dom";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";
import Web3Provider, { useWeb3Context, Web3Consumer } from "web3-react";
import { ethers, utils } from "ethers";
import {
  tradeExactTokensForEth,
  getExecutionDetails,
  BigNumber,
  getTokenReserves,
  getMarketDetails,
  getTradeDetails,
  TRADE_EXACT
} from "@uniswap/sdk";

import "./styles.css";
import { TradeDetails } from "@uniswap/sdk/dist/types";
// import {  } from "ethers";
import ExchangeABI from "./contracts/uniswapExchangeABI";
import TOKENS from "./helpers/tokens";
import { getBalance, getContract } from "./helpers/utils";

const RINKEBY_FACTORY = "0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36";
const DCA_TOKEN_EXCHANGE = "0xdCfaF198Cfad3B2d7cF8F409021D1f7Df7a81766";
const DCA_TOKEN = "0x39006aae8e8bdb1af52c913060fc43c0430fe606";
const DCA_TOKEN_DECIMAL = 18;

const ETH_TOKEN = undefined;

const ETH_TO_TOKEN = 0;
const TOKEN_TO_ETH = 1;
const TOKEN_TO_TOKEN = 2;

const FIXED_DECIMAL_FORMAT = 6;

const CHAIN_ID = 4;

export default function SwapComponent() {
  const [tokenBalance, setTokenBalance] = useState(undefined);

  const [inputAmount, setInputAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("");

  const [marketDetails, setMarketDetails] = useState(undefined);

  const [tradeDetails, setTradeDetails] = useState(undefined);
  // const [executionDetails, setExecutionDetails] = useState(undefined);
  const [transactionHash, setTransactionHash] = useState(undefined);

  const [inputToken, setInputToken] = useState(TOKENS.ETH);
  const [outputToken, setOutputToken] = useState(TOKENS.DCA);

  const [inputBalance, setInputBalance] = useState("0");
  const [outputBalance, setOutputBalance] = useState("0");

  const [loadingMarket, setLoadingMarket] = useState(true);

  function invertTokens() {
    const i = inputToken;
    setInputToken(outputToken);
    setOutputToken(i);
  }
  async function updateMarketDetails() {
    const swapType = getSwapType(inputToken.symbol, outputToken.symbol);

    const md = await fetchMarketDetails(
      inputToken.address,
      outputToken.address,
      swapType
    );
    console.log(md);

    await updateBalances();

    setMarketDetails(md);
    setLoadingMarket(false);

    // const bal = await getBalance("ETH", context);
    // console.log(bal);
  }

  async function updateBalances() {
    const ib = await getBalance(inputToken.symbol, context);
    console.log(ib);

    const ob = await getBalance(outputToken.symbol, context);
    console.log(ob);

    const formattedIb = utils.formatUnits(ib, inputToken.decimals);
    const formattedOb = utils.formatUnits(ob, outputToken.decimals);
    console.log(formattedOb);
    setInputBalance(formattedIb);
    setOutputBalance(formattedOb);
  }

  useEffect(() => {
    updateMarketDetails();
  }, [inputToken, outputToken]);

  const context = useWeb3Context();
  console.log("Context: ", context);

  // async function handleSubmit(e) {
  //   e.preventDefault();
  //   console.log(e);

  //   const inputAmountBN = utils.parseUnits(inputAmount, DCA_TOKEN_DECIMAL);
  //   // const amount2BN = utils.parseEther(amount2);

  //   console.log(inputAmountBN);
  //   // console.log(amount2BN);

  //   let tradeDetails = await tradeExactTokensForEth(
  //     DCA_TOKEN,
  //     inputAmountBN,
  //     CHAIN_ID
  //   );
  //   console.log(tradeDetails);

  //   let a = formatBN(tradeDetails.executionRate.rate, 18);
  //   console.log(a);

  //   setSwapDetails(tradeDetails);

  //   const ex = await getExecutionDetails(tradeDetails);
  //   console.log(ex);
  //   setExecutionDetails(ex);
  // }

  function handleInputChange(newInput: string) {
    console.log("handling input change to: ", newInput);
    if (newInput === "") {
      setTradeDetails(undefined);
      setInputAmount(newInput);
      setOutputAmount(newInput);
      return;
    }
    setInputAmount(newInput);

    const purchaseAmount = parseStringToBN(newInput, inputToken.decimals);
    const td = getTradeDetails(
      TRADE_EXACT.INPUT,
      purchaseAmount,
      marketDetails
    );
    console.log(td);

    const outputString = formatBN(
      td.outputAmount.amount,
      outputToken.decimals,
      FIXED_DECIMAL_FORMAT
    );

    setTradeDetails(td);

    // prints undefined (doesnt set tradeDetails) on initial call for some reason
    console.log(tradeDetails);

    setOutputAmount(outputString);
  }

  function handleOutputChange(newOutput) {
    console.log("handling output change to: ", newOutput);
    if (newOutput === "") {
      setTradeDetails(undefined);
      setInputAmount(newOutput);
      setOutputAmount(newOutput);
      return;
    }
    setOutputAmount(newOutput);

    const purchaseAmount = parseStringToBN(newOutput, inputToken.decimals);
    const td = getTradeDetails(
      TRADE_EXACT.OUTPUT,
      purchaseAmount,
      marketDetails
    );
    console.log(td);

    const inputString = formatBN(
      td.inputAmount.amount,
      inputToken.decimals,
      FIXED_DECIMAL_FORMAT
    );

    setTradeDetails(td);

    // prints undefined (doesnt set tradeDetails) on initial call for some reason
    console.log(tradeDetails);

    setInputAmount(inputString);
  }

  async function handleSwap() {
    if (!tradeDetails) {
      throw new Error("Trade details not available");
    }
    const executionDetails = await getExecutionDetails(tradeDetails);

    console.log("Execution details: ", executionDetails);
    const exchange = getContract(
      executionDetails.exchangeAddress,
      ExchangeABI.abi,
      context.library
    );
    console.log(exchange);
    // const symbol = await exchange.decimals();
    // console.log(symbol);

    const method = exchange[executionDetails.methodName];
    console.log(method);
    const args = executionDetails.methodArguments.map(e => {
      if (e instanceof BigNumber) {
        return e.toFixed(0);
      } else {
        return e;
      }
    });
    console.log(args);
    console.log("Contextttt: ", context);

    const tx = await method(...args, {
      value: "0x" + executionDetails.value.toString(16),
      gasLimit: 70000
    });
    console.log(tx);
    setTransactionHash(tx.hash);
    await tx.wait();
    console.log("tx mined");
  }

  return (
    <React.Fragment>
      {tokenBalance && <p>Token Balance: {inputBalance}</p>}
      {loadingMarket && <p>Loading market...</p>}
      {marketDetails && (
        <div className="swapContainer">
          <label>
            Token Swap: {inputToken.symbol} -> {outputToken.symbol}
          </label>
          <FancyInput
            title="Input"
            value={inputAmount}
            setValue={handleInputChange}
            balance={inputBalance}
          />
          <FancyInput
            title="Output"
            value={outputAmount}
            setValue={handleOutputChange}
            balance={outputBalance}
          />

          {/* <label>Eth Amount:</label>
        <input
          type="text"
          value={amount2}
          onChange={e => setAmount2(e.target.value)}
        /> */}
          {/* <button onClick={e => handleSubmit(e)}>Get Price</button> */}
          {tradeDetails ? (
            <p>
              1 {inputToken.symbol} ={" "}
              {tradeDetails.executionRate.rate.toFixed(FIXED_DECIMAL_FORMAT)}{" "}
              {outputToken.symbol}
            </p>
          ) : (
            // <p>
            //   1 {inputToken.symbol} ={" "}
            //   {formatBN(marketDetails.marketRate.rate, 18)} {outputToken.symbol}
            // </p>
            <p>
              1 {inputToken.symbol} ={" "}
              {marketDetails.marketRate.rate.toFixed(FIXED_DECIMAL_FORMAT)}{" "}
              {outputToken.symbol}
            </p>
          )}

          {/* <p>Rate: {formatBN(marketDetails.marketRate.rate, 18)} ETH/Token</p> */}
        </div>
      )}

      {/* {swapDetails && (
        <React.Fragment>
          <p>Rate: {formatBN(swapDetails.executionRate.rate, 18)} ETH/Token</p>
          <p>Output: {formatBN(swapDetails.outputAmount.amount, 18)} ETH</p>
        </React.Fragment>
      )} */}

      <button className="swapButton" onClick={() => handleSwap()}>
        Swap!
      </button>
      {transactionHash && (
        <React.Fragment>
          <p>{transactionHash}</p>

          <p>
            <a href={`https://rinkeby.etherscan.io/tx/${transactionHash}`}>
              View on Etherscan
            </a>
          </p>
        </React.Fragment>
      )}

      {/* <iframe
        title="uniswap"
        src="https://uniswap.exchange/swap?outputCurrency=0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359"
        height="660px"
        width="100%"
        id="myId"
      /> */}
    </React.Fragment>
  );
}

function getSwapType(inputCurrency: string, outputCurrency: string) {
  if (!inputCurrency || !outputCurrency) {
    return null;
  } else if (inputCurrency === "ETH") {
    return ETH_TO_TOKEN;
  } else if (outputCurrency === "ETH") {
    return TOKEN_TO_ETH;
  } else {
    return TOKEN_TO_TOKEN;
  }
}

async function fetchMarketDetails(
  inputTokenAddress: string,
  outputTokenAddress: string,
  swapType: number | null
) {
  var inputReserve;
  var outputReserve;
  switch (swapType) {
    case ETH_TO_TOKEN: {
      inputReserve = undefined;
      outputReserve = await getTokenReserves(outputTokenAddress, CHAIN_ID);
      break;
    }
    case TOKEN_TO_ETH: {
      inputReserve = await getTokenReserves(inputTokenAddress, CHAIN_ID);
      outputReserve = undefined;
      break;
    }
    case TOKEN_TO_TOKEN: {
      inputReserve = await getTokenReserves(inputTokenAddress, CHAIN_ID);
      outputReserve = await getTokenReserves(outputTokenAddress, CHAIN_ID);
      break;
    }
    default:
      throw new Error("Unsupported swap type");
  }
  return getMarketDetails(inputReserve, outputReserve);
}

function formatBN(amount: BigNumber, decimals: number, fixed?: number) {
  // let amountBN = utils.bigNumberify(amount.toString());
  // console.log("here", amount);
  let shifted = amount.shiftedBy(-1 * decimals);

  return fixed ? shifted.toFixed(fixed).toString() : shifted.toString();
}

function parseStringToBN(amountString: string, decimals: number) {
  const _purchaseAmount: BigNumber = new BigNumber(amountString);
  return _purchaseAmount.multipliedBy(10 ** decimals);
}

function FancyInput(props) {
  return (
    <div className="inputBox">
      <div className="inputTopBar">
        <div className="inputLabel">
          <span>{props.title}</span>
          <span />
        </div>

        <span className="inputBalance">
          <span>Balance: {props.balance}</span>
        </span>
      </div>
      <div className="inputBottom">
        <input
          className="inputNumber"
          name="inputAmountInput"
          type="number"
          min="0"
          step="0.000000000000000001"
          placeholder="0.0"
          value={props.value}
          onChange={e => props.setValue(e.target.value)}
          onKeyPress={e => {
            const charCode = e.which ? e.which : e.keyCode;

            // Prevent 'minus' character
            if (charCode === 45) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        />
      </div>
    </div>
  );
}
