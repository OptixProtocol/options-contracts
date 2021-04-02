const {getContracts, timeTravel, toWei, OptionType} = require("../utils/utils.js")
const {testCallPrices, testPutPrices, testProportions} = require("./Prices.js")
const toBN = web3.utils.toBN
const toBTC = x => toBN(toWei(x)).div(toBN(1e10))
const centsToGwei = (x) => x * 100 * 1e6;
const priceTestPoints = [0, 50, 75, 95, 100, 105, 125, 150, 200]

module.exports.test = () => contract("ERC20Options WBTC(call)", ([user1, user2, user3, user4]) => {

  const marketId = 0;

  before(async () => {  
    const { WBTC, ERC20Options, ERC20LiquidityPool } = await contracts
    var lots = "99999999999999999999999";
    await WBTC.mintTo(user1, lots)
    await WBTC.approve(ERC20Options.address, lots, { from: user1 })
    await WBTC.approve(ERC20LiquidityPool.address, lots, { from: user1 })
    await WBTC.mintTo(user2, lots)
    await WBTC.approve(ERC20Options.address, lots, { from: user2 })
    await WBTC.approve(ERC20LiquidityPool.address, lots, { from: user2 })
    await WBTC.mintTo(user3, lots)
    await WBTC.approve(ERC20Options.address, lots, { from: user3 })
    await WBTC.approve(ERC20LiquidityPool.address, lots, { from: user3 })
    await WBTC.mintTo(user4, lots)
    await WBTC.approve(ERC20Options.address, lots, { from: user4 })
    await WBTC.approve(ERC20LiquidityPool.address, lots, { from: user4 })

    await provideFunds();
  })

  const contracts = getContracts()
  const pricesBuf = []
  async function createOption({period, amount, strike, user} = {}) {
    const {ERC20Options, BTCPriceProvider, } = await contracts
    const price =  await BTCPriceProvider.latestAnswer()
    const [_period, _optionSize, _strike, from] = [
      toBN(24 * 3600 * (period || 1)),
      toBN(amount || toBTC(0.001)),
      toBN(strike || price),
      user || user1,
    ]
    const _type = OptionType.Call
    // console.log("_period",_period);
    // console.log("_optionSize",_optionSize);
    // console.log("_strike", _strike.toString());
    // console.log("price",price.toString());
    // console.log("_type",_type);
    const wtf = await ERC20Options.premium(
      _period,
      _optionSize,
      _strike,
      _type,
      marketId
    ).then((x) => [x.totalETH, x.protocolFee])
    // console.log("_period:" +_period);
    // console.log("_optionSize:" +_optionSize);
    // console.log("_strike:" +_strike);
    // console.log("_type:" + _type);
    // console.log("marketId:" + marketId);
    // // console.log("value:" + value);
    // console.log("from:" + from);

    // console.log("wtf:", wtf);
 
    const createEvent = await ERC20Options.create3(_period, _optionSize, _strike, _type, marketId, {
              // value,
              from,
        })
        .then((x) => x.logs.find((x) => x.event == "Create"))
        .then((x) => (x ? x.args : null))

 

    assert.isNotNull(createEvent, "'Create' event has not been initialized")
    assert.equal(createEvent.account, from, "Wrong account")
    // assert(value.eq(createEvent.totalFee), "Wrong premium value")
    // assert(
    //   toBN(protocolFee).eq(createEvent.protocolFee),
    //   "Wrong protocolFee value"
    // )
    // assert(
    //   _amount.div(toBN(100)).eq(createEvent.protocolFee),
    //   "Wrong protocolFee value"
    // )
    return createEvent
  }

  async function testOption(params = {}) {
    const {ERC20Options, BTCPriceProvider} = await contracts
    const backupPrice = await BTCPriceProvider.latestAnswer()

    const period = params.period || 1
    const amount = toBN(params.amount || toBTC(1))
    const user = params.user || user1
    const createPrice = toBN(params.createPrice || backupPrice)
    const strike = toBN(params.strike || createPrice)
    const exercisePrice = toBN(params.exercisePrice || createPrice)

    await BTCPriceProvider.setPrice(createPrice)
    const {id, totalFee} = await createOption({period, amount, user, strike})
    await BTCPriceProvider.setPrice(exercisePrice)

    let result

    if (exercisePrice.lt(strike)) {
      await ERC20Options.exercise(id).then(
        () => assert.fail("Exercising a call option should be canceled"),
        (x) => {
          assert.equal(
            x.reason,
            "Current price is too low",
            "Wrong error reason"
          )
          result = "rejected"
        }
      )
    } else {
      const expectedProfit = amount
        .mul(exercisePrice.sub(strike))
        .div(exercisePrice)
      const startBalance = await web3.eth.getBalance(user1)
      const {profit} = await ERC20Options.exercise(id).then(
        (x) => x.logs.find((x) => x.event == "Exercise").args
      )
      const endBalance = await web3.eth.getBalance(user1)
      assert(amount.gt(expectedProfit), "too large expected profit")
      assert.equal(
        profit.toString(),
        expectedProfit.toString(),
        "wrong profit amount"
      )
      // assert.equal(
      //     endBalance.sub(startBalance).toString(),
      //     expectedProfit.toString(),
      //     "wrong profit amount",
      // )
      result = profit / 1e18
    }
    pricesBuf.push({
      period,
      amount: amount / 1e18,
      createPrice: createPrice / 1e8,
      strike: strike / 1e8,
      exercisePrice: exercisePrice / 1e8,
      totalFee: totalFee / 1e18,
      profit: result,
      profitSF: result - totalFee / 1e18,
    })

    await BTCPriceProvider.setPrice(backupPrice)
  }

  describe('Test fees', async () => {
    // console.log("asdfasf")
    it("Proportion", async () => {
      const { ERC20Options, ERC20LiquidityPool, WETH, ETHPriceProvider } = await contracts
      const put = [60, 70, 80]
      const mintValue = toWei(100000000000000000)
      const provideValue = toWei(10000)
      await WETH.mintTo(user1, mintValue)
      await WETH.approve(ERC20LiquidityPool.address, mintValue, { from: user1 })
      await ERC20LiquidityPool.provide(provideValue, 0, WETH.address, { from: user1, gas: 1000000 })

      let _period = 24 * 3600 * 1;
      let _amount = "1";
      let _strike = await ETHPriceProvider.latestAnswer();
      let _type = OptionType.Call;
      let _marketId = 1;

      // console.log("WETH.balanceOf:", (await WETH.balanceOf(user1, { gas: 1000000 })).toString());
      // console.log("ERC20LiquidityPool:", (await ERC20LiquidityPool.proportionLocked(WETH.address,0)).toString());
      for (let i = 0; i < put.length; i++) {
        // console.log("asdf:", i);
         const createEvent = await ERC20Options.create3(_period, _amount, _strike, _type, _marketId, {
              // value,
              from: user1,
         })
        // console.log("ERC20LiquidityPool:", (await ERC20LiquidityPool.proportionLocked(WETH.address,0)).toString());
      }
    });
    // await testProportions(user1, marketId, contracts.then(x => [x.WETH, x.ERC20Options, x.ERC20LiquidityPool]))
  });


  describe('Test call prices', () => {
    testCallPrices(marketId, contracts.then(x => [x.ERC20Options, x.BTCPriceProvider]))
  });

  describe('Test call prices', () => {
    testPutPrices(marketId, contracts.then(x => [x.ERC20Options, x.BTCPriceProvider]))
  });

  describe('Test option & pool', () => {
    // it("Should be owned by the first account", async () => {
    //   const { ERC20Options } = await contracts
    //   assert.equal(
    //     await ERC20Options.owner.call(),
    //     user1,
    //     "The first account isn't the contract owner"
    //   )
    // })

    // it("Should be the owner of the pool contract", async () => {
    //   const { ERC20Options, ERC20LiquidityPool } = await contracts
    //   // console.log("ERC20LiquidityPool.owner", await ERC20LiquidityPool.owner());
    //   // console.log("ERC20Options.address", ERC20Options.address);
    //   assert.equal(
    //     await ERC20LiquidityPool.owner(),
    //     ERC20Options.address,
    //     "Isn't the owner of the pool"
    //   )
    // })

    it("Should provide funds to the pool", async () => {
      const { ERC20LiquidityPool, WBTC } = await contracts
      const value = toWei(50)
      await WBTC.mint(value, { from: user4 })
      await WBTC.approve(ERC20LiquidityPool.address, value, { from: user4 })
      await ERC20LiquidityPool.provide(value, 0, WBTC.address, { from: user4, gas: 1000000 })
    })

  

    it("Should create an option", async () => {
      const { ERC20LiquidityPool, WBTC, ERC20Options } = await contracts
      await provideFunds();

      // console.log("WBTC.balanceOf", (await WBTC.balanceOf(ERC20LiquidityPool.address, { gas: 1000000 })).toString());
      // console.log("ERC20LiquidityPool.totalBalance(0)", (await ERC20LiquidityPool.totalBalance(0, { gas: 1000000 })).toString());
      // await ERC20LiquidityPool.provide(value, 0, { from: user4, gas: 1000000 })
      // console.log("WBTC.balanceOf", (await WBTC.balanceOf(ERC20LiquidityPool.address, { gas: 1000000 })).toString());
      // console.log("ERC20LiquidityPool.totalBalance(0)", (await ERC20LiquidityPool.totalBalance(0, { gas: 1000000 })).toString());

      // console.log("ERC20LiquidityPool.lockedPremium(0)", (await ERC20LiquidityPool.lockedPremium(0, { gas: 1000000 })).toString());    
      // console.log("options(0)", await ERC20Options.options(0));
      // console.log("ERC20LiquidityPool.totalBalance(0)", (await ERC20LiquidityPool.totalBalance(0, { gas: 1000000 })).toString());
      // console.log("WBTC.balanceOf(user4)", (await WBTC.balanceOf(user4, { gas: 1000000 })).toString());
      // console.log("WBTC.balanceOf(ERC20LiquidityPool)", (await WBTC.balanceOf(ERC20LiquidityPool.address, { gas: 1000000 })).toString());
    
      const createEvent = await createOption({ user: user4 })
      // console.log("createEvent:",createEvent)
      assert(
        createEvent.id.eq(toBN(0)),
        "The first option's ID isn't equal to 0"
      )
    })

    it("Should exercise an option", async () => {
      await provideFunds();

      const { ERC20Options,BTCPriceProvider } = await contracts
      const { id } = await createOption()
      await timeTravel(15 * 60)
      // console.log("id:" + id);
      const { amount, strike } = await ERC20Options.options(id)
        
      const price = await BTCPriceProvider.latestAnswer()
      
      // console.log("price:" + price.toString());
      // console.log("strike:" + strike.toString());        
        
      const exerciseEvent = await ERC20Options.exercise(id)
        .then((x) => x.logs.find((log) => log.event == "Exercise"))
        .then((x) => (x ? x.args : null))
        .catch((x) => assert.fail(x.reason || x))
      assert.isNotNull(exerciseEvent, "'Exercise' event has not been initialized")
      // assert.equal(
      //   exerciseEvent.id.toNumber(),
      //   id,
      //   "Wrong option ID has been initialized"
      // )
    })

    it("Shouldn't exercise other options", async () => {
      const { ERC20Options } = await contracts
      const { id } = await createOption()
      await ERC20Options.exercise(id, { from: user2 }).then(
        () => assert.fail("Exercising a call option should be canceled"),
        (x) => {
          assert.equal(x.reason, "Not sender or approved", "Wrong error reason")
        }
      )
    })

    it("Shouldn't unlock an active option", async () => {
      const period = parseInt(Math.random() * 28 + 1)
      const { ERC20Options } = await contracts
      const { id } = await createOption({ period })
      const test = () =>
        ERC20Options.unlock(id).then(
          () => assert.fail("Exercising a call option should be canceled"),
          (x) => {
            assert.equal(
              x.reason,
              "Option has not expired yet",
              "Wrong error reason"
            )
          }
        )
      await test()
      timeTravel(3600 * 24 * period - 10)
      await test()
    })

    it("Shouldn't exercise an expired option", async () => {
      const period = parseInt(Math.random() * 28 + 1)
      const { ERC20Options } = await contracts
      const { id } = await createOption({ period, user: user2 })
      await timeTravel(period * 24 * 3600 + 1)
      await ERC20Options.exercise(id, { from: user2 }).then(
        () => assert.fail("Exercising a call option should be canceled"),
        (x) => {
          assert.equal(x.reason, "Option has expired", "Wrong error reason")
        }
      )
    })

    it("Shouldn't unlock an exercised option", async () => {
      const { ERC20Options } = await contracts
      const { id } = await createOption({ user: user2 })
      await ERC20Options.exercise(id, { from: user2 })
      await timeTravel(24 * 3600 + 1)
      await ERC20Options.unlock(id).then(
        () => assert.fail("Exercising a call option should be canceled"),
        (x) => {
          assert.equal(x.reason, "Option is not active", "Wrong error reason")
        }
      )
    })

    it("Should unlock expired options", async () => {
      const { ERC20Options } = await contracts
      const EXPIRED = toBN(3)
      const expected = await Promise.all([
        createOption({ period: 3, user: user3 }),
        createOption({ period: 3, user: user1 }),
        createOption({ period: 3, user: user2 }),
        createOption({ period: 3, user: user2, amount: toBTC(4) }),
      ]).then((x) => x.map((x) => x.id.toNumber()))
      console.log("expected:",expected.toString())
      await timeTravel(3 * 24 * 3600 + 1)

      const actual = await ERC20Options.unlockAll(expected)
        .then((x) => x.logs.filter((x) => x.event == "Expire"))
        .then((x) => x.map((x) => x.args.optionId.toNumber()))

      assert.deepEqual(expected, actual, "Wrong optionIDs has been initialized")
      for (const id of expected) {
        const option = await ERC20Options.options(id)
        assert(option.state.eq(EXPIRED), `option ${id} is not expired`)
      }
    })

    it("Should lock amount correctly", async () => {
      const { ERC20LiquidityPool, ERC20Options, WBTC } = await contracts
      const startLockedAmount = await ERC20LiquidityPool.lockedAmount(WBTC.address)
      const amount = Math.random().toFixed(18)
      const { id } = await createOption({ amount: toBTC(amount) })
      const optionCollateralizationRatio =
        toBN(await ERC20LiquidityPool.collateralizationRatio(marketId))
      const endLockedAmount = await ERC20LiquidityPool.lockedAmount(WBTC.address)
      const expected = toBN(await ERC20Options.options(id).then(x => x.lockedAmount))
      const actual = endLockedAmount.sub(startLockedAmount)
      assert.equal(
        expected.toString(),
        actual.toString(),
        "was locked incorrect amount"
      )
    })

    it("should unlock funds after an option is exercised", async () => {
      const { ERC20Options, ERC20LiquidityPool, WBTC } = await contracts
      const amount = Math.random().toFixed(18)
      const strike = toBN(200e8)
      const { id } = await createOption({ amount: toBTC(amount), strike })
      const startLockedAmount = await ERC20LiquidityPool.lockedAmount(WBTC.address)
      await ERC20Options.exercise(id)
      const endLockedAmount = await ERC20LiquidityPool.lockedAmount(WBTC.address)
      const expected = toBN(await ERC20Options.options(id).then(x => x.lockedAmount))
      const actual = startLockedAmount.sub(endLockedAmount)
      assert.equal(
        actual.toString(),
        expected.toString(),
        "was locked incorrect amount"
      )
    })

    it("Shouldn't change pool's total amount when creates an option", async () => {
      const { WBTC, ERC20LiquidityPool } = await contracts
      const startTotalBalance = await ERC20LiquidityPool.totalBalance(WBTC.address)
      const amount = Math.random().toFixed(18)
      const strike = toBN(200e8)

      const { id } = await createOption({ amount: toBTC(amount), strike, from:user1 })
      const endTotalBalance = await ERC20LiquidityPool.totalBalance(WBTC.address)

      assert(
        startTotalBalance.eq(endTotalBalance),
        `total amount was changed ${startTotalBalance} -> ${endTotalBalance}`
      )
    })

    it("Shouldn't change users' share when creates an option", async () => {
      const { ERC20LiquidityPool, WBTC } = await contracts
      const startShares = await Promise.all(
        [user1, user2, user3].map((user) => ERC20LiquidityPool.shareOf(user, WBTC.address))
      ).then((x) => x.toString())
      const amount = Math.random().toFixed(18)
      const strike = toBN(200e8)
      const { id } = await createOption({ amount: toBTC(amount), strike })
      const endTotalBalance = await ERC20LiquidityPool.totalBalance(WBTC.address)
      const endShares = await Promise.all(
        [user1, user2, user3].map((user) => ERC20LiquidityPool.shareOf(user,WBTC.address))
      ).then((x) => x.toString())
      assert.deepEqual(startShares, endShares, `share was changed`)
    })

    it("Should unfreeze LP's profit correctly after an option is unlocked", async () => {
      const { ERC20LiquidityPool, ERC20Options, WBTC } = await contracts
      const startTotalBalance = await ERC20LiquidityPool.totalBalance(WBTC.address)
      const amount = Math.random().toFixed(18)
      const strike = toBN(200e8)
      const { id } = await createOption({ amount: toBTC(amount), strike })
      // const {premium} = awanew Bit ERC20Options.options(id)
      timeTravel(24 * 3600 + 1)
      const { premium } = await ERC20Options.unlock(id)
        .then((x) => x.logs.find((x) => x.event == "Expire"))
        .then((x) => x.args)
      const endTotalBalance = await ERC20LiquidityPool.totalBalance(WBTC.address)

      assert.equal(
        startTotalBalance.add(premium).toString(),
        endTotalBalance.toString(),
        `profit was unlocked incorrectly`
      )
      assert.equal(
        premium.toString(),
        await ERC20Options.options(id).then((x) => x.premium.toString()),
        `profit was counted incorrectly`
      )
    })
  });

  describe('Test profits', () => {
    for (const testPoint of priceTestPoints)
      it(`Should pay profit for exercised ITM (90%) option correctly (price: ${testPoint}%)`, () =>
        testOption({
          createPrice: toBN(200e8),
          strike: toBN(200e8).mul(toBN(9)).div(toBN(10)),
          exercisePrice: toBN(200e8).mul(toBN(testPoint)).div(toBN(100)),
        }))

    for (const testPoint of priceTestPoints)
      it(`Should pay profit for exercised ATM option correctly (price: ${testPoint}%)`, () =>
        testOption({
          createPrice: toBN(200e8),
          exercisePrice: toBN(200e8).mul(toBN(testPoint)).div(toBN(100)),
        }))

    for (const testPoint of priceTestPoints)
      it(`Should pay profit for exercised OTM (110%) option correctly (price: ${testPoint}%)`, () =>
        testOption({
          createPrice: toBN(200e8),
          strike: toBN(200e8).mul(toBN(11)).div(toBN(10)),
          exercisePrice: toBN(200e8).mul(toBN(testPoint)).div(toBN(100)),
        }))

    it("Shouldn't pay profit for exercised option when price is reduced", () =>
      testOption({
        createPrice: toBN(200e8),
        exercisePrice: toBN(200e8 - 1),
      }))

    for (const testPoint of [190, 195, 200, 205, 210])
      it(`Show price for $${testPoint} strike`, () =>
        testOption({
          createPrice: toBN(200e8),
          strike: toBN(testPoint).mul(toBN(1e8)),
          exercisePrice: toBN(190e8),
        }))

    it("Should withdraw funds from the pool", async () => {
      const { ERC20LiquidityPool, WriterPool, WBTC } = await contracts
      const value = await ERC20LiquidityPool.availableBalance(WBTC.address)
      await timeTravel(14 * 24 * 3600 + 1)
      // await ERC20LiquidityPool.lockupPeriod().then(timeTravel)
      // console.log("token(0):", await ERC20LiquidityPool.tokens(0));
      // console.log("token(1):", await ERC20LiquidityPool.tokens(1));
      // console.log("token(2):", await ERC20LiquidityPool.tokens(2));
      // console.log("tokenPoolCount:", await ERC20LiquidityPool.tokenPoolCount());

      await WriterPool.setApprovalForAll(ERC20LiquidityPool.address, true, { from: user4 });

      await ERC20LiquidityPool.withdraw(value, "100000000000000000000000000000000", WBTC.address, { from: user4 })
    })

    it("Should print prices", () => {
      console.table(pricesBuf)
    })
  });
 
  async function provideFunds() {
    const { ERC20LiquidityPool, WBTC } = await contracts
    const value = toWei(100000)
    await WBTC.mintTo(user4, toWei(10000000000000000))
    await WBTC.approve(ERC20LiquidityPool.address, value, { from: user4 })
    await ERC20LiquidityPool.provide(value, 0, WBTC.address, { from: user4, gas: 1000000 })
  }
})
