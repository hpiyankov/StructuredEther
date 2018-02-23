pragma solidity ^0.4.18;

/// We need to use oraacles for the Ether price
import "github.com/oraclize/ethereum-api/oraclizeAPI.sol";

contract StructuredEther is usingOraclize {
    
    address private owner;
    
    string private ticker;
    string private API_address;
    string private lastPrice;
    uint private lastPriceUpdate;
    
    event LogPriceUpdated(string price);
    event LogNewOraclizeQuery(string description);
    
    enum _collateralType {ETH,SE}
    
    ///Structure for storing deals made in the contract
    struct deal {
        uint startTime;
        uint collateralType;
        uint collateralPCT;
        uint leveregePCT;
    }
    
    
    modifier ownerOnly () {
        require (msg.sender == owner);
        _;
    }
    
    function StructuredEther() public payable {
        owner = msg.sender;
    }
    
    function deposit() public payable {
        
    }
    
    function getBalance() public view returns(uint) {
        return this.balance;
    }
    
    function getPrice() view public returns(string, uint) {
        return (lastPrice, lastPriceUpdate);
    }
    
    function getQueryCost() public payable returns(uint) {
        return oraclize_getPrice("URL");
    }
     
    
    function updatePrice() public payable {
        if (oraclize_getPrice("URL") > this.balance) {
            LogNewOraclizeQuery("Oraclize query was NOT sent, please add some ETH to cover for the query fee");
        } else {
            LogNewOraclizeQuery("Oraclize query was sent, standing by for the answer..");
            oraclize_query("URL", "json(https://api.coinmarketcap.com/v1/ticker/ethereum/).price_usd");
        }
    }
    
    function __callback(bytes32, string result) public {
        if (msg.sender != oraclize_cbAddress()) revert();
        lastPrice = result;
        lastPriceUpdate = now;
        LogPriceUpdated(result);
    }
    
}