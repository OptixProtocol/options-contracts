pragma solidity 0.6.12;

/**
 * SPDX-License-Identifier: GPL-3.0-or-later
 * Hegic
 * Copyright (C) 2020 Hegic Protocol
 *
 *  19 March 2021 - Modified by DannyDoritoEth for Optyn
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */



import "./interfaces/Interfaces.sol";
import "./ERC1155Pool.sol";

// import "@openzeppelin/contracts/presets/ERC1155PresetMinterPauser.sol";
// import "github.com/OpenZeppelin/openzeppelin-contracts/blob/solc-0.6/contracts/presets/ERC1155PresetMinterPauser.sol";


//16.66 KB with only ERC1155PresetMinterPauser
contract ERC20LiquidityPool is AccessControl, ILiquidityPool  {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    uint256 public constant INITIAL_RATE = 1e18;


    //ERC20 collatoral pools
    mapping(IERC20 => bool) public initialised;
    mapping(IERC20 => uint256) public lockedAmount;
    mapping(IERC20 => uint256) public lockedPremiumCall;
    mapping(IERC20 => uint256) public lockedPremiumPut;
    mapping(IERC20 => mapping(address => uint256)) public lastProvideTimestamp;
    mapping(IERC20 => uint256) public totalSupply;
    mapping(IERC20 => uint256) public writerPoolPos;
    mapping(IERC20 => uint256) public maxInvest;
    mapping(IERC20 => uint256) public lockupPeriod;
    mapping(uint256 => IERC20) public tokenPool;

    uint256 public tokenPoolCount = 0;

    LockedLiquidity[] public lockedLiquidity;

    //Writer pool
    WriterPool public writerPool;

    //Option market
    mapping(uint256 => AggregatorV3Interface) public priceProvider;
    mapping(uint256 => IERC20) public collatoralToken;
    mapping(uint256 => uint256) public PRICE_DECIMALS;
    mapping(uint256 => uint256) public collateralizationRatio;
    uint256 public optionMarketCount = 0;

    bytes32 public constant MARKET_MAKER_ROLE = keccak256("MARKET_MAKER_ROLE");
    bytes32 public constant CONTRACT_CALLER_ROLE = keccak256("CONTRACT_CALLER_ROLE");


    constructor(WriterPool _writerPool) public {
        writerPool = _writerPool;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MARKET_MAKER_ROLE, _msgSender());
    }

   function createMarket(AggregatorV3Interface _priceProvider, ERC20 _token) public  {
        require(hasRole(MARKET_MAKER_ROLE, _msgSender()), "ERC20LiquidityPool: must have market maker role");
        priceProvider[optionMarketCount] = _priceProvider;
        collatoralToken[optionMarketCount] = _token;
        PRICE_DECIMALS[optionMarketCount] = 1e8;
        collateralizationRatio[optionMarketCount] = 10000;

        if (!initialised[_token]){
            writerPoolPos[_token] = tokenPoolCount;
            initialised[_token] = true;
            lockupPeriod[_token] = 2 weeks;
            tokenPool[tokenPoolCount] = _token;
            tokenPoolCount += 1;
        }

        emit CreateMarket(optionMarketCount,_priceProvider,_token);
        optionMarketCount += 1;
   }


    /**
     * @notice Used for changing the lockup period
     * @param value New period value
     */
    function setLockupPeriod(IERC20 _token, uint256 value) external  {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20LiquidityPool: must have admin role");
        lockupPeriod[_token] = value;
    }

    function setMaxInvest(IERC20 _token, uint256 _maxInvest) public  {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20LiquidityPool: must have admin role");
        maxInvest[_token] = _maxInvest;
    }


    /**
     * @notice Used for changing option collateralization ratio
     * @param value New optionCollateralizationRatio value
     */
    function setCollaterizationRatio(uint value, uint optionMarketId) external  {
        require(5000 <= value, "ERC20LiquidityPool: too low");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20LiquidityPool: must have admin role");
        collateralizationRatio[optionMarketId] = value;
    }


    /*
     * @nonce calls by ERC20Options to lock funds
     * @param amount Amount of funds that should be locked in an option
     */
    function lock(uint id, uint256 amount, uint256 premium, IERC20 token, IOptions.OptionType optionType) external  {
       require(id == lockedLiquidity.length, "ERC20LiquidityPool: Wrong id");
       require(
            lockedAmount[token].add(amount) <= totalBalance(token),
            "ERC20LiquidityPool: Amount is too large."
        );
        require(hasRole(CONTRACT_CALLER_ROLE, _msgSender()), "ERC20LiquidityPool: must have contract caller role");

        lockedLiquidity.push(LockedLiquidity(amount, premium, true, token, optionType));
        if(optionType == IOptions.OptionType.Put)
            lockedPremiumPut[token] = lockedPremiumPut[token].add(premium);
        else
            lockedPremiumCall[token] = lockedPremiumCall[token].add(premium);
        lockedAmount[token] = lockedAmount[token].add(amount);
    }



    /*
     * @nonce Calls by ERC20Options to unlock funds
     * @param amount Amount of funds that should be unlocked in an expired option
     */
    function unlock(uint256 id) external override  {
        LockedLiquidity storage ll = lockedLiquidity[id];
        require(ll.locked, "ERC20LiquidityPool: LockedLiquidity with id has already unlocked");
        require(hasRole(CONTRACT_CALLER_ROLE, _msgSender()), "ERC20LiquidityPool: must have contract caller role");

        ll.locked = false;

        if(ll.optionType == IOptions.OptionType.Put)
          lockedPremiumPut[ll.pool] = lockedPremiumPut[ll.pool].sub(ll.premium);
        else
          lockedPremiumCall[ll.pool] = lockedPremiumCall[ll.pool].sub(ll.premium);
        lockedAmount[ll.pool] = lockedAmount[ll.pool].sub(ll.amount);

        emit Profit(id, ll.pool, ll.premium);
    }



     /*
     * @nonce calls by ERC20Options to send funds to liquidity providers after an option's expiration
     * @param to Provider
     * @param amount Funds that should be sent
     */
    function send(uint id, address payable to, uint256 amount)
        external
        override
        
    {
        LockedLiquidity storage ll = lockedLiquidity[id];
        require(ll.locked, "ERC20LiquidityPool: LockedLiquidity with id has already unlocked");
        require(to != address(0));
        require(hasRole(CONTRACT_CALLER_ROLE, _msgSender()), "ERC20LiquidityPool: must have contract caller role");


        ll.locked = false;
        if(ll.optionType == IOptions.OptionType.Put)
            lockedPremiumPut[ll.pool] = lockedPremiumPut[ll.pool].sub(ll.premium);
        else
            lockedPremiumCall[ll.pool] = lockedPremiumCall[ll.pool].sub(ll.premium);

        lockedAmount[ll.pool] = lockedAmount[ll.pool].sub(ll.amount);

        uint transferAmount = amount > ll.amount ? ll.amount : amount;
        ll.pool.safeTransfer(to, transferAmount);

        if (transferAmount <= ll.premium)
            emit Profit(id, ll.pool, ll.premium - transferAmount);
        else
            emit Loss(id, ll.pool, transferAmount - ll.premium);
    }

   

   /*
     * @nonce Returns the token total balance provided to the pool
     * @return balance Pool balance
     */
    function totalBalance(IERC20 token) public override view returns (uint256) {
        // require(address(tokens[pool]) != address(0),"Pool doesn't exist");
        return token.balanceOf(address(this)).sub(lockedPremiumPut[token]).sub(lockedPremiumCall[token]);
    }

    function proportionLocked(IERC20 token, uint256 newAmount) public view returns (uint256 ){
       if (token.balanceOf(address(this))==0)
           return 0;

       return ((lockedAmount[token].add(newAmount)).mul(1e9)).div(token.balanceOf(address(this)));
    }

    function putBalanceFactor(IERC20 token, uint256 newAmount) public view returns (uint256 ){
        return ((lockedPremiumPut[token].add(newAmount)).mul(1e9)).div(lockedPremium(token));
    }

    function callBalanceFactor(IERC20 token, uint256 newAmount) public view returns (uint256 ){
        return (((lockedPremiumCall[token].add(newAmount)).mul(1e9)).div(lockedPremium(token)));
    }

    function lockedPremium(IERC20 token) public view returns (uint256){
        return (lockedPremiumPut[token].add(lockedPremiumCall[token]));
    }

     function putRatio(IERC20 token, uint256 newAmount) public view returns (uint256){
        if (lockedPremium(token)==0)
            return 5e9;
        uint256 newLockedPremium = lockedPremiumPut[token] + newAmount;

        int256 ratio = int256((newLockedPremium.mul(1e9)).div(newLockedPremium.add(lockedPremiumCall[token])));
        if (ratio<0)
            return 0;
        else
            return uint256(ratio);
    }
    
    function callRatio(IERC20 token, uint256 newAmount) public view returns (uint256){
        if (lockedPremium(token)==0)
            return 5e9;
        uint256 newLockedPremium = lockedPremiumCall[token] + newAmount;


        int256 ratio = int256((newLockedPremium.mul(1e9)).div(newLockedPremium.add(lockedPremiumCall[token])));
        if (ratio<0)
            return 0;
        else
            return uint256(ratio);
    }

    /*
     * @nonce A provider supplies token to the pool and receives writeToken tokens
     * @param amount Provided tokens
     * @param minMint Minimum amount of tokens that should be received by a provider.
                      Calling the provide function will require the minimum amount of tokens to be minted.
                      The actual amount that will be minted could vary but can only be higher (not lower) than the minimum value.
     * @return mint Amount of tokens to be received
     */
    function provide(uint256 amount, uint256 minMint, IERC20 token) public returns (uint256 mint) {
        lastProvideTimestamp[token][msg.sender] = block.timestamp;
        uint supply = totalSupply[token];
        uint balance = totalBalance(token);
        if (supply > 0 && balance > 0){
            mint = amount.mul(supply).div(balance);
        }
        else
            mint = amount.mul(INITIAL_RATE);

        require(mint >= minMint, "ERC20LiquidityPool: Mint limit is too large");
        require(mint > 0, "ERC20LiquidityPool: Amount is too small");

        require(token.balanceOf(msg.sender)>=amount,
            "ERC20LiquidityPool: Please lower the amount of premiums that you want to send."
        );        
        require(amount<=maxInvest[token],"ERC20LiquidityPool: Max invest limit reached");

        token.safeTransferFrom(msg.sender, address(this), amount);

        writerPool.mint(msg.sender, writerPoolPos[token], mint, "");
        totalSupply[token] = totalSupply[token].add(mint);

        emit Provide(msg.sender, token, amount, mint);
    }



    /*
     * @nonce Provider burns writer tokens and receives erc20 tokens from the pool
     * @param amount Amount of erc20 tokens to receive
     * @param maxBurn Maximum amount of tokens that can be burned
     * @return mint Amount of tokens to be burnt
     */
    function withdraw(uint256 amount, uint256 maxBurn, IERC20 token) public returns (uint256 burn) {
        require(
            lastProvideTimestamp[token][msg.sender].add(lockupPeriod[token]) <= block.timestamp,
            "ERC20LiquidityPool: Withdrawal is locked up"
        );
        require(
            amount <= availableBalance(token),
            "ERC20LiquidityPool: You are trying to unlock more funds than have been locked for your contract. Please lower the amount."
        );

        burn = amount.mul(totalSupply[token]).div(totalBalance(token));

        require(burn <= maxBurn, "ERC20LiquidityPool: Burn limit is too small");
        require(burn <= writerPool.balanceOf(msg.sender, writerPoolPos[token]), "ERC20LiquidityPool: Amount is too large");
        require(burn > 0, "ERC20LiquidityPool: Amount is too small");

        writerPool.burn(msg.sender, writerPoolPos[token], burn);
        totalSupply[token] = totalSupply[token].sub(burn);
        emit Withdraw(msg.sender, token, amount, burn);
        require(token.transfer(msg.sender, amount), "ERC20LiquidityPool: Insufficient funds");
    }




    function writerBalanceOf(address user, IERC20 token)public view returns (uint256 share){
        return writerPool.balanceOf(user, writerPoolPos[token]);
    }



    /*
     * @nonce Returns provider's share in erc20 tokens
     * @param account Provider's address
     * @return Provider's share in token
     */
    function shareOf(address user, IERC20 token) public view returns (uint256 share) {
        uint supply = totalSupply[token];
        if (supply > 0)
            share = totalBalance(token).mul(writerPool.balanceOf(user, writerPoolPos[token])).div(supply);
        else
            share = 0;
    }

 
    /*
     * @nonce Returns the amount of erc20 tokens available for withdrawals
     * @return balance Unlocked amount
     */
    function availableBalance(IERC20 token) public view returns (uint256) {
        return totalBalance(token).sub(lockedAmount[token]);
    }

}