import type { SegakScoringRuleRow } from '@/database/schema'

export interface ActivityMeasurementInput {
  activityCode: string
  rawMeasurement: number
}

export interface CalculatedActivityResult {
  activityCode: string
  rawMeasurement: number
  calculatedScore: number
  performanceCategory: string
}

export interface OverallSegakResult {
  totalScore: number
  overallGrade: string
  items: CalculatedActivityResult[]
}

export class SegakScoringService {
  public calculateActivityScore(
    measurement: number,
    rules: SegakScoringRuleRow[]
  ): { score: number; category: string } {
    if (!rules || rules.length === 0) {
      return { score: 1, category: 'Tiada Peraturan' }
    }

    const matchedRule = rules.find(
      (r) => measurement >= r.minMeasurement && measurement <= r.maxMeasurement
    )

    if (matchedRule) {
      return {
        score: matchedRule.score,
        category: matchedRule.performanceCategory,
      }
    }

    const sortedRules = [...rules].sort((a, b) => a.score - b.score)
    const highest = sortedRules[sortedRules.length - 1]
    const lowest = sortedRules[0]

    if (highest && measurement > highest.maxMeasurement) {
      return { score: highest.score, category: highest.performanceCategory }
    } else if (lowest) {
      return { score: lowest.score, category: lowest.performanceCategory }
    }

    return { score: 1, category: 'Rendah' }
  }

  public calculateOverallResult(items: CalculatedActivityResult[]): OverallSegakResult {
    const fitnessItems = items.filter((i) => i.activityCode !== 'BMI')
    const totalScore = fitnessItems.reduce((sum, item) => sum + item.calculatedScore, 0)

    let overallGrade = 'Sederhana'
    if (totalScore >= 19) {
      overallGrade = 'Sangat Tinggi'
    } else if (totalScore >= 15) {
      overallGrade = 'Tinggi'
    } else if (totalScore >= 11) {
      overallGrade = 'Sederhana'
    } else if (totalScore >= 8) {
      overallGrade = 'Perlu Perhatian'
    } else {
      overallGrade = 'Sangat Rendah'
    }

    return {
      totalScore,
      overallGrade,
      items,
    }
  }
}
