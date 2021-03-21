const {getContracts, toWei, timeTravel, MAX_INTEGER} = require("../utils/utils.js")
const BN = web3.utils.BN

const firstProvide  = new BN( '1000000000000000000' )
const secondProvide = new BN( '1000000000000000000' )
const thirdProvide  = new BN( '3000000000000000000' )
const thirdWithdraw = new BN(  '500000000000000005' )
const profit = new BN( '100' )

// const firstProvide = new BN(toWei(Math.random()))
// const secondProvide = new BN(toWei(Math.random()))
// const thirdProvide = new BN(toWei(Math.random()))
 const firstWithdraw = firstProvide
// const profit = new BN(toWei(Math.random())).div(new BN(1000))

module.exports.test = () => contract("ERC20LiqudityPool", ([user1, user2, user3]) => {
  const contracts = getContracts()

  it("Should mint tokens for the first provider correctly", async () => {
    const {ERC20LiquidityPool, WBTC} = await contracts
    await WBTC.mint(firstProvide, {from: user1})
    await WBTC.approve(ERC20LiquidityPool.address, firstProvide, {from: user1})
    await ERC20LiquidityPool.provide(firstProvide, 0, WBTC.address, {from: user1})

    // console.log("firstProvide:",+firstProvide)
    console.log("shareOf:",(await ERC20LiquidityPool.shareOf(user1, WBTC.address)).toString())

    assert.equal(
        (+firstProvide),
        await ERC20LiquidityPool.shareOf(user1, WBTC.address).then(x => x.toString()),
        "Wrong amount"
    )
  })

  it("Should mint tokens for the second provider correctly", async () => {
    const {ERC20LiquidityPool, WBTC} = await contracts
    await WBTC.mint(secondProvide, {from: user2})
    await WBTC.approve(ERC20LiquidityPool.address, secondProvide, {from: user2})
    await ERC20LiquidityPool.provide(secondProvide, 0, WBTC.address, {from: user2})
    // console.log("secondProvide:",+secondProvide)
    // console.log("shareOf:",(await ERC20LiquidityPool.shareOf(user2, WBTC.address)).toString())
    assert.equal(
        (+secondProvide),
        await ERC20LiquidityPool.shareOf(user2, WBTC.address).then(x => x.toString()), 
        "Wrong amount"
    )
  })

  it("Should distribute the profits correctly", async () => {
    const {ERC20LiquidityPool, WBTC} = await contracts

    const [startShare1, startShare2] = await Promise.all([
      ERC20LiquidityPool.shareOf(user1, WBTC.address),
      ERC20LiquidityPool.shareOf(user2, WBTC.address),
    ])

    const expected1 = profit
      .mul(startShare1)
      .div(startShare1.add(startShare2))
      .add(startShare1)
    const expected2 = profit
      .mul(startShare2)
      .div(startShare1.add(startShare2))
      .add(startShare2)

    await WBTC.mint(profit, {from: user3})
    await WBTC.transfer(ERC20LiquidityPool.address, profit, {from: user3})

    const [res1, res2] = await Promise.all([
      ERC20LiquidityPool.shareOf(user1, WBTC.address).then((x) => x.eq(expected1)),
      ERC20LiquidityPool.shareOf(user2, WBTC.address).then((x) => x.eq(expected2)),
    ])
    assert(res1 && res2, "The profits value isn't correct")
  })

  it("Should mint tokens for the third provider correctly", async () => {
    const {ERC20LiquidityPool, WBTC} = await contracts
    const value = thirdProvide
    const [startShare1, startShare2] = await Promise.all([
      ERC20LiquidityPool.shareOf(user1, WBTC.address),
      ERC20LiquidityPool.shareOf(user2, WBTC.address),
    ])

    await WBTC.mint(thirdProvide, {from: user3})
    await WBTC.approve(ERC20LiquidityPool.address, thirdProvide, {from: user3})
    await ERC20LiquidityPool.provide(thirdProvide, 0, WBTC.address, {from: user3})

    assert.isAtLeast(
      await ERC20LiquidityPool.shareOf(user3, WBTC.address).then((x) => x.sub(value).toNumber()),
      -1,
      "The third provider has lost funds"
    )
    assert(
      await ERC20LiquidityPool.shareOf(user1, WBTC.address).then((x) => x.eq(startShare1)),
      "The first provider has an incorrect share"
    )
    assert(
      await ERC20LiquidityPool.shareOf(user2, WBTC.address).then((x) => x.eq(startShare2)),
      "The second provider has an incorrect share"
    )
  })

  it("Should burn the first provider's tokens correctly", async () => {
    const {ERC20LiquidityPool, WBTC, WriterPool} = await contracts
    const value = firstWithdraw
    const startBalance = await WBTC.balanceOf(user1)

    const [startShare1, startShare2, startShare3] = await Promise.all([
      ERC20LiquidityPool.shareOf(user1, WBTC.address),
      ERC20LiquidityPool.shareOf(user2, WBTC.address),
      ERC20LiquidityPool.shareOf(user3, WBTC.address),
    ])

    await timeTravel(14 * 24 * 3600 + 1)
    // await ERC20LiquidityPool.lockupPeriod().then(timeTravel)
    const gasPrice = await web3.eth.getGasPrice().then((x) => new BN(x))
    await WriterPool.setApprovalForAll(ERC20LiquidityPool.address, true, {from: user1}) 
    const logs = await ERC20LiquidityPool.withdraw(value, MAX_INTEGER, WBTC.address, {from: user1})
    const endBalance = await WBTC.balanceOf(user1)
    const balanceDelta = endBalance.sub(startBalance)

    const [share1, share2, share3] = await Promise.all([
      ERC20LiquidityPool.shareOf(user1, WBTC.address),
      ERC20LiquidityPool.shareOf(user2, WBTC.address),
      ERC20LiquidityPool.shareOf(user3, WBTC.address),
    ])
    assert.isAtLeast(
      share2.sub(startShare2).toNumber(),
      -1,
      "The second provider has lost funds"
    )
    assert.isAtLeast(
      share3.sub(startShare3).toNumber(),
      -1,
      "The third provider has lost funds"
    )
    assert(
      balanceDelta.eq(value),
      "The first provider has received an incorrect amount"
    )
    assert.equal(
      share1.add(value).sub(startShare1),
      0,
      "The first provider has an incorrect share"
    )
  })
})
