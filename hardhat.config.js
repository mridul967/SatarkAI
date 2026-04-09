import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";

dotenv.config();

// Only use the private key if it's a real 64-char hex string (not the placeholder)
const privateKey = process.env.PRIVATE_KEY;
const hasValidKey = privateKey && privateKey.length === 66 && privateKey.startsWith("0x") && privateKey !== "0x...";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      chainId: 1337
    },
    amoy: {
      url: process.env.POLYGON_AMOY_RPC || "",
      accounts: hasValidKey ? [privateKey] : []
    }
  }
};
