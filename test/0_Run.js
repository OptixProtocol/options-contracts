const tests = {
    // ERC20LiquidityPool: require('./Pool/ERC20LiquidityPool.js'),
    ERC20_CALL: require('./Options/ERC20Options_CALL.js'),
    // ERC20_PUT: require('./Options/ERC20Options_PUT.js'),
    // Random: require('./Random.js'),
}

if(process.env.DEVMOD){ 
} else {
    Object.values(tests).forEach(x => x.test());
}
