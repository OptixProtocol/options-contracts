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
 
import "@openzeppelin/contracts/presets/ERC1155PresetMinterPauser.sol";
// import "github.com/OpenZeppelin/openzeppelin-contracts/blob/solc-0.6/contracts/presets/ERC1155PresetMinterPauser.sol";


contract WriterPool is ERC1155PresetMinterPauser  {
    constructor(string memory uri) public ERC1155PresetMinterPauser(uri){
    }
}
