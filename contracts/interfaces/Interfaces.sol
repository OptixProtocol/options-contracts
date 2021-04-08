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
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";


// import "github.com/OpenZeppelin/openzeppelin-contracts/blob/solc-0.6/contracts/token/ERC20/ERC20.sol";
// import "github.com/OpenZeppelin/openzeppelin-contracts/blob/solc-0.6/contracts/token/ERC20/SafeERC20.sol";
// import "github.com/OpenZeppelin/openzeppelin-contracts/blob/solc-0.6/contracts/access/Ownable.sol";
// import "github.com/OpenZeppelin/openzeppelin-contracts/blob/solc-0.6/contracts/token/ERC721/ERC721.sol";
// import "github.com/smartcontractkit/chainlink/blob/develop/evm-contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";


interface IFeeCalcs {
    function getProtocolFee(uint256 period, uint256 optionSize, uint256 strike, uint256 currentPrice, IOptions.OptionType optionType, uint optionMarketId) external view returns (uint256);
    function getStrikeFee(uint256 period, uint256 optionSize, uint256 strike, uint256 currentPrice, IOptions.OptionType optionType, uint optionMarketId) external pure returns (uint256);
    function getPeriodFee(uint256 period, uint256 optionSize, uint256 strike, uint256 currentPrice, IOptions.OptionType optionType, uint optionMarketId) external view returns (uint256);
    function getBalanceFee(uint256 period, uint256 optionSize, uint256 strike, uint256 currentPrice, IOptions.OptionType optionType, uint optionMarketId) external view returns (uint256);
    function getLiquidityProviderFee(uint256 period, uint256 optionSize, uint256 strike, uint256 currentPrice, IOptions.OptionType optionType, uint optionMarketId) external view returns (uint256);
    struct Fees {
        uint256 total;
        uint256 protocolFee;
        uint256 strikeFee;
        uint256 periodFee;
        uint256 balanceFee;
        uint256 lpFee;
    }
}

interface ILiquidityPool {
    struct LockedLiquidity { 
        uint amount; 
        uint premium; 
        bool locked; 
        IERC20 pool; 
        IOptions.OptionType optionType; 
    }

    event CreateMarket(uint indexed marketId, AggregatorV3Interface priceProvider, IERC20 pool);
    event Profit(uint indexed optionId, IERC20 pool, uint amount);
    event Loss(uint indexed optionId, IERC20 pool, uint amount);
    event Provide(address indexed account, IERC20 pool, uint256 amount, uint256 writeAmount);
    event Withdraw(address indexed account, IERC20 pool, uint256 amount, uint256 writeAmount);

    function unlock(uint256 id) external;
    function send(uint256 id, address payable account, uint256 amount) external;
    // function setLockupPeriod(uint value) external;
    function totalBalance(IERC20 pool) external view returns (uint256 amount);

}


interface IOptions {
    event Create(
        uint256 indexed id,
        address indexed account,
        uint256 indexed marketId,
        uint256 protocolFee,
        uint256 totalFee
    );

    event Exercise(uint256 indexed optionId, uint marketId, uint256 profit);
    event Expire(uint256 indexed optionId, uint marketId, uint256 premium);
    enum State {Inactive, Active, Exercised, Expired}
    enum OptionType {Invalid, Put, Call}

    struct Option  {
        State state;
        address payable holder;
        uint256 strike;
        uint256 optionSize;
        uint256 lockedAmount;
        uint256 premium;
        uint256 expiration;
        OptionType optionType;
        uint256 marketId;
    }

    function options(uint) external view returns (
        State state,
        address payable holder,
        uint256 strike,
        uint256 optionSize,
        uint256 lockedAmount,
        uint256 premium,
        uint256 expiration,
        OptionType optionType,
        uint256 marketId
    );
}
