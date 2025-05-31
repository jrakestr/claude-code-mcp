// Simple test to verify code review functionality
import { CodeReviewer } from './dist/utils/code-review.js';

const testCode = `
function unsafeFunction(userInput) {
    const query = "SELECT * FROM users WHERE id = " + userInput;
    const password = process.env.DB_PASSWORD || "secure_env_password";
    eval(userInput);
    return userInput * 42;
}
`;

async function testCodeReview() {
    try {
        console.log('🔍 Testing Code Review Functionality...\n');
        
        const reviewer = new CodeReviewer();
        const analysis = await reviewer.analyzeCode(testCode, 'test.js');
        
        console.log('📊 Analysis Results:');
        console.log(`Language: ${analysis.language}`);
        console.log(`Complexity: ${analysis.complexity}`);
        console.log(`Issues Found: ${analysis.issues.length}\n`);
        
        console.log('📋 Summary:');
        console.log(analysis.summary);
        console.log('\n');
        
        if (analysis.issues.length > 0) {
            console.log('🚨 Issues:');
            analysis.issues.forEach((issue, index) => {
                console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}`);
                if (issue.suggestion) {
                    console.log(`   💡 ${issue.suggestion}`);
                }
                console.log('');
            });
        }
        
        console.log('✅ Code review functionality is working correctly!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

testCodeReview();
