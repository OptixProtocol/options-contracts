const {getContracts, toWei, OptionType} = require("../utils/utils.js")
const BN = web3.utils.BN


const pricePoints = [60, 70, 80, 90, 100, 110, 120, 130, 140]


module.exports = {  
  testCallPrices(marketId, contracts) {
    for (let i = 0; i < pricePoints.length - 1; i++)
      it(
        `Should have a price for ${pricePoints[i]}% strike ` +
          `greater than the price for ${pricePoints[i + 1]}% strike`,
        async () => {
          const [ERC20Options, PriceProvider] = await contracts
          const amount = new BN(toWei(Math.random() * 10))
          // Random period from 1 to 56 days
          const period = new BN(24 * 3600 * parseInt(1 + Math.random() * 55))
          const currentPrice = await PriceProvider.latestAnswer()
          const firstPrice = currentPrice
            .mul(new BN(pricePoints[i]))
            .div(new BN(100))
          const secondPrice = currentPrice
            .mul(new BN(pricePoints[i + 1]))
            .div(new BN(100))
          
          // console.log("amount:",amount.toString());
          // console.log("period:",period.toString());
          // console.log("firstPrice:", firstPrice.toString());
          // console.log("secondPrice:",secondPrice.toString());
          // console.log("poolId:", poolId.toString());
          
          const [first, second] = await Promise.all([
            ERC20Options.fees(amount, period, firstPrice, OptionType.Call, marketId).then((x) => x.total),
            ERC20Options.fees(amount, period, secondPrice, OptionType.Call, marketId).then((x) => x.total),
          ])
          assert(+first>second)
        }
      )
  },
  testPutPrices(marketId, contracts) {
    for (let i = 0; i < pricePoints.length - 1; i++)
      it(
        `Should have a price for ${pricePoints[i]}% strike ` +
          `lower than the price for ${pricePoints[i + 1]}% strike`,
        async () => {
          const [ERC20Options, PriceProvider] = await contracts
          const amount = new BN(toWei(Math.random() * 10))
          // Random period from 1 to 56 days
          const period = new BN(24 * 3600 * parseInt(1 + Math.random() * 55))
          const currentPrice = await PriceProvider.latestAnswer()
          const firstPrice = currentPrice
            .mul(new BN(pricePoints[i]))
            .div(new BN(100))
          const secondPrice = currentPrice
            .mul(new BN(pricePoints[i + 1]))
            .div(new BN(100))
          const [first, second] = await Promise.all([
            ERC20Options.fees(amount, period, firstPrice, OptionType.Put, marketId).then((x) => x.total),
            ERC20Options.fees(amount, period, secondPrice, OptionType.Put, marketId).then((x) => x.total),
          ]);

          assert(+first<+second);
        }
      )
  },
  async testProportions(user1, marketId, contracts) {
    // console.log("3gg");
    // const balance = 100000
    const put = [60, 70, 80]
    // const call = [60, 70, 80]

    const { ETHPriceProvider, ERC20LiquidityPool, WETH } = await contracts
    const value = toWei(100000)
    // console.log("WETH:", WETH)
    // console.log("user1:", user1)
    
    // await WETH.mintTo(user1, value)
    // await WETH.approve(ERC20LiquidityPool.address, value, { from: user4 })
    // await ERC20LiquidityPool.provide(value, 0, WETH.address, { from: user4, gas: 1000000 })


    for (let i = 0; i < put.length; i++) {
      const createEvent = await ERC20Options.create3(_period, _amount, _strike, _type, marketId, [], {
            // value,
            from,
      })
      // console.log("asdf:",i);
      // it(
      //   `Proportion of ${put[i]}% + ${call[i]}% should equal (Put+Call)/Balance `,         
      //   async () => {
      //   }
      // )
    }

  },
}
