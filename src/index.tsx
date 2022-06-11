import * as React from "react";
import { render } from "react-dom";
import WalletConnectQRCodeModal from "@walletconnect/qrcode-modal";
import Web3Provider, { useWeb3Context, Web3Consumer } from "web3-react";
import { ethers, utils } from "ethers";
import { tradeExactTokensForEth, getExecutionDetails } from "@uniswap/sdk";
import Swap from "./swap";
import connectors from "./connectors";
import "./styles.css";
import { TradeDetails } from "@uniswap/sdk/dist/types";

const RINKEBY_FACTORY = "0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36";
const DCA_TOKEN_EXCHANGE = "0xdCfaF198Cfad3B2d7cF8F409021D1f7Df7a81766";
const DCA_TOKEN = "0x39006aae8e8bdb1af52c913060fc43c0430fe606";
const DCA_TOKEN_DECIMAL = 18;

function App() {
  return (
    <>
      <Web3Provider connectors={connectors} libraryName="ethers.js">
        <div className="App">
          <MyComponent />
        </div>
      </Web3Provider>
    </>
  );
}

function MyComponent() {
  const context = useWeb3Context();

  console.log(context);

  if (context.error) {
    console.error("Error!");
  }

  context.library && console.log(context.library._web3Provider);

  if (context.active && context.connectorName === "WalletConnect") {
    if (!context.account) {
      WalletConnectQRCodeModal.open(
        context.connector.walletConnector.uri,
        () => {}
      );
    } else {
      try {
        WalletConnectQRCodeModal.close();
      } catch {}
    }
  }

  const [transactionHash, setTransactionHash] = React.useState(undefined);

  function sendTransaction() {
    const signer = context.library.getSigner();

    signer
      .sendTransaction({
        to: ethers.constants.AddressZero,
        value: ethers.utils.bigNumberify("0")
      })
      .then(({ hash }) => {
        setTransactionHash(hash);
      });
  }

  return (
    <React.Fragment>
      <h1>Yan Sanayi Uniswap</h1>
      <h3>(latest)</h3>

      <Web3ConsumerComponent />

      {context.error && (
        <p>An error occurred, check the console for details.</p>
      )}

      {Object.keys(connectors).map(connectorName => (
        <button
          key={connectorName}
          disabled={context.connectorName === connectorName}
          onClick={() => context.setConnector(connectorName)}
        >
          Activate {connectorName}
        </button>
      ))}

      <br />
      <br />
      {(context.active || (context.error && context.connectorName)) && (
        <button onClick={() => context.unsetConnector()}>
          {context.active ? "Deactivate Connector" : "Reset"}
        </button>
      )}

      {context.active && context.account && !transactionHash && (
        <button onClick={sendTransaction}>Send Dummy Transaction</button>
      )}

      {transactionHash && <p>{transactionHash}</p>}
      <br />
      <br />
      <br />
      {context.active && context.account && <Swap />}
    </React.Fragment>
  );
}

function Web3ConsumerComponent() {
  return (
    <Web3Consumer>
      {context => {
        const { active, connectorName, account, networkId } = context;
        return (
          active && (
            <React.Fragment>
              <p>Active Connector: {connectorName}</p>
              <p>Account: {account || "None"}</p>
              <p>Network ID: {networkId}</p>
            </React.Fragment>
          )
        );
      }}
    </Web3Consumer>
  );
}

const rootElement = document.getElementById("root");
render(<App />, rootElement);
