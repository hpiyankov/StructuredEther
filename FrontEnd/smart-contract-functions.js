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
						availableEther = web3.fromWei(res2[0], 'ether');
            document.getElementById('ETH').innerHTML = web3.fromWei(res2[0], 'ether');
						document.getElementById('SE').innerHTML = (res2[1])/(1000);
						document.getElementById('stakedETH').innerHTML = web3.fromWei(res2[2], 'ether');
						document.getElementById('stakedBuyback').innerHTML = res2[3]/(1000);
						document.getElementById('stakedPrice').innerHTML = res2[4]/(1000);
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
					mainHeading("Amount of Ether to deposit in 0.001 (1000 = 1 ether)");
				break;
				case "Sell/Stake Ether":
					bottomButton(1,"Stake");
					singleSlider(0,availableEther*1000,"range");
					mainHeading("Amount of Ether to sell in 0.001 (1000 = 1 ether) and what part of it to stake instead (subject to 5% fee).");
				break;
				case "Redeem Stake":
					bottomButton(1,"Redeem");
				break;
				case "Buy Ether":
				bottomButton(1,"Buy");
				break;
				case "Withdraw Ether":
					bottomButton(1,"Withdraw");
					singleSlider(0,availableEther*1000,"min-range");
					mainHeading("Amount of Ether to withdraw (subject to 5% fee) in 0.001 (1000 = 1 ether).");
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

