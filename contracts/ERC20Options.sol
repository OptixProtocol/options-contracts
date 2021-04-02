pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

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

import "./ERC20LiquidityPool.sol";



/** 
 * @title Optyn
 */
contract ERC20Options is AccessControl, IOptions, IFeeCalcs, ERC721 {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    address public protocolFeeRecipient;
    Option[] public override options;
    ERC20LiquidityPool public lpPools;
    
    IFeeCalcs public feeCalcs;

    uint public lpMinFee = 100;    //1%
    uint public lpMaxFee = 1000;   //10%
    
    uint public balMinFee = 100;   //1%
    uint public balMaxFee = 2000;  //20%

    uint public protocolFee = 100;  //1%

    bytes32 public constant CONTRACT_CALLER_ROLE = keccak256("CONTRACT_CALLER_ROLE");

    /**
     */
    constructor(
        address _protocolFeeRecipient,
        ERC20LiquidityPool _lpPools,
        string memory name,
        string memory symbol 
    ) ERC721(name, symbol) public {
        lpPools = _lpPools;
        protocolFeeRecipient = _protocolFeeRecipient;
        feeCalcs = this;
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(CONTRACT_CALLER_ROLE, _msgSender());        
    }



    /**
     * @notice Used for changing protocolFeeRecipient
     * @param recipient New protocolFeeRecipient recipient address
     */
    function setProtocolFeeRecipient(address recipient) external  {
        require(address(recipient) != address(0));
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20Options: must have admin role");
        protocolFeeRecipient = recipient;
    }

    function setIFeeCalcs(IFeeCalcs _feeCalcs) external  {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20Options: must have admin role");
        feeCalcs = _feeCalcs;
    }

    function setLPMinFee(uint _fee) external  {
        require(_fee >= 0, "Fee too low");
        require(_fee <= 5000, "Fee too high");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20Options: must have admin role");
        lpMinFee = _fee;
    }

    function setLPMaxFee(uint _fee) external  {
        require(_fee >= 0, "Fee too low");
        require(_fee <= 5000, "Fee too high");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20Options: must have admin role");
        lpMaxFee = _fee;
    }

    function setBalMinFee(uint _fee) external  {
        require(_fee >= 0, "Fee too low");
        require(_fee <= 5000, "Fee too high");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20Options: must have admin role");
        balMinFee = _fee;
    }

    function setBalMaxFee(uint _fee) external  {
        require(_fee >= 0, "Fee too low");
        require(_fee <= 5000, "Fee too high");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20Options: must have admin role");
        balMaxFee = _fee;
    }

    function setProtocolFee(uint _fee) external  {
        require(_fee >= 0, "Fee too low");
        require(_fee <= 5000, "Fee too high");
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "ERC20Options: must have admin role");
        protocolFee = _fee;
    }

    
    function premium(
        uint256 period,
        uint256 optionSize,
        uint256 strike,
        OptionType optionType,
        uint optionMarketId
    )   public
        view
        returns (
            Fees memory _premium 
        )
    {
        (Fees memory fees) = fees(period, optionSize, strike, optionType, optionMarketId);
        _premium.protocolFee = fees.protocolFee.mul(optionSize).div(10000).mul(1e9);
        _premium.strikeFee = fees.strikeFee.mul(optionSize).div(10000).mul(1e9);
        _premium.periodFee = fees.periodFee.mul(optionSize).div(10000).mul(1e9);
        _premium.balanceFee = fees.balanceFee.mul(optionSize).div(10000).mul(1e9);
        _premium.lpFee = fees.lpFee.mul(optionSize).div(10000).mul(1e9);
        _premium.total = _premium.protocolFee + _premium.strikeFee + _premium.periodFee + _premium.balanceFee + _premium.lpFee;
    }

    function fees(
        uint256 period,
        uint256 optionSize,
        uint256 strike,
        OptionType optionType,
        uint optionMarketId
    )   public
        view
        returns (
            Fees memory _fees 
        )
    {
        (, int latestPrice, , , ) = lpPools.priceProvider(optionMarketId).latestRoundData();
        uint256 currentPrice = uint256(latestPrice);
        _fees.protocolFee = feeCalcs.getProtocolFee(optionSize, period, strike, currentPrice, optionType, optionMarketId);
        _fees.strikeFee = feeCalcs.getStrikeFee(optionSize, period, strike, currentPrice, optionType, optionMarketId);
        _fees.periodFee = feeCalcs.getPeriodFee(optionSize, period, strike, currentPrice, optionType, optionMarketId);
        _fees.balanceFee = feeCalcs.getBalanceFee(optionSize, period, strike, currentPrice, optionType, optionMarketId);
        _fees.lpFee = feeCalcs.getLiquidityProviderFee(optionSize, period, strike, currentPrice, optionType, optionMarketId);
        _fees.total = _fees.protocolFee + _fees.strikeFee + _fees.periodFee + _fees.balanceFee + _fees.lpFee;
    }


    function getProtocolFee(uint256 period,
        uint256 optionSize,
        uint256 strike,
        uint256 currentPrice,
        OptionType optionType,
        uint optionMarketId)
        override
        external
        view
        returns (uint256)
    {
        return protocolFee;
    }


    function getStrikeFee(uint256 period,
        uint256 optionSize,
        uint256 strike,
        uint256 currentPrice,
        OptionType optionType,
        uint optionMarketId
    )
        override
        external
        pure
        returns (uint256)
    {
      if (strike > currentPrice && optionType == OptionType.Put)
            return (strike.sub(currentPrice)).mul(1e4).div(currentPrice);
        if (strike < currentPrice && optionType == OptionType.Call)
            return (currentPrice.sub(strike)).mul(1e4).div(currentPrice);
        return 0;        
    }


    function getPeriodFee(
        uint256 period,
        uint256 optionSize,
        uint256 strike,
        uint256 currentPrice,
        OptionType optionType,
        uint optionMarketId
    ) override external view returns (uint256) {
        if (optionType == OptionType.Put)
            return optionSize
                .mul(sqrt(period))
                .mul(strike)
                .div(currentPrice)
                .div(lpPools.PRICE_DECIMALS(optionMarketId));
        else
            return optionSize
                .mul(sqrt(period))
                .mul(currentPrice)
                .div(strike)
                .div(lpPools.PRICE_DECIMALS(optionMarketId));
    }

    function getBalanceFee(uint256 period,
        uint256 optionSize,
        uint256 strike,
        uint256 currentPrice,
        OptionType optionType,
        uint optionMarketId)
        override
        external
        view
        returns (uint256)
    {
        uint256 feeProportion;
        if (optionType == IOptions.OptionType.Put){
             feeProportion = lpPools.putRatio(lpPools.collatoralToken(optionMarketId),optionSize.mul(1e9)).mul(lpPools.proportionLocked(lpPools.collatoralToken(optionMarketId), optionSize)).div(1e9);
        }
        else{
             feeProportion = lpPools.callRatio(lpPools.collatoralToken(optionMarketId),optionSize.mul(1e9)).mul(lpPools.proportionLocked(lpPools.collatoralToken(optionMarketId), optionSize)).div(1e9);
        }

        if(feeProportion.mul(balMaxFee).div(1e9)>balMinFee)
            return feeProportion.mul(balMaxFee).div(1e9);
        else
            return balMinFee; 
    }


    function getLiquidityProviderFee(uint256 period,
        uint256 optionSize,
        uint256 strike,
        uint256 currentPrice,
        OptionType optionType,
        uint optionMarketId)         
        override
        external
        view
        returns (uint256)
    {
        uint256 a = lpPools.proportionLocked(lpPools.collatoralToken(optionMarketId), 0);
        uint256 b = lpPools.proportionLocked(lpPools.collatoralToken(optionMarketId), optionSize);
        uint256 lpCurve = (((a.add(b).div(2)))**4).div(1e27);
        
        if(lpCurve.mul(lpMaxFee).div(1e9)>lpMinFee)
            return lpCurve.mul(lpMaxFee).div(1e9);
        else
            return lpMinFee;
    }



   function create1(
        uint256 period,
        uint256 optionSize,
        uint256 strike,
        OptionType optionType,
        uint256 marketId,
        uint256[] calldata optionIDs
    )
        external        
        returns (uint256 optionID)
    {
        unlockAll(optionIDs);
        return create4(msg.sender,period,optionSize,strike,optionType,marketId);
    }

   function create2(
        address payable account,
        uint256 period,
        uint256 optionSize,
        uint256 strike,
        OptionType optionType,
        uint256 marketId,
        uint256[] calldata optionIDs
    )
        external        
        returns (uint256 optionID)
    {
        unlockAll(optionIDs);
        return create4(account, period,optionSize,strike,optionType,marketId);
    }

    function create3(
        uint256 period,
        uint256 optionSize,
        uint256 strike,
        OptionType optionType,
        uint256 optionMarketId
    )
        public        
        returns (uint256 optionID)
    {
        return create4(msg.sender,period,optionSize,strike,optionType,optionMarketId);
    }  
    
    /**
     * @notice Creates a new option
     * @param period Option period in seconds (1 days <= period <= 4 weeks)
     * @param optionSize Option size
     * @param strike Strike price of the option
     * @param optionType Call or Put option type
     * @return optionID Created option's ID
     */
    function create4(
        address payable account,
        uint256 period,
        uint256 optionSize,
        uint256 strike,
        OptionType optionType,
        uint256 optionMarketId
    )
        public        
        returns (uint256 optionID)
    {
        require(
            optionType == OptionType.Call || optionType == OptionType.Put,
            "Wrong option type"
        );
        require(period >= 1 days, "Period is too short");
        require(period <= 4 weeks, "Period is too long");
        (Fees memory _premium) = premium(period, optionSize, strike, optionType, optionMarketId);
        
        optionID = options.length;        
        Option memory option = _createOption(account,period,optionSize,strike,optionType,optionMarketId,_premium);


        lpPools.collatoralToken(optionMarketId).transferFrom(account, address(lpPools), _premium.total-_premium.protocolFee);
        lpPools.collatoralToken(optionMarketId).transferFrom(account, address(protocolFeeRecipient), _premium.protocolFee);

        options.push(option);
        lpPools.lock(optionID, option.lockedAmount, option.premium, lpPools.collatoralToken(optionMarketId), optionType);
        _safeMint(account, optionID);
        emit Create(optionID, account, optionMarketId, _premium.protocolFee, _premium.total);
    }

    function _createOption(address payable account, 
        uint256 period,
        uint256 optionSize,
        uint256 strike,
        OptionType optionType,
        uint256 optionMarketId, Fees memory _premium) internal view returns (Option memory option){

        uint256 strikeAmount = optionSize;
        // uint optPremium = (_premium.total.sub(_premium.protocolFee));
        option = Option(
           State.Active,
            account,
            strike,
            optionSize,
            (strikeAmount.mul(lpPools.collateralizationRatio(optionMarketId)).div(10000).add(_premium.strikeFee.div(1e9))).mul(1e9),
            _premium.total,
            block.timestamp + period,
            optionType,
            optionMarketId
        );
    }

    /**
     * @notice Transfers an active option
     * @param optionID ID of your option
     * @param newHolder Address of new option holder
     */
    function transfer(uint256 optionID, address payable newHolder) external {
        Option storage option = options[optionID];

        require(newHolder != address(0), "new holder address is zero");
        require(option.expiration >= block.timestamp, "Option has expired");
        require(option.holder == msg.sender, "Wrong msg.sender");
        require(option.state == State.Active, "Only active option could be transferred");

        option.holder = newHolder;
    }

    /**
     * @notice Exercises an active option
     * @param optionID ID of your option
     */
    function exercise(uint256 optionID) external {
        Option storage option = options[optionID];

        require(option.expiration >= block.timestamp, "Option has expired");
        require((option.holder == msg.sender)||isApprovedForAll(option.holder,msg.sender), "Not sender or approved");
        require(option.state == State.Active, "Wrong state");

        option.state = State.Exercised;
        uint256 profit = payProfit(optionID);

        emit Exercise(optionID, option.marketId, profit);
    }

  
    // /**
    //  * @notice Allows the erc20 pool contract to receive and send tokens
    //  */
    // function approve() public {
    //     token.safeApprove(address(lpPools), uint(-1));
    //     token.safeApprove(protocolFeeRecipient, uint(-1));
    // }

    function latestPrice(uint optionMarketId) public view returns (uint256 ){
         (, int lp, , , ) = lpPools.priceProvider(optionMarketId).latestRoundData();
        return uint256(lp); 
    }


    /**
     * @notice Unlocks an array of options
     * @param optionIDs array of options
     */
    function unlockAll(uint256[] calldata optionIDs) public {
        uint arrayLength = optionIDs.length;
        for (uint256 i = 0; i < arrayLength; i++) {
            unlock(optionIDs[i]);
        }
    }

    /**
     * @notice Unlock funds locked in the expired options
     * @param optionID ID of the option
     */
    function unlock(uint256 optionID) public {
        Option storage option = options[optionID];
        require(option.expiration < block.timestamp, "Option has not expired yet");
        require(option.state == State.Active, "Option is not active");
        option.state = State.Expired;
        lpPools.unlock(optionID);
        emit Expire(optionID, option.marketId, option.premium);
    }

  

    /**
     * @notice Calculates strikeFee
     * @param optionSize Option size
     * @param strike Strike price of the option
     * @param currentPrice Current price of BTC
     * @return fee Strike fee amount
     */
    function getStrikeFee(
        uint256 optionSize,
        uint256 strike,
        uint256 currentPrice,
        OptionType optionType
    ) internal pure returns (uint256 fee) {
        if (strike > currentPrice && optionType == OptionType.Put)
            return strike.sub(currentPrice).mul(optionSize).div(currentPrice);
        if (strike < currentPrice && optionType == OptionType.Call)
            return currentPrice.sub(strike).mul(optionSize).div(currentPrice);
        return 0;
    }

    /**
     * @notice Sends profits in erc20 tokens from the token pool to an option holder's address
     * @param optionID A specific option contract id
     */
    function payProfit(uint optionID)
        internal
        returns (uint profit)
    {
        Option memory option = options[optionID];
        (, int _latestPrice, , , ) = lpPools.priceProvider(option.marketId).latestRoundData();
        uint256 currentPrice = uint256(_latestPrice);
        if (option.optionType == OptionType.Call) {
            require(option.strike <= currentPrice, "Current price is too low");
            profit = currentPrice.sub(option.strike).mul(option.optionSize).div(currentPrice);
        } else if (option.optionType == OptionType.Put) {
            require(option.strike >= currentPrice, "Current price is too high");
            profit = option.strike.sub(currentPrice).mul(option.optionSize).div(currentPrice);
        }
        if (profit > option.lockedAmount)
            profit = option.lockedAmount;
        lpPools.send(optionID, option.holder, profit);
    }

    /**
     * @return result Square root of the number
     */
    function sqrt(uint256 x) private pure returns (uint256 result) {
        result = x;
        uint256 k = x.div(2).add(1);
        while (k < result) (result, k) = (k, x.div(k).add(k).div(2));
    }
}
