/**
 * Prayer Time Model
 * Manages Islamic prayer times for Malaysian cities with healthcare integration
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PrayerTime = sequelize.define('PrayerTime', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    cityKey: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'city_key'
    },
    cityName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'city_name'
    },
    prayerDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'prayer_date'
    },
    fajr: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Dawn prayer time'
    },
    sunrise: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Sunrise time (not a prayer)'
    },
    dhuhr: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Midday prayer time'
    },
    asr: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Afternoon prayer time'
    },
    maghrib: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Sunset prayer time'
    },
    isha: {
      type: DataTypes.TIME,
      allowNull: false,
      comment: 'Night prayer time'
    },
    timezone: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'Asia/Kuala_Lumpur'
    },
    calculationMethod: {
      type: DataTypes.STRING(20),
      defaultValue: 'JAKIM',
      field: 'calculation_method'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'prayer_times',
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ['city_key', 'prayer_date']
      },
      {
        fields: ['prayer_date']
      },
      {
        fields: ['city_key']
      }
    ]
  });

  // Instance methods
  PrayerTime.prototype.getNextPrayer = function() {
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
    
    const prayers = [
      { name: 'fajr', time: this.fajr, displayName: 'Fajr' },
      { name: 'dhuhr', time: this.dhuhr, displayName: 'Dhuhr' },
      { name: 'asr', time: this.asr, displayName: 'Asr' },
      { name: 'maghrib', time: this.maghrib, displayName: 'Maghrib' },
      { name: 'isha', time: this.isha, displayName: 'Isha' }
    ];

    for (const prayer of prayers) {
      if (currentTime < prayer.time) {
        return prayer;
      }
    }

    // If all prayers have passed, return tomorrow's Fajr
    return { name: 'fajr', time: this.fajr, displayName: 'Fajr (Tomorrow)' };
  };

  PrayerTime.prototype.getMedicationSchedule = function(frequency) {
    const prayers = {
      fajr: this.fajr,
      dhuhr: this.dhuhr,
      asr: this.asr,
      maghrib: this.maghrib,
      isha: this.isha
    };

    const addMinutes = (time, minutes) => {
      const [hours, mins] = time.split(':').map(Number);
      const totalMinutes = hours * 60 + mins + minutes;
      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMins = totalMinutes % 60;
      return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
    };

    switch (frequency) {
      case '1x':
        return [{ time: addMinutes(prayers.fajr, 30), relation: 'After Fajr' }];
      case '2x':
        return [
          { time: addMinutes(prayers.fajr, 30), relation: 'After Fajr' },
          { time: addMinutes(prayers.maghrib, 20), relation: 'After Maghrib' }
        ];
      case '3x':
        return [
          { time: addMinutes(prayers.fajr, 30), relation: 'After Fajr' },
          { time: addMinutes(prayers.dhuhr, 15), relation: 'After Dhuhr' },
          { time: addMinutes(prayers.maghrib, 20), relation: 'After Maghrib' }
        ];
      case '4x':
        return [
          { time: addMinutes(prayers.fajr, 30), relation: 'After Fajr' },
          { time: addMinutes(prayers.dhuhr, 15), relation: 'After Dhuhr' },
          { time: addMinutes(prayers.asr, 15), relation: 'After Asr' },
          { time: addMinutes(prayers.maghrib, 20), relation: 'After Maghrib' }
        ];
      default:
        throw new Error(`Unsupported frequency: ${frequency}`);
    }
  };

  // Class methods
  PrayerTime.findByCity = function(cityKey, date = new Date()) {
    const dateStr = date.toISOString().split('T')[0];
    return this.findOne({
      where: {
        cityKey,
        prayerDate: dateStr
      }
    });
  };

  PrayerTime.findByCityRange = function(cityKey, startDate, endDate) {
    return this.findAll({
      where: {
        cityKey,
        prayerDate: {
          [sequelize.Sequelize.Op.between]: [startDate, endDate]
        }
      },
      order: [['prayerDate', 'ASC']]
    });
  };

  PrayerTime.getCurrentPrayerForCity = function(cityKey) {
    return this.findByCity(cityKey, new Date());
  };

  return PrayerTime;
};