# Buy Me An Espresso - Services Implementation

This document outlines the backend services required to support the "Buy Me An Espresso" platform's cross-chain tipping functionality. These services facilitate the interaction with the Espresso Network through direct contract verification.

## Service Architecture

```
+----------------------+     +----------------------+     +-------------------------+
|                      |     |                      |     |                         |
|  API Gateway Service +---->+  Messaging Service   +---->+  HotShotVerifier        |
|                      |     |                      |     |  Contract               |
+----------+-----------+     +----------+-----------+     +-------------------------+
           ^                            |
           |                            v
+----------+-----------+     +----------+-----------+     +-------------------------+
|                      |     |                      |     |                         |
|   User Service       |     |  Monitoring Service  +---->+  Alert & Logging System |
|                      |     |                      |     |                         |
+----------------------+     +----------------------+     +-------------------------+
```

## 1. API Gateway Service

The API Gateway serves as the entry point for all client interactions with our backend services.

### Features:
- Authentication and authorization
- Rate limiting
- Request validation
- API versioning
- CORS support
- Request routing

### Implementation:

```typescript
// Using Express.js as the framework
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Middleware for request validation
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const { method, originalUrl, body } = req;
  console.log(`[${new Date().toISOString()}] ${method} ${originalUrl}`);
  next();
});

// Route to messaging service
app.use('/api/v1/messages', createProxyMiddleware({ 
  target: process.env.MESSAGING_SERVICE_URL,
  pathRewrite: {'^/api/v1/messages': '/messages'},
  changeOrigin: true
}));

// Route to user service
app.use('/api/v1/users', createProxyMiddleware({ 
  target: process.env.USER_SERVICE_URL,
  pathRewrite: {'^/api/v1/users': '/users'},
  changeOrigin: true
}));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
```

## 2. Messaging Service

The Messaging Service handles all cross-chain message operations, interacting directly with the HotShotVerifier contract for message verification.

### Features:
- Message ID generation
- Direct contract-based message confirmation
- Message status tracking
- WebSocket events for real-time updates
- Transaction handling for contract interactions

### Implementation:

```typescript
import express from 'express';
import { ethers } from 'ethers';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from './config';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json());

// Initialize provider and contract interfaces
const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const hotShotVerifier = new ethers.Contract(
  CONTRACT_ADDRESSES.hotShotVerifier,
  [
    'function generateMessageId(address sender, address recipient, address token, uint256 amount, uint256 nonce) external pure returns (bytes32)',
    'function confirmMessage(bytes32 messageId) external',
    'function verifyConfirmation(bytes32 messageId) external view returns (uint8)'
  ],
  wallet
);

// Message queue for tracking
const messageQueue = new Map();

// API routes
app.post('/messages/generate', async (req, res) => {
  try {
    const { sender, recipient, token, amount, nonce } = req.body;
    
    // Validate input
    if (!sender || !recipient || !token || !amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters'
      });
    }
    
    // Generate message ID using HotShotVerifier contract
    const messageId = await hotShotVerifier.generateMessageId(
      sender,
      recipient,
      token,
      amount,
      nonce || Math.floor(Date.now() / 1000)
    );
    
    // Add to queue for tracking
    messageQueue.set(messageId, {
      status: 'PENDING',
      data: { sender, recipient, token, amount, nonce },
      createdAt: Date.now(),
      attempts: 0
    });
    
    return res.status(200).json({
      status: 'success',
      messageId,
      data: { sender, recipient, token, amount, nonce }
    });
  } catch (error) {
    console.error('Error generating message:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to generate message ID'
    });
  }
});

app.post('/messages/confirm', async (req, res) => {
  try {
    const { messageId } = req.body;
    
    // Check if message exists in queue
    if (!messageQueue.has(messageId)) {
      return res.status(404).json({
        status: 'error',
        message: 'Message ID not found'
      });
    }
    
    const messageInfo = messageQueue.get(messageId);
    messageInfo.attempts += 1;
    
    try {
      // Call confirmMessage on the HotShotVerifier contract directly
      const tx = await hotShotVerifier.confirmMessage(messageId);
      const receipt = await tx.wait();
      
      // Update status
      messageInfo.status = 'CONFIRMED';
      messageInfo.confirmedAt = Date.now();
      messageInfo.transactionHash = receipt.hash;
      messageQueue.set(messageId, messageInfo);
      
      // Emit websocket event
      io.emit('message:confirmed', { 
        messageId,
        transactionHash: receipt.hash
      });
      
      return res.status(200).json({
        status: 'success',
        message: 'Message confirmed via HotShotVerifier contract',
        transactionHash: receipt.hash
      });
    } catch (contractError) {
      console.error('Error confirming message with contract:', contractError);
      
      // Update status with error
      messageInfo.status = 'FAILED';
      messageInfo.error = contractError.message;
      messageQueue.set(messageId, messageInfo);
      
      return res.status(502).json({
        status: 'error',
        message: 'Failed to confirm message with HotShotVerifier',
        details: contractError.message
      });
    }
  } catch (error) {
    console.error('Error in confirm endpoint:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

app.get('/messages/:messageId/status', async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Check current status on-chain
    const status = await hotShotVerifier.verifyConfirmation(messageId);
    const statusText = ['PENDING', 'CONFIRMED', 'REJECTED'][status];
    
    // Update queue if status changed
    if (messageQueue.has(messageId)) {
      const messageInfo = messageQueue.get(messageId);
      messageInfo.status = statusText;
      messageInfo.lastChecked = Date.now();
      messageQueue.set(messageId, messageInfo);
    }
    
    return res.status(200).json({
      status: 'success',
      messageId,
      messageStatus: statusText,
      statusCode: status
    });
  } catch (error) {
    console.error('Error checking message status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to check message status'
    });
  }
});

// WebSocket events
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('subscribe:message', (messageId) => {
    socket.join(`message:${messageId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Background job to poll for message confirmation status
setInterval(async () => {
  for (const [messageId, info] of messageQueue.entries()) {
    // Only check messages that are still pending
    if (info.status === 'PENDING') {
      try {
        const status = await hotShotVerifier.verifyConfirmation(messageId);
        const statusText = ['PENDING', 'CONFIRMED', 'REJECTED'][status];
        
        if (status !== 0) { // Not pending anymore
          console.log(`Message ${messageId} status changed to ${statusText}`);
          
          // Update queue
          info.status = statusText;
          info.lastChecked = Date.now();
          messageQueue.set(messageId, info);
          
          // Emit status change event
          io.to(`message:${messageId}`).emit('message:status', {
            messageId,
            status: statusText
          });
        }
      } catch (error) {
        console.error(`Error polling message ${messageId}:`, error);
      }
    }
  }
  
  // Clean up old messages (older than 24 hours)
  const now = Date.now();
  for (const [messageId, info] of messageQueue.entries()) {
    if (now - info.createdAt > 24 * 60 * 60 * 1000) {
      messageQueue.delete(messageId);
    }
  }
}, 30000); // Check every 30 seconds

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Messaging Service running on port ${PORT}`);
});
```

## 3. User Service

The User Service manages creator profiles, memberships, and analytics.

### Features:
- Creator profile management
- Membership tier management
- Tipping analytics and reporting
- Authentication for creators and subscribers

### Key Functions:

```typescript
// Pseudocode for key services
class UserService {
  // Creator profile management
  async getCreatorProfile(creatorAddress) {
    // Fetch from database or blockchain
  }
  
  async updateCreatorProfile(creatorAddress, profileData) {
    // Update in database and blockchain
  }
  
  // Membership management
  async getMembershipTiers(creatorAddress) {
    // Get tiers from the blockchain
  }
  
  async getMembershipStatus(memberAddress, creatorAddress, tierId) {
    // Check membership status on-chain
  }
  
  // Analytics
  async getTippingHistory(creatorAddress, timeframe) {
    // Get historical tipping data
  }
  
  async getRevenue(creatorAddress, timeframe) {
    // Calculate revenue for specified timeframe
  }
}
```

## 4. Monitoring Service

The Monitoring Service tracks system health, transaction states, and provides alerts.

### Features:
- Real-time monitoring of contract events
- Transaction tracking
- Error alerting
- Performance metrics
- System health checks

### Implementation:

```typescript
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from './config';
import axios from 'axios';

// Initialize provider and contract interfaces
const rollupProvider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
const sepoliaProvider = new ethers.JsonRpcProvider(NETWORK_CONFIG.parentChain.rpcUrl);

const tipIntentContract = new ethers.Contract(
  CONTRACT_ADDRESSES.tipIntent,
  [
    'event TipIntentCreated(bytes32 indexed intentId, address indexed creator, address indexed tipper, address token, uint256 amount, string message, uint256 chainId)',
    'event TipIntentExecuted(bytes32 indexed intentId, bytes32 messageId)',
    'event TipIntentCancelled(bytes32 indexed intentId)',
    'event TipIntentExpired(bytes32 indexed intentId)'
  ],
  rollupProvider
);

const hotShotVerifierContract = new ethers.Contract(
  CONTRACT_ADDRESSES.hotShotVerifier,
  [
    'event MessageConfirmed(bytes32 indexed messageId)',
    'event MessageRejected(bytes32 indexed messageId, string reason)'
  ],
  rollupProvider
);

const intentSolverContract = new ethers.Contract(
  CONTRACT_ADDRESSES.intentSolver,
  [
    'event IntentSolved(bytes32 indexed intentId, bytes32 indexed messageId, address indexed creator, address token, uint256 creatorAmount, uint256 solverFeeAmount)'
  ],
  rollupProvider
);

// Initialize metrics
const metrics = {
  tipIntentsCreated: 0,
  tipIntentsExecuted: 0,
  tipIntentsCancelled: 0,
  tipIntentsExpired: 0,
  messagesConfirmed: 0,
  messagesRejected: 0,
  intentsSolved: 0,
  errors: 0
};

// Listen for TipIntent events
tipIntentContract.on('TipIntentCreated', (intentId, creator, tipper, token, amount, message, chainId) => {
  metrics.tipIntentsCreated++;
  console.log(`New tip intent created: ${intentId}`);
  
  // Send metric to monitoring system
  sendMetric('tip_intent_created', {
    intentId: intentId,
    creator: creator,
    tipper: tipper,
    token: token,
    amount: amount.toString(),
    chainId: chainId.toString()
  });
});

tipIntentContract.on('TipIntentExecuted', (intentId, messageId) => {
  metrics.tipIntentsExecuted++;
  console.log(`Tip intent executed: ${intentId}`);
  
  sendMetric('tip_intent_executed', {
    intentId: intentId,
    messageId: messageId
  });
});

// Listen for HotShotVerifier events
hotShotVerifierContract.on('MessageConfirmed', (messageId) => {
  metrics.messagesConfirmed++;
  console.log(`Message confirmed: ${messageId}`);
  
  sendMetric('message_confirmed', {
    messageId: messageId
  });
});

hotShotVerifierContract.on('MessageRejected', (messageId, reason) => {
  metrics.messagesRejected++;
  console.log(`Message rejected: ${messageId}, reason: ${reason}`);
  
  sendMetric('message_rejected', {
    messageId: messageId,
    reason: reason
  });
});

intentSolverContract.on('IntentSolved', (intentId, messageId, creator, token, creatorAmount, solverFeeAmount) => {
  metrics.intentsSolved++;
  console.log(`Intent solved: ${intentId}`);
  
  sendMetric('intent_solved', {
    intentId: intentId,
    messageId: messageId,
    creator: creator,
    token: token,
    creatorAmount: creatorAmount.toString(),
    solverFeeAmount: solverFeeAmount.toString()
  });
});

// Error handling
rollupProvider.on('error', (error) => {
  metrics.errors++;
  console.error('Rollup provider error:', error);
  
  sendAlert('provider_error', {
    network: 'rollup',
    error: error.message
  });
});

sepoliaProvider.on('error', (error) => {
  metrics.errors++;
  console.error('Sepolia provider error:', error);
  
  sendAlert('provider_error', {
    network: 'sepolia',
    error: error.message
  });
});

// Health check endpoint
function startHealthServer() {
  const express = require('express');
  const app = express();
  
  app.get('/health', (req, res) => {
    const rollupConnected = rollupProvider.websocket?.readyState === 1;
    const sepoliaConnected = sepoliaProvider.websocket?.readyState === 1;
    
    if (rollupConnected && sepoliaConnected) {
      return res.status(200).json({
        status: 'healthy',
        metrics,
        providers: {
          rollup: 'connected',
          sepolia: 'connected'
        }
      });
    } else {
      return res.status(503).json({
        status: 'unhealthy',
        metrics,
        providers: {
          rollup: rollupConnected ? 'connected' : 'disconnected',
          sepolia: sepoliaConnected ? 'connected' : 'disconnected'
        }
      });
    }
  });
  
  const PORT = process.env.HEALTH_PORT || 3005;
  app.listen(PORT, () => {
    console.log(`Health check server running on port ${PORT}`);
  });
}

// Helper functions
async function sendMetric(name, data) {
  try {
    await axios.post(`${process.env.MONITORING_URL}/metrics`, {
      name,
      timestamp: Date.now(),
      data
    });
  } catch (error) {
    console.error(`Failed to send metric ${name}:`, error);
  }
}

async function sendAlert(type, data) {
  try {
    await axios.post(`${process.env.MONITORING_URL}/alerts`, {
      type,
      severity: data.severity || 'warning',
      timestamp: Date.now(),
      data
    });
  } catch (error) {
    console.error(`Failed to send alert ${type}:`, error);
  }
}

// Start the service
function startMonitoring() {
  console.log('Starting monitoring service...');
  
  // Check blockchain connection
  Promise.all([
    rollupProvider.getBlockNumber(),
    sepoliaProvider.getBlockNumber()
  ]).then(([rollupBlock, sepoliaBlock]) => {
    console.log(`Connected to rollup at block ${rollupBlock}`);
    console.log(`Connected to Sepolia at block ${sepoliaBlock}`);
    
    // Start health check server
    startHealthServer();
    
    // Regular health checks
    setInterval(async () => {
      try {
        const [rollupBlock, sepoliaBlock] = await Promise.all([
          rollupProvider.getBlockNumber(),
          sepoliaProvider.getBlockNumber()
        ]);
        
        console.log(`Rollup block: ${rollupBlock}, Sepolia block: ${sepoliaBlock}`);
      } catch (error) {
        console.error('Health check failed:', error);
        metrics.errors++;
      }
    }, 60000); // Check every minute
  }).catch(error => {
    console.error('Failed to connect to blockchain:', error);
    process.exit(1);
  });
}

startMonitoring();
```

## Security Considerations

### 1. Private Key Management

Use a secure key management system (KMS) like AWS KMS or HashiCorp Vault to store and manage private keys:

```typescript
// Example with AWS KMS
import { KMS } from '@aws-sdk/client-kms';

async function getSigningKey() {
  const kms = new KMS({
    region: process.env.AWS_REGION
  });
  
  const { Plaintext } = await kms.decrypt({
    CiphertextBlob: Buffer.from(process.env.ENCRYPTED_PRIVATE_KEY, 'base64'),
    KeyId: process.env.KMS_KEY_ID
  });
  
  return Buffer.from(Plaintext).toString('utf-8');
}

// Use the retrieved key to create the wallet
const privateKey = await getSigningKey();
const wallet = new ethers.Wallet(privateKey, provider);
```

### 2. Rate Limiting and DoS Protection

Implement rate limiting to prevent denial of service attacks:

```typescript
import rateLimit from 'express-rate-limit';

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// More restrictive rate limit for message confirmation
const confirmLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 confirmations per 5 minutes
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);
app.use('/messages/confirm', confirmLimiter);
```

### 3. Input Validation

Validate all input data to prevent injection attacks:

```typescript
import { z } from 'zod';

// Define schema for message generation
const messageSchema = z.object({
  sender: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1),
  nonce: z.number().optional()
});

// Validation middleware
function validateBody(schema) {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input data',
        details: error.errors
      });
    }
  };
}

// Use the middleware in routes
app.post('/messages/generate', validateBody(messageSchema), async (req, res) => {
  // Route handler implementation
});
```

## Deployment

### Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:$PORT/health || exit 1

EXPOSE $PORT

CMD ["node", "index.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: messaging-service
  labels:
    app: messaging-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: messaging-service
  template:
    metadata:
      labels:
        app: messaging-service
    spec:
      containers:
      - name: messaging-service
        image: buymeanespresso/messaging-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: PORT
          value: "3000"
        - name: ROLLUP_RPC_URL
          valueFrom:
            configMapKeyRef:
              name: blockchain-config
              key: rollup-rpc-url
        - name: SEPOLIA_RPC_URL
          valueFrom:
            configMapKeyRef:
              name: blockchain-config
              key: sepolia-rpc-url
        - name: ENCRYPTED_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: wallet-secrets
              key: encrypted-private-key
        resources:
          limits:
            cpu: "500m"
            memory: "512Mi"
          requests:
            cpu: "100m"
            memory: "128Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 10
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
```

## Conclusion

These backend services form the foundation of a robust, secure, and scalable platform for cross-chain tipping using the Espresso Network. By implementing direct contract verification through the HotShotVerifier contract, we ensure a secure and reliable mechanism for cross-chain messaging without relying on external APIs.

For production deployment, consider implementing additional features:
- Comprehensive logging with structured logs
- Detailed metrics for performance monitoring
- Circuit breaker patterns for contract interactions
- Backup and disaster recovery procedures
- Continuous integration and deployment pipeline
- Integration with blockchain explorer APIs for enhanced transaction tracking 