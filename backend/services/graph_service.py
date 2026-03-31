from typing import List, Dict, Any
from models.schemas import Transaction

class GraphService:
    def __init__(self):
        # Maps user_id -> set of connected properties
        self.device_map = {}
        self.ip_map = {}
        self.merchant_counts = {}
        self.historical_txns = {}
        
    def add_transaction(self, txn: Transaction):
        if txn.user_id not in self.device_map:
            self.device_map[txn.user_id] = set()
        self.device_map[txn.user_id].add(txn.device_id)

        if txn.user_id not in self.ip_map:
            self.ip_map[txn.user_id] = set()
        self.ip_map[txn.user_id].add(txn.ip_address)
        
        if txn.user_id not in self.historical_txns:
            self.historical_txns[txn.user_id] = []
        self.historical_txns[txn.user_id].append(txn)

    def get_graph_signals(self, txn: Transaction) -> List[str]:
        signals = []
        user_devices = self.device_map.get(txn.user_id, set())
        if len(user_devices) > 2:
            signals.append("Device shared with multiple users or multiple devices per user")
            
        user_ips = self.ip_map.get(txn.user_id, set())
        if len(user_ips) > 2:
            signals.append("IP flagged due to high velocity distinct originations")

        return signals

    def get_graph_data(self, user_id: str) -> Dict[str, Any]:
        """Provides d3-formatted nodes and links."""
        nodes = []
        links = []
        
        if user_id not in self.device_map:
            return {"nodes": [], "links": []}

        user_node = {"id": user_id, "group": 1, "label": "User", "risk": 0.1}
        nodes.append(user_node)
        
        for idx, dev in enumerate(self.device_map[user_id]):
            nodes.append({"id": dev, "group": 2, "label": "Device", "risk": 0.5})
            links.append({"source": user_id, "target": dev, "value": 1})

        for ip in self.ip_map[user_id]:
            nodes.append({"id": ip, "group": 3, "label": "IP", "risk": 0.3})
            links.append({"source": user_id, "target": ip, "value": 1})

        txns = self.historical_txns.get(user_id, [])
        for txn in txns:
            nodes.append({"id": txn.transaction_id, "group": 4, "label": "Transaction", "risk": 0.8 if txn.amount > 10000 else 0.2})
            links.append({"source": user_id, "target": txn.transaction_id, "value": 2})
            
        return {"nodes": nodes, "links": links}

graph_service = GraphService()
