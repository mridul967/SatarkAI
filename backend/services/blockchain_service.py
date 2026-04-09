import os
import json
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()

class BlockchainService:
    def __init__(self):
        self.rpc_url = os.getenv("POLYGON_AMOY_RPC", "http://127.0.0.1:8545")
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        # Load keys & addresses from .env
        self.private_key = os.getenv("PRIVATE_KEY")
        self.registry_address = os.getenv("FRAUD_REGISTRY_ADDRESS")
        self.ledger_address = os.getenv("FRAUD_LEDGER_ADDRESS")
        
        # Load ABIs (assuming they're available after compilation)
        self.registry_abi = self._load_abi("contracts/FraudSignalRegistry.sol")
        self.ledger_abi = self._load_abi("contracts/FraudAuditLedger.sol")

        if self.private_key:
            self.account = Account.from_key(self.private_key)
            self.w3.eth.default_account = self.account.address

    def _load_abi(self, contract_path):
        # In a real environment, we'd load the compiled .json artifacts from artifacts/contracts/...
        # For now, we'll return a minimal placeholder ABI for the key functions used in the deep dive
        if "FraudSignalRegistry" in contract_path:
            return [
                {"name": "publishSignal", "type": "function", "inputs": [{"name": "deviceHash", "type": "bytes32"}, {"name": "ipHash", "type": "bytes32"}, {"name": "fraudCategory", "type": "string"}, {"name": "severity", "type": "uint8"}], "outputs": []},
                {"name": "getLatestSignal", "type": "function", "inputs": [{"name": "deviceHash", "type": "bytes32"}], "outputs": [{"name": "", "type": "tuple", "components": [{"name": "deviceHash", "type": "bytes32"}, {"name": "ipHash", "type": "bytes32"}, {"name": "fraudCategory", "type": "string"}, {"name": "severity", "type": "uint8"}, {"name": "timestamp", "type": "uint256"}, {"name": "publisher", "type": "address"}, {"name": "verified", "type": "bool"}]}]}
            ]
        return []

    async def publish_fraud_signal(self, device_id: str, ip_address: str, category: str, severity: int):
        if not self.registry_address or not self.private_key:
            print("Blockchain Service: Missing configuration for signal publication.")
            return

        contract = self.w3.eth.contract(address=self.registry_address, abi=self.registry_abi)
        
        device_hash = self.w3.keccak(text=device_id)
        ip_hash = self.w3.keccak(text=ip_address)
        
        tx = contract.functions.publishSignal(device_hash, ip_hash, category, severity).build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': 200000,
            'gasPrice': self.w3.to_wei('50', 'gwei')
        })
        
        signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return self.w3.to_hex(tx_hash)

    async def check_device_risk(self, device_id: str):
        if not self.registry_address:
            return None
            
        contract = self.w3.eth.contract(address=self.registry_address, abi=self.registry_abi)
        device_hash = self.w3.keccak(text=device_id)
        
        try:
            signal = contract.functions.getLatestSignal(device_hash).call()
            return {
                "category": signal[2],
                "severity": signal[3],
                "timestamp": signal[4],
                "verified": signal[6]
            }
        except Exception:
            return None

blockchain_service = BlockchainService()
