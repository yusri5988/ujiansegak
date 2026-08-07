import { describe, it, expect } from 'vitest'
import { BmiCalculationService } from '../src/app/Services/BmiCalculationService'
import { SegakScoringService } from '../src/app/Services/SegakScoringService'
import { Hash } from '../src/helpers/Hash'

describe('Hash Helper', () => {
  it('mengesahkan kata laluan Guru1234! dengan hash yang betul', async () => {
    const hash = await Hash.make('Guru1234!')
    expect(hash).toBe('bb27ebb8b669ef313a2b6353b46462b95fd77705e2de0145887e152571bd27d3')

    const isValid = await Hash.verify('Guru1234!', 'bb27ebb8b669ef313a2b6353b46462b95fd77705e2de0145887e152571bd27d3')
    expect(isValid).toBe(true)
  })
})

describe('BmiCalculationService', () => {
  const bmiService = new BmiCalculationService()

  it('mengira nilai BMI dengan tepat berasaskan berat dan tinggi', () => {
    const bmi = bmiService.calculateBmi(138.5, 34)
    expect(bmi).toBeGreaterThan(17)
    expect(bmi).toBeLessThan(18)
  })

  it('menentukan kategori BMI murid lelaki umur 11 dengan betul', () => {
    const categoryNormal = bmiService.determineBmiCategory(17.5, 11, 'L')
    expect(categoryNormal).toBe('Berat Badan Normal')

    const categoryObese = bmiService.determineBmiCategory(27.0, 11, 'L')
    expect(categoryObese).toBe('Obesiti')
  })
})

describe('SegakScoringService', () => {
  const scoringService = new SegakScoringService()

  it('mengira jumlah skor dan menentukan gred keseluruhan Ujian SEGAK', () => {
    const items = [
      { activityCode: 'BMI', rawMeasurement: 17.5, calculatedScore: 0, performanceCategory: 'Berat Badan Normal' },
      { activityCode: 'STEP_TEST', rawMeasurement: 90, calculatedScore: 5, performanceCategory: 'Cemerlang' },
      { activityCode: 'PUSH_UP', rawMeasurement: 18, calculatedScore: 4, performanceCategory: 'Tinggi' },
      { activityCode: 'CURL_UP', rawMeasurement: 15, calculatedScore: 4, performanceCategory: 'Tinggi' },
      { activityCode: 'SIT_REACH', rawMeasurement: 30, calculatedScore: 4, performanceCategory: 'Tinggi' },
    ]

    const result = scoringService.calculateOverallResult(items)
    expect(result.totalScore).toBe(17)
    expect(result.overallGrade).toBe('Tinggi')
  })
})
