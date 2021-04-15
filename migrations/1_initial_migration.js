
let commitHash = require('child_process').execSync('git rev-parse HEAD').toString();
let poolUrl = "https://optyn.co/api/pool/{id}.​json"
let optionUrl = "https://optyn.co/api/option/{id}.​json"

const BN = web3.utils.BN
const Exchange = artifacts.require("FakeExchange")

const ERC20Options = artifacts.require("ERC20Options")
const WriterPool = artifacts.require("WriterPool")
const ERC20LiquidityPool = artifacts.require("ERC20LiquidityPool")

const WBTC = artifacts.require("FakeWBTC")
const WETH = artifacts.require("FakeWETH")
const LINK = artifacts.require("FakeLink")
const UNI = artifacts.require("FakeUniswap")
const SUSHI = artifacts.require("FakeSushiswap")
const AAVE = artifacts.require("FakeAAVE")

const PriceProvider = artifacts.require("FakePriceProvider")
const BTCPriceProvider = artifacts.require("FakeBTCPriceProvider")
const ETHPriceProvider = artifacts.require("FakeETHPriceProvider")
const LinkPriceProvider = artifacts.require("FakeLinkPriceProvider")
const FastGasPriceProvider = artifacts.require("FastGasPriceProvider")
const UniswapPriceProvider = artifacts.require("UniswapPriceProvider")
const GoldPriceProvider = artifacts.require("GoldPriceProvider")
const SushiswapPriceProvider = artifacts.require("SushiswapPriceProvider")
const AavePriceProvider = artifacts.require("AavePriceProvider")



// const BC = artifacts.require("BondingCurveLinear")

const CONTRACTS_FILE = process.env.CONTRACTS_FILE

const params = {
    BTCPrice: new BN("5000000000000"),
    ETHPrice: new BN("166121147421"),
    ETHFastGasPrice:  new BN("70200000000"),
    GoldPrice: new BN("184462450000"),
    ChainlinkPrice:  new BN("2269700876"),
    UniSwapPrice: new BN("14845000000000000"),
    SushiSwapPrice: new BN("6372000000000000"),
    AAVEPrice: new BN("31017005853"),

            

    ETHtoBTC() { return this.ETHPrice.mul(new BN("10000000000000000000000000000000")).div(this.BTCPrice) },
    ExchangePrice: new BN(30e8),
    BC:{
        k: new BN("100830342800"),
        startPrice: new BN("350000000000000")
    }
}

module.exports = async function (deployer, network, [account]) {
    if (["development", "develop", 'soliditycoverage'].indexOf(network) >= 0) {
        const w = await deployer.deploy(WBTC)
        // await WBTC.mintTo(account, "100000000000000000000")
        // await WBTC.mintTo("0x1a4037400B5211Dc9881d088252F907B9Ed76169", "100000000000000000000");

        const i = await deployer.deploy(WETH)
        const o = await deployer.deploy(LINK)
        await deployer.deploy(UNI);
        await deployer.deploy(SUSHI);
        await deployer.deploy(AAVE);
        
        // await deployer.deploy(ETHPool)
        const wp = await deployer.deploy(WriterPool, poolUrl, commitHash);
        const lp = await deployer.deploy(ERC20LiquidityPool, wp.address, commitHash)
        // await deployer.deploy(BC, ALF.address, params.BC.k, params.BC.startPrice)
        await deployer.deploy(Exchange, WBTC.address, params.ETHtoBTC())

        await deployer.deploy(BTCPriceProvider, params.BTCPrice, "BTC / USD")
        await deployer.deploy(ETHPriceProvider, params.ETHPrice, "ETH / USD")
        await deployer.deploy(FastGasPriceProvider, params.ETHFastGasPrice, "Fast Gas / Gwei")
        await deployer.deploy(GoldPriceProvider, params.GoldPrice, "XAU / USD")
        await deployer.deploy(LinkPriceProvider, params.ChainlinkPrice, "LINK / USD")
        // await deployer.deploy(UniswapPriceProvider,params.UniSwapPrice, "Uniswap / ETH")
        // await deployer.deploy(SushiswapPriceProvider, params.SushiSwapPrice, "SushiSwap / ETH")        
        // await deployer.deploy(AavePriceProvider, params.AAVEPrice, "AAVE / USD")

      
        const opt = await deployer.deploy(ERC20Options,
            WBTC.address,
            lp.address,
            "Option Contract",
            "OPTION",            
            commitHash
        )
        await lp.grantRole(await lp.CONTRACT_CALLER_ROLE(), opt.address);

        // await h.mintTo(BC.address, "753001000000000000000000000")
        await lp.createMarket(BTCPriceProvider.address,
            WBTC.address)
        lp.setMaxInvest(WBTC.address, "100000000000000000000000000000000000000000");
        await lp.createMarket(ETHPriceProvider.address,
            WETH.address)
        lp.setMaxInvest(WETH.address, "100000000000000000000000000000000000000000");
        await lp.createMarket(FastGasPriceProvider.address,
            WETH.address)
        await lp.createMarket(GoldPriceProvider.address,
            WETH.address)
        // console.log("LinkPriceProvider.address:",LinkPriceProvider.address)
        // console.log("LINK.address:",LINK.address)
        await lp.createMarket(LinkPriceProvider.address,
            LINK.address)
        //    await lp.createMarket(UniswapPriceProvider.address,
        //         UNI.address)        
        //    await lp.createMarket(SushiswapPriceProvider.address,
        //         SUSHI.address)  
        //    await lp.createMarket(AavePriceProvider.address,
        //         AAVE.address)  
        
        // await lp.transferOwnership(ERC20Options.address);
        // await lp.transferOwnership("0x6a17c567315ED3d9C378A5fd79726C2286595528");
        // await opt.transferOwnership("0x6a17c567315ED3d9C378A5fd79726C2286595528");

        // await btcp.setPrice('3972704584246')
        await wp.grantRole(await wp.MINTER_ROLE(), lp.address);

        if (CONTRACTS_FILE) {
            const fs = require('fs');
            console.log("> Contracts writing: " + CONTRACTS_FILE)
            fs.writeFileSync(CONTRACTS_FILE, JSON.stringify({
                WBTC: {
                    address: WBTC.address,
                    abi: WBTC.abi
                },
                WETH: {
                    address: WETH.address,
                    abi: WETH.abi
                },
                ETHPriceProvider: {
                    address: PriceProvider.address,
                    abi: PriceProvider.abi
                },
                BTCPriceProvider: {
                    address: BTCPriceProvider.address,
                    abi: BTCPriceProvider.abi
                },
                ERC20Options: {
                    address: ERC20Options.address,
                    abi: ERC20Options.abi
                },
                ERC20LiquidityPool: {
                    address: ERC20LiquidityPool.address,
                    abi: await ERC20LiquidityPool.abi
                },
                // BC:{
                //     address: BC.address,
                //     abi: BC.abi
                // },
            }))
        }
    } else {
        switch (network) {
            case "rinkeby": {
       
                const wp = await deployer.deploy(WriterPool, poolUrl, commitHash);
                const lp = await deployer.deploy(ERC20LiquidityPool, WriterPool.address, commitHash)
                const opt = await deployer.deploy(ERC20Options,
                    "0x5976120623b76fa441525A3784bBFFD5A00dBAD3",
                    ERC20LiquidityPool.address,
                    "Option Contract",
                    "OPTION",                    
                    commitHash)
                break;
            }
            case "binanceTestnet": {
                const wp = await deployer.deploy(WriterPool, poolUrl, commitHash);
                const lp = await deployer.deploy(ERC20LiquidityPool, WriterPool.address, commitHash)
                const opt = await deployer.deploy(ERC20Options,
                    "0x5976120623b76fa441525A3784bBFFD5A00dBAD3",
                    ERC20LiquidityPool.address,
                    "Option Contract",
                    "OPTION",                    
                    commitHash)
                break;
            }
            case "moonbeamTestnet": {
                const wp = await deployer.deploy(WriterPool, poolUrl, commitHash);
                const lp = await deployer.deploy(ERC20LiquidityPool, WriterPool.address, commitHash)
                const opt = await deployer.deploy(ERC20Options,
                    "0x5976120623b76fa441525A3784bBFFD5A00dBAD3",
                    ERC20LiquidityPool.address,
                    "Option Contract",
                    "OPTION",                    
                    commitHash)
                break;
            }
            case "polygonTestnet": {
                const wp = await deployer.deploy(WriterPool, poolUrl, commitHash);
                const lp = await deployer.deploy(ERC20LiquidityPool, WriterPool.address, commitHash)
                const opt = await deployer.deploy(ERC20Options,
                    "0x5976120623b76fa441525A3784bBFFD5A00dBAD3",
                    ERC20LiquidityPool.address,
                    "Option Contract",
                    "OPTION",                    
                    commitHash)
                break;
            }
            case "polygonMainnet": {
                const wp = await deployer.deploy(WriterPool, poolUrl, commitHash);
                const lp = await deployer.deploy(ERC20LiquidityPool, WriterPool.address, commitHash)
                const opt = await deployer.deploy(ERC20Options,
                    "0x5976120623b76fa441525A3784bBFFD5A00dBAD3",
                    ERC20LiquidityPool.address,
                    "Option Contract",
                    "OPTION",                    
                    commitHash)
                break;
            }                
            case "fantomTestnet": {
                const wp = await deployer.deploy(WriterPool, poolUrl, commitHash);
                const lp = await deployer.deploy(ERC20LiquidityPool, WriterPool.address, commitHash)
                const opt = await deployer.deploy(ERC20Options,
                    "0x5976120623b76fa441525A3784bBFFD5A00dBAD3",
                    ERC20LiquidityPool.address,
                    "Option Contract",
                    "OPTION",                    
                    commitHash)
                break;
            }
            case "plasmTestnet": {
                const wp = await deployer.deploy(WriterPool, poolUrl, commitHash);
                const lp = await deployer.deploy(ERC20LiquidityPool, WriterPool.address, commitHash)
                const opt = await deployer.deploy(ERC20Options,
                    "0x5976120623b76fa441525A3784bBFFD5A00dBAD3",
                    ERC20LiquidityPool.address,
                    "Option Contract",
                    "OPTION",                    
                    commitHash)
                break;
            }
            case "avalancheTestnet": {
                const wp = await deployer.deploy(WriterPool, poolUrl, commitHash);
                const lp = await deployer.deploy(ERC20LiquidityPool, WriterPool.address, commitHash)
                const opt = await deployer.deploy(ERC20Options,
                    "0x5976120623b76fa441525A3784bBFFD5A00dBAD3",
                    ERC20LiquidityPool.address,
                    "Option Contract",
                    "OPTION",                    
                    commitHash)
                break;
            }                
            default: {
                throw Error(`Network not configured in migration: ${network}`)
            }        
        }
    }
}
