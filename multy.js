import WebSocket from 'ws';
import fs from 'fs/promises';
import HttpsProxyAgent from 'https-proxy-agent';
import readline from 'readline';
import { displayBanner } from './banner.js';

async function readFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        const tokens = data.split('\n').map(line => line.trim()).filter(line => line);
        return tokens;
    } catch (error) {
        console.error('Error reading file:', error.message);
        return [];
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class WebSocketClient {
    constructor(token, proxy = null) {
        this.token = token;
        this.proxy = proxy;
        this.socket = null;
        this.pingInterval = null;
        this.reconnectAttempts = 0;
        this.wsUrl = "wss://secure.ws.teneo.pro";
        this.version = "v0.2";
    }

    async connect() {
        const wsUrl = `${this.wsUrl}/websocket?accessToken=${encodeURIComponent(this.token)}&version=${encodeURIComponent(this.version)}`;
        const options = {};
        if (this.proxy) {
            options.agent = new HttpsProxyAgent(this.proxy);
        }

        this.socket = new WebSocket(wsUrl, options);

        this.socket.onopen = () => {
            const connectionTime = new Date().toISOString();
            console.log("WebSocket connected at", connectionTime);
            this.reconnectAttempts = 0;
            this.startPinging();
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Received message from WebSocket:", data);
        };

        this.socket.onclose = () => {
            console.log("WebSocket disconnected");
            this.stopPinging();
            this.reconnect();
        };

        this.socket.onerror = (error) => {
            console.error("WebSocket error:", error.message);
        };
    }

    reconnect() {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        console.log(`Reconnecting in ${delay / 1000} seconds...`);
        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
            this.stopPinging();
        }
    }

    startPinging() {
        this.stopPinging();
        this.pingInterval = setInterval(() => {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({ type: "PING" }));
            }
        }, 10000);
    }

    stopPinging() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
}

async function main() {
    try {
        console.clear();
        displayBanner();
        const tokens = await readFile('tokens.txt');
        rl.question('Do you want to use a proxy? (y/n): ', async (useProxyAnswer) => {
            let useProxy = useProxyAnswer.toLowerCase() === 'y';
            let proxies = [];

            if (useProxy) {
                proxies = await readFile('proxies.txt');
            }

            if (tokens.length > 0) {
                const wsClients = [];

                for (let i = 0; i < tokens.length; i++) {
                    const token = tokens[i];
                    const proxy = proxies[i % proxies.length] || null;
                    console.log(`Connecting WebSocket for account: ${i + 1} - Proxy: ${proxy || 'None'}`);

                    const wsClient = new WebSocketClient(token, proxy);
                    wsClient.connect();
                    wsClients.push(wsClient);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }

                process.on('SIGINT', () => {
                    console.log('Program exited. Stopping pinging and disconnecting All WebSockets...');
                    wsClients.forEach(client => client.stopPinging());
                    wsClients.forEach(client => client.disconnect());
                    process.exit(0);
                });
            } else {
                console.log('No tokens found in tokens.txt - exiting...');
                process.exit(0);
            }
        });
    } catch (error) {
        console.error('Error in main function:', error);
    }
}

main();
