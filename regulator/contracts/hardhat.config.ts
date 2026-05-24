import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    fisco_local: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    polygon_mumbai: {
      url: "https://rpc-mumbai.maticvigil.com",
      chainId: 80001,
    },
  },
};

export default config;
