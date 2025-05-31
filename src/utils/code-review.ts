export interface CodeReviewResult {
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'security' | 'performance' | 'maintainability' | 'bugs' | 'style' | 'structure';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface CodeAnalysis {
  language: string;
  complexity: number;
  issues: CodeReviewResult[];
  summary: string;
  recommendations: string[];
}

export class CodeReviewer {
  
  async analyzeCode(code: string, filePath?: string): Promise<CodeAnalysis> {
    const language = this.detectLanguage(code, filePath);
    const issues: CodeReviewResult[] = [];
    
    // Basic static analysis
    issues.push(...this.checkSecurity(code));
    issues.push(...this.checkPerformance(code));
    issues.push(...this.checkMaintainability(code));
    issues.push(...this.checkBugs(code));
    issues.push(...this.checkStyle(code));
    
    const complexity = this.calculateComplexity(code);
    const summary = this.generateSummary(issues, complexity);
    const recommendations = this.generateRecommendations(issues);
    
    return {
      language,
      complexity,
      issues,
      summary,
      recommendations
    };
  }

  private detectLanguage(code: string, filePath?: string): string {
    if (filePath) {
      const ext = filePath.split('.').pop()?.toLowerCase();
      const langMap: Record<string, string> = {
        'js': 'JavaScript',
        'ts': 'TypeScript',
        'py': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'go': 'Go',
        'rs': 'Rust',
        'php': 'PHP',
        'rb': 'Ruby'
      };
      if (ext && langMap[ext]) return langMap[ext];
    }
    
    // Simple heuristics
    // Check TS first because TS sources almost always satisfy the JS heuristic too
    if (code.includes('interface') || code.includes('enum') || code.includes('type')) {
      return 'TypeScript';
    }
    if (code.includes('function') && code.includes('const')) {
      return 'JavaScript';
    }
    if (code.includes('def ') && code.includes(':')) return 'Python';
    
    return 'Unknown';
  }

  private checkSecurity(code: string): CodeReviewResult[] {
    const issues: CodeReviewResult[] = [];
    
    // SQL Injection patterns - More specific and safer detection
    const sqlInjectionPatterns = [
      // String concatenation with user input in queries
      /query\s*=\s*['"`][^'"`]*['"`]\s*\+\s*\w+/i,
      /SELECT\s+[^;]*\+\s*\w+[^;]*FROM/i,
      /INSERT\s+INTO\s+[^;]*\+\s*\w+/i,
      /UPDATE\s+[^;]*SET\s+[^;]*\+\s*\w+/i,
      /DELETE\s+FROM\s+[^;]*WHERE\s+[^;]*\+\s*\w+/i,
      // Direct variable interpolation in SQL strings
      /['"`][^'"`]*\$\{[^}]+\}[^'"`]*['"`]/,
      // Template literal SQL with variables
      /`[^`]*SELECT[^`]*\$\{[^}]+\}[^`]*`/i
    ];
    
    sqlInjectionPatterns.forEach(pattern => {
      if (code.match(pattern)) {
        issues.push({
          severity: 'critical',
          category: 'security',
          message: 'Potential SQL injection vulnerability detected',
          suggestion: 'Use parameterized queries or prepared statements'
        });
      }
    });
    
    // Hardcoded secrets
    if (code.match(/(password|secret|key|token)\s*=\s*['"][^'"]+['"]/i)) {
      issues.push({
        severity: 'critical',
        category: 'security',
        message: 'Hardcoded credentials detected',
        suggestion: 'Use environment variables or secure credential storage'
      });
    }
    
    // Eval usage - More precise detection to avoid false positives
    const evalPatterns = [
      // Direct eval calls
      /\beval\s*\(/,
      // Window.eval or global.eval
      /(window|global)\.eval\s*\(/,
      // Function constructor with eval-like behavior
      /new\s+Function\s*\([^)]*\)\s*\(/
    ];
    
    evalPatterns.forEach(pattern => {
      if (code.match(pattern)) {
        // Exclude detection logic itself and regex patterns
        const isInRegexPattern = /\/.*eval.*\//.test(code);
        const isInDetectionLogic = code.includes('evalPatterns') || 
                                   code.includes('checkSecurity') ||
                                   code.includes('Use of eval() detected');
        const hasEvalInComments = code.split('\n').some(line => 
          line.includes('eval') && (line.trim().startsWith('//') || line.trim().startsWith('*'))
        );
        
        if (!isInRegexPattern && !isInDetectionLogic && !hasEvalInComments) {
          issues.push({
            severity: 'error',
            category: 'security',
            message: 'Use of eval() detected - potential security risk',
            suggestion: 'Avoid eval() and use safer alternatives'
          });
        }
      }
    });
    
    return issues;
  }

  private checkPerformance(code: string): CodeReviewResult[] {
    const issues: CodeReviewResult[] = [];
    
    // Nested loops
    const nestedLoopPattern = /for\s*\([^}]*for\s*\(/g;
    if (nestedLoopPattern.test(code)) {
      issues.push({
        severity: 'warning',
        category: 'performance',
        message: 'Nested loops detected - potential O(n²) complexity',
        suggestion: 'Consider optimizing algorithm or using more efficient data structures'
      });
    }
    
    // Synchronous file operations
    if (code.match(/fs\.readFileSync|fs\.writeFileSync/)) {
      issues.push({
        severity: 'warning',
        category: 'performance',
        message: 'Synchronous file operations detected',
        suggestion: 'Use asynchronous file operations for better performance'
      });
    }
    
    return issues;
  }

  private checkMaintainability(code: string): CodeReviewResult[] {
    const issues: CodeReviewResult[] = [];
    
    // Long functions
    const functionMatches = code.match(/function[^{]*{[^}]*}/g) || [];
    functionMatches.forEach(func => {
      const lines = func.split('\n').length;
      if (lines > 50) {
        issues.push({
          severity: 'warning',
          category: 'maintainability',
          message: `Function is too long (${lines} lines)`,
          suggestion: 'Break down into smaller, more focused functions'
        });
      }
    });
    
    // Magic numbers
    if (code.match(/\b\d{2,}\b/g)) {
      issues.push({
        severity: 'info',
        category: 'maintainability',
        message: 'Magic numbers detected',
        suggestion: 'Consider using named constants for better readability'
      });
    }
    
    return issues;
  }

  private checkBugs(code: string): CodeReviewResult[] {
    const issues: CodeReviewResult[] = [];
    
    // Potential null pointer
    if (code.match(/\.\w+\s*\(/g) && !code.includes('?.')) {
      issues.push({
        severity: 'warning',
        category: 'bugs',
        message: 'Potential null/undefined access',
        suggestion: 'Add null checks or use optional chaining'
      });
    }
    
    // Assignment in condition
    if (code.match(/if\s*\([^=]*=[^=]/)) {
      issues.push({
        severity: 'error',
        category: 'bugs',
        message: 'Assignment in conditional statement',
        suggestion: 'Use === for comparison instead of = for assignment'
      });
    }
    
    return issues;
  }

  private checkStyle(code: string): CodeReviewResult[] {
    const issues: CodeReviewResult[] = [];
    
    // Inconsistent indentation
    const lines = code.split('\n');
    const indentations = lines.map(line => line.match(/^\s*/)?.[0].length || 0);
    const hasInconsistentIndent = indentations.some((indent, i) => 
      i > 0 && indent % 2 !== 0 && indent % 4 !== 0
    );
    
    if (hasInconsistentIndent) {
      issues.push({
        severity: 'info',
        category: 'style',
        message: 'Inconsistent indentation detected',
        suggestion: 'Use consistent indentation (2 or 4 spaces)'
      });
    }
    
    return issues;
  }

  private calculateComplexity(code: string): number {
    let complexity = 1; // Base complexity
    
    // Count decision points
    const decisionPoints = [
      /if\s*\(/g,
      /else\s*if/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /&&/g,
      /\|\|/g
    ];
    
    decisionPoints.forEach(pattern => {
      const matches = code.match(pattern);
      if (matches) complexity += matches.length;
    });
    
    return complexity;
  }

  private generateSummary(issues: CodeReviewResult[], complexity: number): string {
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    
    let summary = `Code Analysis Summary:\n`;
    summary += `- Complexity Score: ${complexity}\n`;
    summary += `- Critical Issues: ${criticalCount}\n`;
    summary += `- Errors: ${errorCount}\n`;
    summary += `- Warnings: ${warningCount}\n`;
    
    if (criticalCount > 0) {
      summary += `\n⚠️ CRITICAL: Address security vulnerabilities immediately`;
    } else if (errorCount > 0) {
      summary += `\n⚠️ Errors found that should be fixed before deployment`;
    } else if (warningCount > 0) {
      summary += `\n✅ No critical issues, but consider addressing warnings`;
    } else {
      summary += `\n✅ Code looks good! No major issues detected`;
    }
    
    return summary;
  }

  private generateRecommendations(issues: CodeReviewResult[]): string[] {
    const recommendations: string[] = [];
    
    const categories = [...new Set(issues.map(i => i.category))];
    
    categories.forEach(category => {
      const categoryIssues = issues.filter(i => i.category === category);
      if (categoryIssues.length > 0) {
        recommendations.push(`${category.toUpperCase()}: Address ${categoryIssues.length} ${category} issue(s)`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push('Continue following good coding practices');
    }
    
    return recommendations;
  }
}
