window.addEventListener('load', function() {
  if (typeof web3 !== 'undefined') {
    window.web3 = new Web3(web3.currentProvider);
  } else {
    alert("Failed connecting to network, please make sure you have <b>MetaMask</b> enabled and refresh the page!");
	}
	fetchStaticData();
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
        alert("Error getting network");
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
              alert("Unable to get balance.");
            }
          })
      } else {
        alert("Unable to get main account");
      }
    })
    setTimeout(showGetBalance, 5000);
}

function showContractData() {
		document.getElementById('contractAddress').innerHTML = "<b>"+contractAddress+"</b>";
		document.getElementById('priceFeed').innerHTML = "<b>"+priceFeedAddress+"</b>";
}

function fetchStaticData() {
	var defaultAccount = web3.eth.defaultAccount;
	let contract = web3.eth.contract(contractABI).at(contractAddress);

	contract.getStaticData( (err,res) => {
		if (!err) {
			precision = 10**res[0];
			IRperiod = res[1];
			IRpct = res[2] / precision;
			IRcollect = res[3];
			document.getElementById('IR').innerHTML = IRpct*100 + "% IR per " + IRperiod/60/60/24 + "days collected every " + IRcollect/60 + " minutes";
		} else {
			 alert("Error getting static data");
		}
	})
}

function fetchAccountBalance() {
    web3.eth.getAccounts((err, res) => {
      var output = "";
      if (!err) {
        var defaultAccount = web3.eth.defaultAccount;
        let contract = web3.eth.contract(contractABI).at(contractAddress);

        contract.getDynamicData(defaultAccount, (err2,res2) => {
          if (!err2) {
						availableEther = Math.floor(web3.fromWei(res2[0], 'ether')*precision)/precision;
						structuredEther = res2[1]/(precision);
						stakedBuyBack = res2[2]/(precision);
						stakedPrice = res2[3]/(precision);
						price = res2[4]/(precision);
						available = Math.floor(web3.fromWei(res2[5], 'ether')*precision)/precision;
						liquidity = Math.floor(web3.fromWei(res2[6], 'ether')*precision)/precision;
					
            document.getElementById('ETH').innerHTML = availableEther;
						document.getElementById('SE').innerHTML = structuredEther;
						document.getElementById('stakedBuyback').innerHTML = stakedBuyBack;
						document.getElementById('stakedPrice').innerHTML = stakedPrice;
						document.getElementById('priceUSD').innerHTML = price;
						document.getElementById('availETH').innerHTML = available;
						document.getElementById('liquidETH').innerHTML = liquidity;
          } else {
            alert("Error getting balances");
          }
				})
				contract.getStakedETH(defaultAccount, (err3,res3) => {
          if (!err3) {
						stakedEther = Math.floor(web3.fromWei(res3, 'ether')*precision)/precision;
						console.log(res3);
						document.getElementById('stakedETH').innerHTML = stakedEther;
          } else {
            alert("Error getting balances");
          }
        })
      } else {
        alert("Error getting account");
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
					singleSlider(0,Math.floor(metaMaskEther*1000),"min-range");
					mainHeading("Amount of <span class='tooltip'>Finney<span class='tooltiptext'>Finney is a standard measure for Ether. 1000 finney = 1 ether</span></span> to deposit.");
				break;
				case "Sell/Stake Ether":
					bottomButton(1,"Stake");
					singleSlider(0,Math.floor(availableEther*1000),"range");
					mainHeading("Total amount of <span class='tooltip'>Finney<span class='tooltiptext'>Finney is a standard measure for Ether. 1000 finney = 1 ether</span></span> to sell and what part of it to <span class='tooltip'>stake instead<span class='tooltiptext'>Exmple: You want to sell 0.5 Ether = 500 Finney. If you select 0-500 (stake amount - buy amount) on the slider below, you will recieve (0.5 * ETH/USD Price) in Structured Ether. You can later buy back ETH at the current price for your Structured Ether. If you select 250-500 instead, you will still recieve (0.5 * ETH/USD Price , minus 5% tax) in Structured Ether but half of it (250/500 = 50%) would be in a form of a loan, you will also have 0.250 staked Ether. You can later recieve your staked Ether (minus interest rate) at the exact same price which you paid for it (regardless of the curent market price). In the meantime you can use your Structured Ether to freely buy more ether, which you can stake again.</span></span>.");
				break;
				case "Redeem Stake":
					singleSlider(0,Math.floor(Math.min(stakedEther*1000,Math.floor(structuredEther/stakedPrice*precision))),"min-range");
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
					singleSlider(0,Math.floor(availableEther*1000),"min-range");
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

    contract.sellEther(web3.toWei(val2, 'finney'), (val1/val2)*precision, (err,res) => {
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
var price = 0;
var available = 0;
var precision = 0;
var IRperiod =0;
var IRpct =0;
var IRcollect = 0;
var liquidity = 0;
const contractAddress = "0x665ee07beb87de107f1f7b2181694b6cd82ac514";
const priceFeedAddress = "0xa371374e785219c2a2a06d8891fb0514d8750a0b";
const contractABI = [
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
		"constant": true,
		"inputs": [],
		"name": "getStaticData",
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
			}
		],
		"payable": false,
		"stateMutability": "view",
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
		"constant": true,
		"inputs": [
			{
				"name": "account",
				"type": "address"
			}
		],
		"name": "getDynamicData",
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
		"constant": false,
		"inputs": [
			{
				"name": "_IR",
				"type": "uint256"
			}
		],
		"name": "setIR",
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
		"constant": true,
		"inputs": [
			{
				"name": "account",
				"type": "address"
			}
		],
		"name": "getStakedETH",
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
		"inputs": [
			{
				"name": "newPrice",
				"type": "uint256"
			},
			{
				"name": "updateTime",
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
		"inputs": [],
		"payable": false,
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"payable": true,
		"stateMutability": "payable",
		"type": "fallback"
	}
];

