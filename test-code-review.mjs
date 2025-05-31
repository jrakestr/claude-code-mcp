#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test code with various issues for comprehensive testing
const testCode = `
function unsafeFunction(userInput) {
    // SQL Injection vulnerability
    const query = "SELECT * FROM users WHERE id = " + userInput;
    
    // Hardcoded password (example for detection - use env vars in real code)
    const password = process.env.DB_PASSWORD || "default_password_from_env";
    
    // Eval usage
    eval(userInput);
    
    // Nested loops (performance issue)
    for (let i = 0; i < 1000; i++) {
        for (let j = 0; j < 1000; j++) {
            console.log(i * j);
        }
    }
    
    // Potential null access
    const user = getUser();
    user.name.toUpperCase();
    
    // Assignment in condition
    if (user = null) {
        return false;
    }
    
    // Magic number
    return userInput * 42;
}

function veryLongFunction() {
    // This function is intentionally long to trigger maintainability warnings
    let result = 0;
    for (let i = 0; i < 100; i++) {
        result += i;
        console.log("Processing:", i);
        if (i % 2 === 0) {
            result *= 2;
        } else {
            result += 1;
        }
        // ... many more lines to make it long
        console.log("Current result:", result);
        if (result > 1000) {
            result = result / 2;
        }
        // Adding more lines to exceed the length threshold
        const temp = result * 3;
        if (temp > 500) {
            result = temp - 100;
        }
        console.log("Adjusted result:", result);
    }
    return result;
}
`;

// Start the MCP server process
const server = spawn('node', [path.join(__dirname, 'dist/index.js')], {
  stdio: ['pipe', 'pipe', process.stderr]
});

console.log('🚀 Starting Code Review MCP Server Test...\n');

let messageId = 1;

// Helper function to send MCP messages
function sendMessage(method, params) {
  const message = {
    jsonrpc: '2.0',
    id: messageId++,
    method,
    params
  };
  
  console.log(`📤 Sending: ${method}`);
  server.stdin.write(JSON.stringify(message) + '\n');
}

// Handle server responses
let responseBuffer = '';
server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Process complete messages
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        handleResponse(response);
      } catch (error) {
        console.log('📥 Raw response:', line);
      }
    }
  }
});

function handleResponse(response) {
  console.log(`📥 Response ID ${response.id}:`);
  
  if (response.error) {
    console.error('❌ Error:', response.error);
    return;
  }
  
  if (response.result) {
    if (response.result.content) {
      console.log('✅ Content received:');
      response.result.content.forEach(content => {
        if (content.type === 'text') {
          console.log(content.text);
        }
      });
    } else {
      console.log('✅ Result:', JSON.stringify(response.result, null, 2));
    }
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
}

// Test sequence
setTimeout(() => {
  // 1. Initialize connection
  sendMessage('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {}
    },
    clientInfo: {
      name: 'code-review-test-client',
      version: '1.0.0'
    }
  });
}, 100);

setTimeout(() => {
  // 2. Test code review tool
  console.log('🔍 Testing codeReview tool with problematic code...\n');
  sendMessage('tools/call', {
    name: 'codeReview',
    arguments: {
      code: testCode,
      filePath: 'test.js',
      includeComplexity: true
    }
  });
}, 1000);

setTimeout(() => {
  // 3. Test clean code
  console.log('🧹 Testing codeReview tool with clean code...\n');
  const cleanCode = `
function calculateSum(numbers) {
  if (!Array.isArray(numbers)) {
    throw new Error('Input must be an array');
  }
  
  return numbers.reduce((sum, num) => {
    if (typeof num !== 'number') {
      throw new Error('All elements must be numbers');
    }
    return sum + num;
  }, 0);
}

module.exports = { calculateSum };
`;
  
  sendMessage('tools/call', {
    name: 'codeReview',
    arguments: {
      code: cleanCode,
      filePath: 'clean.js'
    }
  });
}, 3000);

setTimeout(() => {
  // 4. Test file review (using the test file itself)
  console.log('📁 Testing reviewFile tool...\n');
  sendMessage('tools/call', {
    name: 'reviewFile',
    arguments: {
      filePath: path.join(__dirname, 'src/utils/code-review.ts'),
      includeContext: true
    }
  });
}, 5000);

// Cleanup after tests
setTimeout(() => {
  console.log('🏁 Test completed. Shutting down server...');
  server.kill();
  process.exit(0);
}, 8000);

// Handle server errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

server.on('exit', (code) => {
  console.log(`🔚 Server exited with code ${code}`);
});
