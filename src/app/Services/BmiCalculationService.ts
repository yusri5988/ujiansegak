export class BmiCalculationService {
  /**
   * Mengira nilai BMI berasaskan berat (kg) dan tinggi (cm)
   * Formula: BMI = weight / (heightInMeters ^ 2)
   */
  public calculateBmi(heightCm: number, weightKg: number): number {
    if (!heightCm || heightCm <= 0 || !weightKg || weightKg <= 0) {
      return 0
    }
    const heightM = heightCm / 100
    const bmi = weightKg / (heightM * heightM)
    return Math.round(bmi * 100) / 100
  }

  /**
   * Mengelaskan kategori BMI mengikut julat umur & jantina kanak-kanak/remaja sekolah Malaysia
   */
  public determineBmiCategory(bmi: number, age: number, gender: 'L' | 'P'): string {
    // Standard Rujukan BMI Kanak-Kanak / Remaja Malaysia
    // Menggunakan julat rujukan bersesuaian umur
    if (gender === 'L') {
      if (age <= 10) {
        if (bmi < 14.0) return 'Kurus'
        if (bmi <= 18.5) return 'Berat Badan Normal'
        if (bmi <= 21.0) return 'Berlebihan Berat Badan'
        return 'Obesiti'
      } else if (age <= 13) {
        if (bmi < 14.5) return 'Kurus'
        if (bmi <= 20.5) return 'Berat Badan Normal'
        if (bmi <= 23.5) return 'Berlebihan Berat Badan'
        return 'Obesiti'
      } else {
        if (bmi < 15.5) return 'Kurus'
        if (bmi <= 22.5) return 'Berat Badan Normal'
        if (bmi <= 26.0) return 'Berlebihan Berat Badan'
        return 'Obesiti'
      }
    } else {
      // Perempuan
      if (age <= 10) {
        if (bmi < 13.5) return 'Kurus'
        if (bmi <= 18.5) return 'Berat Badan Normal'
        if (bmi <= 21.5) return 'Berlebihan Berat Badan'
        return 'Obesiti'
      } else if (age <= 13) {
        if (bmi < 14.0) return 'Kurus'
        if (bmi <= 21.0) return 'Berat Badan Normal'
        if (bmi <= 24.0) return 'Berlebihan Berat Badan'
        return 'Obesiti'
      } else {
        if (bmi < 15.0) return 'Kurus'
        if (bmi <= 23.0) return 'Berat Badan Normal'
        if (bmi <= 26.5) return 'Berlebihan Berat Badan'
        return 'Obesiti'
      }
    }
  }
}
