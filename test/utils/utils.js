const ERC20LiquidityPoolContract = artifacts.require("ERC20LiquidityPool")
const WBTCContract = artifacts.require("FakeWBTC")
const WETHContract = artifacts.require("FakeWETH")
// const PriceContract = artifacts.require("FakePriceProvider")
const BTCPriceContract = artifacts.require("FakeBTCPriceProvider")
const ETHPriceContract = artifacts.require("FakeETHPriceProvider")
const WriterPoolContract = artifacts.require("WriterPool")
const ERC20OptionsContract = artifacts.require("ERC20Options")

const BN = web3.utils.BN


const send = (method, params = []) =>
  new Promise((resolve, reject) =>
    web3.currentProvider.send({id: 0, jsonrpc: "2.0", method, params}, (err, x) => {
        if(err) reject(err)
        else resolve(x)
    })
  )
const getContracts = async () => {
  const [
    // PriceProvider,
    BTCPriceProvider, ETHPriceProvider, WBTC, WETH,
    ERC20LiquidityPool, ERC20Options, WriterPool
  ] = await Promise.all([
    // PriceContract.deployed(),
    BTCPriceContract.deployed(),
    ETHPriceContract.deployed(),
    WBTCContract.deployed(),
    WETHContract.deployed(),
    ERC20LiquidityPoolContract.deployed(),
    ERC20OptionsContract.deployed(),
    WriterPoolContract.deployed(),
      ])
  const [ETHPool, WBTCPool] = await Promise.all([
    // ETHOptions.pool.call().then((address) => ETHPoolContract.at(address)),
    // WBTCOptions.pool.call().then((address) => ERC20LiquidityPoolContract.at(address)),
    ERC20Options.lpPools.call().then((address) => ERC20LiquidityPoolContract.at(address))
  ])
  return {
    BTCPriceProvider, ETHPriceProvider, WBTC, WETH,
    ERC20LiquidityPool, ERC20Options, WriterPool
  }
}

const timeTravel = async (seconds) => {
  await send("evm_increaseTime", [seconds])
  await send("evm_mine")
}


const snapshot = () => send("evm_snapshot").then(x => x.result)
const revert = (snap) => send("evm_revert", [snap])

module.exports = {
  getContracts,
  timeTravel,  
  snapshot, revert,
  toWei: (value) => web3.utils.toWei(value.toString(), "ether"),
  MAX_INTEGER: new BN(2).pow(new BN(256)).sub(new BN(1)),
  OptionType: {Put: 1 , Call: 2}
}
