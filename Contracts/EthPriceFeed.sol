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
    
    /// @dev public method for getting the price getPriceData
    /// @return the price, when it was last updated and the decimal precision
    function getPriceData() view public returns(uint256, uint256, uint8) {
        return (price, lastUpdate, priceMultiple);
    }
    
    /// @dev Oracalize callback function. After recieveing new price data, calls to update the parent. Then recursevely calls itslef to ensure next update. 
    /// parseInt is an oracalize string to uint covertor
    /// @param myId internal to oracalize, ID of the user
    /// @param result string containing the price data
    function __callback(bytes32 myId, string result) public {
        if (msg.sender != oraclize_cbAddress()) revert();
        price                       = parseInt(result,priceMultiple);
        lastUpdate                  = now;
        LogPriceUpdated(result);
        dad.setPrice(price, lastUpdate);
        updatePrice();
    }
    
    /// @dev retrieve a query string parameters
    /// @param id name of the parameter
    function getQuery(bytes24 id) view public returns(string) {
        return query[id];
    }
    
    /// @dev set a query string parameter
    /// @param id name of the parameter
    /// @value value to set
    function setQuery(bytes24 id, string value) public ownerOnly {
        query[id] = value;
    }
    
    /// @dev retrieve a query int parameter
    /// @param id name of the parameter
    function getParams(bytes24 id) view public returns(uint) {
        return params[id];
    }
    
    /// @dev set a query uint parameter
    /// @param id name of the parameter
    /// @value value to set
    function setParams(bytes24 id, uint value) public ownerOnly {
        params[id] = value;
    }
    
    ///@dev connection to the contract which will do the fubding
    ///@param addr address of the parent funding contract
    function setFundingAddress(address addr) public ownerOnly {
        fundingAddress = addr;
        dad = StructuredEther(addr);
    }
    
    ///@dev default fallback function for funding
    function () public payable {
    }
    
    ///@dev force to restart updates. Only doable by owner or funding contract
    function startUpdates() public {
        if (msg.sender == owner || msg.sender == fundingAddress) updatePrice();
    }
    
    ///@dev main function for the price updates. If there is not enough balance, ask the parent contract for cash. Otherwise shedule an Oracalize call based on the time parameter.
    /// make sure calls do not run in parallell
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
    
    ///@dev destoy the contract in order to stop the Oracalize calls
    function kill() public ownerOnly{
        selfdestruct(owner);
    }
}

