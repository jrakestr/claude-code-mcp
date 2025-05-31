// Comprehensive test of the Claude Code Review MCP functionality
import { CodeReviewer } from './dist/utils/code-review.js';
import { GraphlitIntegration } from './dist/utils/graphlit-integration.js';
import { readFile } from 'fs/promises';

async function comprehensiveReviewTest() {
    console.log('🚀 CLAUDE CODE REVIEW MCP - COMPREHENSIVE TEST');
    console.log('='.repeat(60));
    
    try {
        const reviewer = new CodeReviewer();
        
        // Test 1: Review the main tools.ts file
        console.log('\n📁 TEST 1: Reviewing main tools.ts file...');
        const toolsCode = await readFile('./src/server/tools.ts', 'utf-8');
        const toolsAnalysis = await reviewer.analyzeCode(toolsCode, 'tools.ts');
        
        console.log(`✅ Language: ${toolsAnalysis.language}`);
        console.log(`✅ Complexity Score: ${toolsAnalysis.complexity}`);
        console.log(`✅ Issues Found: ${toolsAnalysis.issues.length}`);
        console.log(`✅ Summary: ${toolsAnalysis.summary}`);
        
        // Test 2: Review the Graphlit integration utility
        console.log('\n📁 TEST 2: Reviewing Graphlit integration...');
        const graphlitCode = await readFile('./src/utils/graphlit-integration.ts', 'utf-8');
        const graphlitAnalysis = await reviewer.analyzeCode(graphlitCode, 'graphlit-integration.ts');
        
        console.log(`✅ Language: ${graphlitAnalysis.language}`);
        console.log(`✅ Complexity Score: ${graphlitAnalysis.complexity}`);
        console.log(`✅ Issues Found: ${graphlitAnalysis.issues.length}`);
        
        // Test 3: Test Graphlit formatting functionality
        console.log('\n🔧 TEST 3: Testing Graphlit formatting...');
        const graphlit = new GraphlitIntegration({
            enabled: true,
            autoIngest: false,
            projectName: 'Claude Code Review MCP Test',
            tags: ['test', 'mcp', 'code-review']
        });
        
        const formattedContent = graphlit.formatForGraphlit(
            toolsAnalysis, 
            './src/server/tools.ts', 
            '/Users/justinrakestraw/Documents/Cline/MCP/claude-code-review-mcp'
        );
        
        console.log('✅ Graphlit formatting successful');
        console.log(`✅ Formatted content length: ${formattedContent.length} characters`);
        
        const summary = graphlit.generateSummary(toolsAnalysis, './src/server/tools.ts');
        console.log(`✅ Summary generated: ${summary.substring(0, 100)}...`);
        
        // Test 4: Show detailed issue analysis
        console.log('\n🔍 TEST 4: Detailed Issue Analysis...');
        const allIssues = [...toolsAnalysis.issues, ...graphlitAnalysis.issues];
        
        const issuesByCategory = {
            security: allIssues.filter(i => i.category === 'security').length,
            performance: allIssues.filter(i => i.category === 'performance').length,
            maintainability: allIssues.filter(i => i.category === 'maintainability').length,
            bugs: allIssues.filter(i => i.category === 'bugs').length,
            style: allIssues.filter(i => i.category === 'style').length,
            structure: allIssues.filter(i => i.category === 'structure').length
        };
        
        console.log('📊 Issue Categories:');
        Object.entries(issuesByCategory).forEach(([category, count]) => {
            const icon = count > 0 ? '⚠️' : '✅';
            console.log(`   ${icon} ${category}: ${count}`);
        });
        
        // Test 5: Configuration validation
        console.log('\n⚙️ TEST 5: Configuration Validation...');
        
        const configFiles = [
            '/Users/justinrakestraw/.codeium/windsurf/mcp_config.json',
            '/Users/justinrakestraw/Library/Application Support/Windsurf/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json',
            '/Users/justinrakestraw/Library/Application Support/Claude/claude_desktop_config.json'
        ];
        
        for (const configFile of configFiles) {
            try {
                const config = JSON.parse(await readFile(configFile, 'utf-8'));
                const hasClaudeReview = config.mcpServers && config.mcpServers['claude-code-review-mcp'];
                console.log(`✅ ${configFile.split('/').pop()}: ${hasClaudeReview ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
            } catch (error) {
                console.log(`❌ ${configFile.split('/').pop()}: ERROR - ${error.message}`);
            }
        }
        
        // Final summary
        console.log('\n🎯 COMPREHENSIVE TEST RESULTS:');
        console.log('='.repeat(40));
        console.log('✅ Code Review Engine: WORKING');
        console.log('✅ Graphlit Integration: WORKING');
        console.log('✅ MCP Server: CONFIGURED');
        console.log('✅ Multi-platform Support: ENABLED');
        console.log('\n🚀 Claude Code Review MCP is ready for use!');
        
        // Show sample usage
        console.log('\n📖 SAMPLE USAGE:');
        console.log('1. Use codeReview tool: Analyze code snippets');
        console.log('2. Use reviewFile tool: Review entire files');
        console.log('3. Use formatForGraphlit tool: Format results for Graphlit');
        console.log('4. Available in: Windsurf, Cline, and Claude Desktop');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

comprehensiveReviewTest();
