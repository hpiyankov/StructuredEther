pragma solidity ^0.4.18;
import "github.com/oraclize/ethereum-api/oraclizeAPI.sol";

contract EthPriceFeed is usingOraclize {
    address private owner;
    address private fundingAddress;
    
    Dad dad;
    
    mapping (bytes24=>string) private query;
    mapping (bytes24=>uint) private params;
    
    uint256 private price;
    uint256 private lastUpdate;
    uint256 private lastOracalizeCall;
    uint8 private priceMultiple;   
    
    event LogPriceUpdated(string price);
    event LogNewOraclizeQuery(string description);
    event AskDadForCash(string description);
 
    modifier ownerOnly() {
        require(msg.sender == owner);
        _;
    }
    
    function EthPriceFeed() public {
        owner = msg.sender;
        
        params["frequency"]         = 60;
        params["cutoff"]            = 100;
        
        query["query"]              = "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd";
        query["type"]               = "URL";
        
        priceMultiple               = 2;
        price                       = parseInt("1000.01",priceMultiple);
        lastUpdate                  = now;
    }
    
    function getPriceData() view public returns(uint256, uint256, uint8) {
        return (price, lastUpdate, priceMultiple);
    }
    
    function __callback(bytes32, string result) public {
        if (msg.sender != oraclize_cbAddress()) revert();
        price                       = parseInt(result,priceMultiple);
        lastUpdate                  = now;
        LogPriceUpdated(result);
        updatePrice();
    }
    
    function getQuery(bytes24 id) view public returns(string) {
        return query[id];
    }
    
    function setQuery(bytes24 id, string value) public ownerOnly {
        query[id] = value;
    }
    
    function getParams(bytes24 id) view public returns(uint) {
        return params[id];
    }
    
    function setParams(bytes24 id, uint value) public ownerOnly {
        params[id] = value;
    }
    
    function getBalance() view public returns(uint) {
        return this.balance / 1 finney;
    }
    
    function getFundingAddress() view public returns(address) {
        return fundingAddress;
    }
    
    function setFundingAddress(address addr) public ownerOnly {
        fundingAddress = addr;
        dad = Dad(addr);
    }
    
    function () public payable {
    }
    
    function startUpdates() public {
        if (msg.sender == owner || msg.sender == fundingAddress) updatePrice();
    }
    
    function updatePrice() private {
        ///Make sure we don't start too many parallel calls to Oracalize
        if (now - lastOracalizeCall < (params["frequency"] -20) * 1 seconds) revert();
        if (this.balance < params["cutoff"] * 1 finney) {
            AskDadForCash("Insufficient ammount to peform query, asking parent for cash...");
            dad.fundPriceFeed();
        } else {
            LogNewOraclizeQuery("Oraclize query was sent, standing by for the answer..");
            oraclize_query(params["frequency"]  , query["type"] , query["query"]);
            lastOracalizeCall = now;
        }
    }
    
    function withdraw(uint amount) public ownerOnly {
        uint value = amount * 1 finney;
        require(value < this.balance);
        msg.sender.transfer(value);
    }
    
    function kill() public ownerOnly{
        selfdestruct(owner);
    }
}

///Skeleton function for the deposit to the price feed. 
contract Dad {
    address private fundAddress;
    address private owner;
    EthPriceFeed ethPrice;
    
    event SendFundingToAddress(address addr);
    
    modifier ownerOnly() {
        require(msg.sender == owner || msg.sender == fundAddress);
        _;
    }
    
    function Dad() public {
        owner = msg.sender;
    }
    
    function setFundingAddress(address addr) public ownerOnly {
        fundAddress = addr;
        ethPrice = EthPriceFeed(addr);
    }
    
    function getBalance() view public returns(uint) {
        return this.balance / 1 finney;
    }
    
    
    function deposit() public payable {
    }
    
    ///function to fund the price feed. Can be called only by it of the owner
    function fundPriceFeed() public ownerOnly {
        if (this.balance > 101 * 1 finney) {
            SendFundingToAddress(fundAddress);
            fundAddress.transfer(101 * 1 finney);
            ethPrice.startUpdates();
        }
    }
    
    function kill() public ownerOnly{
        selfdestruct(owner);
    }
}