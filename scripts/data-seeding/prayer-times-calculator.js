/**
 * Islamic Prayer Times Calculator for Malaysian Healthcare Platform
 * Implements JAKIM-standard calculations for major Malaysian cities
 * Supports medication scheduling around prayer times for Muslim patients
 */

const { DateTime } = require('luxon');

class PrayerTimesCalculator {
  constructor() {
    // JAKIM calculation parameters
    this.calculationMethod = {
      name: 'JAKIM',
      fajrAngle: 20, // Angle for Fajr prayer
      ishaAngle: 18, // Angle for Isha prayer
      maghribAngle: 1, // Minutes after sunset
      asrMethod: 'Shafi', // Shafi jurisprudence (predominant in Malaysia)
      timeFormat: '24h'
    };

    // Major Malaysian cities with coordinates
    this.cities = {
      'kuala-lumpur': {
        name: 'Kuala Lumpur',
        latitude: 3.139,
        longitude: 101.687,
        timezone: 'Asia/Kuala_Lumpur',
        elevation: 56
      },
      'johor-bahru': {
        name: 'Johor Bahru',
        latitude: 1.4927,
        longitude: 103.7414,
        timezone: 'Asia/Kuala_Lumpur',
        elevation: 38
      },
      'penang': {
        name: 'Penang',
        latitude: 5.4164,
        longitude: 100.3327,
        timezone: 'Asia/Kuala_Lumpur',
        elevation: 3
      },
      'kota-kinabalu': {
        name: 'Kota Kinabalu',
        latitude: 5.9804,
        longitude: 116.0735,
        timezone: 'Asia/Kuching', // Sabah timezone
        elevation: 3
      },
      'kuching': {
        name: 'Kuching',
        latitude: 1.5497,
        longitude: 110.3594,
        timezone: 'Asia/Kuching', // Sarawak timezone
        elevation: 27
      }
    };
  }

  /**
   * Calculate prayer times for a specific city and date
   * @param {string} cityKey - City identifier
   * @param {string} date - Date in YYYY-MM-DD format
   * @returns {Object} Prayer times object
   */
  calculatePrayerTimes(cityKey, date) {
    const city = this.cities[cityKey];
    if (!city) {
      throw new Error(`City ${cityKey} not supported`);
    }

    const dt = DateTime.fromISO(date, { zone: city.timezone });
    const julianDate = this.getJulianDate(dt);
    const sunTimes = this.calculateSunTimes(city, julianDate);
    
    return {
      city: city.name,
      date: date,
      timezone: city.timezone,
      prayers: {
        fajr: this.calculateFajr(sunTimes, city),
        sunrise: sunTimes.sunrise,
        dhuhr: this.calculateDhuhr(sunTimes),
        asr: this.calculateAsr(sunTimes, city),
        maghrib: this.calculateMaghrib(sunTimes),
        isha: this.calculateIsha(sunTimes, city)
      },
      metadata: {
        calculationMethod: this.calculationMethod.name,
        jurisprudence: this.calculationMethod.asrMethod,
        coordinates: {
          latitude: city.latitude,
          longitude: city.longitude
        }
      }
    };
  }

  /**
   * Calculate sun times using astronomical formulas
   */
  calculateSunTimes(city, julianDate) {
    const { latitude, longitude } = city;
    const n = julianDate - 2451545.0;
    
    // Mean longitude of sun
    const L = (280.460 + 0.9856474 * n) % 360;
    
    // Mean anomaly
    const g = this.degreesToRadians((357.528 + 0.9856003 * n) % 360);
    
    // Ecliptic longitude
    const lambda = this.degreesToRadians(L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
    
    // Declination
    const delta = Math.asin(Math.sin(this.degreesToRadians(23.439)) * Math.sin(lambda));
    
    // Equation of time
    const E = 4 * (L - 0.0057183 - Math.atan2(Math.tan(lambda), Math.cos(this.degreesToRadians(23.439))));
    
    // Solar noon
    const solarNoon = 12 - longitude / 15 - E / 60;
    
    // Hour angle for sunrise/sunset
    const latRad = this.degreesToRadians(latitude);
    const hourAngle = Math.acos(-Math.tan(latRad) * Math.tan(delta));
    const hourAngleDeg = this.radiansToDegrees(hourAngle);
    
    return {
      sunrise: this.formatTime(solarNoon - hourAngleDeg / 15),
      solarNoon: this.formatTime(solarNoon),
      sunset: this.formatTime(solarNoon + hourAngleDeg / 15),
      delta: delta,
      latitude: latRad
    };
  }

  calculateFajr(sunTimes, city) {
    // Fajr is calculated when sun is at specified angle below horizon
    const angle = this.degreesToRadians(this.calculationMethod.fajrAngle);
    const latRad = sunTimes.latitude;
    const delta = sunTimes.delta;
    
    const hourAngle = Math.acos(
      (Math.sin(angle) + Math.sin(latRad) * Math.sin(delta)) / 
      (Math.cos(latRad) * Math.cos(delta))
    );
    
    const fajrTime = sunTimes.solarNoon - this.radiansToDegrees(hourAngle) / 15;
    return this.formatTime(fajrTime);
  }

  calculateDhuhr(sunTimes) {
    // Dhuhr is slightly after solar noon (sun zenith + 2 minutes for safety)
    return this.formatTime(sunTimes.solarNoon + 2/60);
  }

  calculateAsr(sunTimes, city) {
    // Asr calculation using Shafi method (shadow length = object length + noon shadow)
    const latRad = sunTimes.latitude;
    const delta = sunTimes.delta;
    
    // Shadow factor for Shafi method
    const shadowFactor = 1;
    
    const A = Math.sin(Math.atan(1 / (shadowFactor + Math.tan(Math.abs(latRad - delta)))));
    const hourAngle = Math.acos(
      (A - Math.sin(latRad) * Math.sin(delta)) / 
      (Math.cos(latRad) * Math.cos(delta))
    );
    
    const asrTime = sunTimes.solarNoon + this.radiansToDegrees(hourAngle) / 15;
    return this.formatTime(asrTime);
  }

  calculateMaghrib(sunTimes) {
    // Maghrib is sunset + specified minutes
    const maghribOffset = this.calculationMethod.maghribAngle;
    return this.formatTime(this.timeToHours(sunTimes.sunset) + maghribOffset / 60);
  }

  calculateIsha(sunTimes, city) {
    // Isha is calculated when sun is at specified angle below horizon
    const angle = this.degreesToRadians(this.calculationMethod.ishaAngle);
    const latRad = sunTimes.latitude;
    const delta = sunTimes.delta;
    
    const hourAngle = Math.acos(
      (Math.sin(angle) + Math.sin(latRad) * Math.sin(delta)) / 
      (Math.cos(latRad) * Math.cos(delta))
    );
    
    const ishaTime = sunTimes.solarNoon + this.radiansToDegrees(hourAngle) / 15;
    return this.formatTime(ishaTime);
  }

  /**
   * Generate prayer times for a range of dates
   * @param {string} cityKey - City identifier
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {number} days - Number of days to generate
   */
  generatePrayerTimesRange(cityKey, startDate, days = 30) {
    const results = [];
    const start = DateTime.fromISO(startDate);
    
    for (let i = 0; i < days; i++) {
      const currentDate = start.plus({ days: i });
      const prayerTimes = this.calculatePrayerTimes(cityKey, currentDate.toISODate());
      results.push(prayerTimes);
    }
    
    return results;
  }

  /**
   * Get medication scheduling recommendations based on prayer times
   * @param {Object} prayerTimes - Prayer times for the day
   * @param {string} medicationFrequency - Daily frequency (1x, 2x, 3x, 4x)
   */
  getMedicationScheduleRecommendations(prayerTimes, medicationFrequency) {
    const prayers = prayerTimes.prayers;
    const recommendations = {
      city: prayerTimes.city,
      date: prayerTimes.date,
      frequency: medicationFrequency,
      schedule: []
    };

    switch (medicationFrequency) {
      case '1x':
        // Once daily - after Fajr (early morning)
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.fajr, 30),
          prayer_relation: 'After Fajr',
          cultural_note: 'After morning prayers, with or without food'
        });
        break;

      case '2x':
        // Twice daily - after Fajr and Maghrib
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.fajr, 30),
          prayer_relation: 'After Fajr',
          cultural_note: 'Morning dose after prayer'
        });
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.maghrib, 20),
          prayer_relation: 'After Maghrib',
          cultural_note: 'Evening dose after prayer'
        });
        break;

      case '3x':
        // Three times daily - after Fajr, Dhuhr, Maghrib
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.fajr, 30),
          prayer_relation: 'After Fajr',
          cultural_note: 'Morning dose'
        });
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.dhuhr, 15),
          prayer_relation: 'After Dhuhr',
          cultural_note: 'Afternoon dose with meal'
        });
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.maghrib, 20),
          prayer_relation: 'After Maghrib',
          cultural_note: 'Evening dose'
        });
        break;

      case '4x':
        // Four times daily - after each main prayer except Asr
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.fajr, 30),
          prayer_relation: 'After Fajr',
          cultural_note: 'Early morning dose'
        });
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.dhuhr, 15),
          prayer_relation: 'After Dhuhr',
          cultural_note: 'Midday dose'
        });
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.asr, 15),
          prayer_relation: 'After Asr',
          cultural_note: 'Late afternoon dose'
        });
        recommendations.schedule.push({
          time: this.addMinutesToTime(prayers.maghrib, 20),
          prayer_relation: 'After Maghrib',
          cultural_note: 'Evening dose'
        });
        break;

      default:
        throw new Error(`Unsupported frequency: ${medicationFrequency}`);
    }

    return recommendations;
  }

  // Utility methods
  getJulianDate(dateTime) {
    return dateTime.toJSDate().getTime() / 86400000 + 2440587.5;
  }

  degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
  }

  formatTime(hours) {
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  timeToHours(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours + minutes / 60;
  }

  addMinutesToTime(timeString, minutes) {
    const totalMinutes = this.timeToHours(timeString) * 60 + minutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.floor(totalMinutes % 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  /**
   * Validate prayer times against JAKIM reference
   * @param {Object} calculatedTimes - Calculated prayer times
   * @param {Object} referenceTimes - JAKIM reference times (optional)
   */
  validatePrayerTimes(calculatedTimes, referenceTimes = null) {
    const validation = {
      isValid: true,
      issues: [],
      accuracy: 'high'
    };

    // Basic validation checks
    const prayers = calculatedTimes.prayers;
    const timeOrder = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    
    for (let i = 0; i < timeOrder.length - 1; i++) {
      const current = this.timeToHours(prayers[timeOrder[i]]);
      const next = this.timeToHours(prayers[timeOrder[i + 1]]);
      
      if (current >= next) {
        validation.isValid = false;
        validation.issues.push(`${timeOrder[i]} time should be before ${timeOrder[i + 1]}`);
      }
    }

    // If reference times provided, check accuracy
    if (referenceTimes) {
      timeOrder.forEach(prayer => {
        if (referenceTimes[prayer]) {
          const calculated = this.timeToHours(prayers[prayer]);
          const reference = this.timeToHours(referenceTimes[prayer]);
          const diff = Math.abs(calculated - reference) * 60; // minutes
          
          if (diff > 5) { // More than 5 minutes difference
            validation.accuracy = 'medium';
            validation.issues.push(`${prayer} differs by ${Math.round(diff)} minutes from reference`);
          }
        }
      });
    }

    return validation;
  }
}

module.exports = PrayerTimesCalculator;