#!/usr/bin/env node

/**
 * Server monitoring script
 * Usage: node scripts/monitor.js [port]
 */

const http = require('http');
const io = require('socket.io-client');

const port = process.argv[2] || 5000;
const serverUrl = `http://localhost:${port}`;

console.log(`🔍 Monitoring Pokdeng server at ${serverUrl}`);
console.log('Press Ctrl+C to stop monitoring\n');

// Test HTTP endpoint
function testHTTP() {
    return new Promise((resolve, reject) => {
        const req = http.get(serverUrl, (res) => {
            resolve({
                status: res.statusCode,
                headers: res.headers
            });
        });
        
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('HTTP request timeout'));
        });
    });
}

// Test Socket.IO connection
function testSocketIO() {
    return new Promise((resolve, reject) => {
        const socket = io(serverUrl, {
            timeout: 5000,
            reconnection: false
        });
        
        const timeout = setTimeout(() => {
            socket.disconnect();
            reject(new Error('Socket.IO connection timeout'));
        }, 5000);
        
        socket.on('connect', () => {
            clearTimeout(timeout);
            const latency = Date.now() - socket.io.engine.ping;
            socket.disconnect();
            resolve({ latency });
        });
        
        socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
        
        socket.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
        });
    });
}

// Monitor function
async function monitor() {
    const timestamp = new Date().toLocaleString();
    console.log(`[${timestamp}] Checking server health...`);
    
    try {
        // Test HTTP
        const httpResult = await testHTTP();
        console.log(`✅ HTTP: ${httpResult.status} OK`);
        
        // Test Socket.IO
        const socketResult = await testSocketIO();
        console.log(`✅ Socket.IO: Connected (latency: ${socketResult.latency || 'N/A'}ms)`);
        
        console.log('🟢 Server is healthy\n');
        
    } catch (error) {
        console.log(`❌ Error: ${error.message}`);
        console.log('🔴 Server may be down or overloaded\n');
    }
}

// Test connection limits
async function testConnectionLimits() {
    console.log('🧪 Testing connection limits...');
    
    const connections = [];
    const maxTestConnections = 10;
    
    try {
        for (let i = 0; i < maxTestConnections; i++) {
            const socket = io(serverUrl, {
                timeout: 2000,
                reconnection: false
            });
            
            connections.push(socket);
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error(`Connection ${i + 1} timeout`));
                }, 2000);
                
                socket.on('connect', () => {
                    clearTimeout(timeout);
                    console.log(`✅ Connection ${i + 1} established`);
                    resolve();
                });
                
                socket.on('error', (error) => {
                    clearTimeout(timeout);
                    if (error.message && error.message.includes('full')) {
                        console.log(`⚠️  Connection ${i + 1} rejected: Server full`);
                        resolve(); // This is expected behavior
                    } else {
                        reject(error);
                    }
                });
            });
            
            // Small delay between connections
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log(`✅ Successfully tested ${maxTestConnections} connections`);
        
    } catch (error) {
        console.log(`❌ Connection test failed: ${error.message}`);
    } finally {
        // Clean up connections
        connections.forEach(socket => {
            if (socket.connected) {
                socket.disconnect();
            }
        });
        console.log('🧹 Cleaned up test connections\n');
    }
}

// Main monitoring loop
async function startMonitoring() {
    // Initial health check
    await monitor();
    
    // Test connection limits once
    await testConnectionLimits();
    
    // Continue monitoring every 30 seconds
    setInterval(monitor, 30000);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n👋 Monitoring stopped');
    process.exit(0);
});

// Start monitoring
startMonitoring().catch(console.error);
