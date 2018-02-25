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
        params["cutoff"]            = 0.1 * 1 ether;
        
        query["query"]              = "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd";
        query["type"]               = "URL";
        
        priceMultiple               = 10;
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
        return this.balance;
    }
    
    function getFundingAddress() view public returns(address) {
        return fundingAddress;
    }
    
    function setFundingAddress(adress addr) public ownerOnly {
        fundingAddress = addr;
        dad = Dad(addr);
    }
    
    
    function deposit() public payable {
    }
    
    function depositAndUpdate() public payable {
        require(msg.sender==owner || msg.sender == fundingAddress);
        updatePrice();
    }

    
    function updatePrice() private {
        require(now - lastOracalizeCall > (params["frequency"] -10) * 1 seconds);
        if (this.balance < params["cutoff"] * 1 ether) {
            AskDadForCash("Insufficient ammount to peform query, asking parent for cash...");
            dad.fundPriceFeed();
        } else {
            LogNewOraclizeQuery("Oraclize query was sent, standing by for the answer..");
            oraclize_query(params["frequency"]  , query["type"] , query["query"]);
            lastOracalizeCall = now;
        }
    }
    
    function kill() public ownerOnly{
        selfdestruct(owner);
    }
}

contract Dad {
    function fundPriceFeed() public {
    }
}
