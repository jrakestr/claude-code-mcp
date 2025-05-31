import { CodeAnalysis } from './code-review.js';

export interface GraphlitConfig {
  enabled: boolean;
  autoIngest: boolean;
  projectName?: string;
  tags?: string[];
}

export class GraphlitIntegration {
  private config: GraphlitConfig;

  constructor(config: GraphlitConfig = { enabled: false, autoIngest: false }) {
    this.config = config;
  }

  /**
   * Formats code review results for Graphlit ingestion
   */
  formatForGraphlit(analysis: CodeAnalysis, filePath?: string, projectPath?: string): string {
    const timestamp = new Date().toISOString();
    const projectName = this.config.projectName || 'Code Review Project';
    
    let content = `# Code Review Report\n\n`;
    content += `**Generated:** ${timestamp}\n`;
    content += `**Project:** ${projectName}\n`;
    
    if (filePath) {
      content += `**File:** ${filePath}\n`;
    }
    if (projectPath) {
      content += `**Project Path:** ${projectPath}\n`;
    }
    
    content += `**Language:** ${analysis.language}\n`;
    content += `**Complexity Score:** ${analysis.complexity}\n\n`;
    
    // Executive Summary
    content += `## Executive Summary\n`;
    content += `${analysis.summary}\n\n`;
    
    // Quality Metrics
    const criticalCount = analysis.issues.filter(i => i.severity === 'critical').length;
    const errorCount = analysis.issues.filter(i => i.severity === 'error').length;
    const warningCount = analysis.issues.filter(i => i.severity === 'warning').length;
    const infoCount = analysis.issues.filter(i => i.severity === 'info').length;
    
    content += `## Quality Metrics\n`;
    content += `- **Total Issues:** ${analysis.issues.length}\n`;
    content += `- **Critical Issues:** ${criticalCount}\n`;
    content += `- **Errors:** ${errorCount}\n`;
    content += `- **Warnings:** ${warningCount}\n`;
    content += `- **Information:** ${infoCount}\n`;
    content += `- **Code Complexity:** ${analysis.complexity}\n\n`;
    
    // Risk Assessment
    let riskLevel = 'LOW';
    if (criticalCount > 0) riskLevel = 'CRITICAL';
    else if (errorCount > 2) riskLevel = 'HIGH';
    else if (errorCount > 0 || warningCount > 5) riskLevel = 'MEDIUM';
    
    content += `## Risk Assessment\n`;
    content += `**Risk Level:** ${riskLevel}\n\n`;
    
    if (riskLevel === 'CRITICAL') {
      content += `⚠️ **IMMEDIATE ACTION REQUIRED** - Critical security or functionality issues detected.\n\n`;
    } else if (riskLevel === 'HIGH') {
      content += `⚠️ **HIGH PRIORITY** - Multiple errors that should be addressed before deployment.\n\n`;
    } else if (riskLevel === 'MEDIUM') {
      content += `⚠️ **MEDIUM PRIORITY** - Issues that should be addressed for better code quality.\n\n`;
    } else {
      content += `✅ **LOW RISK** - Code quality is good with minimal issues.\n\n`;
    }
    
    // Detailed Issues
    if (analysis.issues.length > 0) {
      content += `## Detailed Issues\n\n`;
      
      const issuesByCategory = analysis.issues.reduce((groups, issue) => {
        if (!groups[issue.category]) groups[issue.category] = [];
        groups[issue.category].push(issue);
        return groups;
      }, {} as Record<string, typeof analysis.issues>);
      
      Object.entries(issuesByCategory).forEach(([category, issues]) => {
        content += `### ${category.toUpperCase()} Issues (${issues.length})\n\n`;
        
        issues.forEach((issue, index) => {
          const severityIcon = this.getSeverityIcon(issue.severity);
          content += `${index + 1}. ${severityIcon} **${issue.message}**\n`;
          content += `   - **Severity:** ${issue.severity.toUpperCase()}\n`;
          if (issue.line) {
            content += `   - **Location:** Line ${issue.line}\n`;
          }
          if (issue.suggestion) {
            content += `   - **Recommendation:** ${issue.suggestion}\n`;
          }
          content += `\n`;
        });
      });
    }
    
    // Recommendations
    if (analysis.recommendations.length > 0) {
      content += `## Recommendations\n\n`;
      analysis.recommendations.forEach((rec, index) => {
        content += `${index + 1}. ${rec}\n`;
      });
      content += `\n`;
    }
    
    // Action Items
    content += `## Action Items\n\n`;
    if (criticalCount > 0) {
      content += `### 🚨 URGENT (Critical Issues)\n`;
      const criticalIssues = analysis.issues.filter(i => i.severity === 'critical');
      criticalIssues.forEach((issue, index) => {
        content += `${index + 1}. ${issue.message}\n`;
      });
      content += `\n`;
    }
    
    if (errorCount > 0) {
      content += `### ❌ HIGH PRIORITY (Errors)\n`;
      const errorIssues = analysis.issues.filter(i => i.severity === 'error');
      errorIssues.forEach((issue, index) => {
        content += `${index + 1}. ${issue.message}\n`;
      });
      content += `\n`;
    }
    
    if (warningCount > 0) {
      content += `### ⚠️ MEDIUM PRIORITY (Warnings)\n`;
      content += `Consider addressing ${warningCount} warning(s) for improved code quality.\n\n`;
    }
    
    // Metadata for Graphlit
    content += `## Metadata\n`;
    content += `- **Review Type:** Automated Code Analysis\n`;
    content += `- **Tool:** Claude Code Review MCP\n`;
    content += `- **Timestamp:** ${timestamp}\n`;
    content += `- **Risk Level:** ${riskLevel}\n`;
    content += `- **Total Issues:** ${analysis.issues.length}\n`;
    content += `- **Complexity:** ${analysis.complexity}\n`;
    
    if (this.config.tags && this.config.tags.length > 0) {
      content += `- **Tags:** ${this.config.tags.join(', ')}\n`;
    }
    
    return content;
  }

  /**
   * Generates a structured summary for quick reference
   */
  generateSummary(analysis: CodeAnalysis, filePath?: string): string {
    const criticalCount = analysis.issues.filter(i => i.severity === 'critical').length;
    const errorCount = analysis.issues.filter(i => i.severity === 'error').length;
    const warningCount = analysis.issues.filter(i => i.severity === 'warning').length;
    
    let status = 'GOOD';
    if (criticalCount > 0) status = 'CRITICAL';
    else if (errorCount > 2) status = 'POOR';
    else if (errorCount > 0) status = 'FAIR';
    
    return `Code Review Summary: ${filePath || 'Code Analysis'} - Status: ${status} | Issues: ${analysis.issues.length} | Complexity: ${analysis.complexity} | Critical: ${criticalCount} | Errors: ${errorCount} | Warnings: ${warningCount}`;
  }

  /**
   * Creates a memory-friendly version for Graphlit ingestion
   */
  createMemoryContent(analysis: CodeAnalysis, context: { filePath?: string; projectPath?: string; reviewType: string }): string {
    const timestamp = new Date().toISOString();
    
    let memory = `Code review completed on ${timestamp}. `;
    
    if (context.filePath) {
      memory += `File: ${context.filePath}. `;
    }
    
    if (context.projectPath) {
      memory += `Project: ${context.projectPath}. `;
    }
    
    memory += `Language: ${analysis.language}. `;
    memory += `Complexity score: ${analysis.complexity}. `;
    
    const criticalCount = analysis.issues.filter(i => i.severity === 'critical').length;
    const errorCount = analysis.issues.filter(i => i.severity === 'error').length;
    const warningCount = analysis.issues.filter(i => i.severity === 'warning').length;
    
    memory += `Found ${analysis.issues.length} total issues: ${criticalCount} critical, ${errorCount} errors, ${warningCount} warnings. `;
    
    if (criticalCount > 0) {
      memory += `URGENT: Critical security or functionality issues require immediate attention. `;
    } else if (errorCount > 0) {
      memory += `Errors found that should be fixed before deployment. `;
    } else if (warningCount > 0) {
      memory += `Code quality is good with some warnings to consider. `;
    } else {
      memory += `Excellent code quality with no significant issues. `;
    }
    
    if (analysis.recommendations.length > 0) {
      memory += `Key recommendations: ${analysis.recommendations.slice(0, 3).join('; ')}. `;
    }
    
    return memory;
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  }

  /**
   * Determines if the review should be automatically ingested to Graphlit
   */
  shouldAutoIngest(analysis: CodeAnalysis): boolean {
    if (!this.config.enabled || !this.config.autoIngest) {
      return false;
    }
    
    const criticalCount = analysis.issues.filter(i => i.severity === 'critical').length;
    const errorCount = analysis.issues.filter(i => i.severity === 'error').length;
    
    // Auto-ingest if there are critical issues or multiple errors
    return criticalCount > 0 || errorCount > 1 || analysis.complexity > 20;
  }
}
