import { useState, useEffect } from 'react';

export function useWebSocket(url) {
  const [data, setData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);

  useEffect(() => {
    let ws;
    let timer;

    const connect = () => {
      try {
        ws = new WebSocket(url);

        ws.onopen = () => setIsConnected(true);

        ws.onmessage = (event) => {
          const payload = JSON.parse(event.data);
          setLastTransaction(payload);
          setData(prev => [payload, ...prev].slice(0, 20));
        };

        ws.onclose = () => {
          setIsConnected(false);
          timer = setTimeout(connect, 3000); // 3 sec reconnect
        };
      } catch (err) {
        console.error("WS error:", err);
      }
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(timer);
    };
  }, [url]);

  return { data, isConnected, lastTransaction };
}
