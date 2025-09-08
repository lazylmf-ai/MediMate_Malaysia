/**
 * Cultural Data Service
 * Central service for Malaysian cultural intelligence features
 * Integrates prayer times, holidays, and cultural considerations into healthcare workflows
 */

const PrayerTimesCalculator = require('../../scripts/data-seeding/prayer-times-calculator');
const MalaysianHolidayGenerator = require('../../scripts/data-seeding/holiday-calendar-generator');

class CulturalDataService {
  constructor(models) {
    this.models = models;
    this.prayerCalculator = new PrayerTimesCalculator();
    this.holidayGenerator = new MalaysianHolidayGenerator();
  }

  /**
   * Get current prayer times for a city
   * @param {string} cityKey - City identifier (e.g., 'kuala-lumpur')
   * @param {string} date - Optional date (defaults to today)
   */
  async getPrayerTimes(cityKey, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    try {
      // Try to get from database first
      let prayerTimes = await this.models.PrayerTime.findOne({
        where: {
          cityKey: cityKey,
          prayerDate: targetDate
        }
      });

      // If not found, calculate and store
      if (!prayerTimes) {
        const calculated = this.prayerCalculator.calculatePrayerTimes(cityKey, targetDate);
        
        prayerTimes = await this.models.PrayerTime.create({
          cityKey: cityKey,
          cityName: calculated.city,
          prayerDate: targetDate,
          fajr: calculated.prayers.fajr,
          sunrise: calculated.prayers.sunrise,
          dhuhr: calculated.prayers.dhuhr,
          asr: calculated.prayers.asr,
          maghrib: calculated.prayers.maghrib,
          isha: calculated.prayers.isha,
          timezone: calculated.timezone,
          calculationMethod: calculated.metadata.calculationMethod
        });
      }

      return prayerTimes;
    } catch (error) {
      console.error('Error getting prayer times:', error);
      throw new Error(`Failed to get prayer times for ${cityKey}: ${error.message}`);
    }
  }

  /**
   * Get next prayer time for medication scheduling
   * @param {string} cityKey - City identifier
   */
  async getNextPrayerTime(cityKey) {
    const prayerTimes = await this.getPrayerTimes(cityKey);
    return prayerTimes.getNextPrayer();
  }

  /**
   * Generate culturally-aware medication schedule
   * @param {string} cityKey - City identifier
   * @param {string} frequency - Medication frequency (1x, 2x, 3x, 4x)
   * @param {string} date - Optional date (defaults to today)
   */
  async getMedicationSchedule(cityKey, frequency, date = null) {
    const prayerTimes = await this.getPrayerTimes(cityKey, date);
    const schedule = prayerTimes.getMedicationSchedule(frequency);

    return {
      city: prayerTimes.cityName,
      date: prayerTimes.prayerDate,
      frequency: frequency,
      schedule: schedule,
      cultural_note: 'Medication times are scheduled to align with Islamic prayer times for better adherence.',
      prayer_times: {
        fajr: prayerTimes.fajr,
        dhuhr: prayerTimes.dhuhr,
        asr: prayerTimes.asr,
        maghrib: prayerTimes.maghrib,
        isha: prayerTimes.isha
      }
    };
  }

  /**
   * Check for holidays that might affect healthcare appointments
   * @param {string} stateCode - Malaysian state code (e.g., 'KUL', 'SGR')
   * @param {number} days - Number of days to look ahead
   */
  async getUpcomingHolidays(stateCode, days = 30) {
    try {
      const holidays = await this.models.MalaysianHoliday.findUpcoming(days, stateCode);
      
      return holidays.map(holiday => ({
        ...holiday.toJSON(),
        recommendations: holiday.getHealthcareRecommendations(),
        is_applicable: holiday.isApplicableToState(stateCode)
      }));
    } catch (error) {
      console.error('Error getting upcoming holidays:', error);
      throw new Error(`Failed to get holidays for ${stateCode}: ${error.message}`);
    }
  }

  /**
   * Check if a specific date is a holiday
   * @param {string} date - Date to check (YYYY-MM-DD)
   * @param {string} stateCode - Malaysian state code
   */
  async isHoliday(date, stateCode) {
    return await this.models.MalaysianHoliday.isHoliday(date, stateCode);
  }

  /**
   * Get culturally-appropriate appointment scheduling recommendations
   * @param {string} cityKey - City identifier
   * @param {string} stateCode - State code
   * @param {string} startDate - Start date for scheduling window
   * @param {number} days - Number of days in scheduling window
   */
  async getAppointmentSchedulingRecommendations(cityKey, stateCode, startDate, days = 14) {
    const [upcomingHolidays, prayerTimes] = await Promise.all([
      this.getUpcomingHolidays(stateCode, days),
      this.getPrayerTimes(cityKey, startDate)
    ]);

    const recommendations = [];
    const currentDate = new Date(startDate);

    for (let i = 0; i < days; i++) {
      const checkDate = new Date(currentDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateString = checkDate.toISOString().split('T')[0];
      const dayPrayerTimes = await this.getPrayerTimes(cityKey, dateString);

      // Check if it's a holiday
      const holidayStatus = await this.isHoliday(dateString, stateCode);
      
      // Check if it's Friday (Jummah prayer day)
      const isFriday = checkDate.getDay() === 5;

      const dayRecommendation = {
        date: dateString,
        day_of_week: checkDate.toLocaleDateString('en-US', { weekday: 'long' }),
        is_holiday: holidayStatus.isHoliday,
        holiday_info: holidayStatus.holiday,
        healthcare_impact: holidayStatus.healthcareImpact,
        is_friday: isFriday,
        recommended_times: [],
        avoid_times: [],
        cultural_notes: []
      };

      // Add prayer time considerations
      if (isFriday) {
        dayRecommendation.avoid_times.push({
          start: '11:30',
          end: '14:30',
          reason: 'Jummah (Friday) prayer period - many Muslims attend mosque'
        });
        dayRecommendation.cultural_notes.push('Friday is Jummah prayer day. Schedule appointments outside prayer hours.');
      }

      // Add general prayer time avoidance
      const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
      prayers.forEach(prayer => {
        const prayerTime = dayPrayerTimes[prayer];
        if (prayerTime) {
          const [hour, minute] = prayerTime.split(':').map(Number);
          const beforeTime = new Date(0, 0, 0, hour, minute - 15).toTimeString().substring(0, 5);
          const afterTime = new Date(0, 0, 0, hour, minute + 15).toTimeString().substring(0, 5);
          
          dayRecommendation.avoid_times.push({
            start: beforeTime,
            end: afterTime,
            reason: `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} prayer time`
          });
        }
      });

      // Add recommended appointment times (between prayers)
      if (!holidayStatus.isHoliday || holidayStatus.healthcareImpact !== 'high') {
        dayRecommendation.recommended_times = [
          { start: '09:00', end: '11:00', note: 'Morning hours after Fajr' },
          { start: '15:00', end: '17:00', note: 'Afternoon hours after Asr' },
          { start: '20:00', end: '21:00', note: 'Evening hours after Maghrib' }
        ];

        // Filter out times that conflict with avoid_times
        dayRecommendation.recommended_times = dayRecommendation.recommended_times.filter(recTime => {
          return !dayRecommendation.avoid_times.some(avoidTime => {
            return (recTime.start >= avoidTime.start && recTime.start <= avoidTime.end) ||
                   (recTime.end >= avoidTime.start && recTime.end <= avoidTime.end);
          });
        });
      }

      recommendations.push(dayRecommendation);
    }

    return {
      city: prayerTimes.cityName,
      state_code: stateCode,
      scheduling_period: {
        start: startDate,
        days: days
      },
      daily_recommendations: recommendations,
      general_notes: [
        'Appointment times are optimized to avoid Islamic prayer times',
        'Holiday impacts are considered for healthcare service availability',
        'Friday afternoons may have reduced availability due to Jummah prayers',
        'Ramadan period may require special scheduling considerations'
      ]
    };
  }

  /**
   * Get medication cultural considerations
   * @param {string} medicationId - Medication identifier
   */
  async getMedicationCulturalInfo(medicationId) {
    try {
      const medication = await this.models.LocalMedication.findOne({
        where: { medicationId: medicationId }
      });

      if (!medication) {
        return {
          found: false,
          message: 'Medication not found in Malaysian database'
        };
      }

      return {
        found: true,
        medication: medication.getDisplayName(),
        halal_status: medication.getHalalStatus(),
        cultural_considerations: medication.getCulturalConsiderations(),
        availability: medication.getAvailabilityInfo(),
        brand_names: medication.getAllBrandNames()
      };
    } catch (error) {
      console.error('Error getting medication cultural info:', error);
      throw new Error(`Failed to get cultural info for medication ${medicationId}: ${error.message}`);
    }
  }

  /**
   * Search for Halal-certified medications
   * @param {string} therapeuticClass - Therapeutic class to search
   */
  async findHalalMedications(therapeuticClass = null) {
    try {
      let whereCondition = { isHalal: true };
      
      if (therapeuticClass) {
        whereCondition.therapeuticClass = {
          [this.models.sequelize.Sequelize.Op.iLike]: `%${therapeuticClass}%`
        };
      }

      const medications = await this.models.LocalMedication.findAll({
        where: whereCondition,
        order: [['genericName', 'ASC']]
      });

      return medications.map(med => ({
        medication_id: med.medicationId,
        generic_name: med.genericName,
        brand_names: med.brandNames,
        therapeutic_class: med.therapeuticClass,
        halal_certification: med.halalCertification,
        availability: med.availabilityStatus,
        cultural_notes: med.culturalNotes
      }));
    } catch (error) {
      console.error('Error finding halal medications:', error);
      throw new Error(`Failed to find halal medications: ${error.message}`);
    }
  }

  /**
   * Get cultural dashboard data
   * @param {string} cityKey - City identifier
   * @param {string} stateCode - State code
   */
  async getCulturalDashboard(cityKey, stateCode) {
    try {
      const [
        currentPrayerTimes,
        nextPrayer,
        upcomingHolidays,
        todaysHolidays,
        medicationStats
      ] = await Promise.all([
        this.getPrayerTimes(cityKey),
        this.getNextPrayerTime(cityKey),
        this.getUpcomingHolidays(stateCode, 7),
        this.models.MalaysianHoliday.getTodaysHolidays(stateCode),
        this.models.LocalMedication.getStatistics()
      ]);

      return {
        location: {
          city: currentPrayerTimes.cityName,
          state_code: stateCode
        },
        today: {
          date: currentPrayerTimes.prayerDate,
          prayer_times: {
            fajr: currentPrayerTimes.fajr,
            dhuhr: currentPrayerTimes.dhuhr,
            asr: currentPrayerTimes.asr,
            maghrib: currentPrayerTimes.maghrib,
            isha: currentPrayerTimes.isha
          },
          next_prayer: nextPrayer,
          holidays: todaysHolidays.map(h => ({
            name: h.name,
            name_bm: h.nameBm,
            type: h.holidayType,
            healthcare_impact: h.healthcareImpact
          }))
        },
        upcoming: {
          holidays: upcomingHolidays.slice(0, 3).map(h => ({
            name: h.name,
            date: h.holidayDate,
            days_away: Math.ceil((new Date(h.holidayDate) - new Date()) / (1000 * 60 * 60 * 24)),
            healthcare_impact: h.healthcareImpact
          }))
        },
        medication_database: {
          total_medications: medicationStats.total_medications,
          halal_certified: medicationStats.halal_certified,
          halal_percentage: medicationStats.halal_percentage,
          otc_available: medicationStats.otc_available
        },
        cultural_features: {
          prayer_time_integration: true,
          holiday_awareness: true,
          halal_medication_database: true,
          multilingual_support: true,
          ramadan_adjustments: true
        }
      };
    } catch (error) {
      console.error('Error getting cultural dashboard:', error);
      throw new Error(`Failed to get cultural dashboard: ${error.message}`);
    }
  }

  /**
   * Get Ramadan-specific medication adjustments
   * @param {string} cityKey - City identifier  
   * @param {Object} medications - Array of medication objects with frequency
   */
  async getRamadanMedicationAdjustments(cityKey, medications) {
    const prayerTimes = await this.getPrayerTimes(cityKey);
    const adjustments = [];

    for (const med of medications) {
      const baseSchedule = prayerTimes.getMedicationSchedule(med.frequency);
      
      // Adjust for fasting hours (Fajr to Maghrib)
      const ramadanSchedule = baseSchedule.filter(slot => {
        const slotTime = slot.time;
        return slotTime <= prayerTimes.fajr || slotTime >= prayerTimes.maghrib;
      });

      adjustments.push({
        medication: med.name,
        original_frequency: med.frequency,
        ramadan_schedule: ramadanSchedule,
        fasting_considerations: this.getRamadanMedicationNotes(med),
        consult_doctor: ramadanSchedule.length < baseSchedule.length
      });
    }

    return {
      city: prayerTimes.cityName,
      ramadan_period: true,
      fasting_hours: {
        start: prayerTimes.fajr,
        end: prayerTimes.maghrib
      },
      medication_adjustments: adjustments
    };
  }

  /**
   * Get Ramadan-specific medication notes
   * @param {Object} medication - Medication object
   */
  getRamadanMedicationNotes(medication) {
    const notes = [];
    
    if (medication.take_with_food) {
      notes.push('This medication should be taken with food. Consider taking during Suhur or Iftar meals.');
    }
    
    if (medication.critical_timing) {
      notes.push('Critical timing medication - consult doctor for Ramadan adjustments.');
    }
    
    if (medication.type === 'diabetes') {
      notes.push('Diabetes medication timing is crucial during fasting. Monitor blood sugar and consult endocrinologist.');
    }

    return notes;
  }
}

module.exports = CulturalDataService;