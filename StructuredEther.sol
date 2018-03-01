pragma solidity ^0.4.18;
import "./EthPriceFeed.sol";


contract StructuredEther {
    using SafeMath for uint;
    
    address private owner;
    address private fundAddress;
    
    enum a {ETH,SE,stakedETH, stakeBuyBack, stakePrice, lastIRdate}
    enum p {price,precision,taxPCT,interestRate,IRperiod}
    
    mapping (address=> mapping(uint8 => uint)) private accounts;
    
    uint precision;
    uint price;
    uint taxPCT;
    uint IRperiod;
    uint IRpct;
    
    EthPriceFeed ethPrice;
    
    function StructuredEther() public payable {
        owner = msg.sender;
        precision = 3;
        price = 1000000;
        taxPCT = 50;
        IRperiod = 1 years;
        IRpct = 12000;
    }
    
    modifier ownerOnly() {
        require (msg.sender == owner || msg.sender == fundAddress);
        _;
    }
    
    modifier ownerForbidden() {
        require (msg.sender != owner);
        _;
    }
    
    modifier nonZero(uint amount) {
        require (amount > 0);
        _;
    }
    
    modifier pctCap(uint pct) {
        require (pct <= 1 * 10**precision);
        _;
    }
    
    function () public payable {
        accounts[msg.sender][uint8(a.ETH)] = accounts[msg.sender][uint8(a.ETH)].add(msg.value);
    }
    
    function getBalances(a balance) public view returns(uint) {
        return getBalances(balance, msg.sender);
    }
    
    function getBalances(a balance, address acc) internal view returns(uint) {
        return accounts[acc][uint8(balance)];
    }
    
    function setBalances(a balance, address acc, uint value) internal {
        accounts[acc][uint8(balance)] = value;
    }
    
    function sellEther(uint amount, uint stake) public ownerForbidden nonZero(amount) pctCap(stake) {
        collectAccountInterest(msg.sender);
        
        uint brutStake = amount.mul(stake).div(10**precision);
        uint netBuy = amount.sub(brutStake);
        uint tax = brutStake.mul(taxPCT).div(10**precision);
        uint netStake = brutStake.sub(tax);
        
        uint stakedETH = accounts[msg.sender][uint8(a.stakedETH)];
        uint stakeBuyBack = accounts[msg.sender][uint8(a.stakeBuyBack)];
        uint stakePrice = accounts[msg.sender][uint8(a.stakePrice)];
    
        accounts[msg.sender][uint8(a.ETH)] = accounts[msg.sender][uint8(a.ETH)].sub(brutStake);
        accounts[msg.sender][uint8(a.SE)] = accounts[msg.sender][uint8(a.SE)].add(netStake.add(netBuy).mul(price).div(1 ether));
        
        accounts[msg.sender][uint8(a.stakedETH)] = stakedETH.add(netStake);
        accounts[msg.sender][uint8(a.stakeBuyBack)] = stakeBuyBack.add(netStake.mul(price).div(1 ether));
        accounts[msg.sender][uint8(a.stakePrice)] = ((stakedETH.mul(stakePrice)).add(netStake.mul(price))).div(stakedETH.add(netStake));
        
        accounts[owner][uint8(a.ETH)] = accounts[owner][uint8(a.ETH)].add(tax);
        accounts[owner][uint8(a.stakedETH)] = accounts[owner][uint8(a.stakedETH)].add(netStake);
    }
    
    function buyEther(uint amount) public ownerForbidden nonZero(amount) {
        collectAccountInterest(msg.sender);
        
        accounts[owner][uint8(a.ETH)] = accounts[owner][uint8(a.ETH)].sub(amount);
        accounts[msg.sender][uint8(a.ETH)] = accounts[msg.sender][uint8(a.ETH)].add(amount);
        accounts[msg.sender][uint8(a.SE)] = accounts[msg.sender][uint8(a.SE)].sub(amount.mul(price).div(1 ether));
    }
    
    
    //Needs completion
    function redeemStake(uint amount) public ownerForbidden nonZero(amount) {
        collectAccountInterest(msg.sender);
        
        uint SEAmount = amount.mul(accounts[msg.sender][uint8(a.stakePrice)]).div(1 ether);
        accounts[msg.sender][uint8(a.SE)] = accounts[msg.sender][uint8(a.SE)].sub(SEAmount);
        accounts[msg.sender][uint8(a.stakedETH)] = accounts[msg.sender][uint8(a.stakedETH)].sub(amount);
        accounts[owner][uint8(a.stakedETH)] = accounts[owner][uint8(a.stakedETH)].sub(amount);
        accounts[msg.sender][uint8(a.ETH)] = accounts[msg.sender][uint8(a.ETH)].add(amount);
    }
    
    function collectAccountInterest(address account) public {
        uint lastIRdate =  accounts[account][uint8(a.lastIRdate)];
        
        if(now.sub(lastIRdate) > 1 hours) {
            uint interest =  accounts[account][uint8(a.stakedETH)].mul(now.sub(lastIRdate).div(IRperiod).mul(IRpct).div(10**precision));
            accounts[account][uint8(a.stakedETH)] = accounts[account][uint8(a.stakedETH)].sub(interest);
            accounts[owner][uint8(a.stakedETH)] = accounts[owner][uint8(a.stakedETH)].sub(interest);
            accounts[owner][uint8(a.ETH)] = accounts[owner][uint8(a.ETH)].add(interest);
            accounts[account][uint8(a.lastIRdate)] = now;
        }
    }
    
    function setFundingAddress(address addr) public ownerOnly {
        fundAddress = addr;
        ethPrice = EthPriceFeed(addr);
    }
    
    ///function to fund the price feed. Can be called only by it of the owner
    function fundPriceFeed() public ownerOnly {
        if (accounts[owner][uint8(a.ETH)] > 101 * 1 finney) {
            fundAddress.transfer(101 * 1 finney);
            ethPrice.startUpdates();
            accounts[owner][uint8(a.ETH)].sub(101 * 1 finney);
        }
    }
    
    function kill() public ownerOnly{
        selfdestruct(owner);
    }
    
    
    function getBalance() public view ownerOnly returns(uint) {
        return this.balance;
    }
}


// ----------------------------------------------------------------------------
// Safe maths
// Taken from https://theethereum.wiki/w/index.php/ERC20_Token_Standard
// ----------------------------------------------------------------------------
library SafeMath {
     function add(uint a, uint b) internal pure returns (uint c) {
          c = a + b;
          require(c >= a);
      }
      function sub(uint a, uint b) internal pure returns (uint c) {
          require(b <= a);
          c = a - b;
     }
     function mul(uint a, uint b) internal pure returns (uint c) {
         c = a * b;
         require(a == 0 || c / a == b);
     }
     function div(uint a, uint b) internal pure returns (uint c) {
         require(b > 0);
         c = a / b;
     }
 }
 