# Troubleshooting Guide 🔧

## Common Issues and Solutions

### 1. "Server is full" Error

**Problem**: Users see "Server is full. Please try again later." message

**Causes**:
- Too many concurrent connections (exceeds `MAX_CONNECTIONS`)
- Server overload or memory issues

**Solutions**:
```bash
# Increase connection limit
MAX_CONNECTIONS=1000

# Monitor server health
npm run monitor

# Check server logs for patterns
tail -f server.log
```

### 2. "Too many connections from your IP" Error

**Problem**: Users from same IP (office/home network) can't connect

**Causes**:
- Multiple users behind same NAT/proxy
- Browser auto-refresh creating multiple connections
- Development environment with multiple tabs

**Solutions**:
```bash
# Increase per-IP limit
MAX_CONNECTIONS_PER_IP=10

# For development, disable IP limiting
MAX_CONNECTIONS_PER_IP=100
```

### 3. Connection Spam in Logs

**Problem**: Too many connection/disconnection logs

**Solutions**:
```bash
# Reduce connection logging
CONNECTION_LOG_INTERVAL=50  # Log every 50th connection
ENABLE_CONNECTION_LOGS=false  # Disable completely

# Increase log level to reduce noise
LOG_LEVEL=warn  # Only warnings and errors
```

### 4. High Memory Usage

**Problem**: Server memory usage keeps growing

**Causes**:
- Memory leaks in session management
- Too many stored game sessions
- Large number of concurrent connections

**Solutions**:
```bash
# Reduce session expiry time
SESSION_EXPIRY_TIME=1800000  # 30 minutes instead of 1 hour

# Reduce cleanup interval
SESSION_CLEANUP_INTERVAL=600000  # 10 minutes instead of 30
```

### 5. Slow Response Times

**Problem**: Game feels laggy or unresponsive

**Causes**:
- High server load
- Network latency
- Too many concurrent games

**Diagnostics**:
```bash
# Monitor server health
npm run monitor

# Check connection latency in browser console
# Look for Socket.IO ping times
```

**Solutions**:
- Increase server resources
- Implement connection pooling
- Add load balancing

### 6. Frequent Disconnections

**Problem**: Players get disconnected frequently

**Causes**:
- Network instability
- Server restarts
- Rate limiting triggering

**Solutions**:
```bash
# Increase Socket.IO timeouts
# In config/server.js:
pingTimeout: 120000,  # 2 minutes
pingInterval: 30000,  # 30 seconds

# Reduce rate limiting
SOCKET_RATE_LIMIT_MAX=60  # 60 events per minute
```

### 7. Game State Sync Issues

**Problem**: Players see different game states

**Causes**:
- Race conditions in game logic
- Network packet loss
- Server overload

**Solutions**:
- Check server logs for errors
- Implement state validation
- Add periodic state sync

## Monitoring Commands

```bash
# Basic health check
npm run monitor

# Check server logs
tail -f server.log

# Monitor system resources
top -p $(pgrep node)

# Check network connections
netstat -an | grep :5000

# Monitor Socket.IO connections
# Add to browser console:
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', () => console.log('Disconnected'));
```

## Performance Tuning

### For High Traffic

```bash
# Increase limits
MAX_CONNECTIONS=2000
MAX_CONNECTIONS_PER_IP=20

# Reduce logging
LOG_LEVEL=error
ENABLE_CONNECTION_LOGS=false
ENABLE_COMMAND_LOGS=false
ENABLE_CHAT_LOGS=false

# Optimize cleanup
SESSION_CLEANUP_INTERVAL=300000  # 5 minutes
STATS_INTERVAL=600000  # 10 minutes
```

### For Development

```bash
# Enable detailed logging
LOG_LEVEL=debug
ENABLE_CONNECTION_LOGS=true
ENABLE_COMMAND_LOGS=true
ENABLE_CHAT_LOGS=true

# Relaxed limits
MAX_CONNECTIONS=100
MAX_CONNECTIONS_PER_IP=50

# Frequent cleanup for testing
SESSION_CLEANUP_INTERVAL=60000  # 1 minute
```

## Emergency Procedures

### Server Overload
1. Check `npm run monitor` output
2. Increase `MAX_CONNECTIONS` temporarily
3. Restart server if needed: `pm2 restart app` or `Ctrl+C` then `npm start`
4. Check system resources: `htop` or `top`

### Memory Leak
1. Monitor memory: `ps aux | grep node`
2. Restart server periodically
3. Implement session cleanup
4. Check for unclosed connections

### DDoS Attack
1. Enable IP-based rate limiting
2. Reduce `MAX_CONNECTIONS_PER_IP` to 1-2
3. Implement IP blacklisting
4. Use reverse proxy (nginx) for additional protection

## Getting Help

If issues persist:
1. Check server logs for error patterns
2. Run monitoring script for diagnostics
3. Check system resources (CPU, memory, network)
4. Review configuration settings
5. Test with minimal configuration

For production deployments, consider:
- Load balancing
- Database session storage
- Redis for scaling
- Professional monitoring tools
