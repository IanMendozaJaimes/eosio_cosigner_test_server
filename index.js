const { Api, JsonRpc, RpcError } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      // development only

//const { JsSignatureProvider } = require('/home/ianonsio/Documents/seeds_proyect/test/greymassfuel-eosjs-demos/v20.0.0/eosjs/src/eosjs-jssig');

const fetch = require('node-fetch');                                    // node only; not needed in browsers
const util = require('util');                   // node only; native TextEncoder/Decoder
const ecc = require('eosjs-ecc');
const se = require('eosjs/dist/eosjs-serialize');
const EosApi = require('eosjs-api')

const config = require('./conf.json');

// everything is optional
const options = {
  httpEndpoint: config.host+":"+config.port, // default, null for cold-storage
  verbose: false, // API logging
  fetchConfiguration: {}
}

const eos = EosApi(options);

const rpc = new JsonRpc(config.host+":"+config.port, { fetch });
const signatureProvider = new JsSignatureProvider(["5KJdYuydWnKEtSP51PmJtNMqRZwiyUEmzjndmp9p3iK9MJwKpg7"]);
const textEncoder = new util.TextEncoder();
const textDecoder = new util.TextDecoder();
const eosjs = new Api({
	rpc,
	signatureProvider,
	textEncoder,
	textDecoder,
});


function readBody(req){
	return new Promise((resolve, reject) => {
		let body = [];
		req.on('error', reject);
		req.on('data', chunk => {
			body.push(chunk);
		});
		req.on('end', () => {
			body = Buffer.concat(body).toString();
			resolve(JSON.parse(body));
		});
	});
}

function JSONrespond(data, res){
	res.writeHead(200, {"Content-Type": "application/json"});
	var json = JSON.stringify(data);
	res.end(json);
}


function isValid(transaction) {
	let actions = transaction.actions;
	let aaccounts = config.allowedAccounts;
	let isValid = 0;

	return true

	for(let i = 0; i < actions.length; i++){	
		Object.entries(aaccounts).forEach(([key, value]) => {
			if(actions[i].account == key){
				let aa = value.actions;
				for(let j = 0; j < aa.length; j++){
					if(actions[i].name == aa[j]){
						isValid += 1;
					}
				}
			}
		});
		if(isValid >= 2){
			return true;
		}
	}
	return false;
}


function cosignHandler(abis, chainid, req, res){
	let bodyP = readBody(req);
	bodyP.then(data => {

		console.log(data)

		const requiredKeys = [ "EOS8PfAg4axdn2tE9DHsq7WffeYuFZ9E2XDHfSrpyuuzZEDjbQTEb" ];
		const serializedTransaction = new Uint8Array(new Buffer.from(data.packed_trx, 'hex'));
		const transaction = eosjs.deserializeTransaction(serializedTransaction);

		// console.log('Serialized Transaction:', serializedTransaction);
		console.log('Deserialized Transaction:', transaction);

		let isV = isValid(transaction);


		if(isValid(transaction)){
			eosjs.signatureProvider.sign({
		        chainId:chainId,
		        requiredKeys, 
		        serializedTransaction,
		    }).then(cT => {

		    	let signs = new Array();

		    	for(let i = 0; i < cT.signatures.length; i++){
		    	 	signs.push(cT.signatures[i]);
		    	}

		    	for(let i = 0; i < data.signatures.length; i++){
		    		signs.push(data.signatures[i]);
		    	}

		    	const combinedTransactionArgs = {
		    		packed_trx: data.packed_trx,
		    		compression: data.compression,
		    		packed_context_free_data: data.packed_context_free_data,
		    		signatures: signs
		    	};

		    	console.log(combinedTransactionArgs)

		    	console.log('###################################')
		    	console.log('###################################')
		    	console.log('###################################')
		    	console.log('###################################')
		    	// printing the actions
				console.log('uuuuuuh')
				a = transaction.actions;
				for(let i = 0; i < a.length; i++){
					console.log(a[i]);
					console.log(a[i].authorization);
					eosjs.deserializeActions(transaction.actions).then(as => {
						console.log('DESERIALIZED ACTIONS: ',as);
						console.log(as[1].authorization)
						console.log(as[1].data.actions)
						console.log(as[1].data.abi_hashes)
					});
				}

		    	eos.pushTransaction(
		    		combinedTransactionArgs
		    	).then(r => {
		    		console.log(r)
		    		JSONrespond(r, res);
		    	})
		    	.catch(err => {
		    		console.log('err2')
		    		console.log(err)
		    		JSONrespond(err, res);
		    	});
		    })
		    .catch(err => {
		    	console.log('err1')
		    	console.log(err)
		    	JSONrespond(err, res);
		    });
		}
		else{
			res.end();
		}
		

		

	});
}



var http = require('http'); 

var chainId = null;
var abis = new Array();


var server = http.createServer(function (req, res) {   //create web server

	res.setHeader("Access-Control-Allow-Origin", req.headers.origin)


    if(req.url != '/v1/chain/get_account')
		console.log(req.url);
	
	if(req.url == '/v1/chain/get_account'){
		let bodyP = readBody(req);
		bodyP.then((data) => {
			rpc.get_account(data.account_name).then((account) => {
				JSONrespond(account, res);
			}).catch(err => {
				console.log('error in get_account: ', err)
			});
		});
	}
	else if(req.url == '/v1/chain/get_info'){

		// chainId = '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11'

		// const getInfo = {
		// 		  server_version: 'a2317d38',
		// 		  chain_id: '4667b205c6838ef70ff7988f6e8257e8be0e1284a2f59699054a018f743b1d11',
		// 		  head_block_num: 68508048,
		// 		  last_irreversible_block_num: 68507719,
		// 		  last_irreversible_block_id: '0415584785f635a29dedd75b4e408ba60c139e3a9fd59a10d50da03485205196',
		// 		  head_block_id: '041559903823de40bf7fd8e8953ecd12165fe689f02769efc438d927e9666797',
		// 		  head_block_time: '2020-01-14T20:34:08.000',
		// 		  head_block_producer: 'telosmiamibp',
		// 		  virtual_block_cpu_limit: 200000000,
		// 		  virtual_block_net_limit: 1048576000,
		// 		  block_cpu_limit: 199900,
		// 		  block_net_limit: 1048576,
		// 		  server_version_string: 'v1.8.5',
		// 		  fork_db_head_block_num: 68508048,
		// 		  fork_db_head_block_id: '041559903823de40bf7fd8e8953ecd12165fe689f02769efc438d927e9666797'
		// 		}

		// JSONrespond(getInfo, res);

		rpc.get_info().then(result => {
			chainId = result.chain_id;
			console.log(result)
			JSONrespond(result, res);
		});
	}
	else if(req.url == '/v1/chain/get_block'){

		// const getBlock = {
		// 		  timestamp: '2020-01-14T20:34:06.500',
		// 		  producer: 'telosmiamibp',
		// 		  confirmed: 0,
		// 		  previous: '0415598cf416fb5e956753f0b381dfcc7168f3bb6af3ef4511b427902667242b',
		// 		  transaction_mroot: 'c8eb044b37c3635b64ab7f82cf0ff7e1d075f0c3d0040e41deddbcf5d98c1627',
		// 		  action_mroot: 'c3f2bd6474bdc0d389e5fdeca0fa00eb1075287b3df134e29fcb357146330c7e',
		// 		  schedule_version: 1459,
		// 		  new_producers: null,
		// 		  header_extensions: [],
		// 		  producer_signature: 'SIG_K1_KW7Cd4AshftD34rs1pGrCEt6qd8PX3aQbxc3Ukah4A3R5YFU9RrnWs2FPCdkodXW5PfM4YnNgTy87kuwaUCRRZWD7LRkWy',
		// 		  transactions: [
		// 		    {
		// 		      status: 'executed',
		// 		      cpu_usage_us: 11320,
		// 		      net_usage_words: 343,
		// 		      trx: [Object]
		// 		    }
		// 		  ],
		// 		  block_extensions: [],
		// 		  id: '0415598d466699bca07cbbec9fcc5ab5724cecdf6256517c83e67055ab290bbb',
		// 		  block_num: 68508045,
		// 		  ref_block_prefix: 3971710112
		// 		}

		// JSONrespond(getBlock, res);

		let bodyP = readBody(req);
		bodyP.then((data) => {
			console.log(data);
			let blockId = data.block_num_or_id;
			eos.getBlock(blockId.toString()).then((block) => {
				console.log(block)
				JSONrespond(block, res);
			});
		});
	}
	else if(req.url == '/v1/chain/get_raw_code_and_abi'){
		let bodyP = readBody(req);
		bodyP.then(data => {
			let accountName = data.account_name;
			rpc.get_raw_code_and_abi(accountName.toString()).then((abi) => {
				abis.push(abi);
				JSONrespond(abi, res);
			})
			.catch(err => {
				console.log(err);
			});
		});
	}
	else if(req.url == '/v1/chain/get_required_keys'){
		let bodyP = readBody(req);
		bodyP.then(data => {
			console.log(data.transaction.actions[0].authorization)

			transaction = data.transaction

			data.transaction.actions.forEach( (action, ai) => {
				action.authorization.forEach( (auth, ti) => {
					if(auth.actor == 'aaaaaaaaaaab'
						&& auth.permission == 'cosign'){
						console.log('HEEEEEERE')
						data.transaction.actions[ai].authorization = [];
					}
				});
			});

			// printing the actions
			// console.log('uuuuuuh')
			// a = transaction.actions;
			// for(let i = 0; i < a.length; i++){
			// 	console.log(a[i]);
			// 	console.log(a[i].authorization);
			// 	eosjs.deserializeActions(transaction.actions).then(as => {
			// 		console.log(as);
			// 	});
			// }
			

			eos.getRequiredKeys(data).then(keys => {
				console.log(keys)
				JSONrespond(keys, res);
			})
			.catch(err => {
				console.log(err)
				JSONrespond(err, res);
			});

		});
	}
	else if(req.url == '/v1/chain/push_transaction'){
		cosignHandler(abis, chainId, req, res);
	}
	else{
		let bodyP = readBody(req);
		bodyP.then(data => {
			console.log(data);
			JSONrespond({}, res);
		});
	}

});

server.listen(7000);

console.log('Server running at port ", config.port ," is running..');


