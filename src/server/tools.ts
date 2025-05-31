import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { executeCommand } from "../utils/bash.js"; // Using .js extension for ESM compatibility
import { readFile, listFiles, searchGlob, grepSearch, writeFile } from "../utils/file.js";
import { CodeReviewer } from "../utils/code-review.js";
import { GraphlitIntegration } from '../utils/graphlit-integration.js';

/**
 * Sets up Claude Code tools on the provided MCP server
 * @param server The MCP server instance to configure
 */
export function setupTools(server: McpServer): void {
  // Bash Tool - Allows executing shell commands
  server.tool(
    "bash",
    "Execute a shell command",
    {
      command: z.string().describe("The shell command to execute"),
      timeout: z.number().optional().describe("Optional timeout in milliseconds (max 600000)")
    },
    async ({ command, timeout }) => {
      try {
        // Check for banned commands
        const bannedCommands = [
          'alias', 'curl', 'curlie', 'wget', 'axel', 'aria2c', 'nc', 'telnet',
          'lynx', 'w3m', 'links', 'httpie', 'xh', 'http-prompt', 'chrome', 'firefox', 'safari'
        ];
        
        const commandParts = command.split(' ');
        if (bannedCommands.includes(commandParts[0])) {
          return {
            content: [{ 
              type: "text", 
              text: `Error: The command '${commandParts[0]}' is not allowed for security reasons.`
            }],
            isError: true
          };
        }
        
        const result = await executeCommand(command, timeout);
        return {
          content: [{ type: "text", text: result }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // File Read Tool - Allows reading files from the filesystem
  server.tool(
    "readFile",
    "Read a file from the local filesystem",
    {
      file_path: z.string().describe("The absolute path to the file to read"),
      offset: z.number().optional().describe("The line number to start reading from"),
      limit: z.number().optional().describe("The number of lines to read")
    },
    async ({ file_path, offset, limit }) => {
      try {
        const content = await readFile(file_path, offset, limit);
        return {
          content: [{ type: "text", text: content }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // List Files Tool - Lists files and directories in a given path
  server.tool(
    "listFiles",
    "Lists files and directories in a given path",
    {
      path: z.string().describe("The absolute path to the directory to list")
    },
    async ({ path }) => {
      try {
        const files = await listFiles(path);
        return {
          content: [{ type: "text", text: JSON.stringify(files, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // Search Glob Tool - Search for files matching a pattern
  server.tool(
    "searchGlob",
    "Search for files matching a pattern",
    {
      pattern: z.string().describe("The glob pattern to match files against"),
      path: z.string().optional().describe("The directory to search in. Defaults to the current working directory.")
    },
    async ({ pattern, path }) => {
      try {
        const results = await searchGlob(pattern, path);
        return {
          content: [{ type: "text", text: results.join('\n') }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // Grep Tool - Search for text in files
  server.tool(
    "grep",
    "Search for text in files",
    {
      pattern: z.string().describe("The regular expression pattern to search for in file contents"),
      path: z.string().optional().describe("The directory to search in. Defaults to the current working directory."),
      include: z.string().optional().describe("File pattern to include in the search (e.g. \"*.js\", \"*.{ts,tsx}\")")
    },
    async ({ pattern, path, include }) => {
      try {
        const results = await grepSearch(pattern, path, include);
        return {
          content: [{ type: "text", text: results }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // Think Tool - No-op tool for thinking/reasoning
  server.tool(
    "think",
    "A tool for thinking through complex problems",
    {
      thought: z.string().describe("Your thoughts")
    },
    async ({ thought }) => {
      return {
        content: [{ 
          type: "text", 
          text: `Thought process: ${thought}`
        }]
      };
    }
  );

  // Code Review Tool - Analyze and review code
  server.tool(
    "codeReview",
    "Review code for bugs, security issues, and best practices",
    {
      code: z.string().describe("The code to review"),
      filePath: z.string().optional().describe("Optional file path to help with language detection"),
      includeComplexity: z.boolean().optional().describe("Include complexity analysis in the review")
    },
    async ({ code, filePath, includeComplexity = true }) => {
      try {
        const codeReviewer = new CodeReviewer();
        const analysis = await codeReviewer.analyzeCode(code, filePath);
        
        let reviewText = `# Code Review Results\n\n`;
        reviewText += `**Language:** ${analysis.language}\n`;
        reviewText += `**Complexity Score:** ${analysis.complexity}\n\n`;
        
        reviewText += `## Summary\n${analysis.summary}\n\n`;
        
        if (analysis.issues.length > 0) {
          reviewText += `## Issues Found (${analysis.issues.length})\n\n`;
          
          const groupedIssues = analysis.issues.reduce((groups, issue) => {
            const key = `${issue.severity}-${issue.category}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(issue);
            return groups;
          }, {} as Record<string, typeof analysis.issues>);
          
          Object.entries(groupedIssues).forEach(([key, issues]) => {
            const [severity, category] = key.split('-');
            reviewText += `### ${severity.toUpperCase()} - ${category.toUpperCase()}\n`;
            issues.forEach((issue, index) => {
              reviewText += `${index + 1}. **${issue.message}**\n`;
              if (issue.suggestion) {
                reviewText += `   *Suggestion: ${issue.suggestion}*\n`;
              }
              if (issue.line) {
                reviewText += `   *Line: ${issue.line}*\n`;
              }
              reviewText += `\n`;
            });
          });
        } else {
          reviewText += `## ✅ No Issues Found\nGreat job! No significant issues detected in the code.\n\n`;
        }
        
        if (analysis.recommendations.length > 0) {
          reviewText += `## Recommendations\n`;
          analysis.recommendations.forEach((rec, index) => {
            reviewText += `${index + 1}. ${rec}\n`;
          });
        }
        
        return {
          content: [{ 
            type: "text", 
            text: reviewText
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error during code review: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );

  // File Edit Tool - Create or edit files
  server.tool(
    "editFile",
    "Create or edit a file",
    {
      file_path: z.string().describe("The absolute path to the file to edit"),
      content: z.string().describe("The new content for the file")
    },
    async ({ file_path, content }) => {
      try {
        await writeFile(file_path, content);
        return {
          content: [{ 
            type: "text", 
            text: `File ${file_path} has been updated.`
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: error instanceof Error ? error.message : String(error)
          }],
          isError: true
        };
      }
    }
  );

  // File-based Code Review Tool - Review entire files
  server.tool(
    "reviewFile",
    "Review an entire file for code quality, security, and best practices",
    {
      filePath: z.string().describe("The absolute path to the file to review"),
      includeContext: z.boolean().optional().describe("Include file context and structure analysis")
    },
    async ({ filePath, includeContext = true }) => {
      try {
        // Input validation
        if (!filePath || filePath.trim() === '') {
          throw new Error('File path is required');
        }

        // Read the file
        const fileContent = await readFile(filePath);
        
        // Perform code review
        const codeReviewer = new CodeReviewer();
        const analysis = await codeReviewer.analyzeCode(fileContent, filePath);
        
        let reviewText = `# File Review: ${filePath}\n\n`;
        
        if (includeContext) {
          const lines = fileContent.split('\n').length;
          const size = Buffer.byteLength(fileContent, 'utf8');
          reviewText += `**File Info:**\n`;
          reviewText += `- Lines: ${lines}\n`;
          reviewText += `- Size: ${size} bytes\n`;
          reviewText += `- Language: ${analysis.language}\n`;
          reviewText += `- Complexity: ${analysis.complexity}\n\n`;
        }
        
        reviewText += `## Analysis Summary\n${analysis.summary}\n\n`;
        
        // Pre-compute groups so they are available for the “Next Steps” section
        const criticalIssues = analysis.issues.filter(i => i.severity === 'critical');
        const errorIssues    = analysis.issues.filter(i => i.severity === 'error');
        const warningIssues  = analysis.issues.filter(i => i.severity === 'warning');
        const infoIssues     = analysis.issues.filter(i => i.severity === 'info');

        if (analysis.issues.length > 0) {
          reviewText += `## Issues Found (${analysis.issues.length})\n\n`;
          const issues = [
            { title: 'CRITICAL ISSUES', issues: criticalIssues },
            { title: 'ERRORS', issues: errorIssues },
            { title: 'WARNINGS', issues: warningIssues },
            { title: 'INFORMATION', issues: infoIssues }
          ];
          issues.forEach(({ title, issues }) => {
            if (issues.length > 0) {
              reviewText += `### ${title}\n`;
              issues.forEach((issue, index) => {
                reviewText += `${index + 1}. **[${issue.category.toUpperCase()}]** ${issue.message}\n`;
                if (issue.suggestion) {
                  reviewText += `   *${issue.suggestion}*\n`;
                }
                if (issue.line) {
                  reviewText += `   *Line ${issue.line}*\n`;
                }
                reviewText += `\n`;
              });
            }
          });
        } else {
          reviewText += `## Excellent Code Quality\n`;
          reviewText += `No significant issues detected. The code follows good practices!\n\n`;
        }
        
        if (analysis.recommendations.length > 0) {
          reviewText += `## Recommendations\n`;
          analysis.recommendations.forEach((rec, index) => {
            reviewText += `${index + 1}. ${rec}\n`;
          });
          reviewText += `\n`;
        }
        
        // Add actionable next steps
        reviewText += `## Next Steps\n`;
        if (criticalIssues.length > 0) {
          reviewText += `1. **URGENT**: Address ${criticalIssues.length} critical security/bug issue(s)\n`;
        }
        if (errorIssues.length > 0) {
          reviewText += `2. Fix ${errorIssues.length} error(s) before deployment\n`;
        }
        if (warningIssues.length > 0) {
          reviewText += `3. Consider addressing ${warningIssues.length} warning(s) for better code quality\n`;
        }
        if (analysis.issues.length === 0) {
          reviewText += `1. Code is ready for deployment\n2. Consider adding tests if not present\n3. Document any complex logic\n`;
        }
        
        return {
          content: [{ 
            type: "text", 
            text: reviewText
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error reviewing file: ${error instanceof Error ? error.message : String(error)}\n\nPlease check:\n- File path is correct\n- File exists and is readable\n- You have necessary permissions`
          }],
          isError: true
        };
      }
    }
  );

  // Project-wide Code Review Tool
  server.tool(
    "reviewProject",
    "Review an entire project directory for code quality and structure",
    {
      projectPath: z.string().describe("The absolute path to the project directory"),
      includePattern: z.string().optional().describe("File pattern to include (e.g., '*.{js,ts,py}')"),
      excludePattern: z.string().optional().describe("File pattern to exclude (e.g., 'node_modules,dist,build')"),
      maxFiles: z.number().optional().describe("Maximum number of files to review (default: 50)")
    },
    async ({ projectPath, includePattern = "*.{js,ts,py,java,cpp,c,go,rs,php,rb}", excludePattern = "node_modules,dist,build,.git", maxFiles = 50 }) => {
      try {
        // Input validation
        if (!projectPath || projectPath.trim() === '') {
          throw new Error('Project path is required');
        }

        const codeReviewer = new CodeReviewer();
        let reviewText = `# Project Code Review: ${projectPath}\n\n`;
        
        // Find code files
        const searchResults = await searchGlob(includePattern, projectPath);
        const excludePatterns = excludePattern.split(',').map(p => p.trim());
        
        const codeFiles = searchResults
          .filter(file => !excludePatterns.some(pattern => file.includes(pattern)))
          .slice(0, maxFiles);
        
        if (codeFiles.length === 0) {
          return {
            content: [{ 
              type: "text", 
              text: `No code files found in ${projectPath} matching pattern ${includePattern}`
            }]
          };
        }
        
        reviewText += `**Project Overview:**\n`;
        reviewText += `- Files analyzed: ${codeFiles.length}\n`;
        reviewText += `- Include pattern: ${includePattern}\n`;
        reviewText += `- Exclude pattern: ${excludePattern}\n\n`;
        
        const allIssues: any[] = [];
        const fileAnalyses: any[] = [];
        let totalComplexity = 0;
        
        // Analyze each file
        for (const filePath of codeFiles) {
          try {
            const fileContent = await readFile(filePath);
            const analysis = await codeReviewer.analyzeCode(fileContent, filePath);
            
            fileAnalyses.push({
              path: filePath,
              analysis
            });
            
            allIssues.push(...analysis.issues.map(issue => ({
              ...issue,
              file: filePath
            })));
            
            totalComplexity += analysis.complexity;
          } catch (error) {
            reviewText += `⚠️ Could not analyze ${filePath}: ${error}\n`;
          }
        }
        
        // Project-level statistics
        const avgComplexity = Math.round(totalComplexity / fileAnalyses.length);
        const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
        const errorCount = allIssues.filter(i => i.severity === 'error').length;
        const warningCount = allIssues.filter(i => i.severity === 'warning').length;
        
        reviewText += `## Project Health Summary\n`;
        reviewText += `- **Total Issues:** ${allIssues.length}\n`;
        reviewText += `- **Critical:** ${criticalCount} 🚨\n`;
        reviewText += `- **Errors:** ${errorCount} ❌\n`;
        reviewText += `- **Warnings:** ${warningCount} ⚠️\n`;
        reviewText += `- **Average Complexity:** ${avgComplexity}\n\n`;
        
        // Overall project health
        if (criticalCount > 0) {
          reviewText += `🚨 **PROJECT STATUS: CRITICAL** - Immediate attention required\n\n`;
        } else if (errorCount > 5) {
          reviewText += `⚠️ **PROJECT STATUS: NEEDS WORK** - Multiple errors to address\n\n`;
        } else if (warningCount > 10) {
          reviewText += `⚠️ **PROJECT STATUS: GOOD** - Consider addressing warnings\n\n`;
        } else {
          reviewText += `✅ **PROJECT STATUS: EXCELLENT** - Well-maintained codebase\n\n`;
        }
        
        // Top issues by severity
        if (allIssues.length > 0) {
          reviewText += `## Priority Issues\n\n`;
          
          const priorityIssues = [
            ...allIssues.filter(i => i.severity === 'critical').slice(0, 5),
            ...allIssues.filter(i => i.severity === 'error').slice(0, 5)
          ];
          
          priorityIssues.forEach((issue, index) => {
            const icon = issue.severity === 'critical' ? '🚨' : '❌';
            reviewText += `${index + 1}. ${icon} **${issue.message}**\n`;
            reviewText += `   📁 *File: ${issue.file}*\n`;
            if (issue.suggestion) {
              reviewText += `   💡 *${issue.suggestion}*\n`;
            }
            reviewText += `\n`;
          });
        }
        
        // Files with highest complexity
        const complexFiles = fileAnalyses
          .sort((a, b) => b.analysis.complexity - a.analysis.complexity)
          .slice(0, 5);
        
        if (complexFiles.length > 0) {
          reviewText += `## Most Complex Files\n`;
          complexFiles.forEach((file, index) => {
            reviewText += `${index + 1}. **${file.path}** (Complexity: ${file.analysis.complexity})\n`;
          });
          reviewText += `\n`;
        }
        
        // Recommendations
        reviewText += `## Project Recommendations\n`;
        if (criticalCount > 0) {
          reviewText += `1. **URGENT**: Address ${criticalCount} critical security/bug issues immediately\n`;
        }
        if (errorCount > 0) {
          reviewText += `2. Fix ${errorCount} error(s) before next release\n`;
        }
        if (avgComplexity > 15) {
          reviewText += `3. Consider refactoring complex files to improve maintainability\n`;
        }
        if (warningCount > 10) {
          reviewText += `4. Address warnings to improve code quality\n`;
        }
        reviewText += `5. Implement automated code quality checks in CI/CD pipeline\n`;
        reviewText += `6. Consider adding comprehensive test coverage\n`;
        
        return {
          content: [{ 
            type: "text", 
            text: reviewText
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error reviewing project: ${error instanceof Error ? error.message : String(error)}\n\nPlease check:\n- Project path is correct\n- Directory exists and is readable\n- You have necessary permissions`
          }],
          isError: true
        };
      }
    }
  );

  // Graphlit Integration Tool
  server.tool(
    "formatForGraphlit",
    "Format code review results for Graphlit ingestion",
    {
      reviewData: z.string().describe("JSON string containing code analysis results"),
      filePath: z.string().optional().describe("Optional file path for context"),
      projectPath: z.string().optional().describe("Optional project path for context"),
      projectName: z.string().optional().describe("Optional project name")
    },
    async ({ reviewData, filePath, projectPath, projectName }: { reviewData: string; filePath?: string; projectPath?: string; projectName?: string }) => {
      try {
        const analysis = JSON.parse(reviewData);
        const graphlit = new GraphlitIntegration({
          enabled: true,
          autoIngest: false,
          projectName: projectName || 'Code Review Project',
          tags: ['code-review', 'automated-analysis']
        });
        
        const formattedContent = graphlit.formatForGraphlit(analysis, filePath, projectPath);
        const summary = graphlit.generateSummary(analysis, filePath);
        const memoryContent = graphlit.createMemoryContent(analysis, {
          filePath,
          projectPath,
          reviewType: 'automated'
        });
        
        return {
          content: [{ 
            type: "text", 
            text: `## Graphlit-Ready Content\n\n### Full Report\n${formattedContent}\n\n### Summary\n${summary}\n\n### Memory Content\n${memoryContent}\n\n---\n\n**Instructions:** Copy the content above and use it with Graphlit MCP tools for ingestion.`
          }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error formatting for Graphlit: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
