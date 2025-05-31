// Test the code review functionality on our recent edits
import { CodeReviewer } from './dist/utils/code-review.js';
import { readFile } from 'fs/promises';

async function reviewRecentEdits() {
    try {
        console.log('🔍 Reviewing Recent Code Edits...\n');
        
        const reviewer = new CodeReviewer();
        
        // Read the tools.ts file that we recently edited
        const toolsCode = await readFile('./src/server/tools.ts', 'utf-8');
        
        // Focus on the Graphlit integration tool we just added (lines 550-590)
        const graphlitToolCode = toolsCode.split('\n').slice(549, 595).join('\n');
        
        console.log('📁 Reviewing Graphlit Integration Tool Code...\n');
        
        const analysis = await reviewer.analyzeCode(graphlitToolCode, 'tools.ts:550-595');
        
        console.log('📊 Analysis Results:');
        console.log(`Language: ${analysis.language}`);
        console.log(`Complexity: ${analysis.complexity}`);
        console.log(`Issues Found: ${analysis.issues.length}\n`);
        
        console.log('📋 Summary:');
        console.log(analysis.summary);
        console.log('\n');
        
        if (analysis.issues.length > 0) {
            console.log('🚨 Issues Found:');
            analysis.issues.forEach((issue, index) => {
                const severityIcon = issue.severity === 'critical' ? '🚨' : 
                                   issue.severity === 'error' ? '❌' : 
                                   issue.severity === 'warning' ? '⚠️' : 'ℹ️';
                console.log(`${index + 1}. ${severityIcon} [${issue.severity.toUpperCase()}] ${issue.message}`);
                if (issue.suggestion) {
                    console.log(`   💡 ${issue.suggestion}`);
                }
                if (issue.line) {
                    console.log(`   📍 Line ${issue.line}`);
                }
                console.log('');
            });
        } else {
            console.log('✅ No issues found! Code quality is excellent.');
        }
        
        if (analysis.recommendations.length > 0) {
            console.log('📝 Recommendations:');
            analysis.recommendations.forEach((rec, index) => {
                console.log(`${index + 1}. ${rec}`);
            });
        }
        
        console.log('\n🎯 Code Review Complete!');
        
    } catch (error) {
        console.error('❌ Error during code review:', error);
    }
}

reviewRecentEdits();
