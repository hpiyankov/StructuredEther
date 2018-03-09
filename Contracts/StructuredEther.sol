pragma solidity ^0.4.18;
import "./EthPriceFeed.sol";

/// @title Structured ether
/// @author Hristo Piyankov
/// @notice Structured product based on ethreum. The contract allows you to buy and sell etereum and the currently quoted average market price. 
/// Function to buy is only accessable if there is enough availability. The counter currency is called Structured Ether which is always pegged to the USD as 1:1.
/// Insead of buying you also have the option to stake your Ether. Staking allows you to buy it back at the fixed price of staking. When you stake the ether you recieve a Structured ether loan
/// equal to USD value of your staked Ether. This means that you are able to direclty re-purchase additional Ether for your Structured Ether or hold the Structed ether as price hedge.
/// Any staking deal is subject to a) one time off tax b) interest rate on the staked Ether.

contract StructuredEther {
    /// @dev The contract is uding the SafeMath functions from the ERC20 standard for all of it soperations
    using SafeMath for uint;
    
    /// @dev Those are the two address considered as owners. One is the address of the person who initiates the contract and the ther one is a configurable address.
    /// The configurable address is the address of the price feed function
    address private owner;
    address private fundAddress;
    
    /// @dev A mapping holding all the account details for each address. The account details are represented as an enum as follows:
    /// @param ETH the Ether balance of the accounts
    /// @param SE the Structured Ether balance of the accounts
    /// @param stakedETH current ammount of staked Ether
    /// @param stakeBuyBack the ammount of Structured Ether for which the Stake was made. Thus is the repay amount needed in order to get back the full stake
    /// @param stakePrice the average price at which the stake was taken. The stake is always repayed at this price.
    mapping (address=> mapping(uint8 => uint)) private accounts;
    enum a {ETH,SE,stakedETH, stakeBuyBack, stakePrice, lastIRdate,interimIRdate}
    
    /// @dev Main varaibles controling the interest collection process
    /// @param precision humber of deciamal points used for everything but Ether. Ether is always debicted in way.
    /// @param price the curret ETH/USD price
    /// @param taxPCT the tax for staking Ether and witdhawing Ether
    /// @param ITPeriod the base period for interest rate number
    /// @param IRpct interest rate percentages
    /// @param IRcollect the period at which interest rate is collected
    /// @param fundingAmmount how much to fund the price feed on each requst
    uint precision;
    uint price;
    uint lastPriceDate;
    uint taxPCT;
    uint IRperiod;
    uint IRpct;
    uint IRcollect;
    uint fundingAmmount;
    
    /// @dev This is the price feed contract. An instance here is needed in otrder to fore the update function
    EthPriceFeed ethPrice;
    
    /// @dev We set the initial parameters values in the constructor for easier setup
    function StructuredEther() public {
        owner = msg.sender;
        precision = 3;
        price = 1000000;
        taxPCT = 50;
        IRperiod = 1 years;
        IRpct = 1200000;
        IRcollect = 1 minutes;
        fundingAmmount = 200*1 finney;
    }
    
    /// @dev Modifier allowing only the owner or the funding contract to call certain functions
    modifier ownerOnly() {
        require (msg.sender == owner || msg.sender == fundAddress);
        _;
    }
    
    /// @dev Making sure the requested ammount is greated than 0
    modifier nonZero(uint amount) {
        require (amount > 0);
        _;
    }
    
    /// @dev Ensure all percentages are <=100%
    modifier pctCap(uint pct) {
        require (pct <= 1 * 10**precision);
        _;
    }
    
    /// @dev strart uodates is price data is too old
    modifier triggersUpdates() {
        _;
        
        if (now.sub(lastPriceDate) > 10 minutes && accounts[owner][uint8(a.ETH)] > fundingAmmount) {
            lastPriceDate = now;
            ethPrice.startUpdates();
        }
    }
    
    /// @dev collects interest rate at appropriate times
    modifier collectsInterest() {
        require (msg.sender != owner);
        
        collectGlobalInterest(now);
        
        uint interest =  calcIR(msg.sender,now);
    
        accounts[msg.sender][uint8(a.stakedETH)] = accounts[msg.sender][uint8(a.stakedETH)].sub(interest);
        accounts[owner][uint8(a.stakedETH)] = accounts[owner][uint8(a.stakedETH)].sub(interest);
        
        accounts[msg.sender][uint8(a.lastIRdate)] = now;
        accounts[owner][uint8(a.interimIRdate)] = now;
        _;
    }
    
    /// @dev Fallback fundtion used for depositing funds. Upon calling will add the deposited ETH to the account's balance.
    function () public payable triggersUpdates{
        accounts[msg.sender][uint8(a.ETH)] = accounts[msg.sender][uint8(a.ETH)].add(msg.value);
    }
    
    /// @dev Return all the account data for a given address. Owner can invoke it for any address, everyone else only for their own.
    /// @return all the enums of the account. Described at the beginning of the document
    function getDynamicData(address account) public view returns (uint,uint,uint,uint,uint,uint,uint) {
        if(msg.sender != owner) {account=msg.sender;}
        
        uint available = 0;
        if(accounts[owner][uint8(a.ETH)] > fundingAmmount) {
          available = accounts[owner][uint8(a.ETH)].sub(fundingAmmount);  
        }
        
        return (
            accounts[account][uint8(a.ETH)],
            accounts[account][uint8(a.SE)],
            accounts[account][uint8(a.stakeBuyBack)],
            accounts[account][uint8(a.stakePrice)],
            price,
            available,
            this.balance
        );
    }
    
    /// @dev this needs to be in a seeprate function otherwise the compiler retursn Stack Too Deep
    /// @return the staked ether minus the expected interest rate on it
    function getStakedETH(address account) public view returns(uint) {
        if(msg.sender != owner) {account=msg.sender;}
        uint interest = 0;
        
        if(account != owner) {interest =  calcIR(account, now);}
        else {interest =  calcIR(account, now,accounts[account][uint8(a.interimIRdate)]);}
      
        uint staked = accounts[account][uint8(a.stakedETH)].sub(interest);
        
        return staked;
    }
    
    /// @dev get all the static data which does not change often
    /// @return basic calculation information
    function getStaticData() public view returns(uint,uint,uint,uint) {
        return (
            precision,
            IRperiod,
            IRpct,
            IRcollect
        );
    }
    
    /// @dev Function used to modify the price. Every time when the price is updated, attempt to collect interest.
    /// @param newPrice ETH/USD price expected with same precision as the precision parameter
    function setPrice(uint newPrice, uint updateTime) public ownerOnly {
        price = newPrice;
        lastPriceDate = updateTime;
        collectGlobalInterest(now);
    }
    
    /// @dev allow the owner to configure the IRpct
    /// @param _IR new interest rate
    function setIR(uint _IR) public ownerOnly {
        IRpct = _IR;
    }
    
    /// @dev Sell your ether and buy Structured ether. Taxes are collected based on the stake amount. All taxes are trasnfered to the owners account and accessable for further funding.
    /// The stake price is caclulated as volume weighted average of all the stakes. Thus you alays have only one price at which to rebuy your stake
    /// @param amount this is the amount of ether you want to sell ot stake
    /// @param stake this is the % of ammount used to stake. If it is 0 then this is a pure buy operation. If it is anywhere between > 0 and <= 100%, the specified % will be used for staking
    /// and the rest will be used for Buying.
    function sellEther(uint amount, uint stake) public nonZero(amount) pctCap(stake) triggersUpdates collectsInterest {
        
        uint brutStake = amount.mul(stake).div(10**precision);
        uint netBuy = amount.sub(brutStake);
        uint tax = brutStake.mul(taxPCT).div(10**precision);
        uint netStake = brutStake.sub(tax);
        
        accounts[msg.sender][uint8(a.ETH)] = accounts[msg.sender][uint8(a.ETH)].sub(brutStake.add(netBuy));
        accounts[msg.sender][uint8(a.SE)] = accounts[msg.sender][uint8(a.SE)].add(netStake.add(netBuy).mul(price).div(1 ether));
        
        accounts[owner][uint8(a.ETH)] = accounts[owner][uint8(a.ETH)].add(netBuy);
        
        if (stake > 0) {
            uint stakedETH = accounts[msg.sender][uint8(a.stakedETH)];
            uint stakeBuyBack = accounts[msg.sender][uint8(a.stakeBuyBack)];
            uint stakePrice = accounts[msg.sender][uint8(a.stakePrice)];
            
            accounts[msg.sender][uint8(a.stakedETH)] = stakedETH.add(netStake);
            accounts[owner][uint8(a.stakedETH)] = accounts[owner][uint8(a.stakedETH)].add(netStake);
            
            accounts[msg.sender][uint8(a.stakeBuyBack)] = stakeBuyBack.add(netStake.mul(price).div(1 ether));
            accounts[msg.sender][uint8(a.stakePrice)] = ((stakedETH.mul(stakePrice)).add(netStake.mul(price))).div(stakedETH.add(netStake));
            
            accounts[owner][uint8(a.ETH)] = accounts[owner][uint8(a.ETH)].add(tax);
        }
    }
    
    /// @dev Sell your structured Ether and buy Ether as the current rate.
    //  @param  amount - how much ether you want to buy
    function buyEther(uint amount) public nonZero(amount) triggersUpdates{
        accounts[owner][uint8(a.ETH)] = accounts[owner][uint8(a.ETH)].sub(amount);
        accounts[msg.sender][uint8(a.ETH)] = accounts[msg.sender][uint8(a.ETH)].add(amount);
        accounts[msg.sender][uint8(a.SE)] = accounts[msg.sender][uint8(a.SE)].sub(amount.mul(price).div(1 ether));
    }
    
    /// @dev Redeem your staked ether. This always happens at the stake price. You cannot redeem more than you have staked
    /// @param amount - how much ethers you want to redeem from your stake
    function redeemStake(uint amount) public nonZero(amount) triggersUpdates collectsInterest {
        uint SEAmount = amount.mul(accounts[msg.sender][uint8(a.stakePrice)]).div(1 ether);
        accounts[msg.sender][uint8(a.SE)] = accounts[msg.sender][uint8(a.SE)].sub(SEAmount);
        accounts[msg.sender][uint8(a.stakeBuyBack)] = accounts[msg.sender][uint8(a.stakeBuyBack)].sub(SEAmount);
        
        accounts[msg.sender][uint8(a.stakedETH)] = accounts[msg.sender][uint8(a.stakedETH)].sub(amount);
        accounts[owner][uint8(a.stakedETH)] = accounts[owner][uint8(a.stakedETH)].sub(amount);
        
        accounts[msg.sender][uint8(a.ETH)] = accounts[msg.sender][uint8(a.ETH)].add(amount);
    }
    
    /// @dev function to withdraw ethers from the contract. You can only withdraw ether , not stakedETH and not Structured ether
    /// @param amount - how much ether to withdraw
    function withdrawEther(uint amount) public {
        uint tax = amount.mul(taxPCT).div(10**precision);
        accounts[msg.sender][uint8(a.ETH)] = accounts[msg.sender][uint8(a.ETH)].sub(amount);
        accounts[owner][uint8(a.ETH)] = accounts[owner][uint8(a.ETH)].add(tax);
        msg.sender.transfer(amount.sub(tax));
    }
    
    
    /// @dev collect inetrest on all staked ether. Lather the inidvidual accounts will catch up when they trigger a collectsInterest() function
    /// @param dateTo the cutoff date for the collection, generally = now
    function collectGlobalInterest(uint dateTo) internal {
        uint interest = calcIR(owner, dateTo);
        accounts[owner][uint8(a.ETH)] = accounts[owner][uint8(a.ETH)].add(interest);
        accounts[owner][uint8(a.lastIRdate)] = dateTo;
    }

    
    /// @dev Function used to connect this contract to the Prce feed.
    /// @param addr - the address of the price feed
    function setFundingAddress(address addr) public ownerOnly {
        fundAddress = addr;
        ethPrice = EthPriceFeed(addr);
    }
    
    /// @dev function to fund the price feed. Can be called only by it of the owner. This is needed in order to recieve fresh data.
    function fundPriceFeed() public ownerOnly {
        if (accounts[owner][uint8(a.ETH)] > fundingAmmount) {
            accounts[owner][uint8(a.ETH)] = accounts[owner][uint8(a.ETH)].sub(fundingAmmount);
            fundAddress.transfer(fundingAmmount);
            ethPrice.startUpdates();
        }
    }
    
    /// @dev calculates the interest of an account given a date
    /// @param account the account for which to caclulate the IR
    /// @param cutoffDate date to which the interest to be cauclaulted
    function calcIR(address account, uint cutoffDate) internal view returns(uint){
        uint interimIR =  accounts[account][uint8(a.lastIRdate)];
        uint interest =  accounts[account][uint8(a.stakedETH)].mul(cutoffDate.sub(interimIR)).mul(IRpct).div(IRperiod).div(10**precision);
        if (interest > accounts[account][uint8(a.stakedETH)]) {interest = accounts[account][uint8(a.stakedETH)];}
        return interest;
    }
    
    /// @dev calculates the interest of an account given a date with a reference date for the cauclultion
    /// @param account the account for which to caclulate the IR
    /// @param cutoffDate date to which the interest to be cauclaulted
    function calcIR(address account, uint cutoffDate, uint referenceDate) internal view returns(uint){
        uint interest =  accounts[account][uint8(a.stakedETH)].mul(cutoffDate.sub(referenceDate)).mul(IRpct).div(IRperiod).div(10**precision);
        if (interest > accounts[account][uint8(a.stakedETH)]) {interest = accounts[account][uint8(a.stakedETH)];}
        return interest;
    }
    
    /// @dev Neeed while still testing to be removed in the final version
    function kill() public ownerOnly{
        selfdestruct(owner);
    }
}


// ----------------------------------------------------------------------------
// @topic Safe maths
// @author Taken from https://theethereum.wiki/w/index.php/ERC20_Token_Standard
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
 