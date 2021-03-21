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
import "../Interfaces/Interfaces.sol";

    contract FakeExchange {
        uint256 public exchangeRate;
        FakeWBTC public token;
        address public WETH = address(this);

        constructor(FakeWBTC t, uint _exchangeRate) public {
            token = t;
            exchangeRate = _exchangeRate;
        }

        function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint)
            external
            payable
            returns (uint[] memory amounts)
        {
            uint amountIn = getAmountsIn(amountOut, path)[0];
            require(msg.value >= amountIn, "Fake Uniswap: value is too small");
            amounts = new uint[](1);
            amounts[0] = msg.value;

            token.mintTo(to, amountOut);
        }

        function getAmountsIn(uint amountOut, address[] memory)
            public
            view
            returns (uint[] memory amounts)
        {
            amounts = new uint[](1);
            amounts[0] = amountOut * exchangeRate / 1e18;
        }

        function setExchangeRate(uint256 _exchangeRate) public {
            exchangeRate = _exchangeRate;
        }
    }


    contract FakePriceProvider is AggregatorV3Interface {
        uint256 public price;
        uint8 public override decimals = 8;
        string public override description = "Test implementation";
        uint256 public override version = 0;

        constructor(uint256 _price, string memory _description) public {
            price = _price;
            description = _description;
        }


        function setPrice(uint256 _price) external {
            price = _price;
        }

        function getRoundData(uint80) external override view returns (uint80, int256, uint256, uint256, uint80) {
            revert("Test implementation");
        }

        function latestAnswer() external view returns(int result) {
            (, result, , , ) = latestRoundData();
        }

        function latestRoundData()
            public
            override
            view
            returns (
                uint80,
                int256 answer,
                uint256,
                uint256,
                uint80
            )
        {
            answer = int(price);
        }
    }


contract FakeBTCPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}

contract FakeETHPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}

contract FakeLinkPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}

contract FastGasPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}

contract OilPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}

contract GoldPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}

contract SilverPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}
contract CryptoCapPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}
contract UniswapPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}
contract SushiswapPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}
contract AavePriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}

contract LitecoinPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}
contract BitcoinCashPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}
contract PolkadoPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}
contract XRPPriceProvider is FakePriceProvider {
    constructor(uint price, string memory description) public FakePriceProvider(price,description) {}
}





contract FakeWBTC is ERC20("FakeWBTC", "WBTC") {
    using SafeERC20 for IERC20;
    constructor() public {
        _setupDecimals(8);
    }

    function mintTo(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}

contract FakeWETH is ERC20("FakeWETH", "WETH") {
    using SafeERC20 for IERC20;
    constructor() public {
        _setupDecimals(8);
    }

    function mintTo(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}

contract FakeLink is ERC20("Fake Chainlink", "LINK") {
    using SafeERC20 for IERC20;
    constructor() public {
        _setupDecimals(8);
    }

    function mintTo(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}

contract FakeUniswap is ERC20("Fake Uniswap", "UNI") {
    using SafeERC20 for IERC20;
    constructor() public {
        _setupDecimals(8);
    }

    function mintTo(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}

contract FakeSushiswap is ERC20("Fake Sushiswap", "SUSHI") {
    using SafeERC20 for IERC20;
    constructor() public {
        _setupDecimals(8);
    }

    function mintTo(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}

contract FakeAAVE is ERC20("Fake AAVE", "AAVE") {
    using SafeERC20 for IERC20;
    constructor() public {
        _setupDecimals(8);
    }

    function mintTo(address account, uint256 amount) public {
        _mint(account, amount);
    }

    function mint(uint256 amount) public {
        _mint(msg.sender, amount);
    }
}

