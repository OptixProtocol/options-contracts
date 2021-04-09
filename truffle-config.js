const HDWalletProvider = require("@truffle/hdwallet-provider")
require('dotenv').config()

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1", // Localhost (default: none)
      port: 7545, // Standard Ethereum port (default: none)
      network_id: "*", // Any network (default: none)'
      gas: 6700000
    },
    develop: {
      port: 8545,
      network_id: 1609822596667,
      accounts: 5,
      defaultEtherBalance: 500,
      blockTime: 3,
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(process.env.MNEMONIC, `https://rinkeby.infura.io/v3/` + process.env.INFURA_ID),
      network_id: 4, // rinkeby's id
      // gas: 7000000,        // Ropsten has a lower block limit than mainnet
      // confirmations: 1,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
      from:"0x1a4037400B5211Dc9881d088252F907B9Ed76169",
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(process.env.MNEMONIC, `https://ropsten.infura.io/v3/` + process.env.INFURA_ID),
      network_id: 3, // Ropsten's id
      // gas: 7000000,        // Ropsten has a lower block limit than mainnet
      // confirmations: 1,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    main: {
      provider: () =>
        new HDWalletProvider(process.env.MNEMONIC, `https://mainnet.infura.io/v3/` + process.env.INFURA_ID),
      network_id: 1, // Mainnet's id
      gasPrice: 33000000000,
      // gas: 7000000,        // Ropsten has a lower block limit than mainnet
      // confirmations: 1,    // # of confs to wait between deployments. (default: 0)
      timeoutBlocks: 200, // # of blocks before a deployment times out  (minimum/default: 50)
      skipDryRun: true, // Skip dry run before migrations? (default: false for public nets )
    },
    binanceTestnet: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://data-seed-prebsc-1-s1.binance.org:8545`),
      network_id: 97,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    binanceMainnet: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://bsc-dataseed1.binance.org`),
      network_id: 56,
      confirmations: 10,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    moonbeamTestnet: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://rpc.testnet.moonbeam.network`),
      network_id: 1287,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    polygonTestnet: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://rpc-mumbai.matic.today`),
      network_id: 80001,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    polygonMainnet: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://rpc-mainnet.matic.network`),
      network_id: 137,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },    
    fantomTestnet: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://rpc.testnet.fantom.network`),
      network_id: 0xfa2,
      confirmations: 2,
      timeoutBlocks: 200,
      skipDryRun: true
    },
    plasmTestnet: {
      provider: () => new HDWalletProvider(process.env.MNEMONIC, `https://rpc.dusty.plasmnet.io:8545`),
      network_id: 80
    },      
  },
  plugins: ["solidity-coverage","truffle-contract-size"],
  
  // Set default mocha options here, use special reporters etc.
  mocha: {slow: 10000},

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.6.12", // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {
        // See the solidity docs for advice about optimization and evmVersion
        optimizer: {enabled: true, runs: 200},
        evmVersion: "istanbul",
      },
    },
  },
}
