/**
 * Malaysian Holiday Model
 * Manages Malaysian federal, state, and cultural holidays for healthcare scheduling
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MalaysianHoliday = sequelize.define('MalaysianHoliday', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    holidayId: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
      field: 'holiday_id'
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    nameBm: {
      type: DataTypes.STRING(200),
      field: 'name_bm',
      comment: 'Name in Bahasa Malaysia'
    },
    nameZh: {
      type: DataTypes.STRING(200),
      field: 'name_zh',
      comment: 'Name in Chinese'
    },
    nameTa: {
      type: DataTypes.STRING(200),
      field: 'name_ta',
      comment: 'Name in Tamil'
    },
    holidayDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'holiday_date'
    },
    holidayType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'holiday_type',
      validate: {
        isIn: [['federal', 'state', 'religious_muslim', 'religious_chinese', 'religious_hindu', 'religious_christian', 'cultural', 'harvest']]
      }
    },
    isFederal: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_federal'
    },
    applicableStates: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      field: 'applicable_states'
    },
    healthcareImpact: {
      type: DataTypes.STRING(20),
      defaultValue: 'medium',
      field: 'healthcare_impact',
      validate: {
        isIn: [['high', 'medium', 'low']]
      }
    },
    description: {
      type: DataTypes.TEXT
    },
    culturalSignificance: {
      type: DataTypes.TEXT,
      field: 'cultural_significance'
    },
    healthcareNotes: {
      type: DataTypes.TEXT,
      field: 'healthcare_notes'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'malaysian_holidays',
    timestamps: false,
    indexes: [
      {
        fields: ['holiday_date']
      },
      {
        fields: ['holiday_type']
      },
      {
        fields: ['is_federal']
      },
      {
        fields: ['healthcare_impact']
      }
    ]
  });

  // Instance methods
  MalaysianHoliday.prototype.getLocalizedName = function(language = 'en') {
    const names = {
      'en': this.name,
      'bm': this.nameBm || this.name,
      'zh': this.nameZh || this.name,
      'ta': this.nameTa || this.name
    };
    
    return names[language] || this.name;
  };

  MalaysianHoliday.prototype.isApplicableToState = function(stateCode) {
    return this.isFederal || (this.applicableStates && this.applicableStates.includes(stateCode));
  };

  MalaysianHoliday.prototype.getHealthcareRecommendations = function() {
    const baseRecommendations = {
      'high': [
        'Stock up on essential medications before the holiday',
        'Confirm emergency contact numbers',
        'Check 24-hour pharmacy locations',
        'Reschedule non-urgent appointments',
        'Prepare emergency medication kit'
      ],
      'medium': [
        'Check clinic operating hours',
        'Refill prescriptions if due soon',
        'Keep emergency contacts handy',
        'Plan for possible service delays'
      ],
      'low': [
        'Normal healthcare services expected',
        'Monitor for any announced changes',
        'Maintain regular medication schedule'
      ]
    };

    return {
      holiday_name: this.name,
      impact_level: this.healthcareImpact,
      recommendations: baseRecommendations[this.healthcareImpact] || baseRecommendations['medium'],
      cultural_notes: this.culturalSignificance,
      healthcare_specific: this.healthcareNotes
    };
  };

  MalaysianHoliday.prototype.isToday = function() {
    const today = new Date().toISOString().split('T')[0];
    return this.holidayDate === today;
  };

  MalaysianHoliday.prototype.isUpcoming = function(days = 7) {
    const today = new Date();
    const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
    const holidayDateTime = new Date(this.holidayDate);
    
    return holidayDateTime >= today && holidayDateTime <= futureDate;
  };

  // Class methods
  MalaysianHoliday.findByState = function(stateCode, year = new Date().getFullYear()) {
    return this.findAll({
      where: {
        [sequelize.Sequelize.Op.or]: [
          { isFederal: true },
          { applicableStates: { [sequelize.Sequelize.Op.contains]: [stateCode] } }
        ],
        holidayDate: {
          [sequelize.Sequelize.Op.between]: [`${year}-01-01`, `${year}-12-31`]
        }
      },
      order: [['holidayDate', 'ASC']]
    });
  };

  MalaysianHoliday.findUpcoming = function(days = 30, stateCode = null) {
    const today = new Date();
    const futureDate = new Date(today.getTime() + (days * 24 * 60 * 60 * 1000));
    
    const whereCondition = {
      holidayDate: {
        [sequelize.Sequelize.Op.between]: [
          today.toISOString().split('T')[0],
          futureDate.toISOString().split('T')[0]
        ]
      }
    };

    if (stateCode) {
      whereCondition[sequelize.Sequelize.Op.or] = [
        { isFederal: true },
        { applicableStates: { [sequelize.Sequelize.Op.contains]: [stateCode] } }
      ];
    }

    return this.findAll({
      where: whereCondition,
      order: [['holidayDate', 'ASC']]
    });
  };

  MalaysianHoliday.findByType = function(holidayType, year = new Date().getFullYear()) {
    return this.findAll({
      where: {
        holidayType,
        holidayDate: {
          [sequelize.Sequelize.Op.between]: [`${year}-01-01`, `${year}-12-31`]
        }
      },
      order: [['holidayDate', 'ASC']]
    });
  };

  MalaysianHoliday.findByHealthcareImpact = function(impactLevel, stateCode = null) {
    const whereCondition = {
      healthcareImpact: impactLevel
    };

    if (stateCode) {
      whereCondition[sequelize.Sequelize.Op.or] = [
        { isFederal: true },
        { applicableStates: { [sequelize.Sequelize.Op.contains]: [stateCode] } }
      ];
    }

    return this.findAll({
      where: whereCondition,
      order: [['holidayDate', 'ASC']]
    });
  };

  MalaysianHoliday.getTodaysHolidays = function(stateCode = null) {
    const today = new Date().toISOString().split('T')[0];
    
    const whereCondition = {
      holidayDate: today
    };

    if (stateCode) {
      whereCondition[sequelize.Sequelize.Op.or] = [
        { isFederal: true },
        { applicableStates: { [sequelize.Sequelize.Op.contains]: [stateCode] } }
      ];
    }

    return this.findAll({
      where: whereCondition
    });
  };

  MalaysianHoliday.getNextHoliday = function(stateCode = null) {
    const today = new Date().toISOString().split('T')[0];
    
    const whereCondition = {
      holidayDate: {
        [sequelize.Sequelize.Op.gt]: today
      }
    };

    if (stateCode) {
      whereCondition[sequelize.Sequelize.Op.or] = [
        { isFederal: true },
        { applicableStates: { [sequelize.Sequelize.Op.contains]: [stateCode] } }
      ];
    }

    return this.findOne({
      where: whereCondition,
      order: [['holidayDate', 'ASC']]
    });
  };

  // Check if a given date is a holiday
  MalaysianHoliday.isHoliday = async function(date, stateCode = null) {
    const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
    
    const whereCondition = {
      holidayDate: dateStr
    };

    if (stateCode) {
      whereCondition[sequelize.Sequelize.Op.or] = [
        { isFederal: true },
        { applicableStates: { [sequelize.Sequelize.Op.contains]: [stateCode] } }
      ];
    }

    const holiday = await this.findOne({
      where: whereCondition
    });

    return {
      isHoliday: !!holiday,
      holiday: holiday,
      healthcareImpact: holiday ? holiday.healthcareImpact : null
    };
  };

  return MalaysianHoliday;
};