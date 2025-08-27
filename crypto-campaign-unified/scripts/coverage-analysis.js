#!/usr/bin/env node
/**
 * Coverage Analysis Script
 * Analyzes test coverage and generates actionable insights
 */

const fs = require('fs')
const path = require('path')

class CoverageAnalyzer {
  constructor(coverageFile = './coverage/coverage-summary.json') {
    this.coverageFile = coverageFile
    this.data = null
  }

  loadCoverage() {
    try {
      if (!fs.existsSync(this.coverageFile)) {
        throw new Error(`Coverage file not found: ${this.coverageFile}`)
      }
      
      this.data = JSON.parse(fs.readFileSync(this.coverageFile, 'utf8'))
      return true
    } catch (error) {
      console.error('Failed to load coverage data:', error.message)
      return false
    }
  }

  analyzeOverall() {
    const { total } = this.data
    
    console.log('\n📊 COVERAGE ANALYSIS REPORT')
    console.log('=' .repeat(50))
    
    console.log('\n🎯 Overall Coverage:')
    console.log(`   Lines:      ${total.lines.pct.toFixed(2)}% (${total.lines.covered}/${total.lines.total})`)
    console.log(`   Functions:  ${total.functions.pct.toFixed(2)}% (${total.functions.covered}/${total.functions.total})`)
    console.log(`   Branches:   ${total.branches.pct.toFixed(2)}% (${total.branches.covered}/${total.branches.total})`)
    console.log(`   Statements: ${total.statements.pct.toFixed(2)}% (${total.statements.covered}/${total.statements.total})`)

    return this.calculateQualityScore(total)
  }

  calculateQualityScore(metrics) {
    const weights = {
      lines: 0.3,
      functions: 0.3,
      branches: 0.2,
      statements: 0.2
    }
    
    const score = (
      metrics.lines.pct * weights.lines +
      metrics.functions.pct * weights.functions +
      metrics.branches.pct * weights.branches +
      metrics.statements.pct * weights.statements
    )
    
    console.log(`\n🏆 Quality Score: ${score.toFixed(2)}%`)
    
    let grade = 'F'
    if (score >= 95) grade = 'A+'
    else if (score >= 90) grade = 'A'
    else if (score >= 85) grade = 'B+'
    else if (score >= 80) grade = 'B'
    else if (score >= 75) grade = 'C+'
    else if (score >= 70) grade = 'C'
    else if (score >= 65) grade = 'D'
    
    console.log(`🎓 Grade: ${grade}`)
    
    return { score, grade }
  }

  analyzeByFile() {
    console.log('\n📁 File-by-File Analysis:')
    
    const files = Object.keys(this.data).filter(key => key !== 'total')
    const sortedFiles = files
      .map(file => ({
        name: file,
        ...this.data[file]
      }))
      .sort((a, b) => a.lines.pct - b.lines.pct)
    
    console.log('\n⚠️  Files needing attention (lowest coverage first):')
    sortedFiles.slice(0, 10).forEach(file => {
      const status = file.lines.pct < 80 ? '❌' : file.lines.pct < 90 ? '⚠️' : '✅'
      console.log(`   ${status} ${file.name}: ${file.lines.pct.toFixed(1)}% lines`)
    })
    
    return sortedFiles
  }

  identifyGaps() {
    console.log('\n🔍 Coverage Gaps Analysis:')
    
    const thresholds = {
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90
    }
    
    const { total } = this.data
    const gaps = []
    
    Object.keys(thresholds).forEach(metric => {
      const current = total[metric].pct
      const threshold = thresholds[metric]
      
      if (current < threshold) {
        const gap = threshold - current
        const missing = Math.ceil((total[metric].total * threshold / 100) - total[metric].covered)
        gaps.push({
          metric,
          current,
          threshold,
          gap,
          missing
        })
        
        console.log(`   ⚠️  ${metric}: ${gap.toFixed(1)}% below threshold (need ${missing} more)`)
      } else {
        console.log(`   ✅ ${metric}: ${(current - threshold).toFixed(1)}% above threshold`)
      }
    })
    
    return gaps
  }

  generateRecommendations() {
    const gaps = this.identifyGaps()
    
    console.log('\n💡 Recommendations:')
    
    if (gaps.length === 0) {
      console.log('   🎉 All coverage thresholds met!')
      console.log('   🔍 Consider adding integration tests')
      console.log('   🚀 Focus on performance optimization')
    } else {
      gaps.forEach(gap => {
        switch (gap.metric) {
          case 'lines':
            console.log(`   📝 Add ${gap.missing} more line tests for ${gap.metric}`)
            console.log('      → Focus on error handling and edge cases')
            break
          case 'functions':
            console.log(`   🔧 Test ${gap.missing} more functions`)
            console.log('      → Prioritize public API methods')
            break
          case 'branches':
            console.log(`   🌳 Cover ${gap.missing} more conditional branches`)
            console.log('      → Add tests for if/else and switch statements')
            break
          case 'statements':
            console.log(`   ✍️  Execute ${gap.missing} more statements`)
            console.log('      → Review complex logical expressions')
            break
        }
      })
      
      console.log('\n🎯 Priority Actions:')
      console.log('   1. Add missing unit tests for uncovered functions')
      console.log('   2. Test error conditions and edge cases')
      console.log('   3. Improve branch coverage in conditional logic')
      console.log('   4. Add integration tests for module interactions')
    }
  }

  generateReport() {
    if (!this.loadCoverage()) {
      process.exit(1)
    }
    
    const qualityMetrics = this.analyzeOverall()
    const fileAnalysis = this.analyzeByFile()
    this.generateRecommendations()
    
    console.log('\n📈 Trend Tracking:')
    console.log('   💾 Coverage data saved for historical analysis')
    
    // Save historical data
    const historyFile = './coverage/coverage-history.json'
    let history = []
    
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'))
    }
    
    history.push({
      timestamp: new Date().toISOString(),
      ...qualityMetrics,
      total: this.data.total
    })
    
    // Keep last 30 entries
    if (history.length > 30) {
      history = history.slice(-30)
    }
    
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2))
    
    console.log('\n🔗 Next Steps:')
    console.log('   📊 View detailed HTML report: open coverage/index.html')
    console.log('   🔄 Run tests: npm run test:coverage')
    console.log('   📈 Monitor trends: cat coverage/coverage-history.json')
    
    return qualityMetrics.score >= 90
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new CoverageAnalyzer()
  const success = analyzer.generateReport()
  process.exit(success ? 0 : 1)
}

module.exports = CoverageAnalyzer