pragma solidity ^0.4.18;
import "github.com/oraclize/ethereum-api/oraclizeAPI.sol";
import "./StructuredEther.sol";

/// @title  Ethereum Price Feed 
/// @author Hristo Piyankov
/// @notice Price feed contract, prividng sheduled updated ETH/USD price using Oracalize and coinmarketcap

contract EthPriceFeed is usingOraclize {
    address private owner;
    
    /// @dev The Parent address from which funding is requested to keep on calling Oracalize
    address private fundingAddress;
    
    /// @dev a skeleton of the parent contract used for defining the calls
    StructuredEther dad;
    
    /// @dev mapping of all the string  query parameters
    mapping (bytes24=>string) private query;
    
    /// @dev mapping of all the int query parameters
    mapping (bytes24=>uint) private params;
    
    /// @param price the last recorded price
    /// @param lastUpdate date of the last oracalie __callback
    /// @param lastOracalizeCall date when oracalize was last called
    /// @param priceMultiple the decimal precision
    uint256 private price;
    uint256 private lastUpdate;
    uint256 private lastOracalizeCall;
    uint8 private priceMultiple;   
    
    /// @dev loggind of events related to calling oracalize
    event LogPriceUpdated(string price);
    event LogNewOraclizeQuery(string description);
    event AskDadForCash(string description);
 
    /// @dev functions callable only by the owner
    modifier ownerOnly() {
        require(msg.sender == owner);
        _;
    }
    
    /// @dev inistial values for the parameters
    /// ParseInt is an oracalie function for decimal string to int conversion
    function EthPriceFeed() public {
        owner = msg.sender;
        
        params["frequency"]         = 60;
        params["cutoff"]            = 100;
        
        query["query"]              = "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).0.price_usd";
        query["type"]               = "URL";
        
        priceMultiple               = 3;
        price                       = parseInt("1000.010",priceMultiple);
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
        dad.setPrice(price, lastUpdate);
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
        dad = StructuredEther(addr);
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

