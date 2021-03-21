const { getContracts, toWei } = require("./utils/utils.js")
const { timeTravel } = require("./utils/utils.js")
const toBN = web3.utils.toBN
const toBTC = x => toBN(toWei(x)).div(toBN(1e10))

module.exports.test = () => contract("Random", ([user1, user2, user3, user4]) => {

    const contracts = getContracts()


    it.only("Should time travel", async () => {
        await timeTravel(15 * 24 * 3600);
    });


    it("Fees charged correctly", async () => {
        const { ERC20LiquidityPool, ERC20Options, WBTC } = await contracts
        const value = toWei(100)
        await WBTC.mint(value, { from: user1 })
        await WBTC.mintTo(ERC20LiquidityPool.address, value)
        await WBTC.approve(ERC20Options.address, value, { from: user1 })
        
        const [_period, _optionSize, _strikePrice, _optionType, _marketId, from ] = [
            toBN(24 * 3600 * 1),
            toBN("1000000000"),
            toBN("5000000000000"),
            toBN(1),
            toBN(0),
            user1
        ]

        let user1BalanceStart = await WBTC.balanceOf(user1);

        console.log("period:" +_period);
        console.log("optionSize:" +_optionSize);
        console.log("strikePrice:" +_strikePrice);
        console.log("optionType:" +_optionType);
        console.log("optionMarketId:" + _marketId);

        const premium = await ERC20Options.premium(
            _period,
            _optionSize,
            _strikePrice,
            _optionType,
            _marketId
        )

        assert.equal(
          +premium.total,
          +premium.protocolFee + +premium.strikeFee + +premium.periodFee + +premium.balanceFee + +premium.lpFee,
          "Fees don't total"
        )
        const createEvent = await ERC20Options.create3(_period, _optionSize, _strikePrice, _optionType, _marketId, {
              // value,
              from,
        })        
        // .then((x) => x.logs.find((x) => x.event == "Create"))
        // .then((x) => (x ? x.args : null))
        console.log("premium:", premium);


        let user1BalanceEnd = await WBTC.balanceOf(user1);
        assert.equal(
          +user1BalanceEnd,
          +user1BalanceStart - +premium.total,
          "Incorrect fees charged"
        )
        
        console.log("premium total:", premium.total);
        console.log("user balance diff:", +user1BalanceStart - +user1BalanceEnd);
        console.log("user1BalanceEnd:", user1BalanceEnd.toString());
        console.log("+user1BalanceStart - +premium.total:", +user1BalanceStart - +premium.total);
    });

});
