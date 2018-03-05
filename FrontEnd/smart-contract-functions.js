window.addEventListener('load', function() {
  if (typeof web3 !== 'undefined') {
    window.web3 = new Web3(web3.currentProvider);
  } else {
    document.getElementById('network').innerHTML = "Failed connecting to network, please make sure you have <b>MetaMask</b> enabled and refresh the page!"
  }
  showGetBalance();
  showNetwork();
  showContractData();
	fetchAccountBalance();
})

function showNetwork() {
    web3.version.getNetwork((err, res) => {
      var output = "";
  
      if (!err) {
        if(res > 1000000000000) {
          output = "testrpc";
        } else {
          switch (res) {
            case "1":
              output = "Mainnet";
              break
            case "2":
              output = "Morden";
              break
            case "3":
              output = "Ropsten";
              break
            case "4":
              output = "Rinkeby";
              break
            default:
              output = "unknown network = "+res;
          }
        }
      } else {
        output = "Error";
      }
      document.getElementById('network').innerHTML =  output;
    })
}

function showGetBalance() {
    web3.eth.getAccounts((err, res) => {
      var output = "";
      if (!err) {
          var defaultAccount = web3.eth.defaultAccount;
          web3.eth.getBalance(defaultAccount, (err2, res2) => {
            if (!err2) {
							document.getElementById('userAddress').innerHTML = defaultAccount;
							document.getElementById('balance').innerHTML = web3.fromWei(res2, 'ether');
							metaMaskEther = web3.fromWei(res2, 'ether');
            } else {
              output = "Unable to get balance.";
              document.getElementById('balance').innerHTML = output;
            }
          })
      } else {
        output = "Unable to get main account";
        document.getElementById('balance').innerHTML = output;
      }
    })
    setTimeout(showGetBalance, 5000);
}

function showContractData() {
    document.getElementById('contractAddress').innerHTML = "<b>"+contractAddress+"</b>";
}

function fetchAccountBalance() {
    web3.eth.getAccounts((err, res) => {
      var output = "";
      if (!err) {
        var defaultAccount = web3.eth.defaultAccount;
        let contract = web3.eth.contract(contractABI).at(contractAddress);

        contract.getAccountData(defaultAccount, (err2,res2) => {
          if (!err2) {
						output = res2;
						availableEther = Math.floor(web3.fromWei(res2[0], 'ether')*1000)/1000;
						stakedEther = Math.floor(web3.fromWei(res2[2], 'ether')*1000)/1000;
						structuredEther = (res2[1])/(1000);
						stakedPrice = res2[4]/(1000);
						stakedBuyBack = res2[3]/(1000);
            document.getElementById('ETH').innerHTML = availableEther;
						document.getElementById('SE').innerHTML = structuredEther;
						document.getElementById('stakedETH').innerHTML = stakedEther;
						document.getElementById('stakedBuyback').innerHTML = stakedBuyBack;
						document.getElementById('stakedPrice').innerHTML = stakedPrice;
						document.getElementById('IR').innerHTML = "HC 12% per 1 year";
          } else {
            output = "Error2";
          }
        })
      } else {
        output = "Error1";
      }
    })
    setTimeout(fetchAccountBalance, 5000);
}


function changedSelection(val) {
			switch (val) {
				case "Please Select":
					bottomButton(0,"");
					clearSlider();
					mainHeading("");
				break;
				case "Deposit Ether":
					bottomButton(1,"Deposit");
					singleSlider(0,metaMaskEther*1000,"min-range");
					mainHeading("Amount of <span class='tooltip'>Finney<span class='tooltiptext'>Finney is a standard measure for Ether. 1000 finney = 1 ether</span></span> to deposit.");
				break;
				case "Sell/Stake Ether":
					bottomButton(1,"Stake");
					singleSlider(0,availableEther*1000,"range");
					mainHeading("Total amount of <span class='tooltip'>Finney<span class='tooltiptext'>Finney is a standard measure for Ether. 1000 finney = 1 ether</span></span> to sell and what part of it to <span class='tooltip'>stake instead<span class='tooltiptext'>Exmple: You want to sell 0.5 Ether = 500 Finney. If you select 0-500 (stake amount - buy amount) on the slider below, you will recieve (0.5 * ETH/USD Price) in Structured Ether. You can later buy back ETH at the current price for your Structured Ether. If you select 250-500 instead, you will still recieve (0.5 * ETH/USD Price , minus 5% tax) in Structured Ether but half of it (250/500 = 50%) would be in a form of a loan, you will also have 0.250 staked Ether. You can later recieve your staked Ether (minus interest rate) at the exact same price which you paid for it (regardless of the curent market price). In the meantime you can use your Structured Ether to freely buy more ether, which you can stake again.</span></span>.");
				break;
				case "Redeem Stake":
					singleSlider(0,Math.floor(Math.min(stakedEther*1000,stakedBuyBack)),"min-range");
					bottomButton(1,"Redeem");
					mainHeading("<span class='tooltip'>Redeem<span class='tooltiptext'>You can redeem your staked ether (minus interest rate) at the exact same price which you paid for it.</span></span> Stake. Maximum amount to reddem is based on your Sraked Ether and Structured Ether available.");
				break;
				case "Buy Ether":
					singleSlider(0,Math.floor(structuredEther/price*1000),"min-range");
					bottomButton(1,"Buy");
					mainHeading("Amount of <span class='tooltip'>Finney<span class='tooltiptext'>Finney is a standard measure for Ether. 1000 finney = 1 ether</span></span> to buy at the <span class='tooltip'>current market price<span class='tooltiptext'>Please note that the price is a live feed and it might change between the point of issuing the order and executing the transation. If you want to be sure your order is filled, always make the order less then your total amount of available structured Ether.</span></span>.");
				break;
				case "Withdraw Ether":
					bottomButton(1,"Withdraw");
					singleSlider(0,availableEther*1000,"min-range");
					mainHeading("Amount of <span class='tooltip'>Finney<span class='tooltiptext'>Finney is a standard measure for Ether. 1000 finney = 1 ether</span></span> to withdraw (subject to 5% fee).");
				break;
				default:
					bottomButton(0,"");
					mainHeading("");
					clearSlider();
			}
	}
	
	function bottomButton(show,name) {
		if (show) {
			document.getElementById('submit').innerHTML = "<button type='button' id='price' onclick='"+name+"GoButton()'>"+name+"</button>";
		} else {
			document.getElementById('submit').innerHTML = "";
		}
	}

	function DepositGoButton() {
		var obj = $("#slider").data("roundSlider");
		var val = obj.option("value");
		var message = {to:contractAddress, value: web3.toWei(val, 'finney')};
		web3.eth.sendTransaction(message, (err, res) => {
      var output = "";
      if (!err) {
        alert("Transaction successfull. Transaction hash: "+ res);
      } else {
        alert("Error sending the transaction!");
      }
      document.getElementById('transactionResponse').innerHTML = "Transaction response= " + output + "<br />";
    })
	}

	function WithdrawGoButton() {
		var obj = $("#slider").data("roundSlider");
		var val = obj.option("value");
		let contract = web3.eth.contract(contractABI).at(contractAddress);

    contract.withdrawEther(web3.toWei(val, 'finney'), (err,res) => {
      if (!err) {
				alert("Transaction submitted succesfully. Transaction hash: "+ res);
      } else {
        alert("Error sending the transaction!");
      }
    })
	}

	function StakeGoButton() {
		var obj = $("#slider").data("roundSlider");
		var split = obj.option("value").split(",");
		var val1 = parseInt(split[0]);
		var val2 = parseInt(split[1]);
		
		console.log(val1);
		console.log(val2);
		let contract = web3.eth.contract(contractABI).at(contractAddress);

    contract.sellEther(web3.toWei(val2, 'finney'), (val1/val2)*1000, (err,res) => {
      if (!err) {
				alert("Transaction submitted succesfully. Transaction hash: "+ res);
      } else {
        alert("Error sending the transaction!");
      }
    })
	}

	function RedeemGoButton() {
		var obj = $("#slider").data("roundSlider");
		var val = obj.option("value");
		let contract = web3.eth.contract(contractABI).at(contractAddress);

    contract.redeemStake(web3.toWei(val, 'finney'), (err,res) => {
      if (!err) {
				alert("Transaction submitted succesfully. Transaction hash: "+ res);
      } else {
        alert("Error sending the transaction!");
      }
    })
	}

	function BuyGoButton() {
		var obj = $("#slider").data("roundSlider");
		var val = obj.option("value");
		let contract = web3.eth.contract(contractABI).at(contractAddress);

    contract.buyEther(web3.toWei(val, 'finney'), (err,res) => {
      if (!err) {
				alert("Transaction submitted succesfully. Transaction hash: "+ res);
      } else {
        alert("Error sending the transaction!");
      }
    })
	}

function mainHeading(header) {
	document.getElementById('mainHeader').innerHTML = header;
}
	
function singleSlider(min, max,type) {
	$("#slider").roundSlider("destroy");
	$("#slider").roundSlider({
    handleShape: "dot",
    width: 80,
    radius: 250,
    value: min,
		min: min,
		max: max,
    sliderType: type,
    handleSize: "+10",
    mouseScrollAction: true
	});
}


function clearSlider() {
	$("#slider").roundSlider("destroy");

}

var metaMaskEther = 0;
var availableEther = 0;
var stakedEther = 0;
var structuredEther = 0;
var stakedPrice = 0;
var price = 1000;
const contractAddress = "0x87486149fdfacdc871d96a281978b8fb77f9b630";
const contractABI = [
	{
		"constant": true,
		"inputs": [
			{
				"name": "account",
				"type": "address"
			}
		],
		"name": "getAccountData",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			},
			{
				"name": "",
				"type": "uint256"
			},
			{
				"name": "",
				"type": "uint256"
			},
			{
				"name": "",
				"type": "uint256"
			},
			{
				"name": "",
				"type": "uint256"
			},
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": true,
		"inputs": [],
		"name": "getBalance",
		"outputs": [
			{
				"name": "",
				"type": "uint256"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "kill",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "buyEther",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "addr",
				"type": "address"
			}
		],
		"name": "setFundingAddress",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "account",
				"type": "address"
			}
		],
		"name": "collectAccountInterest",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [],
		"name": "fundPriceFeed",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdrawEther",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "newPrice",
				"type": "uint256"
			}
		],
		"name": "setPrice",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"payable": true,
		"stateMutability": "payable",
		"type": "fallback"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "redeemStake",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"constant": false,
		"inputs": [
			{
				"name": "amount",
				"type": "uint256"
			},
			{
				"name": "stake",
				"type": "uint256"
			}
		],
		"name": "sellEther",
		"outputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "function"
	}
];

