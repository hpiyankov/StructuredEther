window.addEventListener('load', function() {

  // Checking if Web3 has been injected by the browser (Mist/MetaMask)
  if (typeof web3 !== 'undefined') {
  // Use Mist/MetaMask's provider
    window.web3 = new Web3(web3.currentProvider);
  } else {
    document.getElementById('network').innerHTML = "Failed connecting to network, please make sure you have <b>MetaMask</b> enabled and refresh the page!"
  }
  showGetBalance();
  showNetwork();
  showContractData();
	fetchAccountBalance();
	$("#slider").roundSlider({
    handleShape: "dot",
    width: 80,
    radius: 200,
    value: 41,
    min: "5",
    sliderType: "min-range",
    handleSize: "+10",
    mouseScrollAction: true
	});
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
            } else {
              output = "Error2";
              document.getElementById('balance').innerHTML = output;
            }
          })
      } else {
        output = "Error1";
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



const contractAddress = "0x87486149fdfacdc871d96a281978b8fb77f9b630"
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

function changedSelection() {
	console.log("Here");
}